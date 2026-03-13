"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // node_modules/engine.io-parser/build/esm/commons.js
  var PACKET_TYPES = /* @__PURE__ */ Object.create(null);
  PACKET_TYPES["open"] = "0";
  PACKET_TYPES["close"] = "1";
  PACKET_TYPES["ping"] = "2";
  PACKET_TYPES["pong"] = "3";
  PACKET_TYPES["message"] = "4";
  PACKET_TYPES["upgrade"] = "5";
  PACKET_TYPES["noop"] = "6";
  var PACKET_TYPES_REVERSE = /* @__PURE__ */ Object.create(null);
  Object.keys(PACKET_TYPES).forEach((key) => {
    PACKET_TYPES_REVERSE[PACKET_TYPES[key]] = key;
  });
  var ERROR_PACKET = { type: "error", data: "parser error" };

  // node_modules/engine.io-parser/build/esm/encodePacket.browser.js
  var withNativeBlob = typeof Blob === "function" || typeof Blob !== "undefined" && Object.prototype.toString.call(Blob) === "[object BlobConstructor]";
  var withNativeArrayBuffer = typeof ArrayBuffer === "function";
  var isView = (obj) => {
    return typeof ArrayBuffer.isView === "function" ? ArrayBuffer.isView(obj) : obj && obj.buffer instanceof ArrayBuffer;
  };
  var encodePacket = ({ type, data }, supportsBinary, callback) => {
    if (withNativeBlob && data instanceof Blob) {
      if (supportsBinary) {
        return callback(data);
      } else {
        return encodeBlobAsBase64(data, callback);
      }
    } else if (withNativeArrayBuffer && (data instanceof ArrayBuffer || isView(data))) {
      if (supportsBinary) {
        return callback(data);
      } else {
        return encodeBlobAsBase64(new Blob([data]), callback);
      }
    }
    return callback(PACKET_TYPES[type] + (data || ""));
  };
  var encodeBlobAsBase64 = (data, callback) => {
    const fileReader = new FileReader();
    fileReader.onload = function() {
      const content = fileReader.result.split(",")[1];
      callback("b" + (content || ""));
    };
    return fileReader.readAsDataURL(data);
  };
  function toArray(data) {
    if (data instanceof Uint8Array) {
      return data;
    } else if (data instanceof ArrayBuffer) {
      return new Uint8Array(data);
    } else {
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
  }
  var TEXT_ENCODER;
  function encodePacketToBinary(packet, callback) {
    if (withNativeBlob && packet.data instanceof Blob) {
      return packet.data.arrayBuffer().then(toArray).then(callback);
    } else if (withNativeArrayBuffer && (packet.data instanceof ArrayBuffer || isView(packet.data))) {
      return callback(toArray(packet.data));
    }
    encodePacket(packet, false, (encoded) => {
      if (!TEXT_ENCODER) {
        TEXT_ENCODER = new TextEncoder();
      }
      callback(TEXT_ENCODER.encode(encoded));
    });
  }

  // node_modules/engine.io-parser/build/esm/contrib/base64-arraybuffer.js
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var lookup = typeof Uint8Array === "undefined" ? [] : new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  var decode = (base64) => {
    let bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
    if (base64[base64.length - 1] === "=") {
      bufferLength--;
      if (base64[base64.length - 2] === "=") {
        bufferLength--;
      }
    }
    const arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
    for (i = 0; i < len; i += 4) {
      encoded1 = lookup[base64.charCodeAt(i)];
      encoded2 = lookup[base64.charCodeAt(i + 1)];
      encoded3 = lookup[base64.charCodeAt(i + 2)];
      encoded4 = lookup[base64.charCodeAt(i + 3)];
      bytes[p++] = encoded1 << 2 | encoded2 >> 4;
      bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
      bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
    }
    return arraybuffer;
  };

  // node_modules/engine.io-parser/build/esm/decodePacket.browser.js
  var withNativeArrayBuffer2 = typeof ArrayBuffer === "function";
  var decodePacket = (encodedPacket, binaryType) => {
    if (typeof encodedPacket !== "string") {
      return {
        type: "message",
        data: mapBinary(encodedPacket, binaryType)
      };
    }
    const type = encodedPacket.charAt(0);
    if (type === "b") {
      return {
        type: "message",
        data: decodeBase64Packet(encodedPacket.substring(1), binaryType)
      };
    }
    const packetType = PACKET_TYPES_REVERSE[type];
    if (!packetType) {
      return ERROR_PACKET;
    }
    return encodedPacket.length > 1 ? {
      type: PACKET_TYPES_REVERSE[type],
      data: encodedPacket.substring(1)
    } : {
      type: PACKET_TYPES_REVERSE[type]
    };
  };
  var decodeBase64Packet = (data, binaryType) => {
    if (withNativeArrayBuffer2) {
      const decoded = decode(data);
      return mapBinary(decoded, binaryType);
    } else {
      return { base64: true, data };
    }
  };
  var mapBinary = (data, binaryType) => {
    switch (binaryType) {
      case "blob":
        if (data instanceof Blob) {
          return data;
        } else {
          return new Blob([data]);
        }
      case "arraybuffer":
      default:
        if (data instanceof ArrayBuffer) {
          return data;
        } else {
          return data.buffer;
        }
    }
  };

  // node_modules/engine.io-parser/build/esm/index.js
  var SEPARATOR = String.fromCharCode(30);
  var encodePayload = (packets, callback) => {
    const length = packets.length;
    const encodedPackets = new Array(length);
    let count = 0;
    packets.forEach((packet, i) => {
      encodePacket(packet, false, (encodedPacket) => {
        encodedPackets[i] = encodedPacket;
        if (++count === length) {
          callback(encodedPackets.join(SEPARATOR));
        }
      });
    });
  };
  var decodePayload = (encodedPayload, binaryType) => {
    const encodedPackets = encodedPayload.split(SEPARATOR);
    const packets = [];
    for (let i = 0; i < encodedPackets.length; i++) {
      const decodedPacket = decodePacket(encodedPackets[i], binaryType);
      packets.push(decodedPacket);
      if (decodedPacket.type === "error") {
        break;
      }
    }
    return packets;
  };
  function createPacketEncoderStream() {
    return new TransformStream({
      transform(packet, controller) {
        encodePacketToBinary(packet, (encodedPacket) => {
          const payloadLength = encodedPacket.length;
          let header;
          if (payloadLength < 126) {
            header = new Uint8Array(1);
            new DataView(header.buffer).setUint8(0, payloadLength);
          } else if (payloadLength < 65536) {
            header = new Uint8Array(3);
            const view = new DataView(header.buffer);
            view.setUint8(0, 126);
            view.setUint16(1, payloadLength);
          } else {
            header = new Uint8Array(9);
            const view = new DataView(header.buffer);
            view.setUint8(0, 127);
            view.setBigUint64(1, BigInt(payloadLength));
          }
          if (packet.data && typeof packet.data !== "string") {
            header[0] |= 128;
          }
          controller.enqueue(header);
          controller.enqueue(encodedPacket);
        });
      }
    });
  }
  var TEXT_DECODER;
  function totalLength(chunks) {
    return chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  }
  function concatChunks(chunks, size) {
    if (chunks[0].length === size) {
      return chunks.shift();
    }
    const buffer = new Uint8Array(size);
    let j = 0;
    for (let i = 0; i < size; i++) {
      buffer[i] = chunks[0][j++];
      if (j === chunks[0].length) {
        chunks.shift();
        j = 0;
      }
    }
    if (chunks.length && j < chunks[0].length) {
      chunks[0] = chunks[0].slice(j);
    }
    return buffer;
  }
  function createPacketDecoderStream(maxPayload, binaryType) {
    if (!TEXT_DECODER) {
      TEXT_DECODER = new TextDecoder();
    }
    const chunks = [];
    let state = 0;
    let expectedLength = -1;
    let isBinary2 = false;
    return new TransformStream({
      transform(chunk, controller) {
        chunks.push(chunk);
        while (true) {
          if (state === 0) {
            if (totalLength(chunks) < 1) {
              break;
            }
            const header = concatChunks(chunks, 1);
            isBinary2 = (header[0] & 128) === 128;
            expectedLength = header[0] & 127;
            if (expectedLength < 126) {
              state = 3;
            } else if (expectedLength === 126) {
              state = 1;
            } else {
              state = 2;
            }
          } else if (state === 1) {
            if (totalLength(chunks) < 2) {
              break;
            }
            const headerArray = concatChunks(chunks, 2);
            expectedLength = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length).getUint16(0);
            state = 3;
          } else if (state === 2) {
            if (totalLength(chunks) < 8) {
              break;
            }
            const headerArray = concatChunks(chunks, 8);
            const view = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length);
            const n = view.getUint32(0);
            if (n > Math.pow(2, 53 - 32) - 1) {
              controller.enqueue(ERROR_PACKET);
              break;
            }
            expectedLength = n * Math.pow(2, 32) + view.getUint32(4);
            state = 3;
          } else {
            if (totalLength(chunks) < expectedLength) {
              break;
            }
            const data = concatChunks(chunks, expectedLength);
            controller.enqueue(decodePacket(isBinary2 ? data : TEXT_DECODER.decode(data), binaryType));
            state = 0;
          }
          if (expectedLength === 0 || expectedLength > maxPayload) {
            controller.enqueue(ERROR_PACKET);
            break;
          }
        }
      }
    });
  }
  var protocol = 4;

  // node_modules/@socket.io/component-emitter/lib/esm/index.js
  function Emitter(obj) {
    if (obj) return mixin(obj);
  }
  function mixin(obj) {
    for (var key in Emitter.prototype) {
      obj[key] = Emitter.prototype[key];
    }
    return obj;
  }
  Emitter.prototype.on = Emitter.prototype.addEventListener = function(event, fn) {
    this._callbacks = this._callbacks || {};
    (this._callbacks["$" + event] = this._callbacks["$" + event] || []).push(fn);
    return this;
  };
  Emitter.prototype.once = function(event, fn) {
    function on2() {
      this.off(event, on2);
      fn.apply(this, arguments);
    }
    on2.fn = fn;
    this.on(event, on2);
    return this;
  };
  Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = Emitter.prototype.removeEventListener = function(event, fn) {
    this._callbacks = this._callbacks || {};
    if (0 == arguments.length) {
      this._callbacks = {};
      return this;
    }
    var callbacks = this._callbacks["$" + event];
    if (!callbacks) return this;
    if (1 == arguments.length) {
      delete this._callbacks["$" + event];
      return this;
    }
    var cb;
    for (var i = 0; i < callbacks.length; i++) {
      cb = callbacks[i];
      if (cb === fn || cb.fn === fn) {
        callbacks.splice(i, 1);
        break;
      }
    }
    if (callbacks.length === 0) {
      delete this._callbacks["$" + event];
    }
    return this;
  };
  Emitter.prototype.emit = function(event) {
    this._callbacks = this._callbacks || {};
    var args = new Array(arguments.length - 1), callbacks = this._callbacks["$" + event];
    for (var i = 1; i < arguments.length; i++) {
      args[i - 1] = arguments[i];
    }
    if (callbacks) {
      callbacks = callbacks.slice(0);
      for (var i = 0, len = callbacks.length; i < len; ++i) {
        callbacks[i].apply(this, args);
      }
    }
    return this;
  };
  Emitter.prototype.emitReserved = Emitter.prototype.emit;
  Emitter.prototype.listeners = function(event) {
    this._callbacks = this._callbacks || {};
    return this._callbacks["$" + event] || [];
  };
  Emitter.prototype.hasListeners = function(event) {
    return !!this.listeners(event).length;
  };

  // node_modules/engine.io-client/build/esm/globals.js
  var nextTick = (() => {
    const isPromiseAvailable = typeof Promise === "function" && typeof Promise.resolve === "function";
    if (isPromiseAvailable) {
      return (cb) => Promise.resolve().then(cb);
    } else {
      return (cb, setTimeoutFn) => setTimeoutFn(cb, 0);
    }
  })();
  var globalThisShim = (() => {
    if (typeof self !== "undefined") {
      return self;
    } else if (typeof window !== "undefined") {
      return window;
    } else {
      return Function("return this")();
    }
  })();
  var defaultBinaryType = "arraybuffer";
  function createCookieJar() {
  }

  // node_modules/engine.io-client/build/esm/util.js
  function pick(obj, ...attr) {
    return attr.reduce((acc, k) => {
      if (obj.hasOwnProperty(k)) {
        acc[k] = obj[k];
      }
      return acc;
    }, {});
  }
  var NATIVE_SET_TIMEOUT = globalThisShim.setTimeout;
  var NATIVE_CLEAR_TIMEOUT = globalThisShim.clearTimeout;
  function installTimerFunctions(obj, opts) {
    if (opts.useNativeTimers) {
      obj.setTimeoutFn = NATIVE_SET_TIMEOUT.bind(globalThisShim);
      obj.clearTimeoutFn = NATIVE_CLEAR_TIMEOUT.bind(globalThisShim);
    } else {
      obj.setTimeoutFn = globalThisShim.setTimeout.bind(globalThisShim);
      obj.clearTimeoutFn = globalThisShim.clearTimeout.bind(globalThisShim);
    }
  }
  var BASE64_OVERHEAD = 1.33;
  function byteLength(obj) {
    if (typeof obj === "string") {
      return utf8Length(obj);
    }
    return Math.ceil((obj.byteLength || obj.size) * BASE64_OVERHEAD);
  }
  function utf8Length(str) {
    let c = 0, length = 0;
    for (let i = 0, l = str.length; i < l; i++) {
      c = str.charCodeAt(i);
      if (c < 128) {
        length += 1;
      } else if (c < 2048) {
        length += 2;
      } else if (c < 55296 || c >= 57344) {
        length += 3;
      } else {
        i++;
        length += 4;
      }
    }
    return length;
  }
  function randomString() {
    return Date.now().toString(36).substring(3) + Math.random().toString(36).substring(2, 5);
  }

  // node_modules/engine.io-client/build/esm/contrib/parseqs.js
  function encode(obj) {
    let str = "";
    for (let i in obj) {
      if (obj.hasOwnProperty(i)) {
        if (str.length)
          str += "&";
        str += encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]);
      }
    }
    return str;
  }
  function decode2(qs) {
    let qry = {};
    let pairs = qs.split("&");
    for (let i = 0, l = pairs.length; i < l; i++) {
      let pair = pairs[i].split("=");
      qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return qry;
  }

  // node_modules/engine.io-client/build/esm/transport.js
  var TransportError = class extends Error {
    constructor(reason, description, context) {
      super(reason);
      this.description = description;
      this.context = context;
      this.type = "TransportError";
    }
  };
  var Transport = class extends Emitter {
    /**
     * Transport abstract constructor.
     *
     * @param {Object} opts - options
     * @protected
     */
    constructor(opts) {
      super();
      this.writable = false;
      installTimerFunctions(this, opts);
      this.opts = opts;
      this.query = opts.query;
      this.socket = opts.socket;
      this.supportsBinary = !opts.forceBase64;
    }
    /**
     * Emits an error.
     *
     * @param {String} reason
     * @param description
     * @param context - the error context
     * @return {Transport} for chaining
     * @protected
     */
    onError(reason, description, context) {
      super.emitReserved("error", new TransportError(reason, description, context));
      return this;
    }
    /**
     * Opens the transport.
     */
    open() {
      this.readyState = "opening";
      this.doOpen();
      return this;
    }
    /**
     * Closes the transport.
     */
    close() {
      if (this.readyState === "opening" || this.readyState === "open") {
        this.doClose();
        this.onClose();
      }
      return this;
    }
    /**
     * Sends multiple packets.
     *
     * @param {Array} packets
     */
    send(packets) {
      if (this.readyState === "open") {
        this.write(packets);
      } else {
      }
    }
    /**
     * Called upon open
     *
     * @protected
     */
    onOpen() {
      this.readyState = "open";
      this.writable = true;
      super.emitReserved("open");
    }
    /**
     * Called with data.
     *
     * @param {String} data
     * @protected
     */
    onData(data) {
      const packet = decodePacket(data, this.socket.binaryType);
      this.onPacket(packet);
    }
    /**
     * Called with a decoded packet.
     *
     * @protected
     */
    onPacket(packet) {
      super.emitReserved("packet", packet);
    }
    /**
     * Called upon close.
     *
     * @protected
     */
    onClose(details) {
      this.readyState = "closed";
      super.emitReserved("close", details);
    }
    /**
     * Pauses the transport, in order not to lose packets during an upgrade.
     *
     * @param onPause
     */
    pause(onPause) {
    }
    createUri(schema, query = {}) {
      return schema + "://" + this._hostname() + this._port() + this.opts.path + this._query(query);
    }
    _hostname() {
      const hostname = this.opts.hostname;
      return hostname.indexOf(":") === -1 ? hostname : "[" + hostname + "]";
    }
    _port() {
      if (this.opts.port && (this.opts.secure && Number(this.opts.port) !== 443 || !this.opts.secure && Number(this.opts.port) !== 80)) {
        return ":" + this.opts.port;
      } else {
        return "";
      }
    }
    _query(query) {
      const encodedQuery = encode(query);
      return encodedQuery.length ? "?" + encodedQuery : "";
    }
  };

  // node_modules/engine.io-client/build/esm/transports/polling.js
  var Polling = class extends Transport {
    constructor() {
      super(...arguments);
      this._polling = false;
    }
    get name() {
      return "polling";
    }
    /**
     * Opens the socket (triggers polling). We write a PING message to determine
     * when the transport is open.
     *
     * @protected
     */
    doOpen() {
      this._poll();
    }
    /**
     * Pauses polling.
     *
     * @param {Function} onPause - callback upon buffers are flushed and transport is paused
     * @package
     */
    pause(onPause) {
      this.readyState = "pausing";
      const pause = () => {
        this.readyState = "paused";
        onPause();
      };
      if (this._polling || !this.writable) {
        let total = 0;
        if (this._polling) {
          total++;
          this.once("pollComplete", function() {
            --total || pause();
          });
        }
        if (!this.writable) {
          total++;
          this.once("drain", function() {
            --total || pause();
          });
        }
      } else {
        pause();
      }
    }
    /**
     * Starts polling cycle.
     *
     * @private
     */
    _poll() {
      this._polling = true;
      this.doPoll();
      this.emitReserved("poll");
    }
    /**
     * Overloads onData to detect payloads.
     *
     * @protected
     */
    onData(data) {
      const callback = (packet) => {
        if ("opening" === this.readyState && packet.type === "open") {
          this.onOpen();
        }
        if ("close" === packet.type) {
          this.onClose({ description: "transport closed by the server" });
          return false;
        }
        this.onPacket(packet);
      };
      decodePayload(data, this.socket.binaryType).forEach(callback);
      if ("closed" !== this.readyState) {
        this._polling = false;
        this.emitReserved("pollComplete");
        if ("open" === this.readyState) {
          this._poll();
        } else {
        }
      }
    }
    /**
     * For polling, send a close packet.
     *
     * @protected
     */
    doClose() {
      const close = () => {
        this.write([{ type: "close" }]);
      };
      if ("open" === this.readyState) {
        close();
      } else {
        this.once("open", close);
      }
    }
    /**
     * Writes a packets payload.
     *
     * @param {Array} packets - data packets
     * @protected
     */
    write(packets) {
      this.writable = false;
      encodePayload(packets, (data) => {
        this.doWrite(data, () => {
          this.writable = true;
          this.emitReserved("drain");
        });
      });
    }
    /**
     * Generates uri for connection.
     *
     * @private
     */
    uri() {
      const schema = this.opts.secure ? "https" : "http";
      const query = this.query || {};
      if (false !== this.opts.timestampRequests) {
        query[this.opts.timestampParam] = randomString();
      }
      if (!this.supportsBinary && !query.sid) {
        query.b64 = 1;
      }
      return this.createUri(schema, query);
    }
  };

  // node_modules/engine.io-client/build/esm/contrib/has-cors.js
  var value = false;
  try {
    value = typeof XMLHttpRequest !== "undefined" && "withCredentials" in new XMLHttpRequest();
  } catch (err) {
  }
  var hasCORS = value;

  // node_modules/engine.io-client/build/esm/transports/polling-xhr.js
  function empty() {
  }
  var BaseXHR = class extends Polling {
    /**
     * XHR Polling constructor.
     *
     * @param {Object} opts
     * @package
     */
    constructor(opts) {
      super(opts);
      if (typeof location !== "undefined") {
        const isSSL = "https:" === location.protocol;
        let port = location.port;
        if (!port) {
          port = isSSL ? "443" : "80";
        }
        this.xd = typeof location !== "undefined" && opts.hostname !== location.hostname || port !== opts.port;
      }
    }
    /**
     * Sends data.
     *
     * @param {String} data to send.
     * @param {Function} called upon flush.
     * @private
     */
    doWrite(data, fn) {
      const req = this.request({
        method: "POST",
        data
      });
      req.on("success", fn);
      req.on("error", (xhrStatus, context) => {
        this.onError("xhr post error", xhrStatus, context);
      });
    }
    /**
     * Starts a poll cycle.
     *
     * @private
     */
    doPoll() {
      const req = this.request();
      req.on("data", this.onData.bind(this));
      req.on("error", (xhrStatus, context) => {
        this.onError("xhr poll error", xhrStatus, context);
      });
      this.pollXhr = req;
    }
  };
  var Request = class _Request extends Emitter {
    /**
     * Request constructor
     *
     * @param {Object} options
     * @package
     */
    constructor(createRequest, uri, opts) {
      super();
      this.createRequest = createRequest;
      installTimerFunctions(this, opts);
      this._opts = opts;
      this._method = opts.method || "GET";
      this._uri = uri;
      this._data = void 0 !== opts.data ? opts.data : null;
      this._create();
    }
    /**
     * Creates the XHR object and sends the request.
     *
     * @private
     */
    _create() {
      var _a;
      const opts = pick(this._opts, "agent", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "autoUnref");
      opts.xdomain = !!this._opts.xd;
      const xhr = this._xhr = this.createRequest(opts);
      try {
        xhr.open(this._method, this._uri, true);
        try {
          if (this._opts.extraHeaders) {
            xhr.setDisableHeaderCheck && xhr.setDisableHeaderCheck(true);
            for (let i in this._opts.extraHeaders) {
              if (this._opts.extraHeaders.hasOwnProperty(i)) {
                xhr.setRequestHeader(i, this._opts.extraHeaders[i]);
              }
            }
          }
        } catch (e) {
        }
        if ("POST" === this._method) {
          try {
            xhr.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
          } catch (e) {
          }
        }
        try {
          xhr.setRequestHeader("Accept", "*/*");
        } catch (e) {
        }
        (_a = this._opts.cookieJar) === null || _a === void 0 ? void 0 : _a.addCookies(xhr);
        if ("withCredentials" in xhr) {
          xhr.withCredentials = this._opts.withCredentials;
        }
        if (this._opts.requestTimeout) {
          xhr.timeout = this._opts.requestTimeout;
        }
        xhr.onreadystatechange = () => {
          var _a2;
          if (xhr.readyState === 3) {
            (_a2 = this._opts.cookieJar) === null || _a2 === void 0 ? void 0 : _a2.parseCookies(
              // @ts-ignore
              xhr.getResponseHeader("set-cookie")
            );
          }
          if (4 !== xhr.readyState)
            return;
          if (200 === xhr.status || 1223 === xhr.status) {
            this._onLoad();
          } else {
            this.setTimeoutFn(() => {
              this._onError(typeof xhr.status === "number" ? xhr.status : 0);
            }, 0);
          }
        };
        xhr.send(this._data);
      } catch (e) {
        this.setTimeoutFn(() => {
          this._onError(e);
        }, 0);
        return;
      }
      if (typeof document !== "undefined") {
        this._index = _Request.requestsCount++;
        _Request.requests[this._index] = this;
      }
    }
    /**
     * Called upon error.
     *
     * @private
     */
    _onError(err) {
      this.emitReserved("error", err, this._xhr);
      this._cleanup(true);
    }
    /**
     * Cleans up house.
     *
     * @private
     */
    _cleanup(fromError) {
      if ("undefined" === typeof this._xhr || null === this._xhr) {
        return;
      }
      this._xhr.onreadystatechange = empty;
      if (fromError) {
        try {
          this._xhr.abort();
        } catch (e) {
        }
      }
      if (typeof document !== "undefined") {
        delete _Request.requests[this._index];
      }
      this._xhr = null;
    }
    /**
     * Called upon load.
     *
     * @private
     */
    _onLoad() {
      const data = this._xhr.responseText;
      if (data !== null) {
        this.emitReserved("data", data);
        this.emitReserved("success");
        this._cleanup();
      }
    }
    /**
     * Aborts the request.
     *
     * @package
     */
    abort() {
      this._cleanup();
    }
  };
  Request.requestsCount = 0;
  Request.requests = {};
  if (typeof document !== "undefined") {
    if (typeof attachEvent === "function") {
      attachEvent("onunload", unloadHandler);
    } else if (typeof addEventListener === "function") {
      const terminationEvent = "onpagehide" in globalThisShim ? "pagehide" : "unload";
      addEventListener(terminationEvent, unloadHandler, false);
    }
  }
  function unloadHandler() {
    for (let i in Request.requests) {
      if (Request.requests.hasOwnProperty(i)) {
        Request.requests[i].abort();
      }
    }
  }
  var hasXHR2 = (function() {
    const xhr = newRequest({
      xdomain: false
    });
    return xhr && xhr.responseType !== null;
  })();
  var XHR = class extends BaseXHR {
    constructor(opts) {
      super(opts);
      const forceBase64 = opts && opts.forceBase64;
      this.supportsBinary = hasXHR2 && !forceBase64;
    }
    request(opts = {}) {
      Object.assign(opts, { xd: this.xd }, this.opts);
      return new Request(newRequest, this.uri(), opts);
    }
  };
  function newRequest(opts) {
    const xdomain = opts.xdomain;
    try {
      if ("undefined" !== typeof XMLHttpRequest && (!xdomain || hasCORS)) {
        return new XMLHttpRequest();
      }
    } catch (e) {
    }
    if (!xdomain) {
      try {
        return new globalThisShim[["Active"].concat("Object").join("X")]("Microsoft.XMLHTTP");
      } catch (e) {
      }
    }
  }

  // node_modules/engine.io-client/build/esm/transports/websocket.js
  var isReactNative = typeof navigator !== "undefined" && typeof navigator.product === "string" && navigator.product.toLowerCase() === "reactnative";
  var BaseWS = class extends Transport {
    get name() {
      return "websocket";
    }
    doOpen() {
      const uri = this.uri();
      const protocols = this.opts.protocols;
      const opts = isReactNative ? {} : pick(this.opts, "agent", "perMessageDeflate", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "localAddress", "protocolVersion", "origin", "maxPayload", "family", "checkServerIdentity");
      if (this.opts.extraHeaders) {
        opts.headers = this.opts.extraHeaders;
      }
      try {
        this.ws = this.createSocket(uri, protocols, opts);
      } catch (err) {
        return this.emitReserved("error", err);
      }
      this.ws.binaryType = this.socket.binaryType;
      this.addEventListeners();
    }
    /**
     * Adds event listeners to the socket
     *
     * @private
     */
    addEventListeners() {
      this.ws.onopen = () => {
        if (this.opts.autoUnref) {
          this.ws._socket.unref();
        }
        this.onOpen();
      };
      this.ws.onclose = (closeEvent) => this.onClose({
        description: "websocket connection closed",
        context: closeEvent
      });
      this.ws.onmessage = (ev) => this.onData(ev.data);
      this.ws.onerror = (e) => this.onError("websocket error", e);
    }
    write(packets) {
      this.writable = false;
      for (let i = 0; i < packets.length; i++) {
        const packet = packets[i];
        const lastPacket = i === packets.length - 1;
        encodePacket(packet, this.supportsBinary, (data) => {
          try {
            this.doWrite(packet, data);
          } catch (e) {
          }
          if (lastPacket) {
            nextTick(() => {
              this.writable = true;
              this.emitReserved("drain");
            }, this.setTimeoutFn);
          }
        });
      }
    }
    doClose() {
      if (typeof this.ws !== "undefined") {
        this.ws.onerror = () => {
        };
        this.ws.close();
        this.ws = null;
      }
    }
    /**
     * Generates uri for connection.
     *
     * @private
     */
    uri() {
      const schema = this.opts.secure ? "wss" : "ws";
      const query = this.query || {};
      if (this.opts.timestampRequests) {
        query[this.opts.timestampParam] = randomString();
      }
      if (!this.supportsBinary) {
        query.b64 = 1;
      }
      return this.createUri(schema, query);
    }
  };
  var WebSocketCtor = globalThisShim.WebSocket || globalThisShim.MozWebSocket;
  var WS = class extends BaseWS {
    createSocket(uri, protocols, opts) {
      return !isReactNative ? protocols ? new WebSocketCtor(uri, protocols) : new WebSocketCtor(uri) : new WebSocketCtor(uri, protocols, opts);
    }
    doWrite(_packet, data) {
      this.ws.send(data);
    }
  };

  // node_modules/engine.io-client/build/esm/transports/webtransport.js
  var WT = class extends Transport {
    get name() {
      return "webtransport";
    }
    doOpen() {
      try {
        this._transport = new WebTransport(this.createUri("https"), this.opts.transportOptions[this.name]);
      } catch (err) {
        return this.emitReserved("error", err);
      }
      this._transport.closed.then(() => {
        this.onClose();
      }).catch((err) => {
        this.onError("webtransport error", err);
      });
      this._transport.ready.then(() => {
        this._transport.createBidirectionalStream().then((stream) => {
          const decoderStream = createPacketDecoderStream(Number.MAX_SAFE_INTEGER, this.socket.binaryType);
          const reader = stream.readable.pipeThrough(decoderStream).getReader();
          const encoderStream = createPacketEncoderStream();
          encoderStream.readable.pipeTo(stream.writable);
          this._writer = encoderStream.writable.getWriter();
          const read = () => {
            reader.read().then(({ done, value: value2 }) => {
              if (done) {
                return;
              }
              this.onPacket(value2);
              read();
            }).catch((err) => {
            });
          };
          read();
          const packet = { type: "open" };
          if (this.query.sid) {
            packet.data = `{"sid":"${this.query.sid}"}`;
          }
          this._writer.write(packet).then(() => this.onOpen());
        });
      });
    }
    write(packets) {
      this.writable = false;
      for (let i = 0; i < packets.length; i++) {
        const packet = packets[i];
        const lastPacket = i === packets.length - 1;
        this._writer.write(packet).then(() => {
          if (lastPacket) {
            nextTick(() => {
              this.writable = true;
              this.emitReserved("drain");
            }, this.setTimeoutFn);
          }
        });
      }
    }
    doClose() {
      var _a;
      (_a = this._transport) === null || _a === void 0 ? void 0 : _a.close();
    }
  };

  // node_modules/engine.io-client/build/esm/transports/index.js
  var transports = {
    websocket: WS,
    webtransport: WT,
    polling: XHR
  };

  // node_modules/engine.io-client/build/esm/contrib/parseuri.js
  var re = /^(?:(?![^:@\/?#]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@\/?#]*)(?::([^:@\/?#]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
  var parts = [
    "source",
    "protocol",
    "authority",
    "userInfo",
    "user",
    "password",
    "host",
    "port",
    "relative",
    "path",
    "directory",
    "file",
    "query",
    "anchor"
  ];
  function parse(str) {
    if (str.length > 8e3) {
      throw "URI too long";
    }
    const src = str, b = str.indexOf("["), e = str.indexOf("]");
    if (b != -1 && e != -1) {
      str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ";") + str.substring(e, str.length);
    }
    let m = re.exec(str || ""), uri = {}, i = 14;
    while (i--) {
      uri[parts[i]] = m[i] || "";
    }
    if (b != -1 && e != -1) {
      uri.source = src;
      uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ":");
      uri.authority = uri.authority.replace("[", "").replace("]", "").replace(/;/g, ":");
      uri.ipv6uri = true;
    }
    uri.pathNames = pathNames(uri, uri["path"]);
    uri.queryKey = queryKey(uri, uri["query"]);
    return uri;
  }
  function pathNames(obj, path) {
    const regx = /\/{2,9}/g, names = path.replace(regx, "/").split("/");
    if (path.slice(0, 1) == "/" || path.length === 0) {
      names.splice(0, 1);
    }
    if (path.slice(-1) == "/") {
      names.splice(names.length - 1, 1);
    }
    return names;
  }
  function queryKey(uri, query) {
    const data = {};
    query.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function($0, $1, $2) {
      if ($1) {
        data[$1] = $2;
      }
    });
    return data;
  }

  // node_modules/engine.io-client/build/esm/socket.js
  var withEventListeners = typeof addEventListener === "function" && typeof removeEventListener === "function";
  var OFFLINE_EVENT_LISTENERS = [];
  if (withEventListeners) {
    addEventListener("offline", () => {
      OFFLINE_EVENT_LISTENERS.forEach((listener) => listener());
    }, false);
  }
  var SocketWithoutUpgrade = class _SocketWithoutUpgrade extends Emitter {
    /**
     * Socket constructor.
     *
     * @param {String|Object} uri - uri or options
     * @param {Object} opts - options
     */
    constructor(uri, opts) {
      super();
      this.binaryType = defaultBinaryType;
      this.writeBuffer = [];
      this._prevBufferLen = 0;
      this._pingInterval = -1;
      this._pingTimeout = -1;
      this._maxPayload = -1;
      this._pingTimeoutTime = Infinity;
      if (uri && "object" === typeof uri) {
        opts = uri;
        uri = null;
      }
      if (uri) {
        const parsedUri = parse(uri);
        opts.hostname = parsedUri.host;
        opts.secure = parsedUri.protocol === "https" || parsedUri.protocol === "wss";
        opts.port = parsedUri.port;
        if (parsedUri.query)
          opts.query = parsedUri.query;
      } else if (opts.host) {
        opts.hostname = parse(opts.host).host;
      }
      installTimerFunctions(this, opts);
      this.secure = null != opts.secure ? opts.secure : typeof location !== "undefined" && "https:" === location.protocol;
      if (opts.hostname && !opts.port) {
        opts.port = this.secure ? "443" : "80";
      }
      this.hostname = opts.hostname || (typeof location !== "undefined" ? location.hostname : "localhost");
      this.port = opts.port || (typeof location !== "undefined" && location.port ? location.port : this.secure ? "443" : "80");
      this.transports = [];
      this._transportsByName = {};
      opts.transports.forEach((t) => {
        const transportName = t.prototype.name;
        this.transports.push(transportName);
        this._transportsByName[transportName] = t;
      });
      this.opts = Object.assign({
        path: "/engine.io",
        agent: false,
        withCredentials: false,
        upgrade: true,
        timestampParam: "t",
        rememberUpgrade: false,
        addTrailingSlash: true,
        rejectUnauthorized: true,
        perMessageDeflate: {
          threshold: 1024
        },
        transportOptions: {},
        closeOnBeforeunload: false
      }, opts);
      this.opts.path = this.opts.path.replace(/\/$/, "") + (this.opts.addTrailingSlash ? "/" : "");
      if (typeof this.opts.query === "string") {
        this.opts.query = decode2(this.opts.query);
      }
      if (withEventListeners) {
        if (this.opts.closeOnBeforeunload) {
          this._beforeunloadEventListener = () => {
            if (this.transport) {
              this.transport.removeAllListeners();
              this.transport.close();
            }
          };
          addEventListener("beforeunload", this._beforeunloadEventListener, false);
        }
        if (this.hostname !== "localhost") {
          this._offlineEventListener = () => {
            this._onClose("transport close", {
              description: "network connection lost"
            });
          };
          OFFLINE_EVENT_LISTENERS.push(this._offlineEventListener);
        }
      }
      if (this.opts.withCredentials) {
        this._cookieJar = createCookieJar();
      }
      this._open();
    }
    /**
     * Creates transport of the given type.
     *
     * @param {String} name - transport name
     * @return {Transport}
     * @private
     */
    createTransport(name) {
      const query = Object.assign({}, this.opts.query);
      query.EIO = protocol;
      query.transport = name;
      if (this.id)
        query.sid = this.id;
      const opts = Object.assign({}, this.opts, {
        query,
        socket: this,
        hostname: this.hostname,
        secure: this.secure,
        port: this.port
      }, this.opts.transportOptions[name]);
      return new this._transportsByName[name](opts);
    }
    /**
     * Initializes transport to use and starts probe.
     *
     * @private
     */
    _open() {
      if (this.transports.length === 0) {
        this.setTimeoutFn(() => {
          this.emitReserved("error", "No transports available");
        }, 0);
        return;
      }
      const transportName = this.opts.rememberUpgrade && _SocketWithoutUpgrade.priorWebsocketSuccess && this.transports.indexOf("websocket") !== -1 ? "websocket" : this.transports[0];
      this.readyState = "opening";
      const transport = this.createTransport(transportName);
      transport.open();
      this.setTransport(transport);
    }
    /**
     * Sets the current transport. Disables the existing one (if any).
     *
     * @private
     */
    setTransport(transport) {
      if (this.transport) {
        this.transport.removeAllListeners();
      }
      this.transport = transport;
      transport.on("drain", this._onDrain.bind(this)).on("packet", this._onPacket.bind(this)).on("error", this._onError.bind(this)).on("close", (reason) => this._onClose("transport close", reason));
    }
    /**
     * Called when connection is deemed open.
     *
     * @private
     */
    onOpen() {
      this.readyState = "open";
      _SocketWithoutUpgrade.priorWebsocketSuccess = "websocket" === this.transport.name;
      this.emitReserved("open");
      this.flush();
    }
    /**
     * Handles a packet.
     *
     * @private
     */
    _onPacket(packet) {
      if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
        this.emitReserved("packet", packet);
        this.emitReserved("heartbeat");
        switch (packet.type) {
          case "open":
            this.onHandshake(JSON.parse(packet.data));
            break;
          case "ping":
            this._sendPacket("pong");
            this.emitReserved("ping");
            this.emitReserved("pong");
            this._resetPingTimeout();
            break;
          case "error":
            const err = new Error("server error");
            err.code = packet.data;
            this._onError(err);
            break;
          case "message":
            this.emitReserved("data", packet.data);
            this.emitReserved("message", packet.data);
            break;
        }
      } else {
      }
    }
    /**
     * Called upon handshake completion.
     *
     * @param {Object} data - handshake obj
     * @private
     */
    onHandshake(data) {
      this.emitReserved("handshake", data);
      this.id = data.sid;
      this.transport.query.sid = data.sid;
      this._pingInterval = data.pingInterval;
      this._pingTimeout = data.pingTimeout;
      this._maxPayload = data.maxPayload;
      this.onOpen();
      if ("closed" === this.readyState)
        return;
      this._resetPingTimeout();
    }
    /**
     * Sets and resets ping timeout timer based on server pings.
     *
     * @private
     */
    _resetPingTimeout() {
      this.clearTimeoutFn(this._pingTimeoutTimer);
      const delay = this._pingInterval + this._pingTimeout;
      this._pingTimeoutTime = Date.now() + delay;
      this._pingTimeoutTimer = this.setTimeoutFn(() => {
        this._onClose("ping timeout");
      }, delay);
      if (this.opts.autoUnref) {
        this._pingTimeoutTimer.unref();
      }
    }
    /**
     * Called on `drain` event
     *
     * @private
     */
    _onDrain() {
      this.writeBuffer.splice(0, this._prevBufferLen);
      this._prevBufferLen = 0;
      if (0 === this.writeBuffer.length) {
        this.emitReserved("drain");
      } else {
        this.flush();
      }
    }
    /**
     * Flush write buffers.
     *
     * @private
     */
    flush() {
      if ("closed" !== this.readyState && this.transport.writable && !this.upgrading && this.writeBuffer.length) {
        const packets = this._getWritablePackets();
        this.transport.send(packets);
        this._prevBufferLen = packets.length;
        this.emitReserved("flush");
      }
    }
    /**
     * Ensure the encoded size of the writeBuffer is below the maxPayload value sent by the server (only for HTTP
     * long-polling)
     *
     * @private
     */
    _getWritablePackets() {
      const shouldCheckPayloadSize = this._maxPayload && this.transport.name === "polling" && this.writeBuffer.length > 1;
      if (!shouldCheckPayloadSize) {
        return this.writeBuffer;
      }
      let payloadSize = 1;
      for (let i = 0; i < this.writeBuffer.length; i++) {
        const data = this.writeBuffer[i].data;
        if (data) {
          payloadSize += byteLength(data);
        }
        if (i > 0 && payloadSize > this._maxPayload) {
          return this.writeBuffer.slice(0, i);
        }
        payloadSize += 2;
      }
      return this.writeBuffer;
    }
    /**
     * Checks whether the heartbeat timer has expired but the socket has not yet been notified.
     *
     * Note: this method is private for now because it does not really fit the WebSocket API, but if we put it in the
     * `write()` method then the message would not be buffered by the Socket.IO client.
     *
     * @return {boolean}
     * @private
     */
    /* private */
    _hasPingExpired() {
      if (!this._pingTimeoutTime)
        return true;
      const hasExpired = Date.now() > this._pingTimeoutTime;
      if (hasExpired) {
        this._pingTimeoutTime = 0;
        nextTick(() => {
          this._onClose("ping timeout");
        }, this.setTimeoutFn);
      }
      return hasExpired;
    }
    /**
     * Sends a message.
     *
     * @param {String} msg - message.
     * @param {Object} options.
     * @param {Function} fn - callback function.
     * @return {Socket} for chaining.
     */
    write(msg, options, fn) {
      this._sendPacket("message", msg, options, fn);
      return this;
    }
    /**
     * Sends a message. Alias of {@link Socket#write}.
     *
     * @param {String} msg - message.
     * @param {Object} options.
     * @param {Function} fn - callback function.
     * @return {Socket} for chaining.
     */
    send(msg, options, fn) {
      this._sendPacket("message", msg, options, fn);
      return this;
    }
    /**
     * Sends a packet.
     *
     * @param {String} type: packet type.
     * @param {String} data.
     * @param {Object} options.
     * @param {Function} fn - callback function.
     * @private
     */
    _sendPacket(type, data, options, fn) {
      if ("function" === typeof data) {
        fn = data;
        data = void 0;
      }
      if ("function" === typeof options) {
        fn = options;
        options = null;
      }
      if ("closing" === this.readyState || "closed" === this.readyState) {
        return;
      }
      options = options || {};
      options.compress = false !== options.compress;
      const packet = {
        type,
        data,
        options
      };
      this.emitReserved("packetCreate", packet);
      this.writeBuffer.push(packet);
      if (fn)
        this.once("flush", fn);
      this.flush();
    }
    /**
     * Closes the connection.
     */
    close() {
      const close = () => {
        this._onClose("forced close");
        this.transport.close();
      };
      const cleanupAndClose = () => {
        this.off("upgrade", cleanupAndClose);
        this.off("upgradeError", cleanupAndClose);
        close();
      };
      const waitForUpgrade = () => {
        this.once("upgrade", cleanupAndClose);
        this.once("upgradeError", cleanupAndClose);
      };
      if ("opening" === this.readyState || "open" === this.readyState) {
        this.readyState = "closing";
        if (this.writeBuffer.length) {
          this.once("drain", () => {
            if (this.upgrading) {
              waitForUpgrade();
            } else {
              close();
            }
          });
        } else if (this.upgrading) {
          waitForUpgrade();
        } else {
          close();
        }
      }
      return this;
    }
    /**
     * Called upon transport error
     *
     * @private
     */
    _onError(err) {
      _SocketWithoutUpgrade.priorWebsocketSuccess = false;
      if (this.opts.tryAllTransports && this.transports.length > 1 && this.readyState === "opening") {
        this.transports.shift();
        return this._open();
      }
      this.emitReserved("error", err);
      this._onClose("transport error", err);
    }
    /**
     * Called upon transport close.
     *
     * @private
     */
    _onClose(reason, description) {
      if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
        this.clearTimeoutFn(this._pingTimeoutTimer);
        this.transport.removeAllListeners("close");
        this.transport.close();
        this.transport.removeAllListeners();
        if (withEventListeners) {
          if (this._beforeunloadEventListener) {
            removeEventListener("beforeunload", this._beforeunloadEventListener, false);
          }
          if (this._offlineEventListener) {
            const i = OFFLINE_EVENT_LISTENERS.indexOf(this._offlineEventListener);
            if (i !== -1) {
              OFFLINE_EVENT_LISTENERS.splice(i, 1);
            }
          }
        }
        this.readyState = "closed";
        this.id = null;
        this.emitReserved("close", reason, description);
        this.writeBuffer = [];
        this._prevBufferLen = 0;
      }
    }
  };
  SocketWithoutUpgrade.protocol = protocol;
  var SocketWithUpgrade = class extends SocketWithoutUpgrade {
    constructor() {
      super(...arguments);
      this._upgrades = [];
    }
    onOpen() {
      super.onOpen();
      if ("open" === this.readyState && this.opts.upgrade) {
        for (let i = 0; i < this._upgrades.length; i++) {
          this._probe(this._upgrades[i]);
        }
      }
    }
    /**
     * Probes a transport.
     *
     * @param {String} name - transport name
     * @private
     */
    _probe(name) {
      let transport = this.createTransport(name);
      let failed = false;
      SocketWithoutUpgrade.priorWebsocketSuccess = false;
      const onTransportOpen = () => {
        if (failed)
          return;
        transport.send([{ type: "ping", data: "probe" }]);
        transport.once("packet", (msg) => {
          if (failed)
            return;
          if ("pong" === msg.type && "probe" === msg.data) {
            this.upgrading = true;
            this.emitReserved("upgrading", transport);
            if (!transport)
              return;
            SocketWithoutUpgrade.priorWebsocketSuccess = "websocket" === transport.name;
            this.transport.pause(() => {
              if (failed)
                return;
              if ("closed" === this.readyState)
                return;
              cleanup();
              this.setTransport(transport);
              transport.send([{ type: "upgrade" }]);
              this.emitReserved("upgrade", transport);
              transport = null;
              this.upgrading = false;
              this.flush();
            });
          } else {
            const err = new Error("probe error");
            err.transport = transport.name;
            this.emitReserved("upgradeError", err);
          }
        });
      };
      function freezeTransport() {
        if (failed)
          return;
        failed = true;
        cleanup();
        transport.close();
        transport = null;
      }
      const onerror = (err) => {
        const error = new Error("probe error: " + err);
        error.transport = transport.name;
        freezeTransport();
        this.emitReserved("upgradeError", error);
      };
      function onTransportClose() {
        onerror("transport closed");
      }
      function onclose() {
        onerror("socket closed");
      }
      function onupgrade(to) {
        if (transport && to.name !== transport.name) {
          freezeTransport();
        }
      }
      const cleanup = () => {
        transport.removeListener("open", onTransportOpen);
        transport.removeListener("error", onerror);
        transport.removeListener("close", onTransportClose);
        this.off("close", onclose);
        this.off("upgrading", onupgrade);
      };
      transport.once("open", onTransportOpen);
      transport.once("error", onerror);
      transport.once("close", onTransportClose);
      this.once("close", onclose);
      this.once("upgrading", onupgrade);
      if (this._upgrades.indexOf("webtransport") !== -1 && name !== "webtransport") {
        this.setTimeoutFn(() => {
          if (!failed) {
            transport.open();
          }
        }, 200);
      } else {
        transport.open();
      }
    }
    onHandshake(data) {
      this._upgrades = this._filterUpgrades(data.upgrades);
      super.onHandshake(data);
    }
    /**
     * Filters upgrades, returning only those matching client transports.
     *
     * @param {Array} upgrades - server upgrades
     * @private
     */
    _filterUpgrades(upgrades) {
      const filteredUpgrades = [];
      for (let i = 0; i < upgrades.length; i++) {
        if (~this.transports.indexOf(upgrades[i]))
          filteredUpgrades.push(upgrades[i]);
      }
      return filteredUpgrades;
    }
  };
  var Socket = class extends SocketWithUpgrade {
    constructor(uri, opts = {}) {
      const o = typeof uri === "object" ? uri : opts;
      if (!o.transports || o.transports && typeof o.transports[0] === "string") {
        o.transports = (o.transports || ["polling", "websocket", "webtransport"]).map((transportName) => transports[transportName]).filter((t) => !!t);
      }
      super(uri, o);
    }
  };

  // node_modules/engine.io-client/build/esm/index.js
  var protocol2 = Socket.protocol;

  // node_modules/socket.io-client/build/esm/url.js
  function url(uri, path = "", loc) {
    let obj = uri;
    loc = loc || typeof location !== "undefined" && location;
    if (null == uri)
      uri = loc.protocol + "//" + loc.host;
    if (typeof uri === "string") {
      if ("/" === uri.charAt(0)) {
        if ("/" === uri.charAt(1)) {
          uri = loc.protocol + uri;
        } else {
          uri = loc.host + uri;
        }
      }
      if (!/^(https?|wss?):\/\//.test(uri)) {
        if ("undefined" !== typeof loc) {
          uri = loc.protocol + "//" + uri;
        } else {
          uri = "https://" + uri;
        }
      }
      obj = parse(uri);
    }
    if (!obj.port) {
      if (/^(http|ws)$/.test(obj.protocol)) {
        obj.port = "80";
      } else if (/^(http|ws)s$/.test(obj.protocol)) {
        obj.port = "443";
      }
    }
    obj.path = obj.path || "/";
    const ipv6 = obj.host.indexOf(":") !== -1;
    const host = ipv6 ? "[" + obj.host + "]" : obj.host;
    obj.id = obj.protocol + "://" + host + ":" + obj.port + path;
    obj.href = obj.protocol + "://" + host + (loc && loc.port === obj.port ? "" : ":" + obj.port);
    return obj;
  }

  // node_modules/socket.io-parser/build/esm/index.js
  var esm_exports = {};
  __export(esm_exports, {
    Decoder: () => Decoder,
    Encoder: () => Encoder,
    PacketType: () => PacketType,
    isPacketValid: () => isPacketValid,
    protocol: () => protocol3
  });

  // node_modules/socket.io-parser/build/esm/is-binary.js
  var withNativeArrayBuffer3 = typeof ArrayBuffer === "function";
  var isView2 = (obj) => {
    return typeof ArrayBuffer.isView === "function" ? ArrayBuffer.isView(obj) : obj.buffer instanceof ArrayBuffer;
  };
  var toString = Object.prototype.toString;
  var withNativeBlob2 = typeof Blob === "function" || typeof Blob !== "undefined" && toString.call(Blob) === "[object BlobConstructor]";
  var withNativeFile = typeof File === "function" || typeof File !== "undefined" && toString.call(File) === "[object FileConstructor]";
  function isBinary(obj) {
    return withNativeArrayBuffer3 && (obj instanceof ArrayBuffer || isView2(obj)) || withNativeBlob2 && obj instanceof Blob || withNativeFile && obj instanceof File;
  }
  function hasBinary(obj, toJSON) {
    if (!obj || typeof obj !== "object") {
      return false;
    }
    if (Array.isArray(obj)) {
      for (let i = 0, l = obj.length; i < l; i++) {
        if (hasBinary(obj[i])) {
          return true;
        }
      }
      return false;
    }
    if (isBinary(obj)) {
      return true;
    }
    if (obj.toJSON && typeof obj.toJSON === "function" && arguments.length === 1) {
      return hasBinary(obj.toJSON(), true);
    }
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && hasBinary(obj[key])) {
        return true;
      }
    }
    return false;
  }

  // node_modules/socket.io-parser/build/esm/binary.js
  function deconstructPacket(packet) {
    const buffers = [];
    const packetData = packet.data;
    const pack = packet;
    pack.data = _deconstructPacket(packetData, buffers);
    pack.attachments = buffers.length;
    return { packet: pack, buffers };
  }
  function _deconstructPacket(data, buffers) {
    if (!data)
      return data;
    if (isBinary(data)) {
      const placeholder = { _placeholder: true, num: buffers.length };
      buffers.push(data);
      return placeholder;
    } else if (Array.isArray(data)) {
      const newData = new Array(data.length);
      for (let i = 0; i < data.length; i++) {
        newData[i] = _deconstructPacket(data[i], buffers);
      }
      return newData;
    } else if (typeof data === "object" && !(data instanceof Date)) {
      const newData = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          newData[key] = _deconstructPacket(data[key], buffers);
        }
      }
      return newData;
    }
    return data;
  }
  function reconstructPacket(packet, buffers) {
    packet.data = _reconstructPacket(packet.data, buffers);
    delete packet.attachments;
    return packet;
  }
  function _reconstructPacket(data, buffers) {
    if (!data)
      return data;
    if (data && data._placeholder === true) {
      const isIndexValid = typeof data.num === "number" && data.num >= 0 && data.num < buffers.length;
      if (isIndexValid) {
        return buffers[data.num];
      } else {
        throw new Error("illegal attachments");
      }
    } else if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        data[i] = _reconstructPacket(data[i], buffers);
      }
    } else if (typeof data === "object") {
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          data[key] = _reconstructPacket(data[key], buffers);
        }
      }
    }
    return data;
  }

  // node_modules/socket.io-parser/build/esm/index.js
  var RESERVED_EVENTS = [
    "connect",
    // used on the client side
    "connect_error",
    // used on the client side
    "disconnect",
    // used on both sides
    "disconnecting",
    // used on the server side
    "newListener",
    // used by the Node.js EventEmitter
    "removeListener"
    // used by the Node.js EventEmitter
  ];
  var protocol3 = 5;
  var PacketType;
  (function(PacketType2) {
    PacketType2[PacketType2["CONNECT"] = 0] = "CONNECT";
    PacketType2[PacketType2["DISCONNECT"] = 1] = "DISCONNECT";
    PacketType2[PacketType2["EVENT"] = 2] = "EVENT";
    PacketType2[PacketType2["ACK"] = 3] = "ACK";
    PacketType2[PacketType2["CONNECT_ERROR"] = 4] = "CONNECT_ERROR";
    PacketType2[PacketType2["BINARY_EVENT"] = 5] = "BINARY_EVENT";
    PacketType2[PacketType2["BINARY_ACK"] = 6] = "BINARY_ACK";
  })(PacketType || (PacketType = {}));
  var Encoder = class {
    /**
     * Encoder constructor
     *
     * @param {function} replacer - custom replacer to pass down to JSON.parse
     */
    constructor(replacer) {
      this.replacer = replacer;
    }
    /**
     * Encode a packet as a single string if non-binary, or as a
     * buffer sequence, depending on packet type.
     *
     * @param {Object} obj - packet object
     */
    encode(obj) {
      if (obj.type === PacketType.EVENT || obj.type === PacketType.ACK) {
        if (hasBinary(obj)) {
          return this.encodeAsBinary({
            type: obj.type === PacketType.EVENT ? PacketType.BINARY_EVENT : PacketType.BINARY_ACK,
            nsp: obj.nsp,
            data: obj.data,
            id: obj.id
          });
        }
      }
      return [this.encodeAsString(obj)];
    }
    /**
     * Encode packet as string.
     */
    encodeAsString(obj) {
      let str = "" + obj.type;
      if (obj.type === PacketType.BINARY_EVENT || obj.type === PacketType.BINARY_ACK) {
        str += obj.attachments + "-";
      }
      if (obj.nsp && "/" !== obj.nsp) {
        str += obj.nsp + ",";
      }
      if (null != obj.id) {
        str += obj.id;
      }
      if (null != obj.data) {
        str += JSON.stringify(obj.data, this.replacer);
      }
      return str;
    }
    /**
     * Encode packet as 'buffer sequence' by removing blobs, and
     * deconstructing packet into object with placeholders and
     * a list of buffers.
     */
    encodeAsBinary(obj) {
      const deconstruction = deconstructPacket(obj);
      const pack = this.encodeAsString(deconstruction.packet);
      const buffers = deconstruction.buffers;
      buffers.unshift(pack);
      return buffers;
    }
  };
  var Decoder = class _Decoder extends Emitter {
    /**
     * Decoder constructor
     *
     * @param {function} reviver - custom reviver to pass down to JSON.stringify
     */
    constructor(reviver) {
      super();
      this.reviver = reviver;
    }
    /**
     * Decodes an encoded packet string into packet JSON.
     *
     * @param {String} obj - encoded packet
     */
    add(obj) {
      let packet;
      if (typeof obj === "string") {
        if (this.reconstructor) {
          throw new Error("got plaintext data when reconstructing a packet");
        }
        packet = this.decodeString(obj);
        const isBinaryEvent = packet.type === PacketType.BINARY_EVENT;
        if (isBinaryEvent || packet.type === PacketType.BINARY_ACK) {
          packet.type = isBinaryEvent ? PacketType.EVENT : PacketType.ACK;
          this.reconstructor = new BinaryReconstructor(packet);
          if (packet.attachments === 0) {
            super.emitReserved("decoded", packet);
          }
        } else {
          super.emitReserved("decoded", packet);
        }
      } else if (isBinary(obj) || obj.base64) {
        if (!this.reconstructor) {
          throw new Error("got binary data when not reconstructing a packet");
        } else {
          packet = this.reconstructor.takeBinaryData(obj);
          if (packet) {
            this.reconstructor = null;
            super.emitReserved("decoded", packet);
          }
        }
      } else {
        throw new Error("Unknown type: " + obj);
      }
    }
    /**
     * Decode a packet String (JSON data)
     *
     * @param {String} str
     * @return {Object} packet
     */
    decodeString(str) {
      let i = 0;
      const p = {
        type: Number(str.charAt(0))
      };
      if (PacketType[p.type] === void 0) {
        throw new Error("unknown packet type " + p.type);
      }
      if (p.type === PacketType.BINARY_EVENT || p.type === PacketType.BINARY_ACK) {
        const start = i + 1;
        while (str.charAt(++i) !== "-" && i != str.length) {
        }
        const buf = str.substring(start, i);
        if (buf != Number(buf) || str.charAt(i) !== "-") {
          throw new Error("Illegal attachments");
        }
        p.attachments = Number(buf);
      }
      if ("/" === str.charAt(i + 1)) {
        const start = i + 1;
        while (++i) {
          const c = str.charAt(i);
          if ("," === c)
            break;
          if (i === str.length)
            break;
        }
        p.nsp = str.substring(start, i);
      } else {
        p.nsp = "/";
      }
      const next = str.charAt(i + 1);
      if ("" !== next && Number(next) == next) {
        const start = i + 1;
        while (++i) {
          const c = str.charAt(i);
          if (null == c || Number(c) != c) {
            --i;
            break;
          }
          if (i === str.length)
            break;
        }
        p.id = Number(str.substring(start, i + 1));
      }
      if (str.charAt(++i)) {
        const payload = this.tryParse(str.substr(i));
        if (_Decoder.isPayloadValid(p.type, payload)) {
          p.data = payload;
        } else {
          throw new Error("invalid payload");
        }
      }
      return p;
    }
    tryParse(str) {
      try {
        return JSON.parse(str, this.reviver);
      } catch (e) {
        return false;
      }
    }
    static isPayloadValid(type, payload) {
      switch (type) {
        case PacketType.CONNECT:
          return isObject(payload);
        case PacketType.DISCONNECT:
          return payload === void 0;
        case PacketType.CONNECT_ERROR:
          return typeof payload === "string" || isObject(payload);
        case PacketType.EVENT:
        case PacketType.BINARY_EVENT:
          return Array.isArray(payload) && (typeof payload[0] === "number" || typeof payload[0] === "string" && RESERVED_EVENTS.indexOf(payload[0]) === -1);
        case PacketType.ACK:
        case PacketType.BINARY_ACK:
          return Array.isArray(payload);
      }
    }
    /**
     * Deallocates a parser's resources
     */
    destroy() {
      if (this.reconstructor) {
        this.reconstructor.finishedReconstruction();
        this.reconstructor = null;
      }
    }
  };
  var BinaryReconstructor = class {
    constructor(packet) {
      this.packet = packet;
      this.buffers = [];
      this.reconPack = packet;
    }
    /**
     * Method to be called when binary data received from connection
     * after a BINARY_EVENT packet.
     *
     * @param {Buffer | ArrayBuffer} binData - the raw binary data received
     * @return {null | Object} returns null if more binary data is expected or
     *   a reconstructed packet object if all buffers have been received.
     */
    takeBinaryData(binData) {
      this.buffers.push(binData);
      if (this.buffers.length === this.reconPack.attachments) {
        const packet = reconstructPacket(this.reconPack, this.buffers);
        this.finishedReconstruction();
        return packet;
      }
      return null;
    }
    /**
     * Cleans up binary packet reconstruction variables.
     */
    finishedReconstruction() {
      this.reconPack = null;
      this.buffers = [];
    }
  };
  function isNamespaceValid(nsp) {
    return typeof nsp === "string";
  }
  var isInteger = Number.isInteger || function(value2) {
    return typeof value2 === "number" && isFinite(value2) && Math.floor(value2) === value2;
  };
  function isAckIdValid(id) {
    return id === void 0 || isInteger(id);
  }
  function isObject(value2) {
    return Object.prototype.toString.call(value2) === "[object Object]";
  }
  function isDataValid(type, payload) {
    switch (type) {
      case PacketType.CONNECT:
        return payload === void 0 || isObject(payload);
      case PacketType.DISCONNECT:
        return payload === void 0;
      case PacketType.EVENT:
        return Array.isArray(payload) && (typeof payload[0] === "number" || typeof payload[0] === "string" && RESERVED_EVENTS.indexOf(payload[0]) === -1);
      case PacketType.ACK:
        return Array.isArray(payload);
      case PacketType.CONNECT_ERROR:
        return typeof payload === "string" || isObject(payload);
      default:
        return false;
    }
  }
  function isPacketValid(packet) {
    return isNamespaceValid(packet.nsp) && isAckIdValid(packet.id) && isDataValid(packet.type, packet.data);
  }

  // node_modules/socket.io-client/build/esm/on.js
  function on(obj, ev, fn) {
    obj.on(ev, fn);
    return function subDestroy() {
      obj.off(ev, fn);
    };
  }

  // node_modules/socket.io-client/build/esm/socket.js
  var RESERVED_EVENTS2 = Object.freeze({
    connect: 1,
    connect_error: 1,
    disconnect: 1,
    disconnecting: 1,
    // EventEmitter reserved events: https://nodejs.org/api/events.html#events_event_newlistener
    newListener: 1,
    removeListener: 1
  });
  var Socket2 = class extends Emitter {
    /**
     * `Socket` constructor.
     */
    constructor(io, nsp, opts) {
      super();
      this.connected = false;
      this.recovered = false;
      this.receiveBuffer = [];
      this.sendBuffer = [];
      this._queue = [];
      this._queueSeq = 0;
      this.ids = 0;
      this.acks = {};
      this.flags = {};
      this.io = io;
      this.nsp = nsp;
      if (opts && opts.auth) {
        this.auth = opts.auth;
      }
      this._opts = Object.assign({}, opts);
      if (this.io._autoConnect)
        this.open();
    }
    /**
     * Whether the socket is currently disconnected
     *
     * @example
     * const socket = io();
     *
     * socket.on("connect", () => {
     *   console.log(socket.disconnected); // false
     * });
     *
     * socket.on("disconnect", () => {
     *   console.log(socket.disconnected); // true
     * });
     */
    get disconnected() {
      return !this.connected;
    }
    /**
     * Subscribe to open, close and packet events
     *
     * @private
     */
    subEvents() {
      if (this.subs)
        return;
      const io = this.io;
      this.subs = [
        on(io, "open", this.onopen.bind(this)),
        on(io, "packet", this.onpacket.bind(this)),
        on(io, "error", this.onerror.bind(this)),
        on(io, "close", this.onclose.bind(this))
      ];
    }
    /**
     * Whether the Socket will try to reconnect when its Manager connects or reconnects.
     *
     * @example
     * const socket = io();
     *
     * console.log(socket.active); // true
     *
     * socket.on("disconnect", (reason) => {
     *   if (reason === "io server disconnect") {
     *     // the disconnection was initiated by the server, you need to manually reconnect
     *     console.log(socket.active); // false
     *   }
     *   // else the socket will automatically try to reconnect
     *   console.log(socket.active); // true
     * });
     */
    get active() {
      return !!this.subs;
    }
    /**
     * "Opens" the socket.
     *
     * @example
     * const socket = io({
     *   autoConnect: false
     * });
     *
     * socket.connect();
     */
    connect() {
      if (this.connected)
        return this;
      this.subEvents();
      if (!this.io["_reconnecting"])
        this.io.open();
      if ("open" === this.io._readyState)
        this.onopen();
      return this;
    }
    /**
     * Alias for {@link connect()}.
     */
    open() {
      return this.connect();
    }
    /**
     * Sends a `message` event.
     *
     * This method mimics the WebSocket.send() method.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
     *
     * @example
     * socket.send("hello");
     *
     * // this is equivalent to
     * socket.emit("message", "hello");
     *
     * @return self
     */
    send(...args) {
      args.unshift("message");
      this.emit.apply(this, args);
      return this;
    }
    /**
     * Override `emit`.
     * If the event is in `events`, it's emitted normally.
     *
     * @example
     * socket.emit("hello", "world");
     *
     * // all serializable datastructures are supported (no need to call JSON.stringify)
     * socket.emit("hello", 1, "2", { 3: ["4"], 5: Uint8Array.from([6]) });
     *
     * // with an acknowledgement from the server
     * socket.emit("hello", "world", (val) => {
     *   // ...
     * });
     *
     * @return self
     */
    emit(ev, ...args) {
      var _a, _b, _c;
      if (RESERVED_EVENTS2.hasOwnProperty(ev)) {
        throw new Error('"' + ev.toString() + '" is a reserved event name');
      }
      args.unshift(ev);
      if (this._opts.retries && !this.flags.fromQueue && !this.flags.volatile) {
        this._addToQueue(args);
        return this;
      }
      const packet = {
        type: PacketType.EVENT,
        data: args
      };
      packet.options = {};
      packet.options.compress = this.flags.compress !== false;
      if ("function" === typeof args[args.length - 1]) {
        const id = this.ids++;
        const ack = args.pop();
        this._registerAckCallback(id, ack);
        packet.id = id;
      }
      const isTransportWritable = (_b = (_a = this.io.engine) === null || _a === void 0 ? void 0 : _a.transport) === null || _b === void 0 ? void 0 : _b.writable;
      const isConnected = this.connected && !((_c = this.io.engine) === null || _c === void 0 ? void 0 : _c._hasPingExpired());
      const discardPacket = this.flags.volatile && !isTransportWritable;
      if (discardPacket) {
      } else if (isConnected) {
        this.notifyOutgoingListeners(packet);
        this.packet(packet);
      } else {
        this.sendBuffer.push(packet);
      }
      this.flags = {};
      return this;
    }
    /**
     * @private
     */
    _registerAckCallback(id, ack) {
      var _a;
      const timeout = (_a = this.flags.timeout) !== null && _a !== void 0 ? _a : this._opts.ackTimeout;
      if (timeout === void 0) {
        this.acks[id] = ack;
        return;
      }
      const timer = this.io.setTimeoutFn(() => {
        delete this.acks[id];
        for (let i = 0; i < this.sendBuffer.length; i++) {
          if (this.sendBuffer[i].id === id) {
            this.sendBuffer.splice(i, 1);
          }
        }
        ack.call(this, new Error("operation has timed out"));
      }, timeout);
      const fn = (...args) => {
        this.io.clearTimeoutFn(timer);
        ack.apply(this, args);
      };
      fn.withError = true;
      this.acks[id] = fn;
    }
    /**
     * Emits an event and waits for an acknowledgement
     *
     * @example
     * // without timeout
     * const response = await socket.emitWithAck("hello", "world");
     *
     * // with a specific timeout
     * try {
     *   const response = await socket.timeout(1000).emitWithAck("hello", "world");
     * } catch (err) {
     *   // the server did not acknowledge the event in the given delay
     * }
     *
     * @return a Promise that will be fulfilled when the server acknowledges the event
     */
    emitWithAck(ev, ...args) {
      return new Promise((resolve, reject) => {
        const fn = (arg1, arg2) => {
          return arg1 ? reject(arg1) : resolve(arg2);
        };
        fn.withError = true;
        args.push(fn);
        this.emit(ev, ...args);
      });
    }
    /**
     * Add the packet to the queue.
     * @param args
     * @private
     */
    _addToQueue(args) {
      let ack;
      if (typeof args[args.length - 1] === "function") {
        ack = args.pop();
      }
      const packet = {
        id: this._queueSeq++,
        tryCount: 0,
        pending: false,
        args,
        flags: Object.assign({ fromQueue: true }, this.flags)
      };
      args.push((err, ...responseArgs) => {
        if (packet !== this._queue[0]) {
        }
        const hasError = err !== null;
        if (hasError) {
          if (packet.tryCount > this._opts.retries) {
            this._queue.shift();
            if (ack) {
              ack(err);
            }
          }
        } else {
          this._queue.shift();
          if (ack) {
            ack(null, ...responseArgs);
          }
        }
        packet.pending = false;
        return this._drainQueue();
      });
      this._queue.push(packet);
      this._drainQueue();
    }
    /**
     * Send the first packet of the queue, and wait for an acknowledgement from the server.
     * @param force - whether to resend a packet that has not been acknowledged yet
     *
     * @private
     */
    _drainQueue(force = false) {
      if (!this.connected || this._queue.length === 0) {
        return;
      }
      const packet = this._queue[0];
      if (packet.pending && !force) {
        return;
      }
      packet.pending = true;
      packet.tryCount++;
      this.flags = packet.flags;
      this.emit.apply(this, packet.args);
    }
    /**
     * Sends a packet.
     *
     * @param packet
     * @private
     */
    packet(packet) {
      packet.nsp = this.nsp;
      this.io._packet(packet);
    }
    /**
     * Called upon engine `open`.
     *
     * @private
     */
    onopen() {
      if (typeof this.auth == "function") {
        this.auth((data) => {
          this._sendConnectPacket(data);
        });
      } else {
        this._sendConnectPacket(this.auth);
      }
    }
    /**
     * Sends a CONNECT packet to initiate the Socket.IO session.
     *
     * @param data
     * @private
     */
    _sendConnectPacket(data) {
      this.packet({
        type: PacketType.CONNECT,
        data: this._pid ? Object.assign({ pid: this._pid, offset: this._lastOffset }, data) : data
      });
    }
    /**
     * Called upon engine or manager `error`.
     *
     * @param err
     * @private
     */
    onerror(err) {
      if (!this.connected) {
        this.emitReserved("connect_error", err);
      }
    }
    /**
     * Called upon engine `close`.
     *
     * @param reason
     * @param description
     * @private
     */
    onclose(reason, description) {
      this.connected = false;
      delete this.id;
      this.emitReserved("disconnect", reason, description);
      this._clearAcks();
    }
    /**
     * Clears the acknowledgement handlers upon disconnection, since the client will never receive an acknowledgement from
     * the server.
     *
     * @private
     */
    _clearAcks() {
      Object.keys(this.acks).forEach((id) => {
        const isBuffered = this.sendBuffer.some((packet) => String(packet.id) === id);
        if (!isBuffered) {
          const ack = this.acks[id];
          delete this.acks[id];
          if (ack.withError) {
            ack.call(this, new Error("socket has been disconnected"));
          }
        }
      });
    }
    /**
     * Called with socket packet.
     *
     * @param packet
     * @private
     */
    onpacket(packet) {
      const sameNamespace = packet.nsp === this.nsp;
      if (!sameNamespace)
        return;
      switch (packet.type) {
        case PacketType.CONNECT:
          if (packet.data && packet.data.sid) {
            this.onconnect(packet.data.sid, packet.data.pid);
          } else {
            this.emitReserved("connect_error", new Error("It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)"));
          }
          break;
        case PacketType.EVENT:
        case PacketType.BINARY_EVENT:
          this.onevent(packet);
          break;
        case PacketType.ACK:
        case PacketType.BINARY_ACK:
          this.onack(packet);
          break;
        case PacketType.DISCONNECT:
          this.ondisconnect();
          break;
        case PacketType.CONNECT_ERROR:
          this.destroy();
          const err = new Error(packet.data.message);
          err.data = packet.data.data;
          this.emitReserved("connect_error", err);
          break;
      }
    }
    /**
     * Called upon a server event.
     *
     * @param packet
     * @private
     */
    onevent(packet) {
      const args = packet.data || [];
      if (null != packet.id) {
        args.push(this.ack(packet.id));
      }
      if (this.connected) {
        this.emitEvent(args);
      } else {
        this.receiveBuffer.push(Object.freeze(args));
      }
    }
    emitEvent(args) {
      if (this._anyListeners && this._anyListeners.length) {
        const listeners = this._anyListeners.slice();
        for (const listener of listeners) {
          listener.apply(this, args);
        }
      }
      super.emit.apply(this, args);
      if (this._pid && args.length && typeof args[args.length - 1] === "string") {
        this._lastOffset = args[args.length - 1];
      }
    }
    /**
     * Produces an ack callback to emit with an event.
     *
     * @private
     */
    ack(id) {
      const self2 = this;
      let sent = false;
      return function(...args) {
        if (sent)
          return;
        sent = true;
        self2.packet({
          type: PacketType.ACK,
          id,
          data: args
        });
      };
    }
    /**
     * Called upon a server acknowledgement.
     *
     * @param packet
     * @private
     */
    onack(packet) {
      const ack = this.acks[packet.id];
      if (typeof ack !== "function") {
        return;
      }
      delete this.acks[packet.id];
      if (ack.withError) {
        packet.data.unshift(null);
      }
      ack.apply(this, packet.data);
    }
    /**
     * Called upon server connect.
     *
     * @private
     */
    onconnect(id, pid) {
      this.id = id;
      this.recovered = pid && this._pid === pid;
      this._pid = pid;
      this.connected = true;
      this.emitBuffered();
      this._drainQueue(true);
      this.emitReserved("connect");
    }
    /**
     * Emit buffered events (received and emitted).
     *
     * @private
     */
    emitBuffered() {
      this.receiveBuffer.forEach((args) => this.emitEvent(args));
      this.receiveBuffer = [];
      this.sendBuffer.forEach((packet) => {
        this.notifyOutgoingListeners(packet);
        this.packet(packet);
      });
      this.sendBuffer = [];
    }
    /**
     * Called upon server disconnect.
     *
     * @private
     */
    ondisconnect() {
      this.destroy();
      this.onclose("io server disconnect");
    }
    /**
     * Called upon forced client/server side disconnections,
     * this method ensures the manager stops tracking us and
     * that reconnections don't get triggered for this.
     *
     * @private
     */
    destroy() {
      if (this.subs) {
        this.subs.forEach((subDestroy) => subDestroy());
        this.subs = void 0;
      }
      this.io["_destroy"](this);
    }
    /**
     * Disconnects the socket manually. In that case, the socket will not try to reconnect.
     *
     * If this is the last active Socket instance of the {@link Manager}, the low-level connection will be closed.
     *
     * @example
     * const socket = io();
     *
     * socket.on("disconnect", (reason) => {
     *   // console.log(reason); prints "io client disconnect"
     * });
     *
     * socket.disconnect();
     *
     * @return self
     */
    disconnect() {
      if (this.connected) {
        this.packet({ type: PacketType.DISCONNECT });
      }
      this.destroy();
      if (this.connected) {
        this.onclose("io client disconnect");
      }
      return this;
    }
    /**
     * Alias for {@link disconnect()}.
     *
     * @return self
     */
    close() {
      return this.disconnect();
    }
    /**
     * Sets the compress flag.
     *
     * @example
     * socket.compress(false).emit("hello");
     *
     * @param compress - if `true`, compresses the sending data
     * @return self
     */
    compress(compress) {
      this.flags.compress = compress;
      return this;
    }
    /**
     * Sets a modifier for a subsequent event emission that the event message will be dropped when this socket is not
     * ready to send messages.
     *
     * @example
     * socket.volatile.emit("hello"); // the server may or may not receive it
     *
     * @returns self
     */
    get volatile() {
      this.flags.volatile = true;
      return this;
    }
    /**
     * Sets a modifier for a subsequent event emission that the callback will be called with an error when the
     * given number of milliseconds have elapsed without an acknowledgement from the server:
     *
     * @example
     * socket.timeout(5000).emit("my-event", (err) => {
     *   if (err) {
     *     // the server did not acknowledge the event in the given delay
     *   }
     * });
     *
     * @returns self
     */
    timeout(timeout) {
      this.flags.timeout = timeout;
      return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback.
     *
     * @example
     * socket.onAny((event, ...args) => {
     *   console.log(`got ${event}`);
     * });
     *
     * @param listener
     */
    onAny(listener) {
      this._anyListeners = this._anyListeners || [];
      this._anyListeners.push(listener);
      return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * @example
     * socket.prependAny((event, ...args) => {
     *   console.log(`got event ${event}`);
     * });
     *
     * @param listener
     */
    prependAny(listener) {
      this._anyListeners = this._anyListeners || [];
      this._anyListeners.unshift(listener);
      return this;
    }
    /**
     * Removes the listener that will be fired when any event is emitted.
     *
     * @example
     * const catchAllListener = (event, ...args) => {
     *   console.log(`got event ${event}`);
     * }
     *
     * socket.onAny(catchAllListener);
     *
     * // remove a specific listener
     * socket.offAny(catchAllListener);
     *
     * // or remove all listeners
     * socket.offAny();
     *
     * @param listener
     */
    offAny(listener) {
      if (!this._anyListeners) {
        return this;
      }
      if (listener) {
        const listeners = this._anyListeners;
        for (let i = 0; i < listeners.length; i++) {
          if (listener === listeners[i]) {
            listeners.splice(i, 1);
            return this;
          }
        }
      } else {
        this._anyListeners = [];
      }
      return this;
    }
    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    listenersAny() {
      return this._anyListeners || [];
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback.
     *
     * Note: acknowledgements sent to the server are not included.
     *
     * @example
     * socket.onAnyOutgoing((event, ...args) => {
     *   console.log(`sent event ${event}`);
     * });
     *
     * @param listener
     */
    onAnyOutgoing(listener) {
      this._anyOutgoingListeners = this._anyOutgoingListeners || [];
      this._anyOutgoingListeners.push(listener);
      return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * Note: acknowledgements sent to the server are not included.
     *
     * @example
     * socket.prependAnyOutgoing((event, ...args) => {
     *   console.log(`sent event ${event}`);
     * });
     *
     * @param listener
     */
    prependAnyOutgoing(listener) {
      this._anyOutgoingListeners = this._anyOutgoingListeners || [];
      this._anyOutgoingListeners.unshift(listener);
      return this;
    }
    /**
     * Removes the listener that will be fired when any event is emitted.
     *
     * @example
     * const catchAllListener = (event, ...args) => {
     *   console.log(`sent event ${event}`);
     * }
     *
     * socket.onAnyOutgoing(catchAllListener);
     *
     * // remove a specific listener
     * socket.offAnyOutgoing(catchAllListener);
     *
     * // or remove all listeners
     * socket.offAnyOutgoing();
     *
     * @param [listener] - the catch-all listener (optional)
     */
    offAnyOutgoing(listener) {
      if (!this._anyOutgoingListeners) {
        return this;
      }
      if (listener) {
        const listeners = this._anyOutgoingListeners;
        for (let i = 0; i < listeners.length; i++) {
          if (listener === listeners[i]) {
            listeners.splice(i, 1);
            return this;
          }
        }
      } else {
        this._anyOutgoingListeners = [];
      }
      return this;
    }
    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    listenersAnyOutgoing() {
      return this._anyOutgoingListeners || [];
    }
    /**
     * Notify the listeners for each packet sent
     *
     * @param packet
     *
     * @private
     */
    notifyOutgoingListeners(packet) {
      if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
        const listeners = this._anyOutgoingListeners.slice();
        for (const listener of listeners) {
          listener.apply(this, packet.data);
        }
      }
    }
  };

  // node_modules/socket.io-client/build/esm/contrib/backo2.js
  function Backoff(opts) {
    opts = opts || {};
    this.ms = opts.min || 100;
    this.max = opts.max || 1e4;
    this.factor = opts.factor || 2;
    this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
    this.attempts = 0;
  }
  Backoff.prototype.duration = function() {
    var ms = this.ms * Math.pow(this.factor, this.attempts++);
    if (this.jitter) {
      var rand = Math.random();
      var deviation = Math.floor(rand * this.jitter * ms);
      ms = (Math.floor(rand * 10) & 1) == 0 ? ms - deviation : ms + deviation;
    }
    return Math.min(ms, this.max) | 0;
  };
  Backoff.prototype.reset = function() {
    this.attempts = 0;
  };
  Backoff.prototype.setMin = function(min) {
    this.ms = min;
  };
  Backoff.prototype.setMax = function(max) {
    this.max = max;
  };
  Backoff.prototype.setJitter = function(jitter) {
    this.jitter = jitter;
  };

  // node_modules/socket.io-client/build/esm/manager.js
  var Manager = class extends Emitter {
    constructor(uri, opts) {
      var _a;
      super();
      this.nsps = {};
      this.subs = [];
      if (uri && "object" === typeof uri) {
        opts = uri;
        uri = void 0;
      }
      opts = opts || {};
      opts.path = opts.path || "/socket.io";
      this.opts = opts;
      installTimerFunctions(this, opts);
      this.reconnection(opts.reconnection !== false);
      this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
      this.reconnectionDelay(opts.reconnectionDelay || 1e3);
      this.reconnectionDelayMax(opts.reconnectionDelayMax || 5e3);
      this.randomizationFactor((_a = opts.randomizationFactor) !== null && _a !== void 0 ? _a : 0.5);
      this.backoff = new Backoff({
        min: this.reconnectionDelay(),
        max: this.reconnectionDelayMax(),
        jitter: this.randomizationFactor()
      });
      this.timeout(null == opts.timeout ? 2e4 : opts.timeout);
      this._readyState = "closed";
      this.uri = uri;
      const _parser = opts.parser || esm_exports;
      this.encoder = new _parser.Encoder();
      this.decoder = new _parser.Decoder();
      this._autoConnect = opts.autoConnect !== false;
      if (this._autoConnect)
        this.open();
    }
    reconnection(v) {
      if (!arguments.length)
        return this._reconnection;
      this._reconnection = !!v;
      if (!v) {
        this.skipReconnect = true;
      }
      return this;
    }
    reconnectionAttempts(v) {
      if (v === void 0)
        return this._reconnectionAttempts;
      this._reconnectionAttempts = v;
      return this;
    }
    reconnectionDelay(v) {
      var _a;
      if (v === void 0)
        return this._reconnectionDelay;
      this._reconnectionDelay = v;
      (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMin(v);
      return this;
    }
    randomizationFactor(v) {
      var _a;
      if (v === void 0)
        return this._randomizationFactor;
      this._randomizationFactor = v;
      (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setJitter(v);
      return this;
    }
    reconnectionDelayMax(v) {
      var _a;
      if (v === void 0)
        return this._reconnectionDelayMax;
      this._reconnectionDelayMax = v;
      (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMax(v);
      return this;
    }
    timeout(v) {
      if (!arguments.length)
        return this._timeout;
      this._timeout = v;
      return this;
    }
    /**
     * Starts trying to reconnect if reconnection is enabled and we have not
     * started reconnecting yet
     *
     * @private
     */
    maybeReconnectOnOpen() {
      if (!this._reconnecting && this._reconnection && this.backoff.attempts === 0) {
        this.reconnect();
      }
    }
    /**
     * Sets the current transport `socket`.
     *
     * @param {Function} fn - optional, callback
     * @return self
     * @public
     */
    open(fn) {
      if (~this._readyState.indexOf("open"))
        return this;
      this.engine = new Socket(this.uri, this.opts);
      const socket2 = this.engine;
      const self2 = this;
      this._readyState = "opening";
      this.skipReconnect = false;
      const openSubDestroy = on(socket2, "open", function() {
        self2.onopen();
        fn && fn();
      });
      const onError = (err) => {
        this.cleanup();
        this._readyState = "closed";
        this.emitReserved("error", err);
        if (fn) {
          fn(err);
        } else {
          this.maybeReconnectOnOpen();
        }
      };
      const errorSub = on(socket2, "error", onError);
      if (false !== this._timeout) {
        const timeout = this._timeout;
        const timer = this.setTimeoutFn(() => {
          openSubDestroy();
          onError(new Error("timeout"));
          socket2.close();
        }, timeout);
        if (this.opts.autoUnref) {
          timer.unref();
        }
        this.subs.push(() => {
          this.clearTimeoutFn(timer);
        });
      }
      this.subs.push(openSubDestroy);
      this.subs.push(errorSub);
      return this;
    }
    /**
     * Alias for open()
     *
     * @return self
     * @public
     */
    connect(fn) {
      return this.open(fn);
    }
    /**
     * Called upon transport open.
     *
     * @private
     */
    onopen() {
      this.cleanup();
      this._readyState = "open";
      this.emitReserved("open");
      const socket2 = this.engine;
      this.subs.push(
        on(socket2, "ping", this.onping.bind(this)),
        on(socket2, "data", this.ondata.bind(this)),
        on(socket2, "error", this.onerror.bind(this)),
        on(socket2, "close", this.onclose.bind(this)),
        // @ts-ignore
        on(this.decoder, "decoded", this.ondecoded.bind(this))
      );
    }
    /**
     * Called upon a ping.
     *
     * @private
     */
    onping() {
      this.emitReserved("ping");
    }
    /**
     * Called with data.
     *
     * @private
     */
    ondata(data) {
      try {
        this.decoder.add(data);
      } catch (e) {
        this.onclose("parse error", e);
      }
    }
    /**
     * Called when parser fully decodes a packet.
     *
     * @private
     */
    ondecoded(packet) {
      nextTick(() => {
        this.emitReserved("packet", packet);
      }, this.setTimeoutFn);
    }
    /**
     * Called upon socket error.
     *
     * @private
     */
    onerror(err) {
      this.emitReserved("error", err);
    }
    /**
     * Creates a new socket for the given `nsp`.
     *
     * @return {Socket}
     * @public
     */
    socket(nsp, opts) {
      let socket2 = this.nsps[nsp];
      if (!socket2) {
        socket2 = new Socket2(this, nsp, opts);
        this.nsps[nsp] = socket2;
      } else if (this._autoConnect && !socket2.active) {
        socket2.connect();
      }
      return socket2;
    }
    /**
     * Called upon a socket close.
     *
     * @param socket
     * @private
     */
    _destroy(socket2) {
      const nsps = Object.keys(this.nsps);
      for (const nsp of nsps) {
        const socket3 = this.nsps[nsp];
        if (socket3.active) {
          return;
        }
      }
      this._close();
    }
    /**
     * Writes a packet.
     *
     * @param packet
     * @private
     */
    _packet(packet) {
      const encodedPackets = this.encoder.encode(packet);
      for (let i = 0; i < encodedPackets.length; i++) {
        this.engine.write(encodedPackets[i], packet.options);
      }
    }
    /**
     * Clean up transport subscriptions and packet buffer.
     *
     * @private
     */
    cleanup() {
      this.subs.forEach((subDestroy) => subDestroy());
      this.subs.length = 0;
      this.decoder.destroy();
    }
    /**
     * Close the current socket.
     *
     * @private
     */
    _close() {
      this.skipReconnect = true;
      this._reconnecting = false;
      this.onclose("forced close");
    }
    /**
     * Alias for close()
     *
     * @private
     */
    disconnect() {
      return this._close();
    }
    /**
     * Called when:
     *
     * - the low-level engine is closed
     * - the parser encountered a badly formatted packet
     * - all sockets are disconnected
     *
     * @private
     */
    onclose(reason, description) {
      var _a;
      this.cleanup();
      (_a = this.engine) === null || _a === void 0 ? void 0 : _a.close();
      this.backoff.reset();
      this._readyState = "closed";
      this.emitReserved("close", reason, description);
      if (this._reconnection && !this.skipReconnect) {
        this.reconnect();
      }
    }
    /**
     * Attempt a reconnection.
     *
     * @private
     */
    reconnect() {
      if (this._reconnecting || this.skipReconnect)
        return this;
      const self2 = this;
      if (this.backoff.attempts >= this._reconnectionAttempts) {
        this.backoff.reset();
        this.emitReserved("reconnect_failed");
        this._reconnecting = false;
      } else {
        const delay = this.backoff.duration();
        this._reconnecting = true;
        const timer = this.setTimeoutFn(() => {
          if (self2.skipReconnect)
            return;
          this.emitReserved("reconnect_attempt", self2.backoff.attempts);
          if (self2.skipReconnect)
            return;
          self2.open((err) => {
            if (err) {
              self2._reconnecting = false;
              self2.reconnect();
              this.emitReserved("reconnect_error", err);
            } else {
              self2.onreconnect();
            }
          });
        }, delay);
        if (this.opts.autoUnref) {
          timer.unref();
        }
        this.subs.push(() => {
          this.clearTimeoutFn(timer);
        });
      }
    }
    /**
     * Called upon successful reconnect.
     *
     * @private
     */
    onreconnect() {
      const attempt = this.backoff.attempts;
      this._reconnecting = false;
      this.backoff.reset();
      this.emitReserved("reconnect", attempt);
    }
  };

  // node_modules/socket.io-client/build/esm/index.js
  var cache = {};
  function lookup2(uri, opts) {
    if (typeof uri === "object") {
      opts = uri;
      uri = void 0;
    }
    opts = opts || {};
    const parsed = url(uri, opts.path || "/socket.io");
    const source = parsed.source;
    const id = parsed.id;
    const path = parsed.path;
    const sameNamespace = cache[id] && path in cache[id]["nsps"];
    const newConnection = opts.forceNew || opts["force new connection"] || false === opts.multiplex || sameNamespace;
    let io;
    if (newConnection) {
      io = new Manager(source, opts);
    } else {
      if (!cache[id]) {
        cache[id] = new Manager(source, opts);
      }
      io = cache[id];
    }
    if (parsed.query && !opts.query) {
      opts.query = parsed.queryKey;
    }
    return io.socket(parsed.path, opts);
  }
  Object.assign(lookup2, {
    Manager,
    Socket: Socket2,
    io: lookup2,
    connect: lookup2
  });

  // src/shared/constants.ts
  var CONFIG = {
    ARENA_WIDTH: 2e3,
    ARENA_HEIGHT: 2e3,
    PLAYER_RADIUS: 20,
    TAIL_SEGMENT_RADIUS: 14,
    TAIL_SEGMENT_SPACING: 20,
    // px of travel between segments
    FOOD_RADIUS: 8,
    FOOD_TARGET_COUNT: 50,
    PLAYER_SPEED: 200,
    // units/sec
    STUN_DURATION: 4e3,
    // ms
    TICK_RATE: 60,
    // ticks/sec
    BROADCAST_RATE: 20,
    // state broadcasts/sec
    MAX_PLAYER_NAME_LENGTH: 16,
    MAX_PLAYERS: 20,
    SPAWN_IMMUNITY_MS: 2e3,
    POWERUP_RADIUS: 14,
    POWERUP_TARGET_COUNT: 3,
    HELMET_TARGET_COUNT: 2,
    // number of helmets to keep in arena
    POWERUP_SPEED_DURATION: 5e3,
    // ms
    POWERUP_REVERSE_DURATION: 5e3,
    // ms
    POWERUP_SPEED_MULTIPLIER: 1.8,
    POWERUP_LIFESPAN: 1e4,
    // ms before an uncollected powerup despawns
    POWERUP_MAGNET_DURATION: 5e3,
    // ms
    POWERUP_MAGNET_RADIUS: 200,
    // px — food attraction pull range
    POWERUP_COIN_FLIP_WIN: 5,
    // points gained on heads
    POWERUP_COIN_FLIP_LOSS: 2,
    // points lost on tails (minor)
    OMNI_TARGET_COUNT: 1,
    // one omni powerup in arena at a time
    ZAP_PELLET_THRESHOLD: 10,
    // food pellets needed to charge the zap
    ZAP_STUN_DURATION: 400,
    // ms the zap stuns the target
    SPRINT_SPEED_MULTIPLIER: 1.2,
    SPRINT_MAX_STAMINA: 100,
    // unitless
    SPRINT_DRAIN_RATE: 40,
    // stamina/sec
    SPRINT_RECHARGE_RATE: 20,
    // stamina/sec
    SPRINT_MIN_STAMINA: 10,
    // minimum to begin a sprint
    BLACKHOLE_RADIUS: 40,
    // visual radius
    BLACKHOLE_TARGET_COUNT: 4,
    // number of black holes in arena
    BLACKHOLE_MIN_DISTANCE: 300,
    // minimum distance between holes
    JACKBOX_TARGET_COUNT: 1,
    // keep at most one jack-in-the-box on map
    JACKBOX_RESPAWN_CHANCE_PER_TICK: 1e-3,
    // rare respawn chance (~every 16s on average when absent)
    JACKBOX_GLUE_DURATION: 5e3,
    // ms players stay glued
    JACKBOX_BLAST_SPEED: 800,
    // units/sec blast speed when released
    GUN_TARGET_COUNT: 1,
    // gun pickups on map at once
    GUN_RANGE: 500,
    // 5 grid squares × 100 units
    GUN_FIRE_INTERVAL: 1200,
    // ms between auto-shots
    GUN_BULLET_SPEED: 400,
    // units/sec
    GUN_KNOCKBACK_SPEED: 300,
    // units/sec applied to hit player
    GUN_AMMO: 5,
    // shots before gun disappears
    GUN_BULLET_RADIUS: 8,
    // collision radius for hit detection
    MINIGUN_TARGET_COUNT: 1,
    // minigun pickups on map at once
    MINIGUN_AMMO: 100,
    // shots (burns through fast)
    MINIGUN_FIRE_INTERVAL: 80,
    // ms between shots — ~12 shots/sec
    MINIGUN_SPREAD: 0.18,
    // radians half-angle spread cone
    ICBM_TARGET_COUNT: 1,
    // ICBM pickups on map at once
    ICBM_MISSILE_SPEED: 200,
    // units/sec (same as player — run or dodge!)
    ICBM_TURN_RATE: 1.5,
    // radians/sec max homing turn rate
    ICBM_DETONATE_RADIUS: 35,
    // explode when within this distance of target
    ICBM_BLAST_RADIUS: 130,
    // AOE explosion radius
    ICBM_LIFESPAN: 15e3,
    // ms before self-destruct
    HOOK_TARGET_COUNT: 1,
    // hook pickups in arena at once
    HOOK_PROJECTILE_SPEED: 800,
    // units/sec the hook tip flies
    HOOK_MAX_RANGE: 700,
    // units before hook despawns
    HOOK_PULL_SPEED: 400,
    // units/sec the hooked target is pulled
    HOOK_PULL_DURATION: 1500
    // ms the pull lasts after latching
  };
  var EVENTS = {
    // client -> server
    JOIN: "join",
    INPUT: "input",
    // server -> client
    JOINED: "joined",
    STATE: "state",
    PLAYER_JOINED: "playerJoined",
    PLAYER_LEFT: "playerLeft",
    STUNNED: "stunned"
  };

  // src/client/renderer.ts
  var POWERUP_STYLE = {
    speed: { color: "#facc15", label: "\u26A1" },
    "double-tail": { color: "#a855f7", label: "\xD72" },
    reverse: { color: "#22d3ee", label: "\u21A9" },
    magnet: { color: "#ec4899", label: "\u{1F9F2}" },
    "coin-flip": { color: "#fde68a", label: "\u{1FA99}" },
    helmet: { color: "#9ca3af", label: "\u{1F6E1}\uFE0F" },
    omni: { color: "#ffffff", label: "\u2605" },
    "jack-in-the-box": { color: "#f97316", label: "\u{1F381}" },
    gun: { color: "#ef4444", label: "\u{1F52B}" },
    minigun: { color: "#f97316", label: "\u{1F52B}\u{1F52B}" },
    icbm: { color: "#22d3ee", label: "\u{1F680}" },
    hook: { color: "#f59e0b", label: "\u{1FA9D}" }
  };
  var GRID_SIZE = 100;
  var BG_COLOR = "#1a1a2e";
  var ARENA_BORDER = "#4a4a8a";
  var GRID_COLOR = "rgba(255,255,255,0.04)";
  var FOOD_COLOR = "#22c55e";
  var SILLY_MESSAGES = [
    "hey loser",
    "gimme ur tail",
    "nice helmet lol",
    "get out my way",
    "ur bad",
    "I'm fasting",
    "salty?",
    "YEET",
    "lmao",
    "ok nerd",
    "imagine",
    "skill issue",
    "cope",
    "rent free",
    "ratio'd",
    "sus",
    "mid",
    "no cap",
    "bussin",
    "eat my tail",
    "ur mom",
    "no u",
    "stop",
    "why",
    "you suck",
    "rekt",
    "owned",
    "haha",
    "git gud",
    "eat dirt",
    "l + ratio",
    "touch grass",
    "maidenless",
    "down bad",
    "simping",
    "no bitches?",
    "caught in 4k",
    "average player",
    "ratio incoming",
    "stay mad",
    "malding",
    "get rolled",
    "EZ",
    "EASY WIN",
    "skill gap",
    "do better",
    "DELETED",
    "L take",
    "cringe",
    "yikes"
  ];
  var AVATAR_ASSET_BASE_URL = new URL(".", window.location.href).toString();
  function createRendererState() {
    return {
      localPlayerId: null,
      latestState: null,
      prevState: null,
      lastStateTime: Date.now(),
      stunFlash: /* @__PURE__ */ new Map(),
      camera: { x: CONFIG.ARENA_WIDTH / 2, y: CONFIG.ARENA_HEIGHT / 2 },
      lastFrameTime: Date.now(),
      scamPopup: null,
      coinFlipPopup: null,
      ouroborosPopup: null,
      omniPopup: null,
      speechBubbles: /* @__PURE__ */ new Map(),
      lastSpeechTime: /* @__PURE__ */ new Map(),
      particles: [],
      prevFoodCount: 0,
      prevPlayerHits: /* @__PURE__ */ new Map(),
      prevPlayerPos: /* @__PURE__ */ new Map(),
      scoreboardCollapsed: false,
      minimapCollapsed: false
    };
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function lerpVec(a, b, t) {
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  }
  function findById(players, id) {
    return players.find((p) => p.id === id);
  }
  function spawnConfetti(particles, x, y, count = 12) {
    const colors = ["#ff1493", "#00d4ff", "#facc15", "#22c55e", "#a855f7"];
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      const speed = 150 + Math.random() * 150;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 800,
        maxLife: 800,
        size: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: "confetti"
      });
    }
  }
  function spawnStars(particles, x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 200 + Math.random() * 200;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 600,
        maxLife: 600,
        size: 5 + Math.random() * 5,
        color: "#ffff00",
        type: "star"
      });
    }
  }
  function spawnSmoke(particles, x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 1e3,
        maxLife: 1e3,
        size: 8 + Math.random() * 12,
        color: "rgba(150, 100, 255, 0.6)",
        type: "smoke"
      });
    }
  }
  function startRenderLoop(canvas2, state) {
    const ctx = canvas2.getContext("2d");
    const BROADCAST_INTERVAL = 1e3 / CONFIG.BROADCAST_RATE;
    function resize() {
      canvas2.width = window.innerWidth;
      canvas2.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();
    function frame() {
      requestAnimationFrame(frame);
      if (!state.latestState) return;
      const now = Date.now();
      const rawT = (now - state.lastStateTime) / BROADCAST_INTERVAL;
      const t = Math.min(rawT, 1);
      const interp = /* @__PURE__ */ new Map();
      for (const curr of state.latestState.players) {
        if (state.prevState) {
          const prev = findById(state.prevState.players, curr.id);
          if (prev) {
            interp.set(curr.id, lerpVec({ x: prev.x, y: prev.y }, { x: curr.x, y: curr.y }, t));
            continue;
          }
        }
        interp.set(curr.id, { x: curr.x, y: curr.y });
      }
      const local = state.localPlayerId ? state.latestState.players.find((p) => p.id === state.localPlayerId) : null;
      const target = local ? interp.get(local.id) ?? { x: local.x, y: local.y } : { x: CONFIG.ARENA_WIDTH / 2, y: CONFIG.ARENA_HEIGHT / 2 };
      const frameNow = Date.now();
      const dt = Math.min((frameNow - state.lastFrameTime) / 1e3, 0.1);
      state.lastFrameTime = frameNow;
      const CAMERA_SPEED = 10;
      const alpha = 1 - Math.exp(-CAMERA_SPEED * dt);
      state.camera.x += (target.x - state.camera.x) * alpha;
      state.camera.y += (target.y - state.camera.y) * alpha;
      if (state.latestState.foods.length < state.prevFoodCount) {
        const missingFood = state.prevState?.foods ?? [];
        for (const food of missingFood) {
          const still = state.latestState.foods.find((f) => f.id === food.id);
          if (!still) {
            spawnConfetti(state.particles, food.x, food.y, 15);
            break;
          }
        }
      }
      state.prevFoodCount = state.latestState.foods.length;
      for (const player of state.latestState.players) {
        const prevStun = state.prevPlayerHits.get(player.id) ?? 0;
        if (player.stunned && !prevStun) {
          spawnStars(state.particles, player.x, player.y, 10);
        }
        state.prevPlayerHits.set(player.id, player.stunned ? 1 : 0);
        const prevPos = state.prevPlayerPos.get(player.id);
        if (prevPos) {
          const dist = Math.sqrt((player.x - prevPos.x) ** 2 + (player.y - prevPos.y) ** 2);
          if (dist > 500) {
            spawnSmoke(state.particles, prevPos.x, prevPos.y, 8);
            spawnSmoke(state.particles, player.x, player.y, 8);
          }
        }
        state.prevPlayerPos.set(player.id, { x: player.x, y: player.y });
      }
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt * 1e3;
        p.vy += 300 * dt;
        if (p.life <= 0) {
          state.particles.splice(i, 1);
        }
      }
      const SPEECH_PROXIMITY = 150;
      const SPEECH_DURATION = 3e3;
      const SPEECH_COOLDOWN = 8e3;
      const SPEECH_CHANCE = 200;
      for (const [playerId, bubble] of state.speechBubbles.entries()) {
        if (now - bubble.startTime > SPEECH_DURATION) {
          state.speechBubbles.delete(playerId);
        }
      }
      for (const player of state.latestState.players) {
        if (state.speechBubbles.has(player.id)) continue;
        const lastSpeech = state.lastSpeechTime.get(player.id) ?? 0;
        if (now - lastSpeech < SPEECH_COOLDOWN) continue;
        for (const other of state.latestState.players) {
          if (other.id === player.id) continue;
          const dx = other.x - player.x;
          const dy = other.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < SPEECH_PROXIMITY) {
            if (Math.random() < 1 / SPEECH_CHANCE) {
              const message = SILLY_MESSAGES[Math.floor(Math.random() * SILLY_MESSAGES.length)];
              state.speechBubbles.set(player.id, {
                playerId: player.id,
                message,
                startTime: now
              });
              state.lastSpeechTime.set(player.id, now);
              break;
            }
          }
        }
      }
      const offsetX = canvas2.width / 2 - state.camera.x;
      const offsetY = canvas2.height / 2 - state.camera.y;
      ctx.clearRect(0, 0, canvas2.width, canvas2.height);
      ctx.fillStyle = "#0d0d1a";
      ctx.fillRect(0, 0, canvas2.width, canvas2.height);
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, CONFIG.ARENA_WIDTH, CONFIG.ARENA_HEIGHT);
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      for (let x = 0; x <= CONFIG.ARENA_WIDTH; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CONFIG.ARENA_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y <= CONFIG.ARENA_HEIGHT; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CONFIG.ARENA_WIDTH, y);
        ctx.stroke();
      }
      ctx.strokeStyle = ARENA_BORDER;
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, CONFIG.ARENA_WIDTH, CONFIG.ARENA_HEIGHT);
      const foodPulse = Math.sin(now * 3e-3) * 1.5;
      ctx.shadowColor = FOOD_COLOR;
      ctx.shadowBlur = 10;
      ctx.fillStyle = FOOD_COLOR;
      for (const food of state.latestState.foods) {
        ctx.beginPath();
        ctx.arc(food.x, food.y, CONFIG.FOOD_RADIUS + foodPulse, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      const puPulse = 1 + 0.15 * Math.sin(now * 4e-3);
      for (const pu of state.latestState.powerups) {
        const style = POWERUP_STYLE[pu.type];
        if (!style) continue;
        const r = CONFIG.POWERUP_RADIUS * puPulse;
        ctx.save();
        if (pu.type === "omni") {
          const hue = now * 0.15 % 360;
          const rainbowColor = `hsl(${hue}, 100%, 60%)`;
          const rainbowColor2 = `hsl(${(hue + 180) % 360}, 100%, 60%)`;
          for (let ri = 0; ri < 3; ri++) {
            const ringHue = (hue + ri * 120) % 360;
            const spinAngle = now * 3e-3 * (ri % 2 === 0 ? 1 : -1);
            ctx.strokeStyle = `hsl(${ringHue}, 100%, 65%)`;
            ctx.lineWidth = 2;
            ctx.shadowColor = `hsl(${ringHue}, 100%, 65%)`;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(pu.x, pu.y, r + 5 + ri * 4, spinAngle, spinAngle + Math.PI * 1.5);
            ctx.stroke();
          }
          const grad = ctx.createRadialGradient(pu.x, pu.y, 0, pu.x, pu.y, r);
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(0.5, rainbowColor);
          grad.addColorStop(1, rainbowColor2);
          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.9;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(pu.x, pu.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.font = `bold ${r * 1.1}px "Segoe UI", system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#000";
          ctx.fillText(style.label, pu.x, pu.y + 1);
        } else if (pu.type === "jack-in-the-box") {
          const boxSize = r * 1.7;
          const boxHalf = boxSize / 2;
          ctx.shadowColor = "#f97316";
          ctx.shadowBlur = 18;
          ctx.fillStyle = "#f97316";
          ctx.globalAlpha = 0.92;
          ctx.beginPath();
          ctx.roundRect(pu.x - boxHalf, pu.y - boxHalf * 0.65, boxSize, boxSize * 1.1, 6);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#7c2d12";
          const stripeW = boxSize * 0.14;
          for (let sx = pu.x - boxHalf + stripeW; sx < pu.x + boxHalf; sx += stripeW * 2) {
            ctx.fillRect(sx, pu.y - boxHalf * 0.65, stripeW, boxSize * 1.1);
          }
          ctx.strokeStyle = "#111827";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          const springTop = pu.y - boxHalf * 1.15;
          const springBottom = pu.y - boxHalf * 0.72;
          const coils = 5;
          for (let i = 0; i <= coils; i++) {
            const t2 = i / coils;
            const x = pu.x + Math.sin(t2 * Math.PI * 4) * (r * 0.36);
            const y = springTop + (springBottom - springTop) * t2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.fillStyle = "#fde68a";
          ctx.beginPath();
          ctx.arc(pu.x, springTop - r * 0.18, r * 0.34, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = `bold ${r * 0.95}px "Segoe UI", system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#111827";
          ctx.fillText("J", pu.x, pu.y + 1);
        } else {
          ctx.shadowColor = style.color;
          ctx.shadowBlur = 18;
          ctx.strokeStyle = style.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(pu.x, pu.y, r + 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = style.color;
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.arc(pu.x, pu.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          ctx.font = `bold ${r * 1.1}px "Segoe UI", system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#000";
          ctx.fillText(style.label, pu.x, pu.y + 1);
        }
        ctx.restore();
      }
      for (const bh of state.latestState.blackholes) {
        const bhRadius = bh.radius || CONFIG.BLACKHOLE_RADIUS;
        const bhColor = bh.color || "#a020f0";
        ctx.save();
        for (let ring = 0; ring < 3; ring++) {
          const ringRadius = bhRadius * (0.3 + ring * 0.25);
          const rotation = now * 8e-4 * (ring % 2 ? 1 : -1) + ring * Math.PI / 1.5;
          ctx.strokeStyle = `${bhColor}${Math.floor((0.5 - ring * 0.12) * 255).toString(16).padStart(2, "0")}`;
          ctx.lineWidth = 1.5 - ring * 0.3;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = rotation + i / 6 * Math.PI * 2;
            const x = bh.x + Math.cos(angle) * ringRadius;
            const y = bh.y + Math.sin(angle) * ringRadius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
        ctx.shadowColor = bhColor;
        ctx.shadowBlur = 40;
        ctx.fillStyle = bhColor;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bhRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        const coreGradient = ctx.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, bhRadius * 0.7);
        coreGradient.addColorStop(0, "rgba(0, 0, 0, 0.9)");
        coreGradient.addColorStop(1, `${bhColor}40`);
        ctx.fillStyle = coreGradient;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bhRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        const horizonPulse = 0.4 + 0.6 * Math.sin(now * 6e-3);
        ctx.strokeStyle = bhColor;
        ctx.globalAlpha = horizonPulse;
        ctx.lineWidth = 3;
        ctx.shadowColor = bhColor;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bhRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        for (let p = 0; p < 5; p++) {
          const angle = (now * 1e-3 + p * (Math.PI * 2 / 5)) % (Math.PI * 2);
          const dist = bhRadius * 1.3;
          const px = bh.x + Math.cos(angle) * dist;
          const py = bh.y + Math.sin(angle) * dist;
          const fade = 0.3 + 0.7 * (1 - angle % (Math.PI * 2) / (Math.PI * 2));
          ctx.globalAlpha = fade;
          ctx.fillStyle = "#ff00ff";
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      const topScorer = state.latestState.players.reduce((max, p) => p.score > max.score ? p : max);
      for (const player of state.latestState.players) {
        if (!player.gluedTo || !player.gluedUntil) continue;
        if (player.id > player.gluedTo) continue;
        const partner = state.latestState.players.find((p) => p.id === player.gluedTo);
        if (!partner) continue;
        const posA = interp.get(player.id) ?? { x: player.x, y: player.y };
        const posB = interp.get(partner.id) ?? { x: partner.x, y: partner.y };
        const timeLeft = Math.max(0, player.gluedUntil - now);
        const progress = timeLeft / CONFIG.JACKBOX_GLUE_DURATION;
        const wobble = Math.sin(now * 0.015) * 12 * progress;
        const midX = (posA.x + posB.x) / 2 + wobble;
        const midY = (posA.y + posB.y) / 2 + wobble;
        const r = Math.floor(255);
        const g = Math.floor(150 * progress);
        ctx.save();
        ctx.strokeStyle = `rgb(${r},${g},0)`;
        ctx.lineWidth = 3 + 2 * progress;
        ctx.setLineDash([8, 5]);
        ctx.shadowColor = `rgb(${r},${g},0)`;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(posA.x, posA.y);
        ctx.quadraticCurveTo(midX, midY, posB.x, posB.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      for (const hook of state.latestState.hooks ?? []) {
        const ownerPos = interp.get(hook.ownerId) ?? state.latestState.players.find((p) => p.id === hook.ownerId);
        if (!ownerPos) continue;
        let tipX = hook.x;
        let tipY = hook.y;
        if (hook.latchedTo) {
          const targetPos = interp.get(hook.latchedTo) ?? state.latestState.players.find((p) => p.id === hook.latchedTo);
          if (targetPos) {
            tipX = targetPos.x;
            tipY = targetPos.y;
          }
        }
        ctx.save();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 3;
        if (!hook.latchedTo) ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(ownerPos.x, ownerPos.y);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(tipX, tipY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      for (const player of state.latestState.players) {
        const pos = interp.get(player.id) ?? { x: player.x, y: player.y };
        const isLocal = player.id === state.localPlayerId;
        const isStunned = player.stunned;
        const isTopScorer = player.id === topScorer.id && topScorer.score > 0;
        ctx.save();
        if (isStunned) ctx.globalAlpha = 0.45;
        const tailLen = player.tail.length;
        if (isTopScorer) {
          ctx.shadowColor = player.color;
          ctx.shadowBlur = 8;
        }
        for (let ti = 0; ti < tailLen; ti++) {
          const seg = player.tail[ti];
          const fadeFrac = tailLen > 1 ? ti / (tailLen - 1) : 0;
          const segRadius = CONFIG.TAIL_SEGMENT_RADIUS * lerp(1, 0.6, fadeFrac);
          const baseAlpha = isStunned ? 0.25 : lerp(0.75, 0.25, fadeFrac);
          ctx.globalAlpha = baseAlpha;
          ctx.beginPath();
          ctx.arc(seg.x, seg.y, segRadius, 0, Math.PI * 2);
          ctx.fillStyle = player.color;
          ctx.fill();
          if (isTopScorer) {
            ctx.globalAlpha = 0.35;
            const glowPulse = 0.6 + 0.4 * Math.sin(now * 4e-3 + ti * 0.15);
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(seg.x, seg.y, segRadius + 8, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = isStunned ? 0.45 : 1;
        ctx.shadowColor = player.color;
        ctx.shadowBlur = isTopScorer ? 30 : isLocal ? 18 : 8;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();
        const hashCode = player.id.charCodeAt(0) + player.id.charCodeAt(player.id.length - 1);
        const faceStyle = Math.abs(hashCode) % 12;
        const eyeOffsetX = CONFIG.PLAYER_RADIUS * 0.33;
        const eyeOffsetY = CONFIG.PLAYER_RADIUS * 0.22;
        const eyeR = CONFIG.PLAYER_RADIUS * 0.2;
        const moveDir = player.facingAngle ?? 0;
        const lookX = Math.cos(moveDir) * eyeR * 0.35;
        const lookY = Math.sin(moveDir) * eyeR * 0.35;
        const blink = 0.35 + 0.65 * Math.abs(Math.sin(now * 4e-3 + hashCode * 0.17));
        const winkCycleMs = 9500;
        const winkWindowMs = 230;
        const winkPhase = (now + hashCode * 173) % winkCycleMs;
        const winkingEye = winkPhase < winkWindowMs ? hashCode % 2 === 0 ? "left" : "right" : null;
        const eyeRollCycleMs = 14e3;
        const eyeRollWindowMs = 210;
        const eyeRollPhase = (now + hashCode * 311) % eyeRollCycleMs;
        const isEyeRoll = eyeRollPhase < eyeRollWindowMs;
        const drawSnakeEye = (x, y, style, eyeSeed, side) => {
          const styleType = Math.abs(style) % 12;
          const eyeJitterX = Math.sin(now * 3e-3 + eyeSeed * 0.9) * eyeR * 0.07;
          const eyeJitterY = Math.cos(now * 27e-4 + eyeSeed * 0.6) * eyeR * 0.05;
          const cx = x + eyeJitterX;
          const cy = y + eyeJitterY;
          const isWinkThisEye = winkingEye === side;
          const scleraH = eyeR * (styleType === 1 || styleType === 7 ? 0.52 : 0.92) * (isWinkThisEye ? 0.2 : blink);
          const localLookX = isEyeRoll ? 0 : lookX;
          const localLookY = isEyeRoll ? -eyeR * 0.6 : lookY;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.ellipse(cx, cy, eyeR, Math.max(eyeR * 0.22, scleraH), 0, 0, Math.PI * 2);
          ctx.fill();
          if (isWinkThisEye) {
            ctx.strokeStyle = "#111827";
            ctx.lineWidth = Math.max(1.4, eyeR * 0.14);
            ctx.beginPath();
            ctx.moveTo(cx - eyeR * 0.75, cy);
            ctx.lineTo(cx + eyeR * 0.75, cy + eyeR * 0.05);
            ctx.stroke();
            return;
          }
          const irisColor = ["#22c55e", "#eab308", "#60a5fa", "#f97316", "#a78bfa", "#fb7185", "#f43f5e", "#34d399"][styleType % 8];
          const irisX = cx + localLookX * (styleType === 6 ? 0.25 : 0.6);
          const irisY = cy + localLookY * (styleType === 6 ? 0.25 : 0.6);
          ctx.fillStyle = irisColor;
          ctx.beginPath();
          ctx.ellipse(irisX, irisY, eyeR * (styleType === 4 ? 0.62 : 0.52), eyeR * (styleType === 4 ? 0.62 : 0.52), 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#111827";
          if (styleType === 0 || styleType === 3) {
            ctx.beginPath();
            ctx.ellipse(cx + localLookX, cy + localLookY, eyeR * 0.14, eyeR * 0.46, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (styleType === 1) {
            ctx.beginPath();
            ctx.ellipse(cx + localLookX * 0.7, cy + localLookY * 0.7, eyeR * 0.24, eyeR * 0.22, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (styleType === 2) {
            ctx.beginPath();
            ctx.ellipse(cx + localLookX, cy + localLookY, eyeR * 0.09, eyeR * 0.5, 0.25, 0, Math.PI * 2);
            ctx.fill();
          } else if (styleType === 4) {
            const wiggle = Math.sin(now * 0.01 + eyeSeed) * eyeR * 0.18;
            ctx.beginPath();
            ctx.arc(cx + localLookX * 0.35 + wiggle, cy + localLookY * 0.35, eyeR * 0.16, 0, Math.PI * 2);
            ctx.fill();
          } else if (styleType === 5) {
            ctx.beginPath();
            ctx.arc(cx + localLookX * 0.9, cy + localLookY * 0.9, eyeR * 0.1, 0, Math.PI * 2);
            ctx.fill();
          } else if (styleType === 6) {
            ctx.strokeStyle = "#111827";
            ctx.lineWidth = Math.max(1, eyeR * 0.12);
            ctx.beginPath();
            ctx.arc(cx, cy, eyeR * 0.23, 0, Math.PI * 1.75);
            ctx.stroke();
          } else if (styleType === 7) {
            ctx.fillRect(cx - eyeR * 0.24, cy - eyeR * 0.06, eyeR * 0.48, eyeR * 0.12);
          } else if (styleType === 8) {
            ctx.beginPath();
            ctx.ellipse(cx + eyeR * 0.18, cy - eyeR * 0.05, eyeR * 0.1, eyeR * 0.44, 0.12, 0, Math.PI * 2);
            ctx.fill();
          } else if (styleType === 9) {
            ctx.beginPath();
            ctx.ellipse(cx - eyeR * 0.12, cy + localLookY * 0.25, eyeR * 0.12, eyeR * 0.34, -0.15, 0, Math.PI * 2);
            ctx.fill();
          } else if (styleType === 10) {
            ctx.beginPath();
            ctx.moveTo(cx, cy - eyeR * 0.32);
            ctx.lineTo(cx + eyeR * 0.16, cy);
            ctx.lineTo(cx, cy + eyeR * 0.32);
            ctx.lineTo(cx - eyeR * 0.16, cy);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.ellipse(cx + localLookX, cy + localLookY, eyeR * 0.12, eyeR * 0.44, -0.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.beginPath();
          ctx.arc(cx - eyeR * 0.25, cy - eyeR * 0.25, eyeR * 0.12, 0, Math.PI * 2);
          ctx.fill();
        };
        drawSnakeEye(pos.x - eyeOffsetX, pos.y - eyeOffsetY, faceStyle, hashCode + 11, "left");
        drawSnakeEye(pos.x + eyeOffsetX, pos.y - eyeOffsetY, (faceStyle + 7) % 12, hashCode + 37, "right");
        if (faceStyle !== 4 && faceStyle !== 6) {
          ctx.strokeStyle = "rgba(17, 24, 39, 0.7)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pos.x - eyeOffsetX - eyeR * 0.65, pos.y - eyeOffsetY - eyeR * 0.9);
          ctx.lineTo(pos.x - eyeOffsetX + eyeR * 0.65, pos.y - eyeOffsetY - eyeR * (0.72 + 0.05 * Math.sin(now * 6e-3 + hashCode)));
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pos.x + eyeOffsetX - eyeR * 0.65, pos.y - eyeOffsetY - eyeR * (0.72 + 0.05 * Math.sin(now * 6e-3 + hashCode + 1)));
          ctx.lineTo(pos.x + eyeOffsetX + eyeR * 0.65, pos.y - eyeOffsetY - eyeR * 0.9);
          ctx.stroke();
        }
        {
          const R = CONFIG.PLAYER_RADIUS;
          const BEARD_MIN = 3;
          const BEARD_MAX = 30;
          if (tailLen >= BEARD_MIN) {
            const prog = Math.min(1, (tailLen - BEARD_MIN) / (BEARD_MAX - BEARD_MIN));
            const beardLen = R * 2.6 * prog;
            const strandCount = 3 + Math.floor(prog * 6);
            ctx.save();
            ctx.lineCap = "round";
            for (let si = 0; si < strandCount; si++) {
              const t2 = strandCount > 1 ? si / (strandCount - 1) : 0.5;
              const anchorX = pos.x + Math.cos(Math.PI * 0.5 + (t2 - 0.5) * Math.PI) * R * 0.78;
              const anchorY = pos.y + Math.sin(Math.PI * 0.5 + (t2 - 0.5) * Math.PI) * R * 0.78;
              const sway = Math.sin(now * 15e-4 + (hashCode + si * 23) * 0.7) * R * 0.2 * prog;
              const endX = anchorX + (t2 - 0.5) * beardLen * 0.35 + sway;
              const endY = anchorY + beardLen;
              const ctrlX = (anchorX + endX) / 2 + sway * 0.6;
              const ctrlY = anchorY + beardLen * 0.55;
              ctx.lineWidth = Math.max(1.2, (1.5 + prog * R * 0.13) * (1 - Math.abs(t2 - 0.5) * 0.55));
              const br = Math.round(lerp(150, 215, prog));
              const bg = Math.round(lerp(95, 205, prog));
              const bb = Math.round(lerp(40, 195, prog));
              ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, 0.9)`;
              ctx.beginPath();
              ctx.moveTo(anchorX, anchorY);
              ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
              ctx.stroke();
            }
            ctx.restore();
          }
        }
        {
          const R = CONFIG.PLAYER_RADIUS;
          const dir = player.facingAngle ?? 0;
          const fx = Math.cos(dir);
          const fy = Math.sin(dir);
          const px = -fy;
          const py = fx;
          const mouthX = pos.x + fx * R * 0.42 + px * R * 0.08;
          const mouthY = pos.y + fy * R * 0.42 + py * R * 0.08 + R * 0.22;
          const cigLen = R * 0.9;
          const cigW = Math.max(2.5, R * 0.16);
          ctx.save();
          ctx.lineCap = "round";
          ctx.lineWidth = cigW;
          ctx.strokeStyle = "#f8f5ea";
          ctx.beginPath();
          ctx.moveTo(mouthX, mouthY);
          ctx.lineTo(mouthX + fx * cigLen, mouthY + fy * cigLen);
          ctx.stroke();
          ctx.strokeStyle = "#d4a574";
          ctx.beginPath();
          ctx.moveTo(mouthX + fx * cigLen * 0.64, mouthY + fy * cigLen * 0.64);
          ctx.lineTo(mouthX + fx * cigLen * 0.82, mouthY + fy * cigLen * 0.82);
          ctx.stroke();
          const tipX = mouthX + fx * cigLen;
          const tipY = mouthY + fy * cigLen;
          const emberPulse = 0.65 + 0.35 * Math.sin(now * 0.02 + hashCode);
          ctx.fillStyle = `rgba(255, 96, 0, ${0.45 + 0.4 * emberPulse})`;
          ctx.beginPath();
          ctx.arc(tipX, tipY, R * 0.13, 0, Math.PI * 2);
          ctx.fill();
          for (let si = 0; si < 2; si++) {
            const t2 = (now * 18e-4 + si * 0.42 + hashCode % 11 * 0.03) % 1;
            const sx = tipX + fx * (R * (0.25 + t2 * 0.9)) + px * Math.sin(now * 3e-3 + si) * R * 0.12;
            const sy = tipY + fy * (R * (0.25 + t2 * 0.9)) - t2 * R * 0.35;
            ctx.fillStyle = `rgba(220, 220, 220, ${0.28 * (1 - t2)})`;
            ctx.beginPath();
            ctx.arc(sx, sy, R * (0.06 + 0.06 * t2), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
        if (isTopScorer) {
          const pulse1 = 0.5 + 0.5 * Math.sin(now * 4e-3);
          ctx.globalAlpha = pulse1 * 0.3;
          ctx.strokeStyle = "#d97706";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, CONFIG.PLAYER_RADIUS + 28, 0, Math.PI * 2);
          ctx.stroke();
          const pulse2 = 0.7 + 0.3 * Math.sin(now * 5e-3);
          ctx.globalAlpha = pulse2 * 0.4;
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, CONFIG.PLAYER_RADIUS + 12, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (isStunned) {
          const pulse = 0.4 + 0.6 * Math.abs(Math.sin(now * 6e-3));
          ctx.globalAlpha = pulse;
          ctx.strokeStyle = "#facc15";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, CONFIG.PLAYER_RADIUS + 6, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (player.zapStunnedUntil > now) {
          const flash = Math.sin(now * 0.04) > 0 ? 1 : 0.15;
          ctx.globalAlpha = flash;
          ctx.strokeStyle = "#60a5fa";
          ctx.lineWidth = 3.5;
          ctx.shadowColor = "#93c5fd";
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, CONFIG.PLAYER_RADIUS + 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
        if (isLocal && player.zapCharge >= CONFIG.ZAP_PELLET_THRESHOLD) {
          const chargePulse = 0.6 + 0.4 * Math.sin(now * 8e-3);
          ctx.globalAlpha = chargePulse;
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 3;
          ctx.shadowColor = "#60a5fa";
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, CONFIG.PLAYER_RADIUS + 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
        ctx.shadowBlur = 0;
        if (player.hasHelmet) {
          const R = CONFIG.PLAYER_RADIUS;
          const armorY = pos.y + R * 0.06;
          ctx.save();
          ctx.shadowBlur = 0;
          const armorGrad = ctx.createLinearGradient(pos.x, armorY - R * 0.7, pos.x, armorY + R * 0.5);
          armorGrad.addColorStop(0, "#e5e7eb");
          armorGrad.addColorStop(0.55, "#9ca3af");
          armorGrad.addColorStop(1, "#6b7280");
          ctx.strokeStyle = "#4b5563";
          ctx.lineWidth = Math.max(4, R * 0.26);
          ctx.beginPath();
          ctx.arc(pos.x, armorY, R * 0.93, Math.PI * 0.03, Math.PI * 0.97);
          ctx.strokeStyle = armorGrad;
          ctx.stroke();
          ctx.strokeStyle = "#4b5563";
          ctx.lineWidth = Math.max(1.6, R * 0.08);
          ctx.beginPath();
          ctx.arc(pos.x, armorY, R * 0.93, Math.PI * 0.03, Math.PI * 0.97);
          ctx.stroke();
          const plateW = R * 0.86;
          const plateH = R * 0.44;
          const plateX = pos.x - plateW / 2;
          const plateY = pos.y + R * 0.56;
          ctx.fillStyle = "#9ca3af";
          ctx.strokeStyle = "#4b5563";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(plateX, plateY, plateW, plateH, 4);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#d1d5db";
          for (const rx of [plateX + plateW * 0.22, plateX + plateW * 0.78]) {
            ctx.beginPath();
            ctx.arc(rx, plateY + plateH * 0.5, R * 0.07, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.strokeStyle = "rgba(255,255,255,0.35)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(plateX + plateW * 0.2, plateY + plateH * 0.2);
          ctx.lineTo(plateX + plateW * 0.8, plateY + plateH * 0.2);
          ctx.stroke();
          ctx.restore();
        }
        ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const labelY = pos.y - CONFIG.PLAYER_RADIUS - 6;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillText(player.name, pos.x + 1, labelY + 1);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(player.name, pos.x, labelY);
        if (isStunned && player.stunnedUntil) {
          const remaining = Math.max(0, (player.stunnedUntil - Date.now()) / 1e3).toFixed(1);
          ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
          ctx.fillStyle = "#facc15";
          ctx.fillText(`${remaining}s`, pos.x, labelY - 16);
        }
        if (player.hasGun) {
          ctx.save();
          ctx.shadowBlur = 0;
          const isMinigunEquipped = player.gunType === "minigun";
          ctx.font = `${Math.round(CONFIG.PLAYER_RADIUS * 0.9)}px "Segoe UI", system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(isMinigunEquipped ? "\u{1F52B}\u{1F52B}" : "\u{1F52B}", pos.x + CONFIG.PLAYER_RADIUS + (isMinigunEquipped ? 14 : 10), pos.y - CONFIG.PLAYER_RADIUS - 8);
          ctx.restore();
        }
        if (player.hasHook) {
          ctx.save();
          ctx.shadowBlur = 0;
          ctx.font = `${Math.round(CONFIG.PLAYER_RADIUS * 0.9)}px "Segoe UI", system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("\u{1FA9D}", pos.x - CONFIG.PLAYER_RADIUS - 10, pos.y - CONFIG.PLAYER_RADIUS - 8);
          ctx.restore();
        }
        ctx.restore();
      }
      for (const [playerId, bubble] of state.speechBubbles.entries()) {
        const player = state.latestState.players.find((p) => p.id === playerId);
        if (!player) continue;
        const pos = interp.get(player.id) ?? { x: player.x, y: player.y };
        const elapsed = now - bubble.startTime;
        const progress = Math.min(elapsed / 300, 1);
        const fadeOut = Math.max(1, (3e3 - elapsed) / 500);
        const alpha2 = Math.min(progress, fadeOut);
        if (alpha2 <= 0) continue;
        ctx.save();
        ctx.globalAlpha = alpha2;
        const bubbleX = pos.x;
        const bubbleY = pos.y - CONFIG.PLAYER_RADIUS - 35;
        const padding = 8;
        const textMetrics = ctx.measureText(bubble.message);
        const bubbleW = textMetrics.width + padding * 2;
        const bubbleH = 24;
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        roundRect(ctx, bubbleX - bubbleW / 2, bubbleY - bubbleH / 2, bubbleW, bubbleH, 8);
        ctx.fill();
        ctx.strokeStyle = player.color;
        ctx.lineWidth = 2;
        roundRect(ctx, bubbleX - bubbleW / 2, bubbleY - bubbleH / 2, bubbleW, bubbleH, 8);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.beginPath();
        ctx.moveTo(bubbleX - 6, bubbleY + bubbleH / 2);
        ctx.lineTo(bubbleX + 6, bubbleY + bubbleH / 2);
        ctx.lineTo(bubbleX, bubbleY + bubbleH / 2 + 8);
        ctx.fill();
        ctx.strokeStyle = player.color;
        ctx.stroke();
        ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#000";
        ctx.fillText(bubble.message, bubbleX, bubbleY);
        ctx.restore();
      }
      ctx.restore();
      ctx.save();
      ctx.translate(offsetX, offsetY);
      for (const missile of state.latestState.missiles ?? []) {
        ctx.save();
        ctx.translate(missile.x, missile.y);
        ctx.rotate(missile.angle);
        const trailLen = 28;
        const grad = ctx.createLinearGradient(-trailLen, 0, 0, 0);
        grad.addColorStop(0, "rgba(255, 100, 0, 0)");
        grad.addColorStop(0.5, "rgba(255, 200, 0, 0.7)");
        grad.addColorStop(1, "rgba(255, 60, 0, 0.9)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(-trailLen / 2, 0, trailLen / 2, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 16;
        ctx.font = '18px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("\u{1F680}", 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
        const ownerIsLocal = missile.ownerId === state.localPlayerId;
        if (ownerIsLocal) {
          const target2 = state.latestState.players.find((p) => p.id === missile.targetId);
          if (target2) {
            ctx.save();
            ctx.setLineDash([6, 5]);
            ctx.strokeStyle = "rgba(34, 211, 238, 0.45)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(missile.x, missile.y);
            ctx.lineTo(target2.x, target2.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          }
        }
      }
      ctx.restore();
      ctx.save();
      ctx.translate(offsetX, offsetY);
      for (const bullet of state.latestState.bullets ?? []) {
        ctx.save();
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      ctx.save();
      ctx.translate(offsetX, offsetY);
      for (const particle of state.particles) {
        const alpha2 = particle.life / particle.maxLife;
        ctx.globalAlpha = alpha2;
        ctx.fillStyle = particle.color;
        if (particle.type === "confetti") {
          ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
        } else if (particle.type === "star") {
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = i * 4 * Math.PI / 5 - Math.PI / 2;
            const x = Math.cos(angle) * particle.size;
            const y = Math.sin(angle) * particle.size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (particle.type === "smoke") {
          const fadeSize = particle.size * (1 - (1 - alpha2) * 0.5);
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, fadeSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      drawHUD(ctx, canvas2, state.latestState, state.localPlayerId, state);
      drawActiveEffects(ctx, canvas2, state.latestState, state.localPlayerId);
      drawSprintBar(ctx, canvas2, state.latestState, state.localPlayerId, now);
      drawZapBar(ctx, canvas2, state.latestState, state.localPlayerId, now);
      drawGunAmmoBar(ctx, canvas2, state.latestState, state.localPlayerId);
      drawHookIndicator(ctx, canvas2, state.latestState, state.localPlayerId);
      drawScamPopup(ctx, canvas2, state);
      drawCoinFlipPopup(ctx, canvas2, state);
      drawOuroborosPopup(ctx, canvas2, state);
      drawOmniPopup(ctx, canvas2, state);
    }
    requestAnimationFrame(frame);
  }
  function drawHUD(ctx, canvas2, state, localId, rendererState2) {
    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    if (!rendererState2.scoreboardCollapsed) {
      const sbX = canvas2.width - 200;
      const sbY = 16;
      const lineH = 22;
      const padding = 12;
      const sbH = sorted.length * lineH + padding * 2 + 24;
      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = "#0d0d1a";
      roundRect(ctx, sbX - padding, sbY - padding, 184 + padding, sbH, 10);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = "left";
      ctx.fillStyle = "#aaa";
      ctx.fillText("SCOREBOARD", sbX, sbY + 10);
      ctx.font = '13px "Segoe UI", system-ui, sans-serif';
      sorted.forEach((p, i) => {
        const y = sbY + 30 + i * lineH;
        const isLocal = p.id === localId;
        ctx.beginPath();
        ctx.arc(sbX + 6, y - 4, 5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.fillStyle = isLocal ? "#facc15" : "#ddd";
        const name = p.name.length > 11 ? p.name.slice(0, 10) + "\u2026" : p.name;
        ctx.fillText(`${i + 1}. ${name}`, sbX + 16, y);
        ctx.textAlign = "right";
        ctx.fillText(`${p.score}`, sbX + 168, y);
        ctx.textAlign = "left";
      });
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = "#0d0d1a";
    roundRect(ctx, 12, 12, 140, 34, 8);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = '13px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = "#ccc";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`Players: ${state.players.length}`, 24, 29);
    ctx.restore();
    if (!rendererState2.minimapCollapsed) {
      drawMinimap(ctx, canvas2, state, localId);
    }
  }
  function drawMinimap(ctx, canvas2, state, localId) {
    const MAP_W = 160;
    const MAP_H = 160;
    const MARGIN = 16;
    const mx = canvas2.width - MAP_W - MARGIN;
    const my = canvas2.height - MAP_H - MARGIN;
    const scaleX = MAP_W / CONFIG.ARENA_WIDTH;
    const scaleY = MAP_H / CONFIG.ARENA_HEIGHT;
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#0d0d1a";
    roundRect(ctx, mx, my, MAP_W, MAP_H, 8);
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#22c55e";
    for (const food of state.foods) {
      ctx.beginPath();
      ctx.arc(mx + food.x * scaleX, my + food.y * scaleY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const pu of state.powerups) {
      const style = POWERUP_STYLE[pu.type];
      if (!style) continue;
      ctx.beginPath();
      ctx.arc(mx + pu.x * scaleX, my + pu.y * scaleY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = style.color;
      ctx.fill();
    }
    for (const bh of state.blackholes) {
      const bhColor = bh.color || "#a020f0";
      ctx.fillStyle = bhColor;
      ctx.beginPath();
      ctx.arc(mx + bh.x * scaleX, my + bh.y * scaleY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = bhColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mx + bh.x * scaleX, my + bh.y * scaleY, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const p of state.players) {
      const isLocal = p.id === localId;
      ctx.beginPath();
      ctx.arc(mx + p.x * scaleX, my + p.y * scaleY, isLocal ? 4 : 3, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      if (isLocal) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    ctx.font = 'bold 9px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = "#666";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("MAP", mx + 4, my - 3);
    ctx.restore();
  }
  function drawZapBar(ctx, canvas2, state, localId, now) {
    if (!localId) return;
    const player = state.players.find((p) => p.id === localId);
    if (!player) return;
    const charge = player.zapCharge ?? 0;
    const fraction = Math.max(0, Math.min(1, charge / CONFIG.ZAP_PELLET_THRESHOLD));
    const charged = fraction >= 1;
    const BAR_W = 220;
    const BAR_H = 14;
    const MARGIN = 14;
    const GAP = 6;
    const sprintBarY = canvas2.height - MARGIN - BAR_H;
    const bx = canvas2.width / 2 - BAR_W / 2;
    const by = sprintBarY - BAR_H - GAP;
    const radius = BAR_H / 2;
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = "#0d0d1a";
    roundRect(ctx, bx, by, BAR_W, BAR_H, radius);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (fraction > 0) {
      const fillW = Math.max(BAR_H, (BAR_W - 2) * fraction);
      const fillColor = charged ? "#3b82f6" : "#60a5fa";
      if (charged) {
        const flash = 0.7 + 0.3 * Math.sin(now * 0.012);
        ctx.globalAlpha = flash;
      }
      ctx.fillStyle = fillColor;
      ctx.shadowColor = fillColor;
      ctx.shadowBlur = charged ? 14 : 6;
      roundRect(ctx, bx + 1, by + 1, fillW, BAR_H - 2, radius - 1);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 9px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = fraction > 0.5 ? "#000" : "#60a5fa";
    ctx.fillText(charged ? "\u26A1 ZAP READY!" : `ZAP  ${charge}/${CONFIG.ZAP_PELLET_THRESHOLD}`, canvas2.width / 2, by + BAR_H / 2);
    ctx.restore();
  }
  function drawSprintBar(ctx, canvas2, state, localId, now) {
    if (!localId) return;
    const player = state.players.find((p) => p.id === localId);
    if (!player) return;
    const stamina = player.stamina ?? CONFIG.SPRINT_MAX_STAMINA;
    const fraction = Math.max(0, Math.min(1, stamina / CONFIG.SPRINT_MAX_STAMINA));
    const BAR_W = 220;
    const BAR_H = 14;
    const MARGIN = 14;
    const bx = canvas2.width / 2 - BAR_W / 2;
    const by = canvas2.height - MARGIN - BAR_H;
    const radius = BAR_H / 2;
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = "#0d0d1a";
    roundRect(ctx, bx, by, BAR_W, BAR_H, radius);
    ctx.fill();
    ctx.globalAlpha = 1;
    let fillColor;
    if (fraction > 0.5) {
      fillColor = "#38bdf8";
    } else if (fraction > 0.2) {
      fillColor = "#fb923c";
    } else {
      const flash = 0.6 + 0.4 * Math.sin(now * 0.015);
      ctx.globalAlpha = flash;
      fillColor = "#ef4444";
    }
    if (fraction > 0) {
      const fillW = Math.max(BAR_H, (BAR_W - 2) * fraction);
      ctx.fillStyle = fillColor;
      ctx.shadowColor = fillColor;
      ctx.shadowBlur = 8;
      roundRect(ctx, bx + 1, by + 1, fillW, BAR_H - 2, radius - 1);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 9px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = fraction > 0.3 ? "#000" : "#fff";
    ctx.fillText("SPRINT  [SPACE]", canvas2.width / 2, by + BAR_H / 2);
    ctx.restore();
  }
  function drawGunAmmoBar(ctx, canvas2, state, localId) {
    if (!localId) return;
    const player = state.players.find((p) => p.id === localId);
    if (!player || !player.hasGun) return;
    const isMinigun = player.gunType === "minigun";
    const ammo = player.gunAmmo ?? 0;
    const maxAmmo = isMinigun ? CONFIG.MINIGUN_AMMO : CONFIG.GUN_AMMO;
    const fraction = Math.max(0, Math.min(1, ammo / maxAmmo));
    const barColor = isMinigun ? "#f97316" : "#ef4444";
    const BAR_W = 220;
    const BAR_H = 14;
    const MARGIN = 14;
    const GAP = 6;
    const sprintBarY = canvas2.height - MARGIN - BAR_H;
    const zapBarY = sprintBarY - BAR_H - GAP;
    const bx = canvas2.width / 2 - BAR_W / 2;
    const by = zapBarY - BAR_H - GAP;
    const radius = BAR_H / 2;
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = "#0d0d1a";
    roundRect(ctx, bx, by, BAR_W, BAR_H, radius);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (fraction > 0) {
      const fillW = Math.max(BAR_H, (BAR_W - 2) * fraction);
      ctx.fillStyle = barColor;
      ctx.shadowColor = barColor;
      ctx.shadowBlur = 10;
      roundRect(ctx, bx + 1, by + 1, fillW, BAR_H - 2, radius - 1);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 9px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = fraction > 0.5 ? "#000" : barColor;
    ctx.fillText(isMinigun ? `\u{1F52B}\u{1F52B}  \xD7${ammo}` : `\u{1F52B}  \xD7${ammo}`, canvas2.width / 2, by + BAR_H / 2);
    ctx.restore();
  }
  function drawHookIndicator(ctx, canvas2, state, localId) {
    if (!localId) return;
    const player = state.players.find((p) => p.id === localId);
    if (!player?.hasHook) return;
    const BAR_W = 200;
    const BAR_H = 14;
    const MARGIN = 14;
    const GAP = 6;
    const sprintBarY = canvas2.height - MARGIN - BAR_H;
    const zapBarY = sprintBarY - BAR_H - GAP;
    const gunBarY = zapBarY - BAR_H - GAP;
    const by = gunBarY - BAR_H - GAP;
    const bx = canvas2.width / 2 - BAR_W / 2;
    const radius = BAR_H / 2;
    const pulse = 0.8 + 0.2 * Math.sin(Date.now() * 8e-3);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#f59e0b";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 14;
    roundRect(ctx, bx, by, BAR_W, BAR_H, radius);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.font = 'bold 9px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.fillText("\u{1FA9D}  HOOK READY \u2014 Click to fire", canvas2.width / 2, by + BAR_H / 2);
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  function drawActiveEffects(ctx, canvas2, state, localId) {
    if (!localId) return;
    const player = state.players.find((p) => p.id === localId);
    if (!player) return;
    const now = Date.now();
    const effects = [];
    if (player.speedBoostUntil > now) {
      effects.push({
        label: "\u26A1 Speed Boost",
        color: "#facc15",
        remaining: (player.speedBoostUntil - now) / 1e3
      });
    }
    if (player.reversedUntil > now) {
      effects.push({
        label: "\u21A9 Reversed",
        color: "#22d3ee",
        remaining: (player.reversedUntil - now) / 1e3
      });
    }
    if (player.magnetUntil > now) {
      effects.push({
        label: "\u{1F9F2} Magnet",
        color: "#ec4899",
        remaining: (player.magnetUntil - now) / 1e3
      });
    }
    if (effects.length === 0) return;
    const PILL_W = 150;
    const PILL_H = 30;
    const GAP = 8;
    const startX = canvas2.width / 2 - PILL_W / 2;
    const startY = canvas2.height - 50 - effects.length * (PILL_H + GAP);
    ctx.save();
    effects.forEach((fx, i) => {
      const y = startY + i * (PILL_H + GAP);
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = "#0d0d1a";
      roundRect(ctx, startX, y, PILL_W, PILL_H, PILL_H / 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = fx.color;
      roundRect(ctx, startX, y, 6, PILL_H, 3);
      ctx.fill();
      ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = fx.color;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(fx.label, startX + 14, y + PILL_H / 2);
      ctx.font = '12px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = "#eee";
      ctx.textAlign = "right";
      ctx.fillText(`${fx.remaining.toFixed(1)}s`, startX + PILL_W - 10, y + PILL_H / 2);
    });
    ctx.restore();
  }
  var SCAM_POPUP_DURATION = 3e3;
  var COIN_FLIP_POPUP_DURATION = 3e3;
  var OUROBOROS_POPUP_DURATION = 4e3;
  var OMNI_POPUP_DURATION = 4500;
  function drawOmniPopup(ctx, canvas2, state) {
    if (!state.omniPopup) return;
    const now = Date.now();
    const elapsed = now - state.omniPopup.startTime;
    if (elapsed > OMNI_POPUP_DURATION) {
      state.omniPopup = null;
      return;
    }
    let alpha = 1;
    if (elapsed < 250) {
      alpha = elapsed / 250;
    } else if (elapsed > OMNI_POPUP_DURATION - 700) {
      alpha = (OMNI_POPUP_DURATION - elapsed) / 700;
    }
    const scale = elapsed < 350 ? 0.5 + 0.7 * Math.min(1, elapsed / 350) : 1 + 0.022 * Math.sin(elapsed * 7e-3);
    const BOX_W = 440;
    const BOX_H = 150;
    const cx = canvas2.width / 2;
    const cy = canvas2.height / 2 - 80;
    const hue = elapsed * 0.2 % 360;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    roundRect(ctx, cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 20);
    ctx.fill();
    ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
    ctx.shadowBlur = 28;
    roundRect(ctx, cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 20);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = 'bold 32px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const titleGrad = ctx.createLinearGradient(cx - 180, 0, cx + 180, 0);
    titleGrad.addColorStop(0, `hsl(${hue}, 100%, 65%)`);
    titleGrad.addColorStop(0.5, `hsl(${(hue + 120) % 360}, 100%, 65%)`);
    titleGrad.addColorStop(1, `hsl(${(hue + 240) % 360}, 100%, 65%)`);
    ctx.fillStyle = titleGrad;
    ctx.fillText("\u2605 OMNIPOTENT! \u2605", cx, cy - 30);
    ctx.font = '14px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = "#e0e0e0";
    ctx.fillText("\u26A1 Speed  \xB7  \u{1F9F2} Magnet  \xB7  \u{1F6E1}\uFE0F Armor  \xB7  \xD72 Tail  \xB7  +5 pts", cx, cy + 8);
    ctx.font = 'italic 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = "#aaa";
    ctx.fillText("You have it all. For now.", cx, cy + 38);
    ctx.restore();
  }
  function drawOuroborosPopup(ctx, canvas2, state) {
    if (!state.ouroborosPopup) return;
    const now = Date.now();
    const elapsed = now - state.ouroborosPopup.startTime;
    if (elapsed > OUROBOROS_POPUP_DURATION) {
      state.ouroborosPopup = null;
      return;
    }
    let alpha = 1;
    if (elapsed < 250) {
      alpha = elapsed / 250;
    } else if (elapsed > OUROBOROS_POPUP_DURATION - 700) {
      alpha = (OUROBOROS_POPUP_DURATION - elapsed) / 700;
    }
    const scale = elapsed < 350 ? 0.6 + 0.6 * Math.min(1, elapsed / 350) : 1 + 0.018 * Math.sin(elapsed * 6e-3);
    const BOX_W = 420;
    const BOX_H = 130;
    const cx = canvas2.width - BOX_W / 2 - 16;
    const cy = BOX_H / 2 + 16;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    roundRect(ctx, cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 18);
    ctx.fill();
    const borderPulse = 0.7 + 0.3 * Math.sin(elapsed * 5e-3);
    ctx.strokeStyle = `rgba(200, 150, 15, ${borderPulse})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = "#c8960f";
    ctx.shadowBlur = 24;
    roundRect(ctx, cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 18);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = 'bold 32px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#c8960f";
    ctx.fillText("\u{1F40D} OUROBOROS! \u{1F40D}", cx, cy - 22);
    ctx.font = '15px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = "#fde68a";
    ctx.fillText("You ate your own tail!", cx, cy + 12);
    ctx.font = 'italic 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = "#aaa";
    ctx.fillText("An ancient and honourable way to go...", cx, cy + 40);
    ctx.restore();
  }
  function drawCoinFlipPopup(ctx, canvas2, state) {
    if (!state.coinFlipPopup) return;
    const now = Date.now();
    const elapsed = now - state.coinFlipPopup.startTime;
    if (elapsed > COIN_FLIP_POPUP_DURATION) {
      state.coinFlipPopup = null;
      return;
    }
    const { heads, points } = state.coinFlipPopup;
    let alpha = 1;
    if (elapsed < 200) {
      alpha = elapsed / 200;
    } else if (elapsed > COIN_FLIP_POPUP_DURATION - 600) {
      alpha = (COIN_FLIP_POPUP_DURATION - elapsed) / 600;
    }
    const scale = elapsed < 300 ? 0.7 + 0.45 * Math.min(1, elapsed / 300) : 1 + 0.015 * Math.sin(elapsed * 7e-3);
    const BOX_W = 340;
    const BOX_H = 110;
    const cx = canvas2.width / 2;
    const cy = canvas2.height / 2 - 60;
    const accentColor = heads ? "#22c55e" : "#ef4444";
    const title = heads ? "\u2705 ETHICAL!" : "\u274C UNETHICAL!";
    const subtitle = heads ? `You made good choices! +${points} points` : `That was a bit shady... -${points} points`;
    const footnote = heads ? "\u{1F31F} Keep it up!" : "\u{1F62C} No one will notice...";
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    roundRect(ctx, cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 16);
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 20;
    roundRect(ctx, cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 16);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = accentColor;
    ctx.fillText(title, cx, cy - 20);
    ctx.font = '15px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = "#facc15";
    ctx.fillText(subtitle, cx, cy + 12);
    ctx.font = 'italic 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = "#aaa";
    ctx.fillText(footnote, cx, cy + 38);
    ctx.restore();
  }
  function drawScamPopup(ctx, canvas2, state) {
    if (!state.scamPopup) return;
    const now = Date.now();
    const elapsed = now - state.scamPopup.startTime;
    if (elapsed > SCAM_POPUP_DURATION) {
      state.scamPopup = null;
      return;
    }
    const disguiseLabel = POWERUP_STYLE[state.scamPopup.disguisedAs]?.label ?? "?";
    const disguiseName = state.scamPopup.disguisedAs === "speed" ? "Speed Boost" : "Double Tail";
    const isProtected = state.scamPopup.protected ?? false;
    let alpha = 1;
    if (elapsed < 200) {
      alpha = elapsed / 200;
    } else if (elapsed > SCAM_POPUP_DURATION - 600) {
      alpha = (SCAM_POPUP_DURATION - elapsed) / 600;
    }
    const shakeX = elapsed < 500 ? (Math.random() - 0.5) * 6 : 0;
    const shakeY = elapsed < 500 ? (Math.random() - 0.5) * 6 : 0;
    const scale = elapsed < 300 ? 0.8 + 0.4 * Math.min(1, elapsed / 300) : 1 + 0.02 * Math.sin(elapsed * 8e-3);
    const BOX_W = 360;
    const BOX_H = 120;
    const cx = canvas2.width / 2 + shakeX;
    const cy = canvas2.height / 2 - 60 + shakeY;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    roundRect(ctx, cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 16);
    ctx.fill();
    const borderColor = isProtected ? "#d4af37" : "#ef4444";
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 20;
    roundRect(ctx, cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 16);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = 'bold 28px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isProtected ? "#d4af37" : "#ef4444";
    if (isProtected) {
      ctx.fillText("\u{1F6E1}\uFE0F ARMOR PROTECTED! \u{1F6E1}\uFE0F", cx, cy - 18);
    } else {
      ctx.fillText("\u{1F6A8} YOU'VE BEEN SCAMMED! \u{1F6A8}", cx, cy - 18);
    }
    ctx.font = '15px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = isProtected ? "#d4af37" : "#facc15";
    if (isProtected) {
      ctx.fillText(`That ${disguiseLabel} ${disguiseName} was actually  \u21A9 Reverse!`, cx, cy + 16);
    } else {
      ctx.fillText(`That ${disguiseLabel} ${disguiseName} was actually  \u21A9 Reverse!`, cx, cy + 16);
    }
    ctx.font = 'italic 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = "#aaa";
    ctx.fillText(isProtected ? "Your armor saved you!" : "Your controls are now reversed...", cx, cy + 42);
    ctx.restore();
  }

  // src/client/client.ts
  var PALETTE = [
    "#ef4444",
    // red
    "#3b82f6",
    // blue
    "#f59e0b",
    // amber
    "#a855f7",
    // purple
    "#ec4899",
    // pink
    "#14b8a6",
    // teal
    "#f97316",
    // orange
    "#84cc16"
    // lime
  ];
  var joinScreen = document.getElementById("join-screen");
  var nameInput = document.getElementById("name-input");
  var playBtn = document.getElementById("play-btn");
  var colorSwatches = document.getElementById("color-swatches");
  var canvas = document.getElementById("game-canvas");
  var disconnectedOverlay = document.getElementById("disconnected-overlay");
  var rejoinBtn = document.getElementById("rejoin-btn");
  function showJoinError(msg) {
    let el = document.getElementById("join-error");
    if (!el) {
      el = document.createElement("p");
      el.id = "join-error";
      el.style.cssText = "color:#f87171;font-size:0.85rem;text-align:center;margin-top:-8px;";
      playBtn.insertAdjacentElement("beforebegin", el);
    }
    el.textContent = msg;
  }
  var killStreaks = /* @__PURE__ */ new Map();
  var multiKillCount = 0;
  var multiKillTimer = null;
  var MULTI_KILL_WINDOW_MS = 4e3;
  var MULTI_KILL_LINES = ["Double Kill", "Multi Kill", "Ultra Kill", "Monster Kill", "Ludicrous Kill", "Holy Shit"];
  var STREAK_LINES = {
    3: "Killing Spree",
    6: "Rampage",
    9: "Dominating",
    12: "Unstoppable",
    15: "Godlike",
    20: "Wicked Sick"
  };
  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.pitch = 0.65;
    utt.rate = 0.85;
    utt.volume = 1;
    window.speechSynthesis.speak(utt);
  }
  function onKill(killerId) {
    multiKillCount++;
    if (multiKillTimer !== null) clearTimeout(multiKillTimer);
    multiKillTimer = setTimeout(() => {
      multiKillCount = 0;
      multiKillTimer = null;
    }, MULTI_KILL_WINDOW_MS);
    if (multiKillCount >= 2) {
      const idx = Math.min(multiKillCount - 2, MULTI_KILL_LINES.length - 1);
      speak(MULTI_KILL_LINES[idx]);
      return;
    }
    if (killerId && killerId === rendererState.localPlayerId) {
      const streak = (killStreaks.get(killerId) ?? 0) + 1;
      killStreaks.set(killerId, streak);
      if (streak in STREAK_LINES) {
        speak(STREAK_LINES[streak]);
        return;
      }
    }
    const totalKills = [...killStreaks.values()].reduce((a, b) => a + b, 0);
    if (totalKills === 0 && multiKillCount === 1) {
      speak("First Blood");
    }
  }
  var selectedColor = PALETTE[0];
  var socket = null;
  var rendererState = createRendererState();
  var runStats = { score: 0, tailLength: 0, foodEaten: 0, powerups: 0, distancePx: 0 };
  var ALL_TIME_KEY = "snakealot_best";
  function loadBests() {
    try {
      const raw = localStorage.getItem(ALL_TIME_KEY);
      if (raw) return { score: 0, tailLength: 0, foodEaten: 0, powerups: 0, distancePx: 0, deaths: 0, ...JSON.parse(raw) };
    } catch {
    }
    return { score: 0, tailLength: 0, foodEaten: 0, powerups: 0, distancePx: 0, deaths: 0 };
  }
  function saveBests(b) {
    try {
      localStorage.setItem(ALL_TIME_KEY, JSON.stringify(b));
    } catch {
    }
  }
  var allTimeBest = loadBests();
  var sessionDeaths = 0;
  var prevScore = 0;
  var prevPrevPos = null;
  var prevHasHelmet = false;
  var prevPowerupTimestamps = { speed: 0, reverse: 0, magnet: 0 };
  function updateStatsFromState(state, localId) {
    const p = state.players.find((pl) => pl.id === localId);
    if (!p) return;
    if (p.score > runStats.score) runStats.score = p.score;
    if (p.tail.length > runStats.tailLength) runStats.tailLength = p.tail.length;
    const scoreDelta = p.score - prevScore;
    if (scoreDelta === 1) runStats.foodEaten += 1;
    const pows = prevPowerupTimestamps;
    if (p.speedBoostUntil > pows.speed) {
      runStats.powerups++;
      pows.speed = p.speedBoostUntil;
    }
    if (p.reversedUntil > pows.reverse) {
      runStats.powerups++;
      pows.reverse = p.reversedUntil;
    }
    if (p.magnetUntil > pows.magnet) {
      runStats.powerups++;
      pows.magnet = p.magnetUntil;
    }
    if (prevScore > 0 && scoreDelta === prevScore) runStats.powerups++;
    if (!prevHasHelmet && p.hasHelmet) runStats.powerups++;
    prevHasHelmet = p.hasHelmet;
    prevScore = p.score;
    if (!p.stunned && prevPrevPos) {
      const dx = p.x - prevPrevPos.x;
      const dy = p.y - prevPrevPos.y;
      runStats.distancePx += Math.sqrt(dx * dx + dy * dy);
    }
    prevPrevPos = p.stunned ? null : { x: p.x, y: p.y };
  }
  function setEl(id, value2) {
    const el = document.getElementById(id);
    if (el) el.textContent = value2;
  }
  function showDeathCard() {
    const players = rendererState.latestState?.players ?? [];
    const newRecord = {
      score: runStats.score > allTimeBest.score,
      tail: runStats.tailLength > allTimeBest.tailLength,
      food: runStats.foodEaten > allTimeBest.foodEaten,
      powerups: runStats.powerups > allTimeBest.powerups,
      distance: runStats.distancePx > allTimeBest.distancePx
    };
    if (newRecord.score) allTimeBest.score = runStats.score;
    if (newRecord.tail) allTimeBest.tailLength = runStats.tailLength;
    if (newRecord.food) allTimeBest.foodEaten = runStats.foodEaten;
    if (newRecord.powerups) allTimeBest.powerups = runStats.powerups;
    if (newRecord.distance) allTimeBest.distancePx = runStats.distancePx;
    allTimeBest.deaths++;
    saveBests(allTimeBest);
    setEl("run-score", String(runStats.score));
    setEl("run-tail", String(runStats.tailLength));
    setEl("run-food", String(runStats.foodEaten));
    setEl("run-powerups", String(runStats.powerups));
    setEl("run-distance", (runStats.distancePx / 1e3).toFixed(1));
    const bestLabel = (val, isNew) => (isNew ? "\u2605 " : "") + String(val);
    setEl("best-score", bestLabel(allTimeBest.score, newRecord.score));
    setEl("best-tail", bestLabel(allTimeBest.tailLength, newRecord.tail));
    setEl("best-food", bestLabel(allTimeBest.foodEaten, newRecord.food));
    setEl("best-powerups", bestLabel(allTimeBest.powerups, newRecord.powerups));
    setEl("best-distance", bestLabel((allTimeBest.distancePx / 1e3).toFixed(1), newRecord.distance));
    ["score", "tail", "food", "powerups", "distance"].forEach((key) => {
      const el = document.getElementById(`best-${key}`);
      if (el) el.classList.toggle("new-record", newRecord[key]);
    });
    setEl("stat-deaths", String(sessionDeaths));
    setEl("stat-alltime-deaths", String(allTimeBest.deaths));
    const topByScore = players.reduce(
      (best, p) => !best || p.score > best.score ? p : best,
      null
    );
    const topByTail = players.reduce(
      (best, p) => !best || p.tail.length > best.tail.length ? p : best,
      null
    );
    const setLeader = (elId, player, val) => {
      const el = document.getElementById(elId);
      if (!el) return;
      el.textContent = "";
      if (!player) {
        el.textContent = "\u2014";
        return;
      }
      const dot = document.createElement("span");
      dot.className = "ldot";
      dot.style.background = player.color;
      const nameSpan = document.createElement("span");
      nameSpan.textContent = player.name;
      const valSpan = document.createElement("span");
      valSpan.textContent = val;
      valSpan.style.cssText = "margin-left:4px;color:#facc15;font-weight:700";
      el.append(dot, nameSpan, valSpan);
    };
    setLeader("leader-score", topByScore, topByScore ? String(topByScore.score) : "");
    setLeader("leader-tail", topByTail, topByTail ? String(topByTail.tail.length) : "");
    if (topByScore) {
      document.getElementById("top-player-dot").style.background = topByScore.color;
      document.getElementById("top-player-name").textContent = topByScore.name;
      document.getElementById("top-player-score").textContent = String(topByScore.score) + " pts";
    }
    const card = document.getElementById("death-card");
    card.classList.add("visible");
    const dismiss = () => {
      card.classList.remove("visible");
      card.removeEventListener("click", dismiss);
    };
    card.addEventListener("click", dismiss);
  }
  PALETTE.forEach((color) => {
    const swatch = document.createElement("div");
    swatch.className = "swatch" + (color === selectedColor ? " selected" : "");
    swatch.style.backgroundColor = color;
    swatch.addEventListener("click", () => {
      selectedColor = color;
      document.querySelectorAll(".swatch").forEach((el) => el.classList.remove("selected"));
      swatch.classList.add("selected");
    });
    colorSwatches.appendChild(swatch);
  });
  function startGame(name, color) {
    socket = lookup2();
    socket.on("connect", () => {
      socket.emit(EVENTS.JOIN, { name, color });
    });
    socket.on("error", (err) => {
      showJoinError(err.message ?? "Could not join. Please try again.");
      joinScreen.classList.remove("hidden");
      canvas.classList.remove("visible");
    });
    socket.on(EVENTS.JOINED, (payload) => {
      rendererState.localPlayerId = payload.playerId;
      rendererState.latestState = payload.gameState;
      rendererState.prevState = payload.gameState;
      rendererState.lastStateTime = Date.now();
      const self2 = payload.gameState.players.find((p) => p.id === payload.playerId);
      if (self2) {
        rendererState.camera.x = self2.x;
        rendererState.camera.y = self2.y;
      }
      joinScreen.classList.add("hidden");
      canvas.classList.add("visible");
      disconnectedOverlay.classList.remove("visible");
      const toggleScoreboard = document.getElementById("toggle-scoreboard");
      const toggleMinimap = document.getElementById("toggle-minimap");
      toggleScoreboard.classList.add("visible");
      toggleMinimap.classList.add("visible");
      toggleScoreboard.addEventListener("click", () => {
        rendererState.scoreboardCollapsed = !rendererState.scoreboardCollapsed;
        toggleScoreboard.textContent = rendererState.scoreboardCollapsed ? "SCORES \u25BE" : "SCORES \u25B4";
      });
      toggleMinimap.addEventListener("click", () => {
        rendererState.minimapCollapsed = !rendererState.minimapCollapsed;
        toggleMinimap.textContent = rendererState.minimapCollapsed ? "MAP \u25BE" : "MAP \u25B4";
      });
      startRenderLoop(canvas, rendererState);
      setupInput();
    });
    socket.on(EVENTS.STATE, (state) => {
      rendererState.prevState = rendererState.latestState;
      rendererState.latestState = state;
      rendererState.lastStateTime = Date.now();
      if (rendererState.localPlayerId) {
        updateStatsFromState(state, rendererState.localPlayerId);
      }
    });
    socket.on("scammed", (data) => {
      rendererState.scamPopup = {
        startTime: Date.now(),
        disguisedAs: data.disguisedAs
      };
    });
    socket.on("helmet-protected", (data) => {
      rendererState.scamPopup = {
        startTime: Date.now(),
        disguisedAs: data.disguisedAs,
        protected: true
      };
    });
    socket.on("coin-flip-result", (data) => {
      rendererState.coinFlipPopup = {
        startTime: Date.now(),
        heads: data.heads,
        points: data.points
      };
    });
    socket.on("ouroboros", () => {
      rendererState.ouroborosPopup = { startTime: Date.now() };
    });
    socket.on("omni-collected", () => {
      rendererState.omniPopup = { startTime: Date.now() };
    });
    socket.on("zap-fired", (data) => {
      const target = rendererState.latestState?.players.find((p) => p.id === data.targetId);
      if (target) {
        for (let i = 0; i < 14; i++) {
          const angle = i / 14 * Math.PI * 2;
          const speed = 120 + Math.random() * 180;
          rendererState.particles.push({
            x: target.x,
            y: target.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 500,
            maxLife: 500,
            size: 3 + Math.random() * 4,
            color: Math.random() > 0.5 ? "#60a5fa" : "#ffffff",
            type: "star"
          });
        }
      }
    });
    socket.on("bullet-hit", (data) => {
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 100 + Math.random() * 200;
        rendererState.particles.push({
          x: data.x,
          y: data.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 400,
          maxLife: 400,
          size: 3 + Math.random() * 4,
          color: Math.random() > 0.4 ? "#ef4444" : "#fbbf24",
          type: "star"
        });
      }
    });
    socket.on("icbm-explosion", (data) => {
      const count = data.fizzle ? 18 : 40;
      for (let i = 0; i < count; i++) {
        const angle = i / count * Math.PI * 2 + Math.random() * 0.4;
        const speed = 80 + Math.random() * (data.radius * 1.4);
        rendererState.particles.push({
          x: data.x,
          y: data.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: data.fizzle ? 600 : 1e3,
          maxLife: data.fizzle ? 600 : 1e3,
          size: data.fizzle ? 3 + Math.random() * 5 : 5 + Math.random() * 10,
          color: (() => {
            const r = Math.random();
            if (r < 0.4) return "#ff4500";
            if (r < 0.7) return "#fbbf24";
            if (r < 0.85) return "#ffffff";
            return "#22d3ee";
          })(),
          type: "star"
        });
      }
      if (!data.fizzle) {
        for (let i = 0; i < 10; i++) {
          const angle = Math.random() * Math.PI * 2;
          rendererState.particles.push({
            x: data.x,
            y: data.y,
            vx: Math.cos(angle) * (40 + Math.random() * 60),
            vy: Math.sin(angle) * (40 + Math.random() * 60) - 30,
            life: 1400,
            maxLife: 1400,
            size: 14 + Math.random() * 18,
            color: "rgba(150, 150, 150, 0.5)",
            type: "smoke"
          });
        }
      }
    });
    socket.on("stunned", (data) => {
      killStreaks.delete(data.playerId);
      onKill(data.killerId);
      if (data.playerId === rendererState.localPlayerId) {
        sessionDeaths++;
        prevScore = 0;
        showDeathCard();
        runStats = { score: 0, tailLength: 0, foodEaten: 0, powerups: 0, distancePx: 0 };
        prevPrevPos = null;
        prevHasHelmet = false;
        prevPowerupTimestamps = { speed: 0, reverse: 0, magnet: 0 };
      }
    });
    socket.on("disconnect", () => {
      disconnectedOverlay.classList.add("visible");
    });
  }
  playBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    startGame(name, selectedColor);
  });
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") playBtn.click();
  });
  rejoinBtn.addEventListener("click", () => {
    location.reload();
  });
  var keys = { up: false, down: false, left: false, right: false, sprint: false };
  function setupInput() {
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    canvas.addEventListener("click", onCanvasClick);
    if ("ontouchstart" in window) setupMobileControls();
  }
  function onCanvasClick(e) {
    if (!socket || !rendererState.localPlayerId) return;
    const localPlayer = rendererState.latestState?.players.find(
      (p) => p.id === rendererState.localPlayerId
    );
    if (!localPlayer?.hasHook) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const screenY = (e.clientY - rect.top) * (canvas.height / rect.height);
    const worldX = screenX - canvas.width / 2 + rendererState.camera.x;
    const worldY = screenY - canvas.height / 2 + rendererState.camera.y;
    const angle = Math.atan2(worldY - localPlayer.y, worldX - localPlayer.x);
    socket.emit("hook-fire", { angle });
  }
  function onKey(e) {
    if (!socket) return;
    const pressed = e.type === "keydown";
    let changed = false;
    if (["w", "a", "s", "d", " "].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
    switch (e.key.toLowerCase()) {
      case "w":
      case "arrowup":
        if (keys.up !== pressed) {
          keys.up = pressed;
          changed = true;
        }
        break;
      case "s":
      case "arrowdown":
        if (keys.down !== pressed) {
          keys.down = pressed;
          changed = true;
        }
        break;
      case "a":
      case "arrowleft":
        if (keys.left !== pressed) {
          keys.left = pressed;
          changed = true;
        }
        break;
      case "d":
      case "arrowright":
        if (keys.right !== pressed) {
          keys.right = pressed;
          changed = true;
        }
        break;
      case " ":
        if (keys.sprint !== pressed) {
          keys.sprint = pressed;
          changed = true;
        }
        break;
    }
    if (changed) {
      socket.emit(EVENTS.INPUT, { ...keys });
    }
  }
  function setupMobileControls() {
    const controls = document.getElementById("mobile-controls");
    const zone = document.getElementById("joystick-zone");
    const ring = document.getElementById("joystick-ring");
    const nub = document.getElementById("joystick-nub");
    const sprintBtn = document.getElementById("sprint-btn-mobile");
    controls.classList.add("visible");
    const MAX_RADIUS = 50;
    const THRESHOLD = MAX_RADIUS * 0.28;
    let activeTouchId = null;
    let originX = 0;
    let originY = 0;
    function applyJoystick(dx, dy) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamp = Math.min(dist, MAX_RADIUS);
      const angle = Math.atan2(dy, dx);
      nub.style.transform = `translate(calc(-50% + ${Math.cos(angle) * clamp}px), calc(-50% + ${Math.sin(angle) * clamp}px))`;
      const newUp = dy < -THRESHOLD;
      const newDown = dy > THRESHOLD;
      const newLeft = dx < -THRESHOLD;
      const newRight = dx > THRESHOLD;
      let changed = false;
      if (keys.up !== newUp) {
        keys.up = newUp;
        changed = true;
      }
      if (keys.down !== newDown) {
        keys.down = newDown;
        changed = true;
      }
      if (keys.left !== newLeft) {
        keys.left = newLeft;
        changed = true;
      }
      if (keys.right !== newRight) {
        keys.right = newRight;
        changed = true;
      }
      if (changed && socket) socket.emit(EVENTS.INPUT, { ...keys });
    }
    function clearJoystick() {
      ring.style.display = "none";
      nub.style.transform = "translate(-50%, -50%)";
      activeTouchId = null;
      let changed = false;
      if (keys.up) {
        keys.up = false;
        changed = true;
      }
      if (keys.down) {
        keys.down = false;
        changed = true;
      }
      if (keys.left) {
        keys.left = false;
        changed = true;
      }
      if (keys.right) {
        keys.right = false;
        changed = true;
      }
      if (changed && socket) socket.emit(EVENTS.INPUT, { ...keys });
    }
    zone.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (activeTouchId !== null) return;
      const touch = e.changedTouches[0];
      activeTouchId = touch.identifier;
      originX = touch.clientX;
      originY = touch.clientY;
      ring.style.display = "block";
      ring.style.left = `${originX}px`;
      ring.style.top = `${originY}px`;
      applyJoystick(0, 0);
    }, { passive: false });
    zone.addEventListener("touchmove", (e) => {
      e.preventDefault();
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === activeTouchId) {
          applyJoystick(touch.clientX - originX, touch.clientY - originY);
        }
      }
    }, { passive: false });
    zone.addEventListener("touchend", (e) => {
      e.preventDefault();
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === activeTouchId) clearJoystick();
      }
    }, { passive: false });
    zone.addEventListener("touchcancel", () => clearJoystick());
    sprintBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      keys.sprint = true;
      sprintBtn.classList.add("active");
      if (socket) socket.emit(EVENTS.INPUT, { ...keys });
    }, { passive: false });
    sprintBtn.addEventListener("touchend", (e) => {
      e.preventDefault();
      keys.sprint = false;
      sprintBtn.classList.remove("active");
      if (socket) socket.emit(EVENTS.INPUT, { ...keys });
    }, { passive: false });
    sprintBtn.addEventListener("touchcancel", () => {
      keys.sprint = false;
      sprintBtn.classList.remove("active");
      if (socket) socket.emit(EVENTS.INPUT, { ...keys });
    });
  }
})();
