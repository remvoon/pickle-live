/**
 * Authentication middleware using JWT (HS256 with jose)
 */
import { SignJWT, jwtVerify } from 'jose';

const TOKEN_EXPIRY = '24h';

/**
 * Create a signed JWT token
 */
export async function createToken(secret) {
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);
  
  const token = await new SignJWT({ admin: true, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(key);
  
  return token;
}

/**
 * Verify a JWT token
 */
export async function verifyToken(token, secret) {
  try {
    const encoder = new TextEncoder();
    const key = encoder.encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Hono middleware to require admin auth
 */
export function requireAdmin(env) {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }
    
    const token = authHeader.slice(7);
    const jwtSecret = env.JWT_SECRET || env.ADMIN_PASSWORD;
    
    if (!jwtSecret) {
      return c.json({ error: 'Server misconfigured: no secret set' }, 500);
    }
    
    const payload = await verifyToken(token, jwtSecret);
    if (!payload || !payload.admin) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }
    
    return next();
  };
}
