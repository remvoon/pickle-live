/**
 * Avatar upload with square crop (mobile-friendly drag)
 */
import React, { useState, useRef, useCallback } from 'react';

const CROP_SIZE = 200;

export default function AvatarUpload({ currentAvatar, onAvatarChange, name }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, size: 100 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [showCrop, setShowCrop] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, cropX: 0, cropY: 0 });
  const fileRef = useRef(null);
  const containerRef = useRef(null);

  // Reset file input so re-selecting the same file triggers onChange
  const resetFileInput = () => {
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = Math.min(img.width, img.height);
        const size = Math.min(maxDim, 400);
        setImgSize({ w: img.width, h: img.height });
        setImageSrc(ev.target.result);
        setCrop({
          x: (img.width - size) / 2,
          y: (img.height - size) / 2,
          size,
        });
        setShowCrop(true);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Get pointer position (works for both mouse and touch)
  const getPos = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    const pos = getPos(e);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = imgSize.w / rect.width;
    const scaleY = imgSize.h / rect.height;
    dragRef.current = {
      startX: pos.x,
      startY: pos.y,
      cropX: crop.x,
      cropY: crop.y,
      scaleX,
      scaleY,
    };
  }, [imgSize, crop]);

  const handleDragMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    const pos = getPos(e);
    const { startX, startY, cropX, cropY, scaleX, scaleY } = dragRef.current;
    const dx = (pos.x - startX) * scaleX;
    const dy = (pos.y - startY) * scaleY;
    const newX = Math.max(0, Math.min(cropX + dx, imgSize.w - crop.size));
    const newY = Math.max(0, Math.min(cropY + dy, imgSize.h - crop.size));
    setCrop(prev => ({ ...prev, x: newX, y: newY }));
  }, [isDragging, imgSize, crop.size]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleCropConfirm = () => {
    const canvas = document.createElement('canvas');
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, CROP_SIZE, CROP_SIZE);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      onAvatarChange(dataUrl);
      setShowCrop(false);
      setImageSrc(null);
      resetFileInput();
    };
    img.src = imageSrc;
  };

  const cancelCrop = () => {
    setShowCrop(false);
    setImageSrc(null);
    resetFileInput();
  };

  const handleRemove = () => {
    onAvatarChange('');
    resetFileInput();
  };

  const initials = (name || '?').charAt(0).toUpperCase();

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-400 font-medium">Profile Photo</p>

      <div className="flex items-center gap-3">
        {currentAvatar ? (
          <div className="relative">
            <img src={currentAvatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 shadow-sm" />
            <button type="button" onClick={handleRemove}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-400 text-white text-[10px] flex items-center justify-center hover:bg-red-500">
              ×
            </button>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pickle-400 to-emerald-500 flex items-center justify-center text-white text-xl font-bold shadow-sm">
            {initials}
          </div>
        )}
        <button type="button" onClick={() => fileRef.current?.click()}
          className="text-xs text-pickle-600 font-medium touch-target px-3 py-2 rounded-lg hover:bg-pickle-50 border border-pickle-200">
          {currentAvatar ? 'Change Photo' : 'Add Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment"
          onChange={handleFileSelect} className="hidden" />
      </div>

      {/* Crop modal */}
      {showCrop && imageSrc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
          onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}
          onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}>
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full space-y-3">
            <p className="text-sm font-semibold text-gray-800">Crop Photo</p>
            <p className="text-[11px] text-gray-400">Drag or swipe to adjust the crop area</p>
            <div className="relative mx-auto" style={{ maxWidth: '280px' }} ref={containerRef}>
              <img src={imageSrc} alt="Crop" className="w-full rounded-lg" draggable={false}
                onMouseDown={handleDragStart} onTouchStart={handleDragStart} />
              {/* Crop overlay */}
              {imgSize.w > 0 && (
                <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
                  <svg className="w-full h-full" viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
                    style={{ pointerEvents: 'none' }}>
                    <defs>
                      <mask id="cropMask">
                        <rect width={imgSize.w} height={imgSize.h} fill="white" />
                        <rect x={crop.x} y={crop.y} width={crop.size} height={crop.size} fill="black" />
                      </mask>
                    </defs>
                    <rect width={imgSize.w} height={imgSize.h} fill="rgba(0,0,0,0.45)" mask="url(#cropMask)" />
                    <rect x={crop.x} y={crop.y} width={crop.size} height={crop.size}
                      fill="none" stroke="white" strokeWidth={2.5} rx={4} />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={cancelCrop} className="btn-secondary flex-1 touch-target text-sm">Cancel</button>
              <button type="button" onClick={handleCropConfirm} className="btn-primary flex-1 touch-target text-sm">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
