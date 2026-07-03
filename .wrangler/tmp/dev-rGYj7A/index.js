var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// worker/node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// worker/node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// worker/node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder2) => {
  try {
    return decoder2(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder2(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// worker/node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// worker/node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// worker/node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// worker/node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// worker/node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// worker/node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// worker/node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// worker/node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// worker/node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// worker/node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// worker/node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// worker/node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = /* @__PURE__ */ __name((children) => {
  for (const _ in children) {
    return true;
  }
  return false;
}, "hasChildren");
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// worker/node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// worker/node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// worker/node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const opts = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// worker/node_modules/jose/dist/browser/runtime/webcrypto.js
var webcrypto_default = crypto;
var isCryptoKey = /* @__PURE__ */ __name((key) => key instanceof CryptoKey, "isCryptoKey");

// worker/node_modules/jose/dist/browser/lib/buffer_utils.js
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var MAX_INT32 = 2 ** 32;
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0);
  const buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers) {
    buf.set(buffer, i);
    i += buffer.length;
  }
  return buf;
}
__name(concat, "concat");

// worker/node_modules/jose/dist/browser/runtime/base64url.js
var encodeBase64 = /* @__PURE__ */ __name((input) => {
  let unencoded = input;
  if (typeof unencoded === "string") {
    unencoded = encoder.encode(unencoded);
  }
  const CHUNK_SIZE = 32768;
  const arr = [];
  for (let i = 0; i < unencoded.length; i += CHUNK_SIZE) {
    arr.push(String.fromCharCode.apply(null, unencoded.subarray(i, i + CHUNK_SIZE)));
  }
  return btoa(arr.join(""));
}, "encodeBase64");
var encode = /* @__PURE__ */ __name((input) => {
  return encodeBase64(input).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}, "encode");
var decodeBase64 = /* @__PURE__ */ __name((encoded) => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}, "decodeBase64");
var decode = /* @__PURE__ */ __name((input) => {
  let encoded = input;
  if (encoded instanceof Uint8Array) {
    encoded = decoder.decode(encoded);
  }
  encoded = encoded.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  try {
    return decodeBase64(encoded);
  } catch {
    throw new TypeError("The input to be decoded is not correctly encoded.");
  }
}, "decode");

// worker/node_modules/jose/dist/browser/util/errors.js
var JOSEError = class extends Error {
  static {
    __name(this, "JOSEError");
  }
  constructor(message2, options) {
    super(message2, options);
    this.code = "ERR_JOSE_GENERIC";
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
};
JOSEError.code = "ERR_JOSE_GENERIC";
var JWTClaimValidationFailed = class extends JOSEError {
  static {
    __name(this, "JWTClaimValidationFailed");
  }
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } });
    this.code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
JWTClaimValidationFailed.code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
var JWTExpired = class extends JOSEError {
  static {
    __name(this, "JWTExpired");
  }
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } });
    this.code = "ERR_JWT_EXPIRED";
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
JWTExpired.code = "ERR_JWT_EXPIRED";
var JOSEAlgNotAllowed = class extends JOSEError {
  static {
    __name(this, "JOSEAlgNotAllowed");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JOSE_ALG_NOT_ALLOWED";
  }
};
JOSEAlgNotAllowed.code = "ERR_JOSE_ALG_NOT_ALLOWED";
var JOSENotSupported = class extends JOSEError {
  static {
    __name(this, "JOSENotSupported");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JOSE_NOT_SUPPORTED";
  }
};
JOSENotSupported.code = "ERR_JOSE_NOT_SUPPORTED";
var JWEDecryptionFailed = class extends JOSEError {
  static {
    __name(this, "JWEDecryptionFailed");
  }
  constructor(message2 = "decryption operation failed", options) {
    super(message2, options);
    this.code = "ERR_JWE_DECRYPTION_FAILED";
  }
};
JWEDecryptionFailed.code = "ERR_JWE_DECRYPTION_FAILED";
var JWEInvalid = class extends JOSEError {
  static {
    __name(this, "JWEInvalid");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JWE_INVALID";
  }
};
JWEInvalid.code = "ERR_JWE_INVALID";
var JWSInvalid = class extends JOSEError {
  static {
    __name(this, "JWSInvalid");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JWS_INVALID";
  }
};
JWSInvalid.code = "ERR_JWS_INVALID";
var JWTInvalid = class extends JOSEError {
  static {
    __name(this, "JWTInvalid");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JWT_INVALID";
  }
};
JWTInvalid.code = "ERR_JWT_INVALID";
var JWKInvalid = class extends JOSEError {
  static {
    __name(this, "JWKInvalid");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JWK_INVALID";
  }
};
JWKInvalid.code = "ERR_JWK_INVALID";
var JWKSInvalid = class extends JOSEError {
  static {
    __name(this, "JWKSInvalid");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JWKS_INVALID";
  }
};
JWKSInvalid.code = "ERR_JWKS_INVALID";
var JWKSNoMatchingKey = class extends JOSEError {
  static {
    __name(this, "JWKSNoMatchingKey");
  }
  constructor(message2 = "no applicable key found in the JSON Web Key Set", options) {
    super(message2, options);
    this.code = "ERR_JWKS_NO_MATCHING_KEY";
  }
};
JWKSNoMatchingKey.code = "ERR_JWKS_NO_MATCHING_KEY";
var JWKSMultipleMatchingKeys = class extends JOSEError {
  static {
    __name(this, "JWKSMultipleMatchingKeys");
  }
  constructor(message2 = "multiple matching keys found in the JSON Web Key Set", options) {
    super(message2, options);
    this.code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  }
};
JWKSMultipleMatchingKeys.code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
var JWKSTimeout = class extends JOSEError {
  static {
    __name(this, "JWKSTimeout");
  }
  constructor(message2 = "request timed out", options) {
    super(message2, options);
    this.code = "ERR_JWKS_TIMEOUT";
  }
};
JWKSTimeout.code = "ERR_JWKS_TIMEOUT";
var JWSSignatureVerificationFailed = class extends JOSEError {
  static {
    __name(this, "JWSSignatureVerificationFailed");
  }
  constructor(message2 = "signature verification failed", options) {
    super(message2, options);
    this.code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  }
};
JWSSignatureVerificationFailed.code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";

// worker/node_modules/jose/dist/browser/lib/crypto_key.js
function unusable(name, prop = "algorithm.name") {
  return new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`);
}
__name(unusable, "unusable");
function isAlgorithm(algorithm, name) {
  return algorithm.name === name;
}
__name(isAlgorithm, "isAlgorithm");
function getHashLength(hash) {
  return parseInt(hash.name.slice(4), 10);
}
__name(getHashLength, "getHashLength");
function getNamedCurve(alg) {
  switch (alg) {
    case "ES256":
      return "P-256";
    case "ES384":
      return "P-384";
    case "ES512":
      return "P-521";
    default:
      throw new Error("unreachable");
  }
}
__name(getNamedCurve, "getNamedCurve");
function checkUsage(key, usages) {
  if (usages.length && !usages.some((expected) => key.usages.includes(expected))) {
    let msg = "CryptoKey does not support this operation, its usages must include ";
    if (usages.length > 2) {
      const last = usages.pop();
      msg += `one of ${usages.join(", ")}, or ${last}.`;
    } else if (usages.length === 2) {
      msg += `one of ${usages[0]} or ${usages[1]}.`;
    } else {
      msg += `${usages[0]}.`;
    }
    throw new TypeError(msg);
  }
}
__name(checkUsage, "checkUsage");
function checkSigCryptoKey(key, alg, ...usages) {
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512": {
      if (!isAlgorithm(key.algorithm, "HMAC"))
        throw unusable("HMAC");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "RS256":
    case "RS384":
    case "RS512": {
      if (!isAlgorithm(key.algorithm, "RSASSA-PKCS1-v1_5"))
        throw unusable("RSASSA-PKCS1-v1_5");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "PS256":
    case "PS384":
    case "PS512": {
      if (!isAlgorithm(key.algorithm, "RSA-PSS"))
        throw unusable("RSA-PSS");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "EdDSA": {
      if (key.algorithm.name !== "Ed25519" && key.algorithm.name !== "Ed448") {
        throw unusable("Ed25519 or Ed448");
      }
      break;
    }
    case "Ed25519": {
      if (!isAlgorithm(key.algorithm, "Ed25519"))
        throw unusable("Ed25519");
      break;
    }
    case "ES256":
    case "ES384":
    case "ES512": {
      if (!isAlgorithm(key.algorithm, "ECDSA"))
        throw unusable("ECDSA");
      const expected = getNamedCurve(alg);
      const actual = key.algorithm.namedCurve;
      if (actual !== expected)
        throw unusable(expected, "algorithm.namedCurve");
      break;
    }
    default:
      throw new TypeError("CryptoKey does not support this operation");
  }
  checkUsage(key, usages);
}
__name(checkSigCryptoKey, "checkSigCryptoKey");

// worker/node_modules/jose/dist/browser/lib/invalid_key_input.js
function message(msg, actual, ...types2) {
  types2 = types2.filter(Boolean);
  if (types2.length > 2) {
    const last = types2.pop();
    msg += `one of type ${types2.join(", ")}, or ${last}.`;
  } else if (types2.length === 2) {
    msg += `one of type ${types2[0]} or ${types2[1]}.`;
  } else {
    msg += `of type ${types2[0]}.`;
  }
  if (actual == null) {
    msg += ` Received ${actual}`;
  } else if (typeof actual === "function" && actual.name) {
    msg += ` Received function ${actual.name}`;
  } else if (typeof actual === "object" && actual != null) {
    if (actual.constructor?.name) {
      msg += ` Received an instance of ${actual.constructor.name}`;
    }
  }
  return msg;
}
__name(message, "message");
var invalid_key_input_default = /* @__PURE__ */ __name((actual, ...types2) => {
  return message("Key must be ", actual, ...types2);
}, "default");
function withAlg(alg, actual, ...types2) {
  return message(`Key for the ${alg} algorithm must be `, actual, ...types2);
}
__name(withAlg, "withAlg");

// worker/node_modules/jose/dist/browser/runtime/is_key_like.js
var is_key_like_default = /* @__PURE__ */ __name((key) => {
  if (isCryptoKey(key)) {
    return true;
  }
  return key?.[Symbol.toStringTag] === "KeyObject";
}, "default");
var types = ["CryptoKey"];

// worker/node_modules/jose/dist/browser/lib/is_disjoint.js
var isDisjoint = /* @__PURE__ */ __name((...headers) => {
  const sources = headers.filter(Boolean);
  if (sources.length === 0 || sources.length === 1) {
    return true;
  }
  let acc;
  for (const header of sources) {
    const parameters = Object.keys(header);
    if (!acc || acc.size === 0) {
      acc = new Set(parameters);
      continue;
    }
    for (const parameter of parameters) {
      if (acc.has(parameter)) {
        return false;
      }
      acc.add(parameter);
    }
  }
  return true;
}, "isDisjoint");
var is_disjoint_default = isDisjoint;

// worker/node_modules/jose/dist/browser/lib/is_object.js
function isObjectLike(value) {
  return typeof value === "object" && value !== null;
}
__name(isObjectLike, "isObjectLike");
function isObject(input) {
  if (!isObjectLike(input) || Object.prototype.toString.call(input) !== "[object Object]") {
    return false;
  }
  if (Object.getPrototypeOf(input) === null) {
    return true;
  }
  let proto = input;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(input) === proto;
}
__name(isObject, "isObject");

// worker/node_modules/jose/dist/browser/runtime/check_key_length.js
var check_key_length_default = /* @__PURE__ */ __name((alg, key) => {
  if (alg.startsWith("RS") || alg.startsWith("PS")) {
    const { modulusLength } = key.algorithm;
    if (typeof modulusLength !== "number" || modulusLength < 2048) {
      throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
    }
  }
}, "default");

// worker/node_modules/jose/dist/browser/lib/is_jwk.js
function isJWK(key) {
  return isObject(key) && typeof key.kty === "string";
}
__name(isJWK, "isJWK");
function isPrivateJWK(key) {
  return key.kty !== "oct" && typeof key.d === "string";
}
__name(isPrivateJWK, "isPrivateJWK");
function isPublicJWK(key) {
  return key.kty !== "oct" && typeof key.d === "undefined";
}
__name(isPublicJWK, "isPublicJWK");
function isSecretJWK(key) {
  return isJWK(key) && key.kty === "oct" && typeof key.k === "string";
}
__name(isSecretJWK, "isSecretJWK");

// worker/node_modules/jose/dist/browser/runtime/jwk_to_key.js
function subtleMapping(jwk) {
  let algorithm;
  let keyUsages;
  switch (jwk.kty) {
    case "RSA": {
      switch (jwk.alg) {
        case "PS256":
        case "PS384":
        case "PS512":
          algorithm = { name: "RSA-PSS", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RS256":
        case "RS384":
        case "RS512":
          algorithm = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RSA-OAEP":
        case "RSA-OAEP-256":
        case "RSA-OAEP-384":
        case "RSA-OAEP-512":
          algorithm = {
            name: "RSA-OAEP",
            hash: `SHA-${parseInt(jwk.alg.slice(-3), 10) || 1}`
          };
          keyUsages = jwk.d ? ["decrypt", "unwrapKey"] : ["encrypt", "wrapKey"];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "EC": {
      switch (jwk.alg) {
        case "ES256":
          algorithm = { name: "ECDSA", namedCurve: "P-256" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ES384":
          algorithm = { name: "ECDSA", namedCurve: "P-384" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ES512":
          algorithm = { name: "ECDSA", namedCurve: "P-521" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: "ECDH", namedCurve: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "OKP": {
      switch (jwk.alg) {
        case "Ed25519":
          algorithm = { name: "Ed25519" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "EdDSA":
          algorithm = { name: jwk.crv };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    default:
      throw new JOSENotSupported('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
  }
  return { algorithm, keyUsages };
}
__name(subtleMapping, "subtleMapping");
var parse = /* @__PURE__ */ __name(async (jwk) => {
  if (!jwk.alg) {
    throw new TypeError('"alg" argument is required when "jwk.alg" is not present');
  }
  const { algorithm, keyUsages } = subtleMapping(jwk);
  const rest = [
    algorithm,
    jwk.ext ?? false,
    jwk.key_ops ?? keyUsages
  ];
  const keyData = { ...jwk };
  delete keyData.alg;
  delete keyData.use;
  return webcrypto_default.subtle.importKey("jwk", keyData, ...rest);
}, "parse");
var jwk_to_key_default = parse;

// worker/node_modules/jose/dist/browser/runtime/normalize_key.js
var exportKeyValue = /* @__PURE__ */ __name((k) => decode(k), "exportKeyValue");
var privCache;
var pubCache;
var isKeyObject = /* @__PURE__ */ __name((key) => {
  return key?.[Symbol.toStringTag] === "KeyObject";
}, "isKeyObject");
var importAndCache = /* @__PURE__ */ __name(async (cache, key, jwk, alg, freeze = false) => {
  let cached = cache.get(key);
  if (cached?.[alg]) {
    return cached[alg];
  }
  const cryptoKey = await jwk_to_key_default({ ...jwk, alg });
  if (freeze)
    Object.freeze(key);
  if (!cached) {
    cache.set(key, { [alg]: cryptoKey });
  } else {
    cached[alg] = cryptoKey;
  }
  return cryptoKey;
}, "importAndCache");
var normalizePublicKey = /* @__PURE__ */ __name((key, alg) => {
  if (isKeyObject(key)) {
    let jwk = key.export({ format: "jwk" });
    delete jwk.d;
    delete jwk.dp;
    delete jwk.dq;
    delete jwk.p;
    delete jwk.q;
    delete jwk.qi;
    if (jwk.k) {
      return exportKeyValue(jwk.k);
    }
    pubCache || (pubCache = /* @__PURE__ */ new WeakMap());
    return importAndCache(pubCache, key, jwk, alg);
  }
  if (isJWK(key)) {
    if (key.k)
      return decode(key.k);
    pubCache || (pubCache = /* @__PURE__ */ new WeakMap());
    const cryptoKey = importAndCache(pubCache, key, key, alg, true);
    return cryptoKey;
  }
  return key;
}, "normalizePublicKey");
var normalizePrivateKey = /* @__PURE__ */ __name((key, alg) => {
  if (isKeyObject(key)) {
    let jwk = key.export({ format: "jwk" });
    if (jwk.k) {
      return exportKeyValue(jwk.k);
    }
    privCache || (privCache = /* @__PURE__ */ new WeakMap());
    return importAndCache(privCache, key, jwk, alg);
  }
  if (isJWK(key)) {
    if (key.k)
      return decode(key.k);
    privCache || (privCache = /* @__PURE__ */ new WeakMap());
    const cryptoKey = importAndCache(privCache, key, key, alg, true);
    return cryptoKey;
  }
  return key;
}, "normalizePrivateKey");
var normalize_key_default = { normalizePublicKey, normalizePrivateKey };

// worker/node_modules/jose/dist/browser/key/import.js
async function importJWK(jwk, alg) {
  if (!isObject(jwk)) {
    throw new TypeError("JWK must be an object");
  }
  alg || (alg = jwk.alg);
  switch (jwk.kty) {
    case "oct":
      if (typeof jwk.k !== "string" || !jwk.k) {
        throw new TypeError('missing "k" (Key Value) Parameter value');
      }
      return decode(jwk.k);
    case "RSA":
      if ("oth" in jwk && jwk.oth !== void 0) {
        throw new JOSENotSupported('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
      }
    case "EC":
    case "OKP":
      return jwk_to_key_default({ ...jwk, alg });
    default:
      throw new JOSENotSupported('Unsupported "kty" (Key Type) Parameter value');
  }
}
__name(importJWK, "importJWK");

// worker/node_modules/jose/dist/browser/lib/check_key_type.js
var tag = /* @__PURE__ */ __name((key) => key?.[Symbol.toStringTag], "tag");
var jwkMatchesOp = /* @__PURE__ */ __name((alg, key, usage) => {
  if (key.use !== void 0 && key.use !== "sig") {
    throw new TypeError("Invalid key for this operation, when present its use must be sig");
  }
  if (key.key_ops !== void 0 && key.key_ops.includes?.(usage) !== true) {
    throw new TypeError(`Invalid key for this operation, when present its key_ops must include ${usage}`);
  }
  if (key.alg !== void 0 && key.alg !== alg) {
    throw new TypeError(`Invalid key for this operation, when present its alg must be ${alg}`);
  }
  return true;
}, "jwkMatchesOp");
var symmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage, allowJwk) => {
  if (key instanceof Uint8Array)
    return;
  if (allowJwk && isJWK(key)) {
    if (isSecretJWK(key) && jwkMatchesOp(alg, key, usage))
      return;
    throw new TypeError(`JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present`);
  }
  if (!is_key_like_default(key)) {
    throw new TypeError(withAlg(alg, key, ...types, "Uint8Array", allowJwk ? "JSON Web Key" : null));
  }
  if (key.type !== "secret") {
    throw new TypeError(`${tag(key)} instances for symmetric algorithms must be of type "secret"`);
  }
}, "symmetricTypeCheck");
var asymmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage, allowJwk) => {
  if (allowJwk && isJWK(key)) {
    switch (usage) {
      case "sign":
        if (isPrivateJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation be a private JWK`);
      case "verify":
        if (isPublicJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation be a public JWK`);
    }
  }
  if (!is_key_like_default(key)) {
    throw new TypeError(withAlg(alg, key, ...types, allowJwk ? "JSON Web Key" : null));
  }
  if (key.type === "secret") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithms must not be of type "secret"`);
  }
  if (usage === "sign" && key.type === "public") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm signing must be of type "private"`);
  }
  if (usage === "decrypt" && key.type === "public") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm decryption must be of type "private"`);
  }
  if (key.algorithm && usage === "verify" && key.type === "private") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm verifying must be of type "public"`);
  }
  if (key.algorithm && usage === "encrypt" && key.type === "private") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm encryption must be of type "public"`);
  }
}, "asymmetricTypeCheck");
function checkKeyType(allowJwk, alg, key, usage) {
  const symmetric = alg.startsWith("HS") || alg === "dir" || alg.startsWith("PBES2") || /^A\d{3}(?:GCM)?KW$/.test(alg);
  if (symmetric) {
    symmetricTypeCheck(alg, key, usage, allowJwk);
  } else {
    asymmetricTypeCheck(alg, key, usage, allowJwk);
  }
}
__name(checkKeyType, "checkKeyType");
var check_key_type_default = checkKeyType.bind(void 0, false);
var checkKeyTypeWithJwk = checkKeyType.bind(void 0, true);

// worker/node_modules/jose/dist/browser/lib/validate_crit.js
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0) {
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  }
  if (!protectedHeader || protectedHeader.crit === void 0) {
    return /* @__PURE__ */ new Set();
  }
  if (!Array.isArray(protectedHeader.crit) || protectedHeader.crit.length === 0 || protectedHeader.crit.some((input) => typeof input !== "string" || input.length === 0)) {
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  }
  let recognized;
  if (recognizedOption !== void 0) {
    recognized = new Map([...Object.entries(recognizedOption), ...recognizedDefault.entries()]);
  } else {
    recognized = recognizedDefault;
  }
  for (const parameter of protectedHeader.crit) {
    if (!recognized.has(parameter)) {
      throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
    }
    if (joseHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    }
    if (recognized.get(parameter) && protectedHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
    }
  }
  return new Set(protectedHeader.crit);
}
__name(validateCrit, "validateCrit");
var validate_crit_default = validateCrit;

// worker/node_modules/jose/dist/browser/lib/validate_algorithms.js
var validateAlgorithms = /* @__PURE__ */ __name((option, algorithms) => {
  if (algorithms !== void 0 && (!Array.isArray(algorithms) || algorithms.some((s) => typeof s !== "string"))) {
    throw new TypeError(`"${option}" option must be an array of strings`);
  }
  if (!algorithms) {
    return void 0;
  }
  return new Set(algorithms);
}, "validateAlgorithms");
var validate_algorithms_default = validateAlgorithms;

// worker/node_modules/jose/dist/browser/runtime/subtle_dsa.js
function subtleDsa(alg, algorithm) {
  const hash = `SHA-${alg.slice(-3)}`;
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512":
      return { hash, name: "HMAC" };
    case "PS256":
    case "PS384":
    case "PS512":
      return { hash, name: "RSA-PSS", saltLength: alg.slice(-3) >> 3 };
    case "RS256":
    case "RS384":
    case "RS512":
      return { hash, name: "RSASSA-PKCS1-v1_5" };
    case "ES256":
    case "ES384":
    case "ES512":
      return { hash, name: "ECDSA", namedCurve: algorithm.namedCurve };
    case "Ed25519":
      return { name: "Ed25519" };
    case "EdDSA":
      return { name: algorithm.name };
    default:
      throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
}
__name(subtleDsa, "subtleDsa");

// worker/node_modules/jose/dist/browser/runtime/get_sign_verify_key.js
async function getCryptoKey(alg, key, usage) {
  if (usage === "sign") {
    key = await normalize_key_default.normalizePrivateKey(key, alg);
  }
  if (usage === "verify") {
    key = await normalize_key_default.normalizePublicKey(key, alg);
  }
  if (isCryptoKey(key)) {
    checkSigCryptoKey(key, alg, usage);
    return key;
  }
  if (key instanceof Uint8Array) {
    if (!alg.startsWith("HS")) {
      throw new TypeError(invalid_key_input_default(key, ...types));
    }
    return webcrypto_default.subtle.importKey("raw", key, { hash: `SHA-${alg.slice(-3)}`, name: "HMAC" }, false, [usage]);
  }
  throw new TypeError(invalid_key_input_default(key, ...types, "Uint8Array", "JSON Web Key"));
}
__name(getCryptoKey, "getCryptoKey");

// worker/node_modules/jose/dist/browser/runtime/verify.js
var verify = /* @__PURE__ */ __name(async (alg, key, signature, data) => {
  const cryptoKey = await getCryptoKey(alg, key, "verify");
  check_key_length_default(alg, cryptoKey);
  const algorithm = subtleDsa(alg, cryptoKey.algorithm);
  try {
    return await webcrypto_default.subtle.verify(algorithm, cryptoKey, signature, data);
  } catch {
    return false;
  }
}, "verify");
var verify_default = verify;

// worker/node_modules/jose/dist/browser/jws/flattened/verify.js
async function flattenedVerify(jws, key, options) {
  if (!isObject(jws)) {
    throw new JWSInvalid("Flattened JWS must be an object");
  }
  if (jws.protected === void 0 && jws.header === void 0) {
    throw new JWSInvalid('Flattened JWS must have either of the "protected" or "header" members');
  }
  if (jws.protected !== void 0 && typeof jws.protected !== "string") {
    throw new JWSInvalid("JWS Protected Header incorrect type");
  }
  if (jws.payload === void 0) {
    throw new JWSInvalid("JWS Payload missing");
  }
  if (typeof jws.signature !== "string") {
    throw new JWSInvalid("JWS Signature missing or incorrect type");
  }
  if (jws.header !== void 0 && !isObject(jws.header)) {
    throw new JWSInvalid("JWS Unprotected Header incorrect type");
  }
  let parsedProt = {};
  if (jws.protected) {
    try {
      const protectedHeader = decode(jws.protected);
      parsedProt = JSON.parse(decoder.decode(protectedHeader));
    } catch {
      throw new JWSInvalid("JWS Protected Header is invalid");
    }
  }
  if (!is_disjoint_default(parsedProt, jws.header)) {
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  }
  const joseHeader = {
    ...parsedProt,
    ...jws.header
  };
  const extensions = validate_crit_default(JWSInvalid, /* @__PURE__ */ new Map([["b64", true]]), options?.crit, parsedProt, joseHeader);
  let b64 = true;
  if (extensions.has("b64")) {
    b64 = parsedProt.b64;
    if (typeof b64 !== "boolean") {
      throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    }
  }
  const { alg } = joseHeader;
  if (typeof alg !== "string" || !alg) {
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  }
  const algorithms = options && validate_algorithms_default("algorithms", options.algorithms);
  if (algorithms && !algorithms.has(alg)) {
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  }
  if (b64) {
    if (typeof jws.payload !== "string") {
      throw new JWSInvalid("JWS Payload must be a string");
    }
  } else if (typeof jws.payload !== "string" && !(jws.payload instanceof Uint8Array)) {
    throw new JWSInvalid("JWS Payload must be a string or an Uint8Array instance");
  }
  let resolvedKey = false;
  if (typeof key === "function") {
    key = await key(parsedProt, jws);
    resolvedKey = true;
    checkKeyTypeWithJwk(alg, key, "verify");
    if (isJWK(key)) {
      key = await importJWK(key, alg);
    }
  } else {
    checkKeyTypeWithJwk(alg, key, "verify");
  }
  const data = concat(encoder.encode(jws.protected ?? ""), encoder.encode("."), typeof jws.payload === "string" ? encoder.encode(jws.payload) : jws.payload);
  let signature;
  try {
    signature = decode(jws.signature);
  } catch {
    throw new JWSInvalid("Failed to base64url decode the signature");
  }
  const verified = await verify_default(alg, key, signature, data);
  if (!verified) {
    throw new JWSSignatureVerificationFailed();
  }
  let payload;
  if (b64) {
    try {
      payload = decode(jws.payload);
    } catch {
      throw new JWSInvalid("Failed to base64url decode the payload");
    }
  } else if (typeof jws.payload === "string") {
    payload = encoder.encode(jws.payload);
  } else {
    payload = jws.payload;
  }
  const result = { payload };
  if (jws.protected !== void 0) {
    result.protectedHeader = parsedProt;
  }
  if (jws.header !== void 0) {
    result.unprotectedHeader = jws.header;
  }
  if (resolvedKey) {
    return { ...result, key };
  }
  return result;
}
__name(flattenedVerify, "flattenedVerify");

// worker/node_modules/jose/dist/browser/jws/compact/verify.js
async function compactVerify(jws, key, options) {
  if (jws instanceof Uint8Array) {
    jws = decoder.decode(jws);
  }
  if (typeof jws !== "string") {
    throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  }
  const { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3) {
    throw new JWSInvalid("Invalid Compact JWS");
  }
  const verified = await flattenedVerify({ payload, protected: protectedHeader, signature }, key, options);
  const result = { payload: verified.payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(compactVerify, "compactVerify");

// worker/node_modules/jose/dist/browser/lib/epoch.js
var epoch_default = /* @__PURE__ */ __name((date) => Math.floor(date.getTime() / 1e3), "default");

// worker/node_modules/jose/dist/browser/lib/secs.js
var minute = 60;
var hour = minute * 60;
var day = hour * 24;
var week = day * 7;
var year = day * 365.25;
var REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
var secs_default = /* @__PURE__ */ __name((str) => {
  const matched = REGEX.exec(str);
  if (!matched || matched[4] && matched[1]) {
    throw new TypeError("Invalid time period format");
  }
  const value = parseFloat(matched[2]);
  const unit = matched[3].toLowerCase();
  let numericDate;
  switch (unit) {
    case "sec":
    case "secs":
    case "second":
    case "seconds":
    case "s":
      numericDate = Math.round(value);
      break;
    case "minute":
    case "minutes":
    case "min":
    case "mins":
    case "m":
      numericDate = Math.round(value * minute);
      break;
    case "hour":
    case "hours":
    case "hr":
    case "hrs":
    case "h":
      numericDate = Math.round(value * hour);
      break;
    case "day":
    case "days":
    case "d":
      numericDate = Math.round(value * day);
      break;
    case "week":
    case "weeks":
    case "w":
      numericDate = Math.round(value * week);
      break;
    default:
      numericDate = Math.round(value * year);
      break;
  }
  if (matched[1] === "-" || matched[4] === "ago") {
    return -numericDate;
  }
  return numericDate;
}, "default");

// worker/node_modules/jose/dist/browser/lib/jwt_claims_set.js
var normalizeTyp = /* @__PURE__ */ __name((value) => value.toLowerCase().replace(/^application\//, ""), "normalizeTyp");
var checkAudiencePresence = /* @__PURE__ */ __name((audPayload, audOption) => {
  if (typeof audPayload === "string") {
    return audOption.includes(audPayload);
  }
  if (Array.isArray(audPayload)) {
    return audOption.some(Set.prototype.has.bind(new Set(audPayload)));
  }
  return false;
}, "checkAudiencePresence");
var jwt_claims_set_default = /* @__PURE__ */ __name((protectedHeader, encodedPayload, options = {}) => {
  let payload;
  try {
    payload = JSON.parse(decoder.decode(encodedPayload));
  } catch {
  }
  if (!isObject(payload)) {
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  }
  const { typ } = options;
  if (typ && (typeof protectedHeader.typ !== "string" || normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ))) {
    throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', payload, "typ", "check_failed");
  }
  const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options;
  const presenceCheck = [...requiredClaims];
  if (maxTokenAge !== void 0)
    presenceCheck.push("iat");
  if (audience !== void 0)
    presenceCheck.push("aud");
  if (subject !== void 0)
    presenceCheck.push("sub");
  if (issuer !== void 0)
    presenceCheck.push("iss");
  for (const claim of new Set(presenceCheck.reverse())) {
    if (!(claim in payload)) {
      throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, payload, claim, "missing");
    }
  }
  if (issuer && !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss)) {
    throw new JWTClaimValidationFailed('unexpected "iss" claim value', payload, "iss", "check_failed");
  }
  if (subject && payload.sub !== subject) {
    throw new JWTClaimValidationFailed('unexpected "sub" claim value', payload, "sub", "check_failed");
  }
  if (audience && !checkAudiencePresence(payload.aud, typeof audience === "string" ? [audience] : audience)) {
    throw new JWTClaimValidationFailed('unexpected "aud" claim value', payload, "aud", "check_failed");
  }
  let tolerance;
  switch (typeof options.clockTolerance) {
    case "string":
      tolerance = secs_default(options.clockTolerance);
      break;
    case "number":
      tolerance = options.clockTolerance;
      break;
    case "undefined":
      tolerance = 0;
      break;
    default:
      throw new TypeError("Invalid clockTolerance option type");
  }
  const { currentDate } = options;
  const now = epoch_default(currentDate || /* @__PURE__ */ new Date());
  if ((payload.iat !== void 0 || maxTokenAge) && typeof payload.iat !== "number") {
    throw new JWTClaimValidationFailed('"iat" claim must be a number', payload, "iat", "invalid");
  }
  if (payload.nbf !== void 0) {
    if (typeof payload.nbf !== "number") {
      throw new JWTClaimValidationFailed('"nbf" claim must be a number', payload, "nbf", "invalid");
    }
    if (payload.nbf > now + tolerance) {
      throw new JWTClaimValidationFailed('"nbf" claim timestamp check failed', payload, "nbf", "check_failed");
    }
  }
  if (payload.exp !== void 0) {
    if (typeof payload.exp !== "number") {
      throw new JWTClaimValidationFailed('"exp" claim must be a number', payload, "exp", "invalid");
    }
    if (payload.exp <= now - tolerance) {
      throw new JWTExpired('"exp" claim timestamp check failed', payload, "exp", "check_failed");
    }
  }
  if (maxTokenAge) {
    const age = now - payload.iat;
    const max = typeof maxTokenAge === "number" ? maxTokenAge : secs_default(maxTokenAge);
    if (age - tolerance > max) {
      throw new JWTExpired('"iat" claim timestamp check failed (too far in the past)', payload, "iat", "check_failed");
    }
    if (age < 0 - tolerance) {
      throw new JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', payload, "iat", "check_failed");
    }
  }
  return payload;
}, "default");

// worker/node_modules/jose/dist/browser/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const verified = await compactVerify(jwt, key, options);
  if (verified.protectedHeader.crit?.includes("b64") && verified.protectedHeader.b64 === false) {
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  }
  const payload = jwt_claims_set_default(verified.protectedHeader, verified.payload, options);
  const result = { payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(jwtVerify, "jwtVerify");

// worker/node_modules/jose/dist/browser/runtime/sign.js
var sign = /* @__PURE__ */ __name(async (alg, key, data) => {
  const cryptoKey = await getCryptoKey(alg, key, "sign");
  check_key_length_default(alg, cryptoKey);
  const signature = await webcrypto_default.subtle.sign(subtleDsa(alg, cryptoKey.algorithm), cryptoKey, data);
  return new Uint8Array(signature);
}, "sign");
var sign_default = sign;

// worker/node_modules/jose/dist/browser/jws/flattened/sign.js
var FlattenedSign = class {
  static {
    __name(this, "FlattenedSign");
  }
  constructor(payload) {
    if (!(payload instanceof Uint8Array)) {
      throw new TypeError("payload must be an instance of Uint8Array");
    }
    this._payload = payload;
  }
  setProtectedHeader(protectedHeader) {
    if (this._protectedHeader) {
      throw new TypeError("setProtectedHeader can only be called once");
    }
    this._protectedHeader = protectedHeader;
    return this;
  }
  setUnprotectedHeader(unprotectedHeader) {
    if (this._unprotectedHeader) {
      throw new TypeError("setUnprotectedHeader can only be called once");
    }
    this._unprotectedHeader = unprotectedHeader;
    return this;
  }
  async sign(key, options) {
    if (!this._protectedHeader && !this._unprotectedHeader) {
      throw new JWSInvalid("either setProtectedHeader or setUnprotectedHeader must be called before #sign()");
    }
    if (!is_disjoint_default(this._protectedHeader, this._unprotectedHeader)) {
      throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
    }
    const joseHeader = {
      ...this._protectedHeader,
      ...this._unprotectedHeader
    };
    const extensions = validate_crit_default(JWSInvalid, /* @__PURE__ */ new Map([["b64", true]]), options?.crit, this._protectedHeader, joseHeader);
    let b64 = true;
    if (extensions.has("b64")) {
      b64 = this._protectedHeader.b64;
      if (typeof b64 !== "boolean") {
        throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
      }
    }
    const { alg } = joseHeader;
    if (typeof alg !== "string" || !alg) {
      throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
    }
    checkKeyTypeWithJwk(alg, key, "sign");
    let payload = this._payload;
    if (b64) {
      payload = encoder.encode(encode(payload));
    }
    let protectedHeader;
    if (this._protectedHeader) {
      protectedHeader = encoder.encode(encode(JSON.stringify(this._protectedHeader)));
    } else {
      protectedHeader = encoder.encode("");
    }
    const data = concat(protectedHeader, encoder.encode("."), payload);
    const signature = await sign_default(alg, key, data);
    const jws = {
      signature: encode(signature),
      payload: ""
    };
    if (b64) {
      jws.payload = decoder.decode(payload);
    }
    if (this._unprotectedHeader) {
      jws.header = this._unprotectedHeader;
    }
    if (this._protectedHeader) {
      jws.protected = decoder.decode(protectedHeader);
    }
    return jws;
  }
};

// worker/node_modules/jose/dist/browser/jws/compact/sign.js
var CompactSign = class {
  static {
    __name(this, "CompactSign");
  }
  constructor(payload) {
    this._flattened = new FlattenedSign(payload);
  }
  setProtectedHeader(protectedHeader) {
    this._flattened.setProtectedHeader(protectedHeader);
    return this;
  }
  async sign(key, options) {
    const jws = await this._flattened.sign(key, options);
    if (jws.payload === void 0) {
      throw new TypeError("use the flattened module for creating JWS with b64: false");
    }
    return `${jws.protected}.${jws.payload}.${jws.signature}`;
  }
};

// worker/node_modules/jose/dist/browser/jwt/produce.js
function validateInput(label, input) {
  if (!Number.isFinite(input)) {
    throw new TypeError(`Invalid ${label} input`);
  }
  return input;
}
__name(validateInput, "validateInput");
var ProduceJWT = class {
  static {
    __name(this, "ProduceJWT");
  }
  constructor(payload = {}) {
    if (!isObject(payload)) {
      throw new TypeError("JWT Claims Set MUST be an object");
    }
    this._payload = payload;
  }
  setIssuer(issuer) {
    this._payload = { ...this._payload, iss: issuer };
    return this;
  }
  setSubject(subject) {
    this._payload = { ...this._payload, sub: subject };
    return this;
  }
  setAudience(audience) {
    this._payload = { ...this._payload, aud: audience };
    return this;
  }
  setJti(jwtId) {
    this._payload = { ...this._payload, jti: jwtId };
    return this;
  }
  setNotBefore(input) {
    if (typeof input === "number") {
      this._payload = { ...this._payload, nbf: validateInput("setNotBefore", input) };
    } else if (input instanceof Date) {
      this._payload = { ...this._payload, nbf: validateInput("setNotBefore", epoch_default(input)) };
    } else {
      this._payload = { ...this._payload, nbf: epoch_default(/* @__PURE__ */ new Date()) + secs_default(input) };
    }
    return this;
  }
  setExpirationTime(input) {
    if (typeof input === "number") {
      this._payload = { ...this._payload, exp: validateInput("setExpirationTime", input) };
    } else if (input instanceof Date) {
      this._payload = { ...this._payload, exp: validateInput("setExpirationTime", epoch_default(input)) };
    } else {
      this._payload = { ...this._payload, exp: epoch_default(/* @__PURE__ */ new Date()) + secs_default(input) };
    }
    return this;
  }
  setIssuedAt(input) {
    if (typeof input === "undefined") {
      this._payload = { ...this._payload, iat: epoch_default(/* @__PURE__ */ new Date()) };
    } else if (input instanceof Date) {
      this._payload = { ...this._payload, iat: validateInput("setIssuedAt", epoch_default(input)) };
    } else if (typeof input === "string") {
      this._payload = {
        ...this._payload,
        iat: validateInput("setIssuedAt", epoch_default(/* @__PURE__ */ new Date()) + secs_default(input))
      };
    } else {
      this._payload = { ...this._payload, iat: validateInput("setIssuedAt", input) };
    }
    return this;
  }
};

// worker/node_modules/jose/dist/browser/jwt/sign.js
var SignJWT = class extends ProduceJWT {
  static {
    __name(this, "SignJWT");
  }
  setProtectedHeader(protectedHeader) {
    this._protectedHeader = protectedHeader;
    return this;
  }
  async sign(key, options) {
    const sig = new CompactSign(encoder.encode(JSON.stringify(this._payload)));
    sig.setProtectedHeader(this._protectedHeader);
    if (Array.isArray(this._protectedHeader?.crit) && this._protectedHeader.crit.includes("b64") && this._protectedHeader.b64 === false) {
      throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
    }
    return sig.sign(key, options);
  }
};

// worker/src/auth.js
var TOKEN_EXPIRY = "24h";
async function createToken(secret) {
  const encoder2 = new TextEncoder();
  const key = encoder2.encode(secret);
  const token = await new SignJWT({ admin: true, role: "admin" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(TOKEN_EXPIRY).sign(key);
  return token;
}
__name(createToken, "createToken");
async function verifyToken(token, secret) {
  try {
    const encoder2 = new TextEncoder();
    const key = encoder2.encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch (err) {
    return null;
  }
}
__name(verifyToken, "verifyToken");
function requireAdmin(env) {
  return async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Missing or invalid Authorization header" }, 401);
    }
    const token = authHeader.slice(7);
    const jwtSecret = env.JWT_SECRET || env.ADMIN_PASSWORD;
    if (!jwtSecret) {
      return c.json({ error: "Server misconfigured: no secret set" }, 500);
    }
    const payload = await verifyToken(token, jwtSecret);
    if (!payload || !payload.admin) {
      return c.json({ error: "Invalid or expired token" }, 401);
    }
    return next();
  };
}
__name(requireAdmin, "requireAdmin");

// worker/src/db.js
async function query(db, sql, ...bindings) {
  let stmt = db.prepare(sql);
  if (bindings && bindings.length > 0) {
    stmt = stmt.bind(...bindings);
  }
  const result = await stmt.all();
  return result.results || [];
}
__name(query, "query");
async function queryOne(db, sql, ...bindings) {
  let stmt = db.prepare(sql);
  if (bindings && bindings.length > 0) {
    stmt = stmt.bind(...bindings);
  }
  const result = await stmt.first();
  return result || null;
}
__name(queryOne, "queryOne");
async function execute(db, sql, ...bindings) {
  let stmt = db.prepare(sql);
  if (bindings && bindings.length > 0) {
    stmt = stmt.bind(...bindings);
  }
  const result = await stmt.run();
  return result;
}
__name(execute, "execute");

// worker/src/routes/auth.js
var authRoutes = new Hono2();
authRoutes.post("/login", async (c) => {
  const { password } = await c.req.json();
  const adminPassword = c.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return c.json({ error: "Server misconfigured: ADMIN_PASSWORD not set" }, 500);
  }
  if (password !== adminPassword) {
    return c.json({ error: "Invalid password" }, 401);
  }
  const jwtSecret = c.env.JWT_SECRET || c.env.ADMIN_PASSWORD;
  const token = await createToken(jwtSecret);
  return c.json({ token, message: "Login successful" });
});
var auth_default = authRoutes;

// worker/src/routes/events.js
var eventRoutes = new Hono2();
eventRoutes.post("/", async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const { slug, name, date, description } = body;
  if (!slug || !name || !date) {
    return c.json({ error: "slug, name, and date are required" }, 400);
  }
  const existing = await queryOne(db, "SELECT id FROM events WHERE id = ?", slug);
  if (existing) {
    return c.json({ error: "An event with this slug already exists" }, 409);
  }
  await execute(
    db,
    "INSERT INTO events (id, name, date, start_time, end_time, description, location, courts, format_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    slug,
    name,
    date,
    body.start_time || "",
    body.end_time || "",
    description || "",
    body.location || "",
    body.courts || "",
    "royal_rumble"
  );
  const event = await queryOne(db, "SELECT * FROM events WHERE id = ?", slug);
  return c.json(event, 201);
});
eventRoutes.put("/:slug", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  const existing = await queryOne(db, "SELECT * FROM events WHERE id = ?", slug);
  if (!existing) {
    return c.json({ error: "Event not found" }, 404);
  }
  const fields = [];
  const values = [];
  if (body.name !== void 0) {
    fields.push("name = ?");
    values.push(body.name);
  }
  if (body.date !== void 0) {
    fields.push("date = ?");
    values.push(body.date);
  }
  if (body.start_time !== void 0) {
    fields.push("start_time = ?");
    values.push(body.start_time);
  }
  if (body.end_time !== void 0) {
    fields.push("end_time = ?");
    values.push(body.end_time);
  }
  if (body.description !== void 0) {
    fields.push("description = ?");
    values.push(body.description);
  }
  if (body.location !== void 0) {
    fields.push("location = ?");
    values.push(body.location);
  }
  if (body.courts !== void 0) {
    fields.push("courts = ?");
    values.push(body.courts);
  }
  if (fields.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }
  values.push(slug);
  await execute(db, `UPDATE events SET ${fields.join(", ")} WHERE id = ?`, ...values);
  const event = await queryOne(db, "SELECT * FROM events WHERE id = ?", slug);
  return c.json(event);
});
eventRoutes.post("/:slug/banner", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const existing = await queryOne(db, "SELECT * FROM events WHERE id = ?", slug);
  if (!existing) {
    return c.json({ error: "Event not found" }, 404);
  }
  const formData = await c.req.formData();
  const file = formData.get("image");
  if (!file) {
    return c.json({ error: "No image file provided" }, 400);
  }
  const ext = file.name.split(".").pop() || "png";
  const timestamp = Date.now();
  const key = `banners/${slug}-${timestamp}.${ext}`;
  const bucket = c.env.BUCKET;
  await bucket.put(key, file.stream(), {
    httpMetadata: { contentType: file.type }
  });
  const filename = `${slug}-${timestamp}.${ext}`;
  const bannerUrl = `/api/banners/${filename}`;
  await execute(db, "UPDATE events SET banner_url = ? WHERE id = ?", bannerUrl, slug);
  return c.json({ banner_url: bannerUrl, key: filename });
});
eventRoutes.delete("/:slug", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const existing = await queryOne(db, "SELECT id FROM events WHERE id = ?", slug);
  if (!existing) {
    return c.json({ error: "Event not found" }, 404);
  }
  await execute(db, "DELETE FROM match_points WHERE match_id IN (SELECT id FROM matches WHERE stage_id IN (SELECT id FROM stages WHERE event_id = ?))", slug);
  await execute(db, "DELETE FROM matches WHERE stage_id IN (SELECT id FROM stages WHERE event_id = ?)", slug);
  await execute(db, "DELETE FROM stage_groups WHERE stage_id IN (SELECT id FROM stages WHERE event_id = ?)", slug);
  await execute(db, "DELETE FROM stages WHERE event_id = ?", slug);
  await execute(db, "DELETE FROM group_teams WHERE group_id IN (SELECT id FROM groups_t WHERE event_id = ?)", slug);
  await execute(db, "DELETE FROM groups_t WHERE event_id = ?", slug);
  await execute(db, "DELETE FROM participants WHERE event_id = ?", slug);
  await execute(db, "DELETE FROM events WHERE id = ?", slug);
  return c.json({ success: true, message: "Event deleted" });
});
eventRoutes.get("/:slug/share", async (c) => {
  const { slug } = c.req.param();
  const origin = c.req.header("Origin") || `https://pickle-live.pages.dev`;
  const url = `${origin}/event/${slug}`;
  return c.json({ url });
});
eventRoutes.post("/:slug/copy", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  const { new_slug, name, date } = body;
  if (!new_slug || !name || !date) {
    return c.json({ error: "new_slug, name, and date are required" }, 400);
  }
  const existingNew = await queryOne(db, "SELECT id FROM events WHERE id = ?", new_slug);
  if (existingNew) {
    return c.json({ error: "An event with this slug already exists" }, 409);
  }
  const source = await queryOne(db, "SELECT * FROM events WHERE id = ?", slug);
  if (!source) {
    return c.json({ error: "Source event not found" }, 404);
  }
  await execute(
    db,
    "INSERT INTO events (id, name, date, start_time, end_time, description, location, courts, format_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    new_slug,
    name,
    date,
    body.start_time || source.start_time || "",
    body.end_time || source.end_time || "",
    source.description || "",
    source.location || "",
    source.courts || "",
    source.format_type || ""
  );
  const participants = await query(db, "SELECT * FROM participants WHERE event_id = ?", slug);
  const pMap = {};
  for (const p of participants) {
    const r = await execute(
      db,
      "INSERT INTO participants (event_id, name, gender, paddle, handedness, email, nickname, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      new_slug,
      p.name,
      p.gender,
      p.paddle,
      p.handedness,
      p.email,
      p.nickname || "",
      p.avatar || ""
    );
    pMap[p.id] = r.meta.last_row_id;
  }
  const teams = await query(db, "SELECT * FROM teams WHERE event_id = ?", slug);
  const tMap = {};
  for (const t of teams) {
    const newP1 = pMap[t.player1_id];
    const newP2 = pMap[t.player2_id];
    if (!newP1 || !newP2) continue;
    const r = await execute(
      db,
      "INSERT INTO teams (event_id, name, player1_id, player2_id, emoji) VALUES (?, ?, ?, ?, ?)",
      new_slug,
      t.name,
      newP1,
      newP2,
      t.emoji || ""
    );
    tMap[t.id] = r.meta.last_row_id;
  }
  const groups = await query(db, "SELECT * FROM groups_t WHERE event_id = ?", slug);
  const gMap = {};
  for (const g of groups) {
    const r = await execute(
      db,
      "INSERT INTO groups_t (event_id, name, stage_type, round_number) VALUES (?, ?, ?, ?)",
      new_slug,
      g.name,
      g.stage_type,
      g.round_number
    );
    gMap[g.id] = r.meta.last_row_id;
  }
  for (const g of groups) {
    const gtRows = await query(db, "SELECT * FROM group_teams WHERE group_id = ?", g.id);
    for (const gt of gtRows) {
      const ng = gMap[gt.group_id];
      const nt = tMap[gt.team_id];
      if (ng && nt) {
        await execute(db, "INSERT INTO group_teams (group_id, team_id) VALUES (?, ?)", ng, nt);
      }
    }
  }
  const stages = await query(db, "SELECT * FROM stages WHERE event_id = ?", slug);
  const sMap = {};
  for (const s of stages) {
    const r = await execute(
      db,
      "INSERT INTO stages (event_id, name, scoring_type, points_to_win, deuce_allowed, order_index) VALUES (?, ?, ?, ?, ?, ?)",
      new_slug,
      s.name,
      s.scoring_type,
      s.points_to_win,
      s.deuce_allowed,
      s.order_index
    );
    sMap[s.id] = r.meta.last_row_id;
  }
  for (const s of stages) {
    const sgRows = await query(db, "SELECT * FROM stage_groups WHERE stage_id = ?", s.id);
    for (const sg of sgRows) {
      const ns = sMap[sg.stage_id];
      const ng = gMap[sg.group_id];
      if (ns && ng) {
        await execute(db, "INSERT INTO stage_groups (stage_id, group_id) VALUES (?, ?)", ns, ng);
      }
    }
  }
  const matches = await query(db, "SELECT * FROM matches WHERE stage_id IN (SELECT id FROM stages WHERE event_id = ?)", slug);
  for (const m of matches) {
    const ns = sMap[m.stage_id];
    const ng = gMap[m.group_id];
    const nt1 = m.team1_id ? tMap[m.team1_id] : null;
    const nt2 = m.team2_id ? tMap[m.team2_id] : null;
    if (ns && ng) {
      await execute(
        db,
        `INSERT INTO matches (stage_id, group_id, team1_id, team2_id,
         team1_score, team2_score, scheduled_time, court, status, winner_team_id, walkover,
         current_server_team, current_server_player_id, current_server_side,
         current_server_number, starting_team_done,
         team1_player1_name, team1_player2_name, team2_player1_name, team2_player2_name)
         VALUES (?, ?, ?, ?, 0, 0, ?, ?, 'scheduled', NULL, 0, NULL, NULL, '', 1, 0, '', '', '', '')`,
        ns,
        ng,
        nt1,
        nt2,
        m.scheduled_time || "",
        m.court || ""
      );
    }
  }
  const newEvent = await queryOne(db, "SELECT * FROM events WHERE id = ?", new_slug);
  return c.json({ event: newEvent }, 201);
});
var events_default = eventRoutes;

// worker/src/routes/participants.js
var participantRoutes = new Hono2();
participantRoutes.get("/:slug/participants", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const participants = await query(
    db,
    `SELECT * FROM participants WHERE event_id = ? AND event_id != '__global__' ORDER BY name ASC`,
    slug
  );
  return c.json(participants);
});
participantRoutes.post("/:slug/participants", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.name) {
    return c.json({ error: "name is required" }, 400);
  }
  const nickname = body.nickname || body.name;
  const result = await execute(
    db,
    "INSERT INTO participants (event_id, name, nickname, gender, paddle, handedness, email, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    slug,
    body.name,
    nickname,
    body.gender || "",
    body.paddle || "",
    body.handedness || "",
    body.email || "",
    body.avatar || ""
  );
  const globalExists = await queryOne(
    db,
    "SELECT id FROM participants WHERE event_id = ? AND name = ?",
    "__global__",
    body.name
  );
  if (!globalExists) {
    await execute(
      db,
      "INSERT INTO participants (event_id, name, nickname, gender, paddle, handedness, email, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      "__global__",
      body.name,
      nickname,
      body.gender || "",
      body.paddle || "",
      body.handedness || "",
      body.email || "",
      body.avatar || ""
    );
  }
  const participant = await queryOne(
    db,
    "SELECT * FROM participants WHERE id = ?",
    result.meta.last_row_id
  );
  return c.json(participant, 201);
});
participantRoutes.put("/:slug/participants/:id", async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  const existing = await queryOne(
    db,
    "SELECT * FROM participants WHERE id = ? AND event_id = ?",
    id,
    slug
  );
  if (!existing) {
    return c.json({ error: "Participant not found" }, 404);
  }
  const fields = [];
  const values = [];
  if (body.name !== void 0) {
    fields.push("name = ?");
    values.push(body.name);
  }
  if (body.nickname !== void 0) {
    fields.push("nickname = ?");
    values.push(body.nickname);
  }
  if (body.gender !== void 0) {
    fields.push("gender = ?");
    values.push(body.gender);
  }
  if (body.avatar !== void 0) {
    fields.push("avatar = ?");
    values.push(body.avatar);
  }
  if (body.paddle !== void 0) {
    fields.push("paddle = ?");
    values.push(body.paddle);
  }
  if (body.handedness !== void 0) {
    fields.push("handedness = ?");
    values.push(body.handedness);
  }
  if (body.email !== void 0) {
    fields.push("email = ?");
    values.push(body.email);
  }
  if (fields.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }
  values.push(id);
  await execute(db, `UPDATE participants SET ${fields.join(", ")} WHERE id = ?`, ...values);
  const participant = await queryOne(db, "SELECT * FROM participants WHERE id = ?", id);
  return c.json(participant);
});
participantRoutes.delete("/:slug/participants/:id", async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const teamsWithPlayer = await query(
    db,
    "SELECT id FROM teams WHERE (player1_id = ? OR player2_id = ?) AND event_id = ?",
    id,
    id,
    slug
  );
  for (const team of teamsWithPlayer) {
    await execute(db, "DELETE FROM group_teams WHERE team_id = ?", team.id);
    await execute(db, "DELETE FROM matches WHERE team1_id = ? OR team2_id = ?", team.id, team.id);
    await execute(db, "DELETE FROM teams WHERE id = ?", team.id);
  }
  await execute(db, "DELETE FROM participants WHERE id = ? AND event_id = ?", id, slug);
  return c.json({ success: true, removed_from_teams: teamsWithPlayer.length });
});
participantRoutes.post("/:slug/participants/batch", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.player_ids || !Array.isArray(body.player_ids) || body.player_ids.length === 0) {
    return c.json({ error: "player_ids array is required" }, 400);
  }
  const added = [];
  for (const pid of body.player_ids) {
    const globalPlayer = await queryOne(
      db,
      "SELECT * FROM participants WHERE id = ? AND event_id = ?",
      pid,
      "__global__"
    );
    if (!globalPlayer) continue;
    const alreadyInEvent = await queryOne(
      db,
      "SELECT id FROM participants WHERE event_id = ? AND name = ?",
      slug,
      globalPlayer.name
    );
    if (alreadyInEvent) continue;
    const result = await execute(
      db,
      `INSERT INTO participants (event_id, name, nickname, gender, paddle, handedness, email)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      slug,
      globalPlayer.name,
      globalPlayer.nickname,
      globalPlayer.gender || "",
      globalPlayer.paddle || "",
      globalPlayer.handedness || "",
      globalPlayer.email || ""
    );
    const p = await queryOne(db, "SELECT * FROM participants WHERE id = ?", result.meta.last_row_id);
    added.push(p);
  }
  return c.json(added, 201);
});
var participants_default = participantRoutes;

// worker/src/routes/teams.js
var teamRoutes = new Hono2();
var ANIMALS = [
  "\u{1F98A}",
  "\u{1F436}",
  "\u{1F431}",
  "\u{1F43C}",
  "\u{1F428}",
  "\u{1F981}",
  "\u{1F42F}",
  "\u{1F438}",
  "\u{1F435}",
  "\u{1F984}",
  "\u{1F419}",
  "\u{1F98B}",
  "\u{1F41D}",
  "\u{1F989}",
  "\u{1F422}",
  "\u{1F98E}",
  "\u{1F42C}",
  "\u{1F9AD}",
  "\u{1F9A9}",
  "\u{1F427}",
  "\u{1F986}",
  "\u{1F985}",
  "\u{1F43A}",
  "\u{1F99D}",
  "\u{1F42E}",
  "\u{1F437}",
  "\u{1F42D}",
  "\u{1F439}",
  "\u{1F430}",
  "\u{1F43B}",
  "\u{1F987}",
  "\u{1F433}",
  "\u{1F988}",
  "\u{1F40A}",
  "\u{1F98D}",
  "\u{1F992}",
  "\u{1F98F}",
  "\u{1F418}",
  "\u{1F99B}",
  "\u{1F42A}",
  "\u{1F411}",
  "\u{1F410}",
  "\u{1F98C}",
  "\u{1F415}",
  "\u{1F408}",
  "\u{1F99C}",
  "\u{1F43E}",
  "\u{1F43F}\uFE0F"
];
function getTeamEmoji(teamId) {
  if (!teamId) return "\u{1F98A}";
  let hash = 0;
  const str = String(teamId);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return ANIMALS[Math.abs(hash) % ANIMALS.length];
}
__name(getTeamEmoji, "getTeamEmoji");
teamRoutes.post("/:slug/teams", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.player1_id || !body.player2_id) {
    return c.json({ error: "player1_id and player2_id are required" }, 400);
  }
  if (body.player1_id === body.player2_id) {
    return c.json({ error: "A team must have two different players" }, 400);
  }
  const p1 = await queryOne(db, "SELECT id FROM participants WHERE id = ? AND event_id = ?", body.player1_id, slug);
  const p2 = await queryOne(db, "SELECT id FROM participants WHERE id = ? AND event_id = ?", body.player2_id, slug);
  if (!p1 || !p2) {
    return c.json({ error: "One or both participants not found" }, 404);
  }
  const existingTeam = await queryOne(
    db,
    "SELECT id FROM teams WHERE event_id = ? AND (player1_id = ? OR player2_id = ?)",
    slug,
    body.player1_id,
    body.player2_id
  );
  if (existingTeam && existingTeam.id !== (body.id || 0)) {
    return c.json({ error: "One or both players are already on a team in this event" }, 409);
  }
  const teamCount = await queryOne(
    db,
    "SELECT COUNT(*) as count FROM teams WHERE event_id = ?",
    slug
  );
  const teamNumber = (teamCount?.count || 0) + 1;
  const teamName = body.name || `Team ${teamNumber}`;
  const result = await execute(
    db,
    "INSERT INTO teams (event_id, name, player1_id, player2_id, emoji) VALUES (?, ?, ?, ?, ?)",
    slug,
    teamName,
    body.player1_id,
    body.player2_id,
    body.emoji || getTeamEmoji(teamNumber)
  );
  const team = await queryOne(db, "SELECT * FROM teams WHERE id = ?", result.meta.last_row_id);
  return c.json(team, 201);
});
teamRoutes.get("/:slug/teams", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const teams = await query(db, `
    SELECT t.*, 
      p1.name AS player1_name, p1.nickname AS player1_nickname, p1.gender AS player1_gender, p1.paddle AS player1_paddle, p1.handedness AS player1_handedness,
      p2.name AS player2_name, p2.nickname AS player2_nickname, p2.gender AS player2_gender, p2.paddle AS player2_paddle, p2.handedness AS player2_handedness
    FROM teams t
    LEFT JOIN participants p1 ON t.player1_id = p1.id
    LEFT JOIN participants p2 ON t.player2_id = p2.id
    WHERE t.event_id = ?
    ORDER BY t.name ASC
  `, slug);
  return c.json(teams);
});
teamRoutes.put("/:slug/teams/:id", async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  const existing = await queryOne(
    db,
    "SELECT * FROM teams WHERE id = ? AND event_id = ?",
    id,
    slug
  );
  if (!existing) {
    return c.json({ error: "Team not found" }, 404);
  }
  const fields = [];
  const values = [];
  if (body.name !== void 0) {
    fields.push("name = ?");
    values.push(body.name);
  }
  if (body.emoji !== void 0) {
    fields.push("emoji = ?");
    values.push(body.emoji);
  }
  if (body.player1_id !== void 0) {
    const p = await queryOne(db, "SELECT id FROM participants WHERE id = ? AND event_id = ?", body.player1_id, slug);
    if (!p) return c.json({ error: "Player 1 not found" }, 404);
    fields.push("player1_id = ?");
    values.push(body.player1_id);
  }
  if (body.player2_id !== void 0) {
    const p = await queryOne(db, "SELECT id FROM participants WHERE id = ? AND event_id = ?", body.player2_id, slug);
    if (!p) return c.json({ error: "Player 2 not found" }, 404);
    fields.push("player2_id = ?");
    values.push(body.player2_id);
  }
  if (fields.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }
  values.push(id);
  await execute(db, `UPDATE teams SET ${fields.join(", ")} WHERE id = ?`, ...values);
  const team = await queryOne(db, "SELECT * FROM teams WHERE id = ?", id);
  return c.json(team);
});
teamRoutes.delete("/:slug/teams/:id", async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  await execute(db, "DELETE FROM group_teams WHERE team_id = ?", id);
  await execute(db, "DELETE FROM teams WHERE id = ? AND event_id = ?", id, slug);
  return c.json({ success: true });
});
teamRoutes.delete("/:slug/teams", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  await execute(db, `
    DELETE FROM group_teams WHERE team_id IN (
      SELECT id FROM teams WHERE event_id = ?
    )
  `, slug);
  const result = await execute(db, "DELETE FROM teams WHERE event_id = ?", slug);
  return c.json({ success: true, deleted: result.meta?.changes || 0 });
});
teamRoutes.post("/:slug/teams/random-pair", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const participants = await query(db, "SELECT id FROM participants WHERE event_id = ?", slug);
  const teams = await query(db, "SELECT player1_id, player2_id FROM teams WHERE event_id = ?", slug);
  const pairedIds = new Set(teams.flatMap((t) => [t.player1_id, t.player2_id]));
  const unpaired = participants.filter((p) => !pairedIds.has(p.id));
  if (unpaired.length < 2) {
    return c.json({ error: "Need at least 2 unpaired participants to pair" }, 400);
  }
  for (let i = unpaired.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unpaired[i], unpaired[j]] = [unpaired[j], unpaired[i]];
  }
  const teamCount = await queryOne(
    db,
    "SELECT COUNT(*) as count FROM teams WHERE event_id = ?",
    slug
  );
  let teamNumber = teamCount?.count || 0;
  const created = [];
  for (let i = 0; i + 1 < unpaired.length; i += 2) {
    teamNumber++;
    const teamName = `Team ${teamNumber}`;
    const result = await execute(
      db,
      "INSERT INTO teams (event_id, name, player1_id, player2_id, emoji) VALUES (?, ?, ?, ?, ?)",
      slug,
      teamName,
      unpaired[i].id,
      unpaired[i + 1].id,
      getTeamEmoji(teamNumber)
    );
    const team = await queryOne(db, "SELECT * FROM teams WHERE id = ?", result.meta.last_row_id);
    created.push(team);
  }
  return c.json({ success: true, created, remaining: unpaired.length % 2 });
});
var teams_default = teamRoutes;

// worker/src/routes/groups.js
var groupRoutes = new Hono2();
groupRoutes.post("/:slug/groups", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.name) {
    return c.json({ error: "name is required" }, 400);
  }
  const result = await execute(
    db,
    "INSERT INTO groups_t (event_id, name, stage_type, round_number) VALUES (?, ?, ?, ?)",
    slug,
    body.name,
    body.stage_type || "round_robin",
    body.round_number || 1
  );
  const group = await queryOne(db, "SELECT * FROM groups_t WHERE id = ?", result.meta.last_row_id);
  return c.json(group, 201);
});
groupRoutes.get("/:slug/groups", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const groups = await query(
    db,
    "SELECT * FROM groups_t WHERE event_id = ? ORDER BY name ASC",
    slug
  );
  const result = [];
  for (const group of groups) {
    const teams = await query(db, `
      SELECT t.*, 
        p1.name AS player1_name, p2.name AS player2_name
      FROM teams t
      JOIN group_teams gt ON t.id = gt.team_id
      LEFT JOIN participants p1 ON t.player1_id = p1.id
      LEFT JOIN participants p2 ON t.player2_id = p2.id
      WHERE gt.group_id = ?
    `, group.id);
    result.push({ ...group, teams });
  }
  return c.json(result);
});
groupRoutes.post("/:slug/groups/:groupId/teams", async (c) => {
  const { slug, groupId } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.team_id) {
    return c.json({ error: "team_id is required" }, 400);
  }
  const group = await queryOne(db, "SELECT * FROM groups_t WHERE id = ? AND event_id = ?", groupId, slug);
  if (!group) {
    return c.json({ error: "Group not found" }, 404);
  }
  const team = await queryOne(db, "SELECT id FROM teams WHERE id = ? AND event_id = ?", body.team_id, slug);
  if (!team) {
    return c.json({ error: "Team not found in this event" }, 404);
  }
  const existing = await queryOne(db, "SELECT * FROM group_teams WHERE group_id = ? AND team_id = ?", groupId, body.team_id);
  if (existing) {
    return c.json({ error: "Team already in this group" }, 409);
  }
  await execute(db, "INSERT INTO group_teams (group_id, team_id) VALUES (?, ?)", groupId, body.team_id);
  return c.json({ success: true }, 201);
});
groupRoutes.delete("/:slug/groups/:groupId/teams/:teamId", async (c) => {
  const { slug, groupId, teamId } = c.req.param();
  const db = c.env.DB;
  await execute(db, "DELETE FROM matches WHERE group_id = ? AND (team1_id = ? OR team2_id = ?)", groupId, teamId, teamId);
  await execute(db, "DELETE FROM group_teams WHERE group_id = ? AND team_id = ?", groupId, teamId);
  return c.json({ success: true });
});
groupRoutes.delete("/:slug/groups/:id", async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  await execute(db, "DELETE FROM matches WHERE group_id = ?", id);
  await execute(db, "DELETE FROM stage_groups WHERE group_id = ?", id);
  await execute(db, "DELETE FROM group_teams WHERE group_id = ?", id);
  await execute(db, "DELETE FROM groups_t WHERE id = ? AND event_id = ?", id, slug);
  return c.json({ success: true });
});
var groups_default = groupRoutes;

// worker/src/routes/stages.js
var stageRoutes = new Hono2();
stageRoutes.post("/:slug/stages", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.name) {
    return c.json({ error: "name is required" }, 400);
  }
  let orderIndex = body.order_index;
  if (orderIndex === void 0 || orderIndex === null) {
    const maxOrder = await queryOne(
      db,
      "SELECT MAX(order_index) as max_idx FROM stages WHERE event_id = ?",
      slug
    );
    orderIndex = (maxOrder?.max_idx || 0) + 1;
  }
  const result = await execute(
    db,
    "INSERT INTO stages (event_id, name, scoring_type, points_to_win, deuce_allowed, order_index) VALUES (?, ?, ?, ?, ?, ?)",
    slug,
    body.name,
    body.scoring_type || "rally",
    body.points_to_win || 15,
    body.deuce_allowed !== void 0 ? body.deuce_allowed ? 1 : 0 : 1,
    orderIndex
  );
  const stage = await queryOne(db, "SELECT * FROM stages WHERE id = ?", result.meta.last_row_id);
  return c.json(stage, 201);
});
stageRoutes.get("/:slug/stages", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const stages = await query(
    db,
    "SELECT * FROM stages WHERE event_id = ? ORDER BY order_index ASC",
    slug
  );
  const result = [];
  for (const stage of stages) {
    const groups = await query(db, `
      SELECT g.* FROM groups_t g
      JOIN stage_groups sg ON g.id = sg.group_id
      WHERE sg.stage_id = ?
      ORDER BY g.name ASC
    `, stage.id);
    result.push({ ...stage, groups });
  }
  return c.json(result);
});
stageRoutes.post("/:slug/stages/:stageId/groups", async (c) => {
  const { slug, stageId } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  const stage = await queryOne(db, "SELECT * FROM stages WHERE id = ? AND event_id = ?", stageId, slug);
  if (!stage) {
    return c.json({ error: "Stage not found" }, 404);
  }
  const groupIds = body.group_ids || (body.group_id ? [body.group_id] : []);
  if (groupIds.length === 0) {
    return c.json({ error: "group_ids is required" }, 400);
  }
  for (const gid of groupIds) {
    const group = await queryOne(db, "SELECT id FROM groups_t WHERE id = ? AND event_id = ?", gid, slug);
    if (!group) continue;
    const existing = await queryOne(db, "SELECT * FROM stage_groups WHERE stage_id = ? AND group_id = ?", stageId, gid);
    if (!existing) {
      await execute(db, "INSERT INTO stage_groups (stage_id, group_id) VALUES (?, ?)", stageId, gid);
    }
  }
  return c.json({ success: true });
});
stageRoutes.delete("/:slug/stages/:id", async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  await execute(db, "DELETE FROM matches WHERE stage_id = ?", id);
  await execute(db, "DELETE FROM stage_groups WHERE stage_id = ?", id);
  await execute(db, "DELETE FROM stages WHERE id = ? AND event_id = ?", id, slug);
  return c.json({ success: true });
});
var stages_default = stageRoutes;

// worker/src/scoring.js
function getServerAndSide(team, score, serverNumber) {
  const serverPlayerId = serverNumber === 2 ? team.player2_id : team.player1_id;
  const side = score % 2 === 0 ? "right" : "left";
  return { serverPlayerId, side };
}
__name(getServerAndSide, "getServerAndSide");
function isMatchComplete(team1Score, team2Score, pointsToWin, deuceAllowed) {
  const maxScore = Math.max(team1Score, team2Score);
  const minScore = Math.min(team1Score, team2Score);
  if (maxScore < pointsToWin) return false;
  if (deuceAllowed) {
    return maxScore - minScore >= 2;
  } else {
    return maxScore >= pointsToWin;
  }
}
__name(isMatchComplete, "isMatchComplete");
function recomputeMatchState(points, stageScoringType) {
  let team1Score = 0;
  let team2Score = 0;
  let currentServerTeam = 1;
  let serverNumber = 1;
  let startingTeamDone = 0;
  for (const point of points) {
    const scoringType = point.scoring_type_at_time || stageScoringType;
    const rallyWinner = point.rally_winner_team;
    const servingTeam = currentServerTeam;
    if (scoringType === "rally") {
      if (rallyWinner === 1) team1Score += 1;
      else team2Score += 1;
      currentServerTeam = rallyWinner;
    } else {
      if (rallyWinner === servingTeam) {
        if (servingTeam === 1) team1Score += 1;
        else team2Score += 1;
        currentServerTeam = servingTeam;
      } else {
        const isStartingPair = startingTeamDone === 0 && servingTeam === 1;
        if (serverNumber === 1 && !isStartingPair) {
          serverNumber = 2;
          currentServerTeam = servingTeam;
        } else {
          serverNumber = 1;
          currentServerTeam = rallyWinner;
          if (startingTeamDone === 0) startingTeamDone = 1;
        }
      }
    }
  }
  return { team1Score, team2Score, currentServerTeam, serverNumber, startingTeamDone };
}
__name(recomputeMatchState, "recomputeMatchState");

// worker/src/routes/matches.js
var matchRoutes = new Hono2();
function addMinutes(isoString, minutes) {
  if (!isoString || minutes === 0) return isoString;
  const d = new Date(isoString);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
__name(addMinutes, "addMinutes");
async function getTeamData(db, teamId) {
  return await queryOne(db, `
    SELECT t.*, 
      p1.name AS player1_name, COALESCE(p1.nickname, p1.name) AS player1_nickname, p1.gender AS player1_gender, p1.paddle AS player1_paddle, p1.handedness AS player1_handedness,
      p2.name AS player2_name, COALESCE(p2.nickname, p2.name) AS player2_nickname, p2.gender AS player2_gender, p2.paddle AS player2_paddle, p2.handedness AS player2_handedness
    FROM teams t
    LEFT JOIN participants p1 ON t.player1_id = p1.id
    LEFT JOIN participants p2 ON t.player2_id = p2.id
    WHERE t.id = ?
  `, teamId);
}
__name(getTeamData, "getTeamData");
matchRoutes.get("/:slug/matches", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const matches = await query(db, `
    SELECT m.*,
      t1.name AS team1_name, t2.name AS team2_name,
      COALESCE(NULLIF(m.team1_player1_name,''), p1.name) AS team1_player1_name, COALESCE(p1.nickname, p1.name) AS team1_player1_nickname, p1.gender AS team1_player1_gender, p1.handedness AS team1_player1_handedness,
      COALESCE(NULLIF(m.team1_player2_name,''), p2.name) AS team1_player2_name, COALESCE(p2.nickname, p2.name) AS team1_player2_nickname, p2.gender AS team1_player2_gender, p2.handedness AS team1_player2_handedness,
      COALESCE(NULLIF(m.team2_player1_name,''), p3.name) AS team2_player1_name, COALESCE(p3.nickname, p3.name) AS team2_player1_nickname, p3.gender AS team2_player1_gender, p3.handedness AS team2_player1_handedness,
      COALESCE(NULLIF(m.team2_player2_name,''), p4.name) AS team2_player2_name, COALESCE(p4.nickname, p4.name) AS team2_player2_nickname, p4.gender AS team2_player2_gender, p4.handedness AS team2_player2_handedness,
      s.name AS stage_name, s.scoring_type, s.points_to_win, s.deuce_allowed,
      g.name AS group_name
    FROM matches m
    JOIN stages s ON m.stage_id = s.id
    JOIN groups_t g ON m.group_id = g.id
    LEFT JOIN teams t1 ON m.team1_id = t1.id
    LEFT JOIN teams t2 ON m.team2_id = t2.id
    LEFT JOIN participants p1 ON t1.player1_id = p1.id
    LEFT JOIN participants p2 ON t1.player2_id = p2.id
    LEFT JOIN participants p3 ON t2.player1_id = p3.id
    LEFT JOIN participants p4 ON t2.player2_id = p4.id
    WHERE s.event_id = ?
    ORDER BY m.id ASC
  `, slug);
  return c.json(matches);
});
matchRoutes.post("/:slug/matches", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.team1_id || !body.team2_id || !body.stage_id || !body.group_id) {
    return c.json({ error: "team1_id, team2_id, stage_id, and group_id are required" }, 400);
  }
  if (body.team1_id === body.team2_id) {
    return c.json({ error: "A team cannot play against itself" }, 400);
  }
  const t1 = await getTeamData(db, body.team1_id);
  const t2 = await getTeamData(db, body.team2_id);
  const result = await execute(
    db,
    `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, scheduled_time, court, status,
     team1_player1_name, team1_player2_name, team2_player1_name, team2_player2_name)
     VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?)`,
    body.stage_id,
    body.group_id,
    body.team1_id,
    body.team2_id,
    body.scheduled_time || "",
    body.court || "",
    t1?.player1_name || "",
    t1?.player2_name || "",
    t2?.player1_name || "",
    t2?.player2_name || ""
  );
  const match2 = await queryOne(db, "SELECT * FROM matches WHERE id = ?", result.meta.last_row_id);
  return c.json(match2, 201);
});
matchRoutes.post("/:slug/matches/auto-generate", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.group_id || !body.stage_id) {
    return c.json({ error: "group_id and stage_id are required" }, 400);
  }
  const group = await queryOne(db, "SELECT * FROM groups_t WHERE id = ? AND event_id = ?", body.group_id, slug);
  if (!group) return c.json({ error: "Group not found" }, 404);
  const stage = await queryOne(db, "SELECT * FROM stages WHERE id = ? AND event_id = ?", body.stage_id, slug);
  if (!stage) return c.json({ error: "Stage not found" }, 404);
  const teams = await query(db, `
    SELECT t.* FROM teams t
    JOIN group_teams gt ON t.id = gt.team_id
    WHERE gt.group_id = ?
  `, body.group_id);
  if (teams.length < 2) {
    return c.json({ error: "Need at least 2 teams in the group" }, 400);
  }
  const courts = body.courts || [];
  const scheduledTime = body.scheduled_time || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const startTime = body.start_time || "09:00";
  const createdMatches = [];
  let matchIdx = 0;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const roundNum = courts.length > 0 ? Math.floor(matchIdx / courts.length) : matchIdx;
      const matchTime = addMinutes(`${scheduledTime}T${startTime}:00`, roundNum * 15);
      const court = courts.length > 0 ? courts[matchIdx % courts.length] : "";
      const t1 = await getTeamData(db, teams[i].id);
      const t2 = await getTeamData(db, teams[j].id);
      const result = await execute(
        db,
        `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, scheduled_time, court, status,
         team1_player1_name, team1_player2_name, team2_player1_name, team2_player2_name)
         VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?)`,
        body.stage_id,
        body.group_id,
        teams[i].id,
        teams[j].id,
        matchTime,
        court,
        t1?.player1_name || "",
        t1?.player2_name || "",
        t2?.player1_name || "",
        t2?.player2_name || ""
      );
      const match2 = await queryOne(db, "SELECT * FROM matches WHERE id = ?", result.meta.last_row_id);
      createdMatches.push(match2);
      matchIdx++;
    }
  }
  return c.json(createdMatches, 201);
});
matchRoutes.put("/:slug/matches/:id", async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  const existing = await queryOne(db, "SELECT * FROM matches WHERE id = ?", id);
  const stage = await queryOne(db, "SELECT * FROM stages WHERE id = ? AND event_id = ?", existing?.stage_id, slug);
  if (!existing || !stage) {
    return c.json({ error: "Match not found" }, 404);
  }
  const fields = [];
  const values = [];
  if (body.team1_id !== void 0) {
    fields.push("team1_id = ?");
    values.push(body.team1_id);
  }
  if (body.team2_id !== void 0) {
    fields.push("team2_id = ?");
    values.push(body.team2_id);
  }
  if (body.scheduled_time !== void 0) {
    fields.push("scheduled_time = ?");
    values.push(body.scheduled_time);
  }
  if (body.court !== void 0) {
    fields.push("court = ?");
    values.push(body.court);
  }
  if (body.team1_score !== void 0) {
    fields.push("team1_score = ?");
    values.push(body.team1_score);
  }
  if (body.team2_score !== void 0) {
    fields.push("team2_score = ?");
    values.push(body.team2_score);
  }
  if (body.winner_team_id !== void 0) {
    fields.push("winner_team_id = ?");
    values.push(body.winner_team_id);
  }
  if (body.status !== void 0) {
    fields.push("status = ?");
    values.push(body.status);
  }
  if (body.walkover !== void 0) {
    fields.push("walkover = ?");
    values.push(body.walkover);
  }
  if (fields.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }
  values.push(id);
  await execute(db, `UPDATE matches SET ${fields.join(", ")} WHERE id = ?`, ...values);
  const match2 = await queryOne(db, "SELECT * FROM matches WHERE id = ?", id);
  return c.json(match2);
});
matchRoutes.delete("/:slug/matches/:id", async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const pointCount = await queryOne(db, "SELECT COUNT(*) as cnt FROM match_points WHERE match_id = ?", id);
  if (pointCount.cnt > 0) {
    return c.json({ error: "Cannot delete match with recorded points. Undo points first." }, 409);
  }
  await execute(db, "DELETE FROM matches WHERE id = ?", id);
  return c.json({ success: true });
});
matchRoutes.post("/:slug/matches/:id/start", async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const match2 = await queryOne(db, "SELECT * FROM matches WHERE id = ?", id);
  if (!match2) return c.json({ error: "Match not found" }, 404);
  const team1 = await getTeamData(db, match2.team1_id);
  const { serverPlayerId, side } = getServerAndSide(team1, 0, 1);
  const t2 = await getTeamData(db, match2.team2_id);
  await execute(
    db,
    `UPDATE matches SET status = 'live', current_server_team = 1, current_server_player_id = ?, current_server_side = ?, current_server_number = 1, starting_team_done = 0,
     team1_player1_name = COALESCE(NULLIF(team1_player1_name,''), ?), team1_player2_name = COALESCE(NULLIF(team1_player2_name,''), ?),
     team2_player1_name = COALESCE(NULLIF(team2_player1_name,''), ?), team2_player2_name = COALESCE(NULLIF(team2_player2_name,''), ?)
     WHERE id = ?`,
    serverPlayerId,
    side,
    team1?.player1_name || "",
    team1?.player2_name || "",
    t2?.player1_name || "",
    t2?.player2_name || "",
    id
  );
  const updated = await queryOne(db, "SELECT * FROM matches WHERE id = ?", id);
  return c.json(updated);
});
matchRoutes.post("/:slug/matches/:id/point", async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.rally_winner_team || ![1, 2].includes(body.rally_winner_team)) {
    return c.json({ error: "rally_winner_team must be 1 or 2" }, 400);
  }
  const match2 = await queryOne(db, "SELECT * FROM matches WHERE id = ?", id);
  if (!match2 || match2.status !== "live") {
    return c.json({ error: "Match is not live" }, 400);
  }
  const stage = await queryOne(db, "SELECT * FROM stages WHERE id = ?", match2.stage_id);
  if (!stage) return c.json({ error: "Stage not found" }, 404);
  const team1 = await getTeamData(db, match2.team1_id);
  const team2 = await getTeamData(db, match2.team2_id);
  if (!team1 || !team2) return c.json({ error: "Teams not found" }, 404);
  const scoringType = stage.scoring_type;
  const rallyWinner = body.rally_winner_team;
  const servingTeam = match2.current_server_team || 1;
  const team1ScoreBefore = match2.team1_score || 0;
  const team2ScoreBefore = match2.team2_score || 0;
  let sideOut = 0;
  let newTeam1Score = team1ScoreBefore;
  let newTeam2Score = team2ScoreBefore;
  let newServingTeam = servingTeam;
  let newServerNumber = match2.current_server_number || 1;
  let newStartingTeamDone = match2.starting_team_done || 0;
  if (scoringType === "rally") {
    if (rallyWinner === 1) newTeam1Score += 1;
    else newTeam2Score += 1;
    newServingTeam = rallyWinner;
  } else {
    if (rallyWinner === servingTeam) {
      if (servingTeam === 1) newTeam1Score += 1;
      else newTeam2Score += 1;
      newServingTeam = servingTeam;
    } else {
      const isStartingPair = newStartingTeamDone === 0 && servingTeam === 1;
      const isOnServer1 = newServerNumber === 1;
      if (isOnServer1 && !isStartingPair) {
        newServerNumber = 2;
        newServingTeam = servingTeam;
        sideOut = 0;
      } else {
        newServerNumber = 1;
        newServingTeam = rallyWinner;
        sideOut = 1;
        if (newStartingTeamDone === 0) newStartingTeamDone = 1;
      }
    }
  }
  if (isMatchComplete(newTeam1Score, newTeam2Score, stage.points_to_win, stage.deuce_allowed)) {
    const winnerTeam = newTeam1Score > newTeam2Score ? match2.team1_id : match2.team2_id;
    const pointNumber2 = await getNextPointNumber(db, id);
    const serverPlayerId2 = body.server_player_id || match2.current_server_player_id;
    const serverSide2 = body.server_side || match2.current_server_side || "right";
    await execute(
      db,
      `INSERT INTO match_points (match_id, point_number, team1_score_before, team2_score_before, rally_winner_team, server_player_id, server_side, scoring_type_at_time, side_out)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      pointNumber2,
      team1ScoreBefore,
      team2ScoreBefore,
      rallyWinner,
      serverPlayerId2,
      serverSide2,
      scoringType,
      sideOut
    );
    await execute(
      db,
      `UPDATE matches SET status = 'completed', team1_score = ?, team2_score = ?, winner_team_id = ? WHERE id = ?`,
      newTeam1Score,
      newTeam2Score,
      winnerTeam,
      id
    );
    const updated2 = await queryOne(db, "SELECT * FROM matches WHERE id = ?", id);
    const points2 = await query(db, "SELECT * FROM match_points WHERE match_id = ? ORDER BY point_number ASC", id);
    return c.json({ match: updated2, points: points2, match_completed: true });
  }
  let nextServerPlayerId, nextServerSide;
  if (newServingTeam === 1) {
    const serverInfo = getServerAndSide(team1, newTeam1Score, newServerNumber);
    nextServerPlayerId = serverInfo.serverPlayerId;
    nextServerSide = serverInfo.side;
  } else {
    const serverInfo = getServerAndSide(team2, newTeam2Score, newServerNumber);
    nextServerPlayerId = serverInfo.serverPlayerId;
    nextServerSide = serverInfo.side;
  }
  const serverPlayerId = body.server_player_id || match2.current_server_player_id;
  const serverSide = body.server_side || match2.current_server_side || "right";
  const pointNumber = await getNextPointNumber(db, id);
  await execute(
    db,
    `INSERT INTO match_points (match_id, point_number, team1_score_before, team2_score_before, rally_winner_team, server_player_id, server_side, scoring_type_at_time, side_out)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    pointNumber,
    team1ScoreBefore,
    team2ScoreBefore,
    rallyWinner,
    serverPlayerId,
    serverSide,
    scoringType,
    sideOut
  );
  await execute(
    db,
    `UPDATE matches SET team1_score = ?, team2_score = ?, current_server_team = ?, current_server_player_id = ?, current_server_side = ?, current_server_number = ?, starting_team_done = ? WHERE id = ?`,
    newTeam1Score,
    newTeam2Score,
    newServingTeam,
    nextServerPlayerId,
    nextServerSide,
    newServerNumber,
    newStartingTeamDone,
    id
  );
  const updated = await queryOne(db, "SELECT * FROM matches WHERE id = ?", id);
  const points = await query(db, "SELECT * FROM match_points WHERE match_id = ? ORDER BY point_number ASC", id);
  return c.json({
    match: updated,
    points,
    side_out: sideOut === 1,
    next_server: {
      team: newServingTeam,
      player_id: nextServerPlayerId,
      side: nextServerSide
    }
  });
});
matchRoutes.post("/:slug/matches/:id/undo", async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const lastPoint = await queryOne(
    db,
    "SELECT * FROM match_points WHERE match_id = ? ORDER BY point_number DESC LIMIT 1",
    id
  );
  if (!lastPoint) {
    return c.json({ error: "No points to undo" }, 400);
  }
  await execute(db, "DELETE FROM match_points WHERE id = ?", lastPoint.id);
  const remainingPoints = await query(
    db,
    "SELECT * FROM match_points WHERE match_id = ? ORDER BY point_number ASC",
    id
  );
  const stage = await queryOne(
    db,
    "SELECT * FROM stages WHERE id = ?",
    (await queryOne(db, "SELECT stage_id FROM matches WHERE id = ?", id))?.stage_id
  );
  if (!stage) return c.json({ error: "Stage not found" }, 404);
  const scoringType = stage.scoring_type;
  const state = recomputeMatchState(remainingPoints, scoringType);
  const match2 = await queryOne(db, "SELECT * FROM matches WHERE id = ?", id);
  const team1 = match2 ? await getTeamData(db, match2.team1_id) : null;
  const team2 = match2 ? await getTeamData(db, match2.team2_id) : null;
  let nextServerPlayerId, nextServerSide;
  if (state.currentServerTeam === 1 && team1) {
    const si = getServerAndSide(team1, state.team1Score, state.serverNumber);
    nextServerPlayerId = si.serverPlayerId;
    nextServerSide = si.side;
  } else if (team2) {
    const si = getServerAndSide(team2, state.team2Score, state.serverNumber);
    nextServerPlayerId = si.serverPlayerId;
    nextServerSide = si.side;
  } else {
    nextServerPlayerId = null;
    nextServerSide = "right";
  }
  await execute(
    db,
    `UPDATE matches SET team1_score = ?, team2_score = ?, current_server_team = ?, current_server_player_id = ?, current_server_side = ?, current_server_number = ?, starting_team_done = ? WHERE id = ?`,
    state.team1Score,
    state.team2Score,
    state.currentServerTeam,
    nextServerPlayerId,
    nextServerSide,
    state.serverNumber || 1,
    state.startingTeamDone || 0,
    id
  );
  const updated = await queryOne(db, "SELECT * FROM matches WHERE id = ?", id);
  const points = await query(db, "SELECT * FROM match_points WHERE match_id = ? ORDER BY point_number ASC", id);
  return c.json({ match: updated, points });
});
matchRoutes.post("/:slug/matches/:id/complete", async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  const match2 = await queryOne(db, "SELECT * FROM matches WHERE id = ?", id);
  if (!match2) return c.json({ error: "Match not found" }, 404);
  const winnerTeamId = body.winner_team_id || ((match2.team1_score || 0) > (match2.team2_score || 0) ? match2.team1_id : match2.team2_id);
  await execute(
    db,
    `UPDATE matches SET status = 'completed', winner_team_id = ?, walkover = ? WHERE id = ?`,
    winnerTeamId,
    body.walkover ? 1 : 0,
    id
  );
  const updated = await queryOne(db, "SELECT * FROM matches WHERE id = ?", id);
  return c.json(updated);
});
matchRoutes.post("/:slug/matches/:id/walkover", async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.winner_team_id) {
    return c.json({ error: "winner_team_id is required" }, 400);
  }
  const match2 = await queryOne(db, "SELECT * FROM matches WHERE id = ?", id);
  if (!match2) return c.json({ error: "Match not found" }, 404);
  const stage = await queryOne(db, "SELECT points_to_win FROM stages WHERE id = ?", match2.stage_id);
  const maxPoints = stage?.points_to_win || 15;
  const winnerId = body.winner_team_id;
  const team1Won = winnerId === match2.team1_id;
  const t1Score = team1Won ? maxPoints : 0;
  const t2Score = team1Won ? 0 : maxPoints;
  await execute(
    db,
    `UPDATE matches SET status = 'completed', winner_team_id = ?, walkover = 1,
     team1_score = ?, team2_score = ? WHERE id = ?`,
    winnerId,
    t1Score,
    t2Score,
    id
  );
  const updated = await queryOne(db, "SELECT * FROM matches WHERE id = ?", id);
  return c.json(updated);
});
matchRoutes.post("/:slug/matches/:id/reset", async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const match2 = await queryOne(db, "SELECT * FROM matches WHERE id = ?", id);
  if (!match2) return c.json({ error: "Match not found" }, 404);
  const stage = await queryOne(db, "SELECT * FROM stages WHERE id = ? AND event_id = ?", match2.stage_id, slug);
  if (!stage) return c.json({ error: "Match not found" }, 404);
  await execute(db, "DELETE FROM match_points WHERE match_id = ?", id);
  await execute(
    db,
    `UPDATE matches SET status = 'scheduled', team1_score = 0, team2_score = 0,
     winner_team_id = NULL, walkover = 0,
     current_server_team = NULL, current_server_player_id = NULL,
     current_server_side = NULL, current_server_number = NULL,
     starting_team_done = 0
     WHERE id = ?`,
    id
  );
  const updated = await queryOne(db, "SELECT * FROM matches WHERE id = ?", id);
  return c.json(updated);
});
async function getNextPointNumber(db, matchId) {
  const result = await queryOne(
    db,
    "SELECT MAX(point_number) as max_pn FROM match_points WHERE match_id = ?",
    matchId
  );
  return (result?.max_pn || 0) + 1;
}
__name(getNextPointNumber, "getNextPointNumber");
matchRoutes.post("/:slug/matches/auto-advance", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const rrStage = await queryOne(
    db,
    "SELECT * FROM stages WHERE event_id = ? AND order_index = 1",
    slug
  );
  if (!rrStage) return c.json({ error: "No round-robin stage found" }, 400);
  const koStage = await queryOne(
    db,
    "SELECT * FROM stages WHERE event_id = ? AND order_index = 2",
    slug
  );
  if (!koStage) return c.json({ error: "No knockout stage found" }, 400);
  const rrGroups = await query(
    db,
    `SELECT g.* FROM groups_t g
     JOIN stage_groups sg ON sg.group_id = g.id
     WHERE sg.stage_id = ? AND g.stage_type = 'round_robin'
     ORDER BY g.name ASC`,
    rrStage.id
  );
  const allCompleted = await query(
    db,
    `SELECT m.* FROM matches m
     JOIN stage_groups sg ON sg.group_id = m.group_id
     WHERE sg.stage_id = ? AND m.status = 'completed'`,
    rrStage.id
  );
  const totalRRMatches = await queryOne(
    db,
    `SELECT COUNT(*) as cnt FROM matches m
     JOIN stage_groups sg ON sg.group_id = m.group_id
     WHERE sg.stage_id = ?`,
    rrStage.id
  );
  if (allCompleted.length < (totalRRMatches?.cnt || 0)) {
    return c.json({
      error: "Not all round-robin matches are completed yet",
      completed: allCompleted.length,
      total: totalRRMatches?.cnt || 0
    }, 400);
  }
  const groupStandings = [];
  for (const grp of rrGroups) {
    const teams = await query(
      db,
      `SELECT t.*, p1.name AS p1_name, p1.nickname AS p1_nickname, p1.gender AS p1_gender,
              p2.name AS p2_name, p2.nickname AS p2_nickname, p2.gender AS p2_gender
       FROM group_teams gt
       JOIN teams t ON t.id = gt.team_id
       LEFT JOIN participants p1 ON t.player1_id = p1.id
       LEFT JOIN participants p2 ON t.player2_id = p2.id
       WHERE gt.group_id = ?`,
      grp.id
    );
    const wins = {};
    const h2h = {};
    for (const t of teams) {
      wins[t.id] = 0;
      h2h[t.id] = {};
    }
    const groupMatches = allCompleted.filter((m) => m.group_id === grp.id);
    for (const m of groupMatches) {
      if (m.team1_id && m.team2_id) {
        if (m.team1_score > m.team2_score) {
          wins[m.team1_id] = (wins[m.team1_id] || 0) + 1;
          if (h2h[m.team1_id]) h2h[m.team1_id][m.team2_id] = "win";
          if (h2h[m.team2_id]) h2h[m.team2_id][m.team1_id] = "loss";
        } else if (m.team2_score > m.team1_score) {
          wins[m.team2_id] = (wins[m.team2_id] || 0) + 1;
          if (h2h[m.team2_id]) h2h[m.team2_id][m.team1_id] = "win";
          if (h2h[m.team1_id]) h2h[m.team1_id][m.team2_id] = "loss";
        }
      }
    }
    const ranked = [...teams].sort((a, b) => {
      const wa = wins[a.id] || 0;
      const wb = wins[b.id] || 0;
      if (wa !== wb) return wb - wa;
      if (h2h[a.id] && h2h[a.id][b.id] === "win") return -1;
      if (h2h[b.id] && h2h[b.id][a.id] === "win") return 1;
      return 0;
    });
    groupStandings.push({ group: grp, teams: ranked, wins });
  }
  const firstKoGroup = await queryOne(
    db,
    `SELECT g.* FROM groups_t g
     JOIN stage_groups sg ON sg.group_id = g.id
     WHERE sg.stage_id = ? AND g.stage_type = 'knockout' AND g.round_number = 1
     ORDER BY g.id ASC LIMIT 1`,
    koStage.id
  );
  if (!firstKoGroup) return c.json({ error: "No first knockout round found" }, 400);
  const placeholderMatches = await query(
    db,
    `SELECT * FROM matches WHERE stage_id = ? AND group_id = ? AND team1_id IS NULL AND team2_id IS NULL
     ORDER BY id ASC`,
    koStage.id,
    firstKoGroup.id
  );
  const totalAdvancing = placeholderMatches.length * 2;
  const advancePerGroup = Math.floor(totalAdvancing / rrGroups.length);
  if (advancePerGroup < 1) {
    return c.json({ error: `Not enough knockout slots (${totalAdvancing}) for ${rrGroups.length} groups` }, 400);
  }
  const advancing = [];
  for (let rank = 0; rank < advancePerGroup; rank++) {
    for (const gs of groupStandings) {
      if (gs.teams[rank]) {
        advancing.push({ ...gs.teams[rank], group_name: gs.group.name, rank: rank + 1 });
      }
    }
  }
  const pairings = [];
  const n = advancing.length;
  for (let i = 0; i < n / 2; i++) {
    pairings.push({ team1: advancing[i], team2: advancing[n - 1 - i] });
  }
  const updated = [];
  for (let i = 0; i < pairings.length && i < placeholderMatches.length; i++) {
    const p = pairings[i];
    await execute(
      db,
      "UPDATE matches SET team1_id = ?, team2_id = ?, status = ? WHERE id = ?",
      p.team1.id,
      p.team2.id,
      "scheduled",
      placeholderMatches[i].id
    );
    const match2 = await queryOne(db, "SELECT * FROM matches WHERE id = ?", placeholderMatches[i].id);
    updated.push(match2);
  }
  return c.json({
    standings: groupStandings.map((gs) => ({
      group_name: gs.group.name,
      teams: gs.teams.map((t, i) => ({
        id: t.id,
        name: t.name,
        p1_nickname: t.p1_nickname || t.p1_name,
        p2_nickname: t.p2_nickname || t.p2_name,
        wins: gs.wins[t.id] || 0,
        rank: i + 1,
        advancing: i < advancePerGroup
      }))
    })),
    pairings: pairings.map((p) => ({
      team1: { id: p.team1.id, name: p.team1.name, group: p.team1.group_name, rank: p.team1.rank },
      team2: { id: p.team2.id, name: p.team2.name, group: p.team2.group_name, rank: p.team2.rank }
    })),
    updated_matches: updated
  });
});
matchRoutes.post("/:slug/matches/advance", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.targetStageId || !body.targetGroupId || !body.pairings) {
    return c.json({ error: "targetStageId, targetGroupId, and pairings are required" }, 400);
  }
  const createdMatches = [];
  for (const pairing of body.pairings) {
    if (!pairing.team1_id || !pairing.team2_id) continue;
    const result = await execute(
      db,
      `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, status) VALUES (?, ?, ?, ?, 'scheduled')`,
      body.targetStageId,
      body.targetGroupId,
      pairing.team1_id,
      pairing.team2_id
    );
    const match2 = await queryOne(db, "SELECT * FROM matches WHERE id = ?", result.meta.last_row_id);
    createdMatches.push(match2);
  }
  return c.json(createdMatches, 201);
});
var matches_default = matchRoutes;

// worker/src/routes/players.js
var GLOBAL_EVENT = "__global__";
var playerRoutes = new Hono2();
playerRoutes.get("/", async (c) => {
  const db = c.env.DB;
  const players = await query(
    db,
    `SELECT id, name, COALESCE(NULLIF(nickname, ''), name) AS display_nickname,
            gender, paddle, handedness, email, avatar, created_at
     FROM participants WHERE event_id = ? ORDER BY name ASC`,
    GLOBAL_EVENT
  );
  return c.json(players);
});
playerRoutes.post("/", async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.name) {
    return c.json({ error: "name is required" }, 400);
  }
  const nickname = body.nickname || body.name;
  const existing = await queryOne(
    db,
    "SELECT id FROM participants WHERE event_id = ? AND name = ?",
    GLOBAL_EVENT,
    body.name
  );
  if (existing) {
    return c.json({ error: "A player with this name already exists in the global pool" }, 409);
  }
  const result = await execute(
    db,
    `INSERT INTO participants (event_id, name, nickname, gender, paddle, handedness, email, avatar)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    GLOBAL_EVENT,
    body.name,
    nickname,
    body.gender || "",
    body.paddle || "",
    body.handedness || "",
    body.email || "",
    body.avatar || ""
  );
  const player = await queryOne(
    db,
    "SELECT * FROM participants WHERE id = ?",
    result.meta.last_row_id
  );
  return c.json(player, 201);
});
playerRoutes.put("/:id", async (c) => {
  const { id } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  const existing = await queryOne(
    db,
    "SELECT * FROM participants WHERE id = ? AND event_id = ?",
    id,
    GLOBAL_EVENT
  );
  if (!existing) {
    return c.json({ error: "Global player not found" }, 404);
  }
  const fields = [];
  const values = [];
  if (body.name !== void 0) {
    fields.push("name = ?");
    values.push(body.name);
  }
  if (body.nickname !== void 0) {
    fields.push("nickname = ?");
    values.push(body.nickname);
  }
  if (body.gender !== void 0) {
    fields.push("gender = ?");
    values.push(body.gender);
  }
  if (body.paddle !== void 0) {
    fields.push("paddle = ?");
    values.push(body.paddle);
  }
  if (body.handedness !== void 0) {
    fields.push("handedness = ?");
    values.push(body.handedness);
  }
  if (body.email !== void 0) {
    fields.push("email = ?");
    values.push(body.email);
  }
  if (body.avatar !== void 0) {
    fields.push("avatar = ?");
    values.push(body.avatar);
  }
  if (fields.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }
  values.push(id);
  await execute(db, `UPDATE participants SET ${fields.join(", ")} WHERE id = ?`, ...values);
  const player = await queryOne(db, "SELECT * FROM participants WHERE id = ?", id);
  return c.json(player);
});
playerRoutes.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const db = c.env.DB;
  const usage = await queryOne(
    db,
    "SELECT COUNT(*) as cnt FROM participants WHERE name = (SELECT name FROM participants WHERE id = ?) AND event_id != ?",
    id,
    GLOBAL_EVENT
  );
  await execute(db, "DELETE FROM participants WHERE id = ? AND event_id = ?", id, GLOBAL_EVENT);
  return c.json({ success: true, used_in_events: usage?.cnt || 0 });
});
var players_default = playerRoutes;

// worker/src/routes/format.js
var formatRoutes = new Hono2();
formatRoutes.get("/:slug/royal-rumble-info", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const event = await queryOne(db, "SELECT id, courts, start_time, end_time FROM events WHERE id = ?", slug);
  if (!event) return c.json({ error: "Event not found" }, 404);
  const participants = await query(db, "SELECT * FROM participants WHERE event_id = ?", slug);
  const n = participants.length;
  const totalPermutations = n >= 4 ? n * (n - 1) * (n - 2) * (n - 3) / 8 : 0;
  let courts = [];
  try {
    courts = JSON.parse(event.courts || "[]");
  } catch {
    courts = [];
  }
  const courtCount = courts.length || 1;
  let durationMinutes = 0;
  if (event.start_time && event.end_time) {
    const [sh, sm] = event.start_time.split(":").map(Number);
    const [eh, em] = event.end_time.split(":").map(Number);
    durationMinutes = eh * 60 + em - (sh * 60 + sm);
    if (durationMinutes < 0) durationMinutes = 0;
  }
  return c.json({
    player_count: n,
    total_permutations: totalPermutations,
    court_count: courtCount,
    courts,
    start_time: event.start_time || "",
    end_time: event.end_time || "",
    duration_minutes: durationMinutes
  });
});
formatRoutes.post("/:slug/setup-format", async (c) => {
  try {
    const { slug } = c.req.param();
    const db = c.env.DB;
    const body = await c.req.json();
    const event = await queryOne(db, "SELECT id FROM events WHERE id = ?", slug);
    if (!event) return c.json({ error: "Event not found" }, 404);
    const { format_type, round_robin, knockout } = body;
    if (!format_type) return c.json({ error: "format_type is required" }, 400);
    await execute(db, `DELETE FROM match_points WHERE match_id IN (SELECT id FROM matches WHERE stage_id IN (SELECT id FROM stages WHERE event_id = ?))`, slug);
    await execute(db, `DELETE FROM matches WHERE stage_id IN (SELECT id FROM stages WHERE event_id = ?)`, slug);
    await execute(db, `DELETE FROM stage_groups WHERE stage_id IN (SELECT id FROM stages WHERE event_id = ?)`, slug);
    await execute(db, `DELETE FROM stages WHERE event_id = ?`, slug);
    await execute(db, `DELETE FROM group_teams WHERE group_id IN (SELECT id FROM groups_t WHERE event_id = ?)`, slug);
    await execute(db, `DELETE FROM groups_t WHERE event_id = ?`, slug);
    await execute(db, "DELETE FROM teams WHERE event_id = ? AND emoji IS NULL", slug);
    const result = { groups: [], stages: [], matches: [] };
    await execute(db, "UPDATE events SET format_type = ? WHERE id = ?", format_type, slug);
    if (format_type === "round_robin_knockout" || format_type === "round_robin_only") {
      const rrConfig = round_robin || {};
      const groupCount = rrConfig.group_count || 1;
      const advancePerGroup = rrConfig.advance_per_group || 1;
      const rrScoring = rrConfig.scoring || { scoring_type: "rally", points_to_win: 15, deuce_allowed: true };
      const teams = await query(db, "SELECT * FROM teams WHERE event_id = ?", slug);
      if (teams.length === 0) {
        return c.json({ error: "No teams created yet. Create teams first." }, 400);
      }
      if (groupCount > teams.length) {
        return c.json({ error: `Can't have more groups (${groupCount}) than teams (${teams.length}).` }, 400);
      }
      const minTeamsPerGroup = Math.floor(teams.length / groupCount);
      if (minTeamsPerGroup < 2) {
        return c.json({ error: `With ${teams.length} teams and ${groupCount} groups, at least one group would have fewer than 2 teams and can't play round-robin matches. Reduce the number of groups.` }, 400);
      }
      if (advancePerGroup > Math.ceil(teams.length / groupCount)) {
        return c.json({ error: `Can't advance ${advancePerGroup} teams per group when groups only have ~${Math.ceil(teams.length / groupCount)} teams each.` }, 400);
      }
      const stageResult = await execute(
        db,
        `INSERT INTO stages (event_id, name, scoring_type, points_to_win, deuce_allowed, order_index)
       VALUES (?, ?, ?, ?, ?, 1)`,
        slug,
        "Round Robin",
        rrScoring.scoring_type || "rally",
        rrScoring.points_to_win || 21,
        rrScoring.deuce_allowed !== false ? 1 : 0
      );
      const rrStageId = stageResult.meta.last_row_id;
      const rrStage = await queryOne(db, "SELECT * FROM stages WHERE id = ?", rrStageId);
      result.stages.push(rrStage);
      const groupNames = rrConfig.group_names || Array.from({ length: groupCount }, (_, i) => `Group ${String.fromCharCode(65 + i)}`);
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      const groups_of_teams = Array.from({ length: groupCount }, () => []);
      shuffled.forEach((team, idx) => {
        groups_of_teams[idx % groupCount].push(team);
      });
      for (let g = 0; g < groupCount; g++) {
        const grpResult = await execute(
          db,
          "INSERT INTO groups_t (event_id, name, stage_type, round_number) VALUES (?, ?, ?, ?)",
          slug,
          groupNames[g] || `Group ${g + 1}`,
          "round_robin",
          1
        );
        const groupId = grpResult.meta.last_row_id;
        await execute(db, "INSERT INTO stage_groups (stage_id, group_id) VALUES (?, ?)", rrStageId, groupId);
        for (const team of groups_of_teams[g]) {
          await execute(db, "INSERT INTO group_teams (group_id, team_id) VALUES (?, ?)", groupId, team.id);
        }
        const groupTeams = groups_of_teams[g];
        for (let i = 0; i < groupTeams.length; i++) {
          for (let j = i + 1; j < groupTeams.length; j++) {
            const matchResult = await execute(
              db,
              `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, status)
             VALUES (?, ?, ?, ?, 'scheduled')`,
              rrStageId,
              groupId,
              groupTeams[i].id,
              groupTeams[j].id
            );
            const match2 = await queryOne(db, "SELECT * FROM matches WHERE id = ?", matchResult.meta.last_row_id);
            result.matches.push(match2);
          }
        }
        const grp = await queryOne(db, "SELECT * FROM groups_t WHERE id = ?", groupId);
        result.groups.push({
          ...grp,
          teams: groups_of_teams[g],
          advance_count: advancePerGroup
        });
      }
      if (format_type === "round_robin_knockout") {
        const koConfig = knockout || {};
        const koScoring = koConfig.scoring || { scoring_type: "rally", points_to_win: 15, deuce_allowed: true };
        const advancingTeams = groupCount * advancePerGroup;
        let bracketSize = 2;
        while (bracketSize < advancingTeams) bracketSize *= 2;
        const roundNames = [];
        let temp = bracketSize;
        const roundLabels = ["Final", "Semi-Finals", "Quarter-Finals", "Round of 16", "Round of 32", "Round of 64"];
        while (temp >= 2) {
          const label = roundLabels[Math.log2(temp) - 1] || `Round of ${temp}`;
          roundNames.push(label);
          temp /= 2;
        }
        const koStageResult = await execute(
          db,
          `INSERT INTO stages (event_id, name, scoring_type, points_to_win, deuce_allowed, order_index)
         VALUES (?, ?, ?, ?, ?, 2)`,
          slug,
          "Knockout",
          koScoring.scoring_type || "rally",
          koScoring.points_to_win || 21,
          koScoring.deuce_allowed !== false ? 1 : 0
        );
        const koStageId = koStageResult.meta.last_row_id;
        const koStage = await queryOne(db, "SELECT * FROM stages WHERE id = ?", koStageId);
        result.stages.push(koStage);
        let matchesInRound = bracketSize / 2;
        for (let r = 0; r < roundNames.length; r++) {
          const grpResult = await execute(
            db,
            "INSERT INTO groups_t (event_id, name, stage_type, round_number) VALUES (?, ?, ?, ?)",
            slug,
            roundNames[r],
            "knockout",
            r + 1
          );
          const groupId = grpResult.meta.last_row_id;
          await execute(db, "INSERT INTO stage_groups (stage_id, group_id) VALUES (?, ?)", koStageId, groupId);
          for (let m = 0; m < matchesInRound; m++) {
            const matchResult = await execute(
              db,
              `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, status)
             VALUES (?, ?, NULL, NULL, 'scheduled')`,
              koStageId,
              groupId
            );
            const match2 = await queryOne(db, "SELECT * FROM matches WHERE id = ?", matchResult.meta.last_row_id);
            result.matches.push(match2);
          }
          matchesInRound /= 2;
          const grp = await queryOne(db, "SELECT * FROM groups_t WHERE id = ?", groupId);
          result.groups.push(grp);
        }
      }
    } else if (format_type === "royal_rumble") {
      const rrConfig = round_robin || {};
      const rrScoring = rrConfig.scoring || { scoring_type: "rally", points_to_win: 15, deuce_allowed: true };
      const matchCount = rrConfig.match_count || 0;
      const courtCount = rrConfig.court_count || 1;
      const allParticipants = await query(db, "SELECT * FROM participants WHERE event_id = ?", slug);
      const seen = /* @__PURE__ */ new Set();
      const participants = allParticipants.filter((p) => {
        const key = p.name.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const n = participants.length;
      if (n < 4) {
        return c.json({ error: "Need at least 4 players for Royal Rumble. Add more players first." }, 400);
      }
      const totalPermutations = n * (n - 1) * (n - 2) * (n - 3) / 8;
      const targetMatches = matchCount > 0 ? Math.min(matchCount, totalPermutations) : totalPermutations;
      const allPairs = [];
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          allPairs.push([participants[i], participants[j]]);
        }
      }
      const allMatches = [];
      for (let pi = 0; pi < allPairs.length; pi++) {
        for (let pj = pi + 1; pj < allPairs.length; pj++) {
          const pair1 = allPairs[pi];
          const pair2 = allPairs[pj];
          const ids1 = /* @__PURE__ */ new Set([pair1[0].id, pair1[1].id]);
          const ids2 = /* @__PURE__ */ new Set([pair2[0].id, pair2[1].id]);
          const overlap = [...ids1].some((id) => ids2.has(id));
          if (!overlap) {
            allMatches.push({ pair1, pair2 });
          }
        }
      }
      const playerLastRound = {};
      participants.forEach((p) => {
        playerLastRound[p.id] = -999;
      });
      const scheduledMatches = [];
      const usedMatchIdx = /* @__PURE__ */ new Set();
      let currentRound = 0;
      while (scheduledMatches.length < targetMatches && usedMatchIdx.size < allMatches.length) {
        const roundMatches = [];
        for (let court = 0; court < courtCount; court++) {
          let bestIdx = -1;
          let bestDowntime = -1;
          for (let mi = 0; mi < allMatches.length; mi++) {
            if (usedMatchIdx.has(mi)) continue;
            const m = allMatches[mi];
            const players = [m.pair1[0].id, m.pair1[1].id, m.pair2[0].id, m.pair2[1].id];
            const playersInRound = new Set(roundMatches.flatMap(
              (rm) => [rm.pair1[0].id, rm.pair1[1].id, rm.pair2[0].id, rm.pair2[1].id]
            ));
            if (players.some((pid) => playersInRound.has(pid))) continue;
            const downtime = players.reduce((sum, pid) => sum + (currentRound - playerLastRound[pid]), 0);
            if (downtime > bestDowntime) {
              bestDowntime = downtime;
              bestIdx = mi;
            }
          }
          if (bestIdx >= 0) {
            roundMatches.push(allMatches[bestIdx]);
            usedMatchIdx.add(bestIdx);
          }
        }
        if (roundMatches.length === 0) {
          currentRound++;
          continue;
        }
        for (const rm of roundMatches) {
          [rm.pair1[0].id, rm.pair1[1].id, rm.pair2[0].id, rm.pair2[1].id].forEach((pid) => {
            playerLastRound[pid] = currentRound;
          });
        }
        for (const rm of roundMatches) {
          scheduledMatches.push({ match: rm, round: currentRound });
        }
        currentRound++;
      }
      const pairTeamMap = /* @__PURE__ */ new Map();
      const stageResult = await execute(
        db,
        `INSERT INTO stages (event_id, name, scoring_type, points_to_win, deuce_allowed, order_index)
       VALUES (?, ?, ?, ?, ?, 1)`,
        slug,
        "Royal Rumble",
        rrScoring.scoring_type || "rally",
        rrScoring.points_to_win || 21,
        rrScoring.deuce_allowed !== false ? 1 : 0
      );
      const rrStageId = stageResult.meta.last_row_id;
      const rrStage = await queryOne(db, "SELECT * FROM stages WHERE id = ?", rrStageId);
      result.stages.push(rrStage);
      const grpResult = await execute(
        db,
        "INSERT INTO groups_t (event_id, name, stage_type, round_number) VALUES (?, ?, ?, ?)",
        slug,
        "Royal Rumble",
        "round_robin",
        1
      );
      const groupId = grpResult.meta.last_row_id;
      await execute(db, "INSERT INTO stage_groups (stage_id, group_id) VALUES (?, ?)", rrStageId, groupId);
      const getOrCreateTeam = /* @__PURE__ */ __name(async (p1, p2) => {
        const key = [p1.id, p2.id].sort((a, b) => a - b).join("-");
        if (pairTeamMap.has(key)) return pairTeamMap.get(key);
        const existing = await queryOne(
          db,
          "SELECT * FROM teams WHERE event_id = ? AND ((player1_id = ? AND player2_id = ?) OR (player1_id = ? AND player2_id = ?))",
          slug,
          p1.id,
          p2.id,
          p2.id,
          p1.id
        );
        if (existing) {
          pairTeamMap.set(key, existing);
          await execute(
            db,
            "INSERT OR IGNORE INTO group_teams (group_id, team_id) VALUES (?, ?)",
            groupId,
            existing.id
          );
          return existing;
        }
        const teamResult = await execute(
          db,
          "INSERT INTO teams (event_id, name, player1_id, player2_id) VALUES (?, ?, ?, ?)",
          slug,
          `Team ${pairTeamMap.size + 1}`,
          p1.id,
          p2.id
        );
        const team = await queryOne(db, "SELECT * FROM teams WHERE id = ?", teamResult.meta.last_row_id);
        await execute(db, "INSERT INTO group_teams (group_id, team_id) VALUES (?, ?)", groupId, team.id);
        pairTeamMap.set(key, team);
        return team;
      }, "getOrCreateTeam");
      let matchNum = 0;
      let currentScheduledRound = -1;
      let courtInRound = 0;
      for (const { match: sm, round } of scheduledMatches) {
        if (round !== currentScheduledRound) {
          currentScheduledRound = round;
          courtInRound = 0;
        }
        const team1 = await getOrCreateTeam(sm.pair1[0], sm.pair1[1]);
        const team2 = await getOrCreateTeam(sm.pair2[0], sm.pair2[1]);
        const courtNum = courtInRound + 1;
        const timeOffset = round * 15;
        const matchResult = await execute(
          db,
          `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, status, court, scheduled_time)
         VALUES (?, ?, ?, ?, 'scheduled', ?, ?)`,
          rrStageId,
          groupId,
          team1.id,
          team2.id,
          `Court ${courtNum}`,
          timeOffset > 0 ? `+${timeOffset}min` : ""
        );
        const match2 = await queryOne(db, "SELECT * FROM matches WHERE id = ?", matchResult.meta.last_row_id);
        result.matches.push(match2);
        matchNum++;
        courtInRound++;
      }
      const grp = await queryOne(db, "SELECT * FROM groups_t WHERE id = ?", groupId);
      result.groups.push({
        ...grp,
        teams: [...pairTeamMap.values()],
        advance_count: 0,
        total_permutations: totalPermutations,
        matches_generated: matchNum,
        courts_used: courtCount
      });
    } else if (format_type === "knockout_only") {
      const koConfig = knockout || {};
      const koScoring = koConfig.scoring || { scoring_type: "rally", points_to_win: 15, deuce_allowed: true };
      const teams = await query(db, "SELECT * FROM teams WHERE event_id = ?", slug);
      if (teams.length < 2) {
        return c.json({ error: "Need at least 2 teams" }, 400);
      }
      let bracketSize = 2;
      while (bracketSize < teams.length) bracketSize *= 2;
      const koStageResult = await execute(
        db,
        `INSERT INTO stages (event_id, name, scoring_type, points_to_win, deuce_allowed, order_index)
       VALUES (?, ?, ?, ?, ?, 1)`,
        slug,
        "Knockout",
        koScoring.scoring_type || "rally",
        koScoring.points_to_win || 21,
        koScoring.deuce_allowed !== false ? 1 : 0
      );
      const koStageId = koStageResult.meta.last_row_id;
      const koStage = await queryOne(db, "SELECT * FROM stages WHERE id = ?", koStageId);
      result.stages.push(koStage);
      const grpResult = await execute(
        db,
        "INSERT INTO groups_t (event_id, name, stage_type, round_number) VALUES (?, ?, ?, ?)",
        slug,
        "Bracket",
        "knockout",
        1
      );
      const groupId = grpResult.meta.last_row_id;
      await execute(db, "INSERT INTO stage_groups (stage_id, group_id) VALUES (?, ?)", koStageId, groupId);
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      const bracket = [...shuffled];
      while (bracket.length < bracketSize) bracket.push(null);
      const firstRoundMatches = [];
      for (let i = 0; i < bracket.length; i += 2) {
        if (bracket[i] && bracket[i + 1]) {
          const matchResult = await execute(
            db,
            `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, status)
           VALUES (?, ?, ?, ?, 'scheduled')`,
            koStageId,
            groupId,
            bracket[i].id,
            bracket[i + 1].id
          );
          const match2 = await queryOne(db, "SELECT * FROM matches WHERE id = ?", matchResult.meta.last_row_id);
          firstRoundMatches.push(match2);
          result.matches.push(match2);
        } else if (bracket[i]) {
          const matchResult = await execute(
            db,
            `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, status, walkover, winner_team_id)
           VALUES (?, ?, ?, ?, 'completed', 1, ?)`,
            koStageId,
            groupId,
            bracket[i].id,
            bracket[i].id,
            bracket[i].id
          );
          const match2 = await queryOne(db, "SELECT * FROM matches WHERE id = ?", matchResult.meta.last_row_id);
          result.matches.push(match2);
        }
      }
      const grp = await queryOne(db, "SELECT * FROM groups_t WHERE id = ?", groupId);
      result.groups.push(grp);
    }
    return c.json({
      success: true,
      message: "Tournament format set up successfully",
      ...result,
      summary: {
        groups_created: result.groups.length,
        stages_created: result.stages.length,
        matches_created: result.matches.length
      }
    });
  } catch (err) {
    console.error("setup-format error:", err);
    return c.json({ error: err.message || "Internal server error" }, 500);
  }
});
var format_default = formatRoutes;

// worker/src/routes/venues.js
var venueRoutes = new Hono2();
venueRoutes.get("/", async (c) => {
  const db = c.env.DB;
  const venues = await query(db, "SELECT * FROM venues ORDER BY name ASC");
  return c.json(venues);
});
venueRoutes.post("/", async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const { name, courts } = body;
  if (!name || !name.trim()) {
    return c.json({ error: "Venue name is required" }, 400);
  }
  const existing = await queryOne(db, "SELECT id FROM venues WHERE name = ?", name.trim());
  if (existing) {
    return c.json({ error: "A venue with this name already exists" }, 409);
  }
  const courtsJson = JSON.stringify(courts || []);
  await execute(db, "INSERT INTO venues (name, courts) VALUES (?, ?)", name.trim(), courtsJson);
  const venue = await queryOne(db, "SELECT * FROM venues WHERE name = ?", name.trim());
  return c.json(venue, 201);
});
venueRoutes.put("/:id", async (c) => {
  const { id } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  const existing = await queryOne(db, "SELECT * FROM venues WHERE id = ?", id);
  if (!existing) {
    return c.json({ error: "Venue not found" }, 404);
  }
  const fields = [];
  const values = [];
  if (body.name !== void 0) {
    fields.push("name = ?");
    values.push(body.name.trim());
  }
  if (body.courts !== void 0) {
    fields.push("courts = ?");
    values.push(JSON.stringify(body.courts));
  }
  if (fields.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }
  values.push(id);
  await execute(db, `UPDATE venues SET ${fields.join(", ")} WHERE id = ?`, ...values);
  const venue = await queryOne(db, "SELECT * FROM venues WHERE id = ?", id);
  return c.json(venue);
});
venueRoutes.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const db = c.env.DB;
  const existing = await queryOne(db, "SELECT id FROM venues WHERE id = ?", id);
  if (!existing) {
    return c.json({ error: "Venue not found" }, 404);
  }
  await execute(db, "DELETE FROM venues WHERE id = ?", id);
  return c.json({ success: true });
});
var venues_default = venueRoutes;

// worker/src/index.js
var app = new Hono2();
app.use("/*", cors({
  origin: /* @__PURE__ */ __name((origin, c) => {
    const allowed = c.env.ALLOWED_ORIGINS || "*";
    if (allowed === "*" || !origin) return "*";
    const origins = allowed.split(",").map((o) => o.trim());
    if (origins.includes(origin)) return origin;
    if (origins.includes("*")) return "*";
    return origin;
  }, "origin"),
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  maxAge: 86400
}));
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
app.get("/api/players", async (c) => {
  const db = c.env.DB;
  const players = await query(db, `
    SELECT 
      MIN(id) AS id,
      name,
      COALESCE(NULLIF(nickname, ''), name) AS display_nickname,
      gender, paddle, handedness, email, avatar,
      COUNT(*) AS event_count,
      GROUP_CONCAT(DISTINCT event_id) AS event_ids
    FROM participants
    GROUP BY name
    ORDER BY name ASC
  `);
  return c.json(players);
});
app.route("/api/auth", auth_default);
app.get("/api/banners/*", async (c) => {
  const filename = c.req.path.replace("/api/banners/", "");
  const bucket = c.env.BUCKET;
  if (!bucket) return c.json({ error: "Storage not configured" }, 500);
  try {
    const obj = await bucket.get(`banners/${filename}`);
    if (!obj) return c.json({ error: "Not found" }, 404);
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("Cache-Control", "public, max-age=31536000");
    return new Response(obj.body, { headers });
  } catch (err) {
    return c.json({ error: "Not found" }, 404);
  }
});
app.get("/api/events", async (c) => {
  const db = c.env.DB;
  const events = await query(db, "SELECT * FROM events ORDER BY date DESC");
  const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const upcoming = events.filter((e) => e.date >= now);
  const past = events.filter((e) => e.date < now);
  return c.json({ upcoming, past, all: events });
});
app.get("/api/events/:slug", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const event = await queryOne(db, "SELECT * FROM events WHERE id = ?", slug);
  if (!event) return c.json({ error: "Event not found" }, 404);
  const allParticipants = await query(
    db,
    "SELECT * FROM participants WHERE event_id = ? ORDER BY name ASC",
    slug
  );
  const allTeams = await query(db, `
    SELECT t.*, 
      p1.name AS player1_name, COALESCE(p1.nickname, p1.name) AS player1_nickname, p1.gender AS player1_gender, p1.handedness AS player1_handedness, p1.paddle AS player1_paddle,
      p2.name AS player2_name, COALESCE(p2.nickname, p2.name) AS player2_nickname, p2.gender AS player2_gender, p2.handedness AS player2_handedness, p2.paddle AS player2_paddle
    FROM teams t
    LEFT JOIN participants p1 ON t.player1_id = p1.id
    LEFT JOIN participants p2 ON t.player2_id = p2.id
    WHERE t.event_id = ?
    ORDER BY t.name ASC
  `, slug);
  const stages = await query(db, "SELECT * FROM stages WHERE event_id = ? ORDER BY order_index ASC", slug);
  const stagesWithData = [];
  for (const stage of stages) {
    const groups = await query(db, `
      SELECT g.* FROM groups_t g
      JOIN stage_groups sg ON g.id = sg.group_id
      WHERE sg.stage_id = ?
      ORDER BY g.name ASC
    `, stage.id);
    const groupsWithData = [];
    for (const group of groups) {
      const teams = await query(db, `
        SELECT t.*, 
          p1.name AS player1_name, COALESCE(p1.nickname, p1.name) AS player1_nickname, p1.gender AS player1_gender,
          p1.paddle AS player1_paddle, p1.handedness AS player1_handedness,
          p2.name AS player2_name, COALESCE(p2.nickname, p2.name) AS player2_nickname, p2.gender AS player2_gender,
          p2.paddle AS player2_paddle, p2.handedness AS player2_handedness
        FROM teams t
        JOIN group_teams gt ON t.id = gt.team_id
        LEFT JOIN participants p1 ON t.player1_id = p1.id
        LEFT JOIN participants p2 ON t.player2_id = p2.id
        WHERE gt.group_id = ?
      `, group.id);
      const matches = await query(db, `
        SELECT m.*,
          t1.name AS team1_name, t2.name AS team2_name,
          COALESCE(NULLIF(m.team1_player1_name,''), p1.name) AS team1_player1_name, COALESCE(p1.nickname, p1.name) AS team1_player1_nickname, p1.gender AS team1_player1_gender, p1.handedness AS team1_player1_handedness,
          COALESCE(NULLIF(m.team1_player2_name,''), p2.name) AS team1_player2_name, COALESCE(p2.nickname, p2.name) AS team1_player2_nickname, p2.gender AS team1_player2_gender, p2.handedness AS team1_player2_handedness,
          COALESCE(NULLIF(m.team2_player1_name,''), p3.name) AS team2_player1_name, COALESCE(p3.nickname, p3.name) AS team2_player1_nickname, p3.gender AS team2_player1_gender, p3.handedness AS team2_player1_handedness,
          COALESCE(NULLIF(m.team2_player2_name,''), p4.name) AS team2_player2_name, COALESCE(p4.nickname, p4.name) AS team2_player2_nickname, p4.gender AS team2_player2_gender, p4.handedness AS team2_player2_handedness
        FROM matches m
        LEFT JOIN teams t1 ON m.team1_id = t1.id
        LEFT JOIN teams t2 ON m.team2_id = t2.id
        LEFT JOIN participants p1 ON t1.player1_id = p1.id
        LEFT JOIN participants p2 ON t1.player2_id = p2.id
        LEFT JOIN participants p3 ON t2.player1_id = p3.id
        LEFT JOIN participants p4 ON t2.player2_id = p4.id
        WHERE m.group_id = ?
        ORDER BY m.id ASC
      `, group.id);
      groupsWithData.push({ ...group, teams, matches });
    }
    stagesWithData.push({ ...stage, groups: groupsWithData });
  }
  return c.json({ event, stages: stagesWithData, allTeams, allParticipants });
});
app.get("/api/events/:slug/matches/live", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const matches = await query(db, `
    SELECT m.*,
      t1.name AS team1_name, t2.name AS team2_name,
      COALESCE(NULLIF(m.team1_player1_name,''), p1.name) AS team1_player1_name, COALESCE(p1.nickname, p1.name) AS team1_player1_nickname, p1.gender AS team1_player1_gender, p1.handedness AS team1_player1_handedness,
      COALESCE(NULLIF(m.team1_player2_name,''), p2.name) AS team1_player2_name, COALESCE(p2.nickname, p2.name) AS team1_player2_nickname, p2.gender AS team1_player2_gender, p2.handedness AS team1_player2_handedness,
      COALESCE(NULLIF(m.team2_player1_name,''), p3.name) AS team2_player1_name, COALESCE(p3.nickname, p3.name) AS team2_player1_nickname, p3.gender AS team2_player1_gender, p3.handedness AS team2_player1_handedness,
      COALESCE(NULLIF(m.team2_player2_name,''), p4.name) AS team2_player2_name, COALESCE(p4.nickname, p4.name) AS team2_player2_nickname, p4.gender AS team2_player2_gender, p4.handedness AS team2_player2_handedness,
      s.scoring_type, s.points_to_win, s.deuce_allowed,
      g.name AS group_name,
      s.name AS stage_name
    FROM matches m
    JOIN stages s ON m.stage_id = s.id
    JOIN groups_t g ON m.group_id = g.id
    LEFT JOIN teams t1 ON m.team1_id = t1.id
    LEFT JOIN teams t2 ON m.team2_id = t2.id
    LEFT JOIN participants p1 ON t1.player1_id = p1.id
    LEFT JOIN participants p2 ON t1.player2_id = p2.id
    LEFT JOIN participants p3 ON t2.player1_id = p3.id
    LEFT JOIN participants p4 ON t2.player2_id = p4.id
    WHERE s.event_id = ? AND m.status = 'live'
    ORDER BY m.id ASC
  `, slug);
  const result = [];
  for (const match2 of matches) {
    const points = await query(db, `
      SELECT * FROM match_points WHERE match_id = ? ORDER BY point_number ASC
    `, match2.id);
    result.push({ ...match2, points });
  }
  return c.json({ matches: result });
});
app.get("/api/events/:slug/standings", async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const event = await queryOne(db, "SELECT format_type FROM events WHERE id = ?", slug);
  if (!event) return c.json({ error: "Event not found" }, 404);
  const isRoyalRumble = event.format_type === "royal_rumble";
  const matches = await query(db, `
    SELECT m.*,
      t1.name AS team1_name, t2.name AS team2_name,
      COALESCE(NULLIF(m.team1_player1_name,''), p1.name) AS team1_player1_name,
      COALESCE(NULLIF(m.team1_player2_name,''), p2.name) AS team1_player2_name,
      COALESCE(NULLIF(m.team2_player1_name,''), p3.name) AS team2_player1_name,
      COALESCE(NULLIF(m.team2_player2_name,''), p4.name) AS team2_player2_name
    FROM matches m
    JOIN stages s ON m.stage_id = s.id
    LEFT JOIN teams t1 ON m.team1_id = t1.id
    LEFT JOIN teams t2 ON m.team2_id = t2.id
    LEFT JOIN participants p1 ON t1.player1_id = p1.id
    LEFT JOIN participants p2 ON t1.player2_id = p2.id
    LEFT JOIN participants p3 ON t2.player1_id = p3.id
    LEFT JOIN participants p4 ON t2.player2_id = p4.id
    WHERE s.event_id = ? AND m.status = 'completed'
  `, slug);
  const playerMap = /* @__PURE__ */ new Map();
  for (const m of matches) {
    const team1Players = [m.team1_player1_name, m.team1_player2_name].filter(Boolean);
    const team2Players = [m.team2_player1_name, m.team2_player2_name].filter(Boolean);
    const team1Won = m.winner_team_id === m.team1_id;
    const team2Won = m.winner_team_id === m.team2_id;
    for (const name of team1Players) {
      if (!playerMap.has(name)) playerMap.set(name, { name, played: 0, wins: 0, losses: 0, pf: 0, pa: 0 });
      const p = playerMap.get(name);
      p.played++;
      p.pf += m.team1_score;
      p.pa += m.team2_score;
      if (team1Won) p.wins++;
      else if (team2Won) p.losses++;
    }
    for (const name of team2Players) {
      if (!playerMap.has(name)) playerMap.set(name, { name, played: 0, wins: 0, losses: 0, pf: 0, pa: 0 });
      const p = playerMap.get(name);
      p.played++;
      p.pf += m.team2_score;
      p.pa += m.team1_score;
      if (team2Won) p.wins++;
      else if (team1Won) p.losses++;
    }
  }
  const playerStandings = Array.from(playerMap.values()).map((p) => ({ ...p, diff: p.pf - p.pa })).sort((a, b) => b.wins - a.wins || b.diff - a.diff || b.pf - a.pf);
  if (isRoyalRumble) {
    return c.json({ player_standings: playerStandings, team_standings: [] });
  }
  const teamMap = /* @__PURE__ */ new Map();
  for (const m of matches) {
    if (!m.team1_id || !m.team2_id) continue;
    for (const [teamId, teamName, score, oppScore, isWinner] of [
      [m.team1_id, m.team1_name, m.team1_score, m.team2_score, m.winner_team_id === m.team1_id],
      [m.team2_id, m.team2_name, m.team2_score, m.team1_score, m.winner_team_id === m.team2_id]
    ]) {
      if (!teamMap.has(teamId)) teamMap.set(teamId, { team_id: teamId, team_name: teamName, played: 0, wins: 0, losses: 0, pf: 0, pa: 0 });
      const t = teamMap.get(teamId);
      t.played++;
      t.pf += score;
      t.pa += oppScore;
      if (isWinner) t.wins++;
      else t.losses++;
    }
  }
  const teamIds = Array.from(teamMap.keys());
  if (teamIds.length > 0) {
    const placeholders = teamIds.map(() => "?").join(",");
    const teamPlayers = await query(db, `
      SELECT t.id AS team_id,
        p1.name AS player1_name, COALESCE(p1.nickname, p1.name) AS player1_nickname, p1.gender AS player1_gender,
        p2.name AS player2_name, COALESCE(p2.nickname, p2.name) AS player2_nickname, p2.gender AS player2_gender
      FROM teams t
      LEFT JOIN participants p1 ON t.player1_id = p1.id
      LEFT JOIN participants p2 ON t.player2_id = p2.id
      WHERE t.id IN (${placeholders})
    `, ...teamIds);
    for (const tp of teamPlayers) {
      if (teamMap.has(tp.team_id)) {
        Object.assign(teamMap.get(tp.team_id), {
          player1_name: tp.player1_name,
          player1_nickname: tp.player1_nickname,
          player1_gender: tp.player1_gender,
          player2_name: tp.player2_name,
          player2_nickname: tp.player2_nickname,
          player2_gender: tp.player2_gender
        });
      }
    }
  }
  const teamStandings = Array.from(teamMap.values()).map((t) => ({ ...t, diff: t.pf - t.pa })).sort((a, b) => b.wins - a.wins || b.diff - a.diff || b.pf - a.pf);
  return c.json({ player_standings: playerStandings, team_standings: teamStandings });
});
app.get("/api/events/:slug/matches/:id/points", async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const match2 = await queryOne(db, `
    SELECT m.id FROM matches m
    JOIN stages s ON m.stage_id = s.id
    WHERE s.event_id = ? AND m.id = ?
  `, slug, id);
  if (!match2) return c.json({ error: "Match not found" }, 404);
  const points = await query(db, `
    SELECT * FROM match_points WHERE match_id = ? ORDER BY point_number ASC
  `, id);
  return c.json({ points });
});
app.use("/api/admin/*", async (c, next) => {
  const authMiddleware = requireAdmin(c.env);
  return authMiddleware(c, next);
});
app.route("/api/admin/events", events_default);
app.route("/api/admin/events", participants_default);
app.route("/api/admin/events", teams_default);
app.route("/api/admin/events", groups_default);
app.route("/api/admin/events", stages_default);
app.route("/api/admin/events", matches_default);
app.route("/api/admin/events", format_default);
app.route("/api/admin/venues", venues_default);
app.route("/api/admin/players", players_default);
app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error", details: err.message }, 500);
});
var src_default = app;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-8TUvhJ/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-8TUvhJ/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
