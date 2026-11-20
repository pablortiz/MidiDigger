"use strict";
var Luna = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/global.ts
  var global_exports = {};
  __export(global_exports, {
    AUTOMATION_MODES: () => AUTOMATION_MODES,
    AddOn: () => AddOn,
    AudioSource: () => AudioSource,
    Automation: () => Automation,
    Bindings: () => Bindings,
    BreakpointNode: () => BreakpointNode,
    Bus: () => Bus,
    COARSE_PAIRS_PER_FINE: () => COARSE_PAIRS_PER_FINE,
    COARSE_PAIR_NS: () => COARSE_PAIR_NS,
    CUE_COUNT: () => CUE_COUNT,
    Cell: () => Cell,
    Channel: () => Channel,
    Chord: () => Chord,
    Chords: () => Chords,
    Client: () => Client,
    Clip: () => Clip,
    Collection: () => Collection,
    ConnectionLost: () => ConnectionLost,
    Context: () => Context,
    Control: () => Control,
    Controls: () => Controls,
    DEFAULT_LUNA_PORT: () => DEFAULT_LUNA_PORT,
    DEFAULT_SHORTCUTS: () => DEFAULT_SHORTCUTS,
    DISPLAY_TICKS_PER_BEAT: () => DISPLAY_TICKS_PER_BEAT,
    Device: () => Device,
    Devices: () => Devices,
    Disposed: () => Disposed,
    Drivers: () => Drivers,
    EDIT_TIMEOUT_MS: () => EDIT_TIMEOUT_MS,
    EIGHTH_NOTE: () => EIGHTH_NOTE,
    Effect: () => Effect,
    Error: () => UAError,
    FloatLiteral: () => FloatLiteral,
    Gui: () => Gui,
    GuiWindow: () => GuiWindow,
    HALF_NOTE: () => HALF_NOTE,
    Job: () => Job,
    Jobs: () => Jobs,
    KeySignature: () => KeySignature,
    MAX_SECRET_BYTES: () => MAX_SECRET_BYTES,
    MAX_SECRET_NAME_LENGTH: () => MAX_SECRET_NAME_LENGTH,
    Marker: () => Marker,
    Markers: () => Markers,
    Meter: () => Meter,
    MidiClip: () => MidiClip,
    MockEngine: () => MockEngine,
    MockPort: () => MockPort,
    Musical: () => Musical,
    NoSessionOpen: () => NoSessionOpen,
    Node: () => Node,
    NotRunning: () => NotRunning,
    OVERVIEW_PAIR_NS: () => OVERVIEW_PAIR_NS,
    Output: () => Output,
    PLUGIN_ERROR_MISSING: () => PLUGIN_ERROR_MISSING,
    Playlist: () => Playlist,
    Plugin: () => Plugin,
    Plugins: () => Plugins,
    Preferences: () => Preferences,
    Presets: () => Presets,
    QUARTER_NOTE: () => QUARTER_NOTE,
    QwertyMidi: () => QwertyMidi,
    RECORD_LOOP_MARGIN_TICKS: () => RECORD_LOOP_MARGIN_TICKS,
    Render: () => Render,
    Renders: () => Renders,
    RequestTimeout: () => RequestTimeout,
    SEND_COUNT: () => SEND_COUNT,
    SIXTEENTH_NOTE: () => SIXTEENTH_NOTE,
    Scheduler: () => Scheduler,
    Secrets: () => Secrets,
    SendMidi: () => SendMidi,
    Session: () => Session,
    SessionPackage: () => SessionPackage,
    Sessions: () => Sessions,
    Shortcuts: () => Shortcuts,
    Store: () => Store,
    TICKS_PER_BEAT: () => TICKS_PER_BEAT,
    TICKS_PER_DISPLAY_TICK: () => TICKS_PER_DISPLAY_TICK,
    TempoEvent: () => TempoEvent,
    TimeSignature: () => TimeSignature,
    Timeline: () => Timeline,
    Track: () => Track,
    Transport: () => Transport,
    Unsupported: () => Unsupported,
    VERSION: () => VERSION,
    WAVEFORM_PAGE: () => WAVEFORM_PAGE,
    WHOLE_NOTE: () => WHOLE_NOTE,
    WasmEngine: () => WasmEngine,
    WasmPort: () => WasmPort,
    Waveforms: () => Waveforms,
    WebSocketPort: () => WebSocketPort,
    Workspace: () => Workspace,
    audioNsAtTick: () => audioNsAtTick,
    automationModeOrdinal: () => automationModeOrdinal,
    beatsToTicks: () => beatsToTicks,
    bindClock: () => bindClock,
    bindDrag: () => bindDrag,
    bindGesture: () => bindGesture,
    bindRange: () => bindRange,
    bindShortcuts: () => bindShortcuts,
    bootWasmEngine: () => bootWasmEngine,
    canDropPaths: () => canDropPaths,
    clients: () => clients,
    clipAudio: () => clipAudio,
    clipTypeFrom: () => clipTypeFrom,
    connect: () => connect,
    consoleLog: () => consoleLog,
    decodeMessage: () => decodeMessage,
    decodeMidiData: () => decodeMidiData,
    derived: () => derived,
    encodeMidiData: () => encodeMidiData,
    encodePayload: () => encodePayload,
    encodeRequest: () => encodeRequest,
    eventMatches: () => eventMatches,
    expandMulti: () => expandMulti,
    float: () => float,
    formatBarBeat: () => formatBarBeat,
    formatMinSec: () => formatMinSec,
    formatTimeSignature: () => formatTimeSignature,
    getOptionsToParams: () => getOptionsToParams,
    hasNativeBridge: () => hasNativeBridge,
    isEmbeddedInLuna: () => isEmbeddedInLuna,
    isLunaEnginePort: () => isLunaEnginePort,
    joinPath: () => joinPath,
    kindForScale: () => kindForScale,
    listOf: () => listOf,
    locationOptions: () => locationOptions,
    midiByte: () => midiByte,
    normalizeChordName: () => normalizeChordName2,
    onPathDrop: () => onPathDrop,
    pairNotes: () => pairNotes,
    pairNs: () => pairNs,
    pairRange: () => pairRange,
    parseChord: () => parseChord,
    propertyValue: () => propertyValue,
    requireTick: () => requireTick,
    secondsToTicks: () => secondsToTicks,
    selectedNotes: () => selectedNotes,
    settle: () => settle,
    shallowEquals: () => shallowEquals,
    splitPath: () => splitPath,
    stripValueSuffix: () => stripValueSuffix,
    ticksToBeats: () => ticksToBeats,
    ticksToSeconds: () => ticksToSeconds,
    toEvent: () => toEvent,
    traceWaveform: () => traceWaveform,
    wasmUpdateToEvent: () => wasmUpdateToEvent,
    waveformColumns: () => waveformColumns,
    waveformLanes: () => waveformLanes,
    waveformPeak: () => waveformPeak,
    writable: () => writable,
    yieldTask: () => yieldTask
  });

  // src/wire/port.ts
  var WIRE_KEYS = {
    properties: "properties",
    children: "children",
    commands: "commands",
    flatvalue: "flatvalue",
    propinfo: "propinfo",
    cmdparams: "cmdparams",
    propfilter: "propfilter",
    recursive: "recursive",
    levels: "levels",
    hidden: "hidden",
    offset: "offset",
    limit: "limit",
    includedChildren: "included_children",
    excludedChildren: "excluded_children",
    ignoreResponse: "ignore_response"
  };
  function getOptionsToParams(options) {
    const params = {};
    if (!options) return params;
    for (const key of Object.keys(options)) {
      const value = options[key];
      if (value === void 0) continue;
      params[WIRE_KEYS[key]] = typeof value === "boolean" ? value ? "1" : "0" : String(value);
    }
    return params;
  }
  function stripValueSuffix(path) {
    return path.endsWith("/value") ? path.slice(0, -"/value".length) : path;
  }
  function toEvent(message) {
    const event = { path: stripValueSuffix(message.path), data: message.data };
    if (message.operation) event.operation = message.operation;
    return event;
  }
  function eventMatches(subPath, eventPath) {
    if (subPath === "/" || subPath === "") return true;
    return eventPath === subPath || eventPath.startsWith(subPath + "/");
  }
  function propertyValue(data) {
    if (data !== null && typeof data === "object" && !Array.isArray(data) && "value" in data) {
      const keys = Object.keys(data);
      if (keys.length === 1 || keys.every((k) => k === "value" || k === "default" || k === "type" || k === "readonly")) {
        return data.value;
      }
    }
    return data;
  }
  function splitPath(path) {
    const at = path.lastIndexOf("/");
    if (at <= 0) return { node: "/", name: path.slice(at + 1) };
    return { node: path.slice(0, at), name: path.slice(at + 1) };
  }
  function joinPath(...segments) {
    const parts = [];
    for (const segment of segments) {
      for (const piece of segment.split("/")) {
        if (piece.length > 0) parts.push(piece);
      }
    }
    return "/" + parts.join("/");
  }
  var consoleLog = (level, message, detail) => {
    if (level === "error") console.error(`[Luna] ${message}`, detail ?? "");
    else if (level === "warn") console.warn(`[Luna] ${message}`, detail ?? "");
  };

  // src/wire/errors.ts
  var UAError = class extends Error {
    /** Engine error string or one of the SDK codes. */
    code;
    /** Verb of the request that failed, when known. */
    cmd;
    /** Path of the request that failed, when known. */
    path;
    constructor(code, message, detail = {}) {
      super(message);
      this.name = "UAError";
      this.code = code;
      this.cmd = detail.cmd;
      this.path = detail.path;
    }
  };
  var NotRunning = class extends UAError {
    constructor(url) {
      super("not_running", `No LUNA engine at ${url}. Start LUNA and open a session.`);
      this.name = "NotRunning";
    }
  };
  var RequestTimeout = class extends UAError {
    constructor(cmd, path, ms) {
      super("timeout", `${cmd} ${path} did not answer within ${ms} ms`, { cmd, path });
      this.name = "RequestTimeout";
    }
  };
  var ConnectionLost = class extends UAError {
    constructor(cmd, path) {
      super("disconnected", cmd ? `connection lost during ${cmd} ${path}` : "connection lost", cmd && path ? { cmd, path } : {});
      this.name = "ConnectionLost";
    }
  };
  var Unsupported = class extends UAError {
    constructor(what) {
      super("unsupported", what);
      this.name = "Unsupported";
    }
  };
  var NoSessionOpen = class extends UAError {
    constructor() {
      super("no_session", "No session is open. Open or create one in LUNA, or call luna.sessions.create().");
      this.name = "NoSessionOpen";
    }
  };
  var Disposed = class extends UAError {
    constructor(what, path) {
      super("disposed", `${what} was disposed: the engine removed it`, path ? { path } : {});
      this.name = "Disposed";
    }
  };

  // src/wire/codec.ts
  function appendParams(path, params) {
    if (!params) return path;
    const entries = Object.entries(params);
    if (entries.length === 0) return path;
    const query = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
    return path + (path.includes("?") ? "&" : "?") + query;
  }
  var FloatLiteral = class {
    constructor(value) {
      this.value = value;
      if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`Luna.float: ${String(value)} is not a finite number`);
    }
    value;
    /** The literal as it goes on the wire: always with a fraction or an exponent. */
    toLiteral() {
      const text = String(this.value);
      return /[.eE]/.test(text) ? text : `${text}.0`;
    }
    toJSON() {
      return this.value;
    }
  };
  function float(value) {
    return value instanceof FloatLiteral ? value : new FloatLiteral(value);
  }
  var floatNonce = 0;
  function encodePayload(data) {
    if (data === void 0) return "";
    let floats = false;
    const marker = `float${++floatNonce}:`;
    const text = JSON.stringify(data, function(key, value) {
      const original = this[key];
      if (original instanceof FloatLiteral) {
        floats = true;
        return marker + original.toLiteral();
      }
      return value;
    });
    if (!floats) return text;
    const quoted = JSON.stringify(marker).slice(1, -1);
    return text.replace(new RegExp(`"${quoted.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")}([^"]*)"`, "g"), "$1");
  }
  function encodeRequest(verb, path, params, data) {
    const payload = encodePayload(data);
    return `${verb} ${appendParams(path, params)}${payload ? " " + payload : ""}`;
  }
  var JSON_MAGIC = "JSON";
  function decodeMessage(text) {
    let body = text;
    if (body.startsWith(JSON_MAGIC)) body = body.slice(8);
    const nul = body.indexOf("\0");
    if (nul >= 0) body = body.slice(0, nul);
    body = body.trim();
    if (body.length === 0) return void 0;
    let raw;
    try {
      raw = JSON.parse(body);
    } catch {
      return void 0;
    }
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return void 0;
    const record = raw;
    const path = typeof record["path"] === "string" ? record["path"] : typeof record["url"] === "string" ? record["url"] : void 0;
    if (path === void 0) return void 0;
    const message = { path };
    if ("data" in record) message.data = record["data"];
    if (record["operation"] === "added" || record["operation"] === "removed") message.operation = record["operation"];
    if (record["parameters"] !== null && typeof record["parameters"] === "object") {
      message.parameters = record["parameters"];
    }
    if (typeof record["error"] === "string") message.error = record["error"];
    if (typeof record["cmd"] === "string") message.cmd = record["cmd"];
    return message;
  }
  function correlationId(message, key) {
    const value = message.parameters?.[key];
    return value === void 0 || value === null ? void 0 : String(value);
  }

  // src/wire/multi.ts
  function isPacked(data) {
    if (data === null || typeof data !== "object" || Array.isArray(data)) return false;
    const p = data;
    return Array.isArray(p["data"]) && Array.isArray(p["path"]) && Array.isArray(p["name"]) && Array.isArray(p["parent"]) && Array.isArray(p["string"]);
  }
  var MAX_DEPTH = 256;
  function packedPath(p, id) {
    const parts = [];
    let current = id;
    for (let depth = 0; depth < MAX_DEPTH; depth++) {
      const nameIndex = p.name[current];
      const parent = p.parent[current];
      if (nameIndex === void 0 || parent === void 0) break;
      parts.push(p.string[nameIndex] ?? "");
      if (parent === current) break;
      current = parent;
    }
    return "/" + parts.reverse().join("/");
  }
  function expandMulti(message) {
    if (message.path !== "multi") return [message];
    const payload = message.data;
    if (Array.isArray(payload)) {
      const out2 = [];
      for (const entry of payload) {
        if (entry !== null && typeof entry === "object" && typeof entry.path === "string") {
          out2.push(entry);
        }
      }
      return out2;
    }
    if (!isPacked(payload)) return [];
    const out = [];
    for (let i = 0; i < payload.data.length; i++) {
      const pathId = payload.path[i];
      if (pathId === void 0) continue;
      out.push({ path: packedPath(payload, pathId), data: payload.data[i] });
    }
    for (const i of payload.added ?? []) {
      const m = out[i];
      if (m) m.operation = "added";
    }
    for (const i of payload.removed ?? []) {
      const m = out[i];
      if (m) m.operation = "removed";
    }
    return out;
  }

  // src/wire/websocket-port.ts
  var DEFAULT_LUNA_PORT = 4718;
  var OPEN = 1;
  function unref(timer) {
    const t = timer;
    if (typeof t.unref === "function") t.unref();
  }
  var WebSocketPort = class {
    url;
    Socket;
    requestTimeoutMs;
    reconnectEnabled;
    reconnectMinMs;
    reconnectMaxMs;
    heartbeatEnabled;
    idKey;
    onUnhandled;
    log;
    socket;
    status = "disconnected";
    everConnected = false;
    closed = false;
    nextId = 1;
    pending = /* @__PURE__ */ new Map();
    subscriptions = /* @__PURE__ */ new Map();
    statusListeners = /* @__PURE__ */ new Set();
    reconnectTimer;
    reconnectDelay;
    heartbeatTimer;
    constructor(options = {}) {
      this.url = options.url ?? `ws://${options.host ?? "localhost"}:${options.port ?? DEFAULT_LUNA_PORT}`;
      const Socket = options.WebSocket ?? globalThis.WebSocket;
      if (!Socket) throw new UAError("no_websocket", "No WebSocket implementation available; pass one in options.WebSocket");
      this.Socket = Socket;
      this.requestTimeoutMs = options.requestTimeoutMs ?? 1e4;
      this.reconnectEnabled = options.reconnect ?? true;
      this.reconnectMinMs = options.reconnectMinMs ?? 250;
      this.reconnectMaxMs = options.reconnectMaxMs ?? 1e4;
      this.reconnectDelay = this.reconnectMinMs;
      this.heartbeatEnabled = options.heartbeat ?? true;
      this.idKey = options.idKey ?? "ua_id";
      this.onUnhandled = options.onUnhandled;
      this.log = options.log ?? consoleLog;
    }
    get connected() {
      return this.status === "connected";
    }
    /**
     * Connect. Resolves once the socket is open. Rejects with {@link NotRunning} if the first
     * attempt fails, or has not opened within `requestTimeoutMs`; later drops are handled by
     * reconnect instead.
     */
    open() {
      if (this.closed) return Promise.reject(new ConnectionLost());
      if (this.status === "connected") return Promise.resolve();
      return new Promise((resolve, reject) => {
        let settled = false;
        const socket = new this.Socket(this.url);
        this.socket = socket;
        this.setStatus("connecting");
        const openTimer = setTimeout(() => {
          if (this.socket !== socket || settled) return;
          this.log("warn", `no answer from ${this.url} within ${this.requestTimeoutMs} ms`, { url: this.url, timeoutMs: this.requestTimeoutMs });
          dropped();
        }, this.requestTimeoutMs);
        unref(openTimer);
        const dropped = () => {
          clearTimeout(openTimer);
          if (this.socket !== socket) return;
          this.socket = void 0;
          socket.onopen = socket.onerror = socket.onclose = socket.onmessage = null;
          try {
            if (socket.readyState !== 3) socket.close();
          } catch {
          }
          this.stopHeartbeat();
          this.failPending();
          if (!settled) {
            settled = true;
            this.setStatus("disconnected");
            if (!this.everConnected) {
              reject(new NotRunning(this.url));
              return;
            }
          } else if (!this.closed) {
            this.setStatus("disconnected");
          }
          this.scheduleReconnect();
        };
        socket.onopen = () => {
          clearTimeout(openTimer);
          settled = true;
          this.everConnected = true;
          this.reconnectDelay = this.reconnectMinMs;
          this.setStatus("connected");
          this.resubscribeAll();
          this.startHeartbeat();
          resolve();
        };
        socket.onmessage = (ev) => this.handleFrame(ev.data);
        socket.onerror = dropped;
        socket.onclose = dropped;
      });
    }
    async get(path, options) {
      return this.request("get", path, getOptionsToParams(options), void 0, options?.ignoreResponse === true);
    }
    async set(path, data) {
      await this.request("set", path, {}, data, false);
    }
    async post(path, data) {
      return this.request("post", path, {}, data, false);
    }
    subscribe(path, handler, options) {
      const recursive = options?.recursive === true;
      const key = `${path}|${recursive ? 1 : 0}`;
      let sub = this.subscriptions.get(key);
      if (!sub) {
        sub = { path, recursive, handlers: /* @__PURE__ */ new Set() };
        this.subscriptions.set(key, sub);
        if (this.connected) this.sendSubscribe(sub);
      }
      sub.handlers.add(handler);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        const current = this.subscriptions.get(key);
        if (!current) return;
        current.handlers.delete(handler);
        if (current.handlers.size === 0) {
          this.subscriptions.delete(key);
          if (this.connected) this.fireAndForget("unsubscribe", current.path, {});
        }
      };
    }
    onStatus(listener) {
      this.statusListeners.add(listener);
      return () => {
        this.statusListeners.delete(listener);
      };
    }
    async close() {
      if (this.closed) return;
      this.closed = true;
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = void 0;
      this.stopHeartbeat();
      const socket = this.socket;
      this.socket = void 0;
      this.failPending();
      this.setStatus("closed");
      if (socket) {
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, 300);
          unref(timer);
          socket.onclose = () => {
            clearTimeout(timer);
            resolve();
          };
          try {
            socket.close();
          } catch {
            clearTimeout(timer);
            resolve();
          }
        });
      }
    }
    // -----------------------------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------------------------
    request(verb, path, params, data, ignoreResponse) {
      const socket = this.socket;
      if (!socket || socket.readyState !== OPEN || !this.connected) {
        return Promise.reject(new ConnectionLost(verb, path));
      }
      if (ignoreResponse) {
        socket.send(encodeRequest(verb, path, params, data));
        return Promise.resolve(void 0);
      }
      const id = `r${this.nextId++}`;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending.delete(id);
          this.log("warn", `${verb} ${path} timed out`, { verb, path, ms: this.requestTimeoutMs });
          reject(new RequestTimeout(verb, path, this.requestTimeoutMs));
        }, this.requestTimeoutMs);
        unref(timer);
        this.pending.set(id, { verb, path, resolve, reject, timer });
        socket.send(encodeRequest(verb, path, { ...params, [this.idKey]: id }, data));
      });
    }
    fireAndForget(verb, path, params) {
      const socket = this.socket;
      if (!socket || socket.readyState !== OPEN) return;
      socket.send(encodeRequest(verb, appendParams(path, { ignore_response: "1" }), params));
    }
    sendSubscribe(sub) {
      this.fireAndForget("subscribe", sub.path, sub.recursive ? { recursive: "1" } : {});
    }
    resubscribeAll() {
      for (const sub of this.subscriptions.values()) this.sendSubscribe(sub);
    }
    handleFrame(data) {
      if (typeof data !== "string") return;
      const message = decodeMessage(data);
      if (!message) return;
      for (const entry of expandMulti(message)) {
        const id = correlationId(entry, this.idKey);
        if (id !== void 0) {
          const pending2 = this.pending.get(id);
          if (!pending2) continue;
          this.pending.delete(id);
          clearTimeout(pending2.timer);
          if (entry.error !== void 0) {
            pending2.reject(new UAError(entry.error, `${pending2.verb} ${pending2.path}: ${entry.error}`, { cmd: pending2.verb, path: pending2.path }));
          } else {
            pending2.resolve(entry.data);
          }
          continue;
        }
        if (entry.parameters && "ignore_response" in entry.parameters) continue;
        const event = toEvent(entry);
        let delivered = false;
        for (const sub of this.subscriptions.values()) {
          if (!eventMatches(sub.path, event.path)) continue;
          delivered = true;
          for (const handler of sub.handlers) {
            try {
              handler(event);
            } catch (err) {
              this.log("error", "subscription handler threw", { path: event.path, error: err });
            }
          }
        }
        if (!delivered) this.onUnhandled?.(entry);
      }
    }
    failPending() {
      for (const [id, p] of this.pending) {
        clearTimeout(p.timer);
        this.pending.delete(id);
        p.reject(new ConnectionLost(p.verb, p.path));
      }
    }
    scheduleReconnect() {
      if (this.closed || !this.reconnectEnabled || !this.everConnected || this.reconnectTimer) return;
      const delay = this.reconnectDelay;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.reconnectMaxMs);
      this.log("info", `reconnecting to ${this.url} in ${delay} ms`, { url: this.url, delayMs: delay });
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = void 0;
        if (this.closed) return;
        this.open().catch(() => {
        });
      }, delay);
      unref(this.reconnectTimer);
    }
    startHeartbeat() {
      if (!this.heartbeatEnabled) return;
      this.get("/status/timeout_ms", { flatvalue: true }).then((data) => {
        const timeoutMs = Number(propertyValue(data));
        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || this.closed || !this.connected) return;
        const interval = Math.max(1e3, Math.floor(timeoutMs / 2));
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
          if (!this.connected) return;
          this.fireAndForget("get", "/ping", {});
        }, interval);
        unref(this.heartbeatTimer);
      }).catch(() => {
      });
    }
    stopHeartbeat() {
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = void 0;
    }
    setStatus(status, detail) {
      if (this.status === status) return;
      this.status = status;
      this.log(status === "disconnected" && this.everConnected && !this.closed ? "warn" : "debug", `${this.url} ${status}`, { url: this.url, status });
      for (const listener of this.statusListeners) {
        try {
          listener(status, detail);
        } catch (err) {
          this.log("error", "status listener threw", { status, error: err });
        }
      }
    }
  };

  // src/wire/mock-port.ts
  var EMPTY_MIDI_TABLE = () => ({ operation: "update", row_ids: [], enabled: [], midi_data: [], tick: [] });
  function encodeMidiTable(operation, rows) {
    return {
      operation,
      row_ids: rows.map((r) => r.rowid),
      enabled: rows.map((r) => r.enabled),
      midi_data: rows.map((r) => (r.status & 255) << 16 | (r.data1 & 127) << 8 | r.data2 & 127),
      tick: rows.map((r) => r.tick)
    };
  }
  function decodeMidiTable(value) {
    const table = value;
    return (table?.row_ids ?? []).map((rowid, i) => {
      const packed = table?.midi_data?.[i] ?? 0;
      return { rowid, tick: table?.tick?.[i] ?? 0, status: packed >>> 16 & 255, data1: packed >>> 8 & 127, data2: packed & 127, enabled: table?.enabled?.[i] !== false };
    });
  }
  var normalizeChordName = (name) => name.replace(/\u266D/g, "b").replace(/\u266F/g, "#");
  function groupByClip(rows) {
    const out = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const uid = row.clip_uid;
      if (!uid) continue;
      out.set(uid, [...out.get(uid) ?? [], row]);
    }
    return out;
  }
  function normalize(path) {
    const q = path.indexOf("?");
    const clean = q >= 0 ? path.slice(0, q) : path;
    const parts = clean.split("/").filter((p) => p.length > 0);
    return "/" + parts.join("/");
  }
  function parentOf(path) {
    return splitPath(path).node;
  }
  function wireFloat(value) {
    if (value instanceof FloatLiteral) return value.value;
    if (typeof value !== "number" || !Number.isFinite(value)) return 0;
    return Number.isInteger(value) ? 0 : value;
  }
  var FADER_ZERO = 0.78;
  var FADER_MIN = -96;
  var FADER_MAX = 12;
  function faderToReal(n) {
    return n <= FADER_ZERO ? FADER_MIN - n / FADER_ZERO * FADER_MIN : (n - FADER_ZERO) / (1 - FADER_ZERO) * FADER_MAX;
  }
  function faderToNormalized(real) {
    const n = real <= 0 ? (real - FADER_MIN) / -FADER_MIN * FADER_ZERO : FADER_ZERO + real / FADER_MAX * (1 - FADER_ZERO);
    return Math.min(1, Math.max(0, n));
  }
  function formatPan(real) {
    const n = Math.round(Math.abs(real));
    return n === 0 ? "C" : real < 0 ? `L${n}` : `R${n}`;
  }
  function parsePan(text) {
    const m = /^([LR])(\d+(?:\.\d+)?)$/.exec(text);
    if (m) return (m[1] === "L" ? -1 : 1) * Number(m[2]);
    return text === "C" ? 0 : Number(text) || 0;
  }
  var CONTROL_VIEWS = /* @__PURE__ */ new Set(["value", "real_value", "normalized_value", "string_value"]);
  var MockEngine = class _MockEngine {
    nodes = /* @__PURE__ */ new Map();
    ports = /* @__PURE__ */ new Set();
    faults = /* @__PURE__ */ new Map();
    pendingDeliveries = 0;
    settleWaiters = [];
    /** Every request any port made, oldest first. Useful for asserting what a model did. */
    requests = [];
    /** `set_touch` calls, as `<control path>:on|off`, oldest first. */
    touches = [];
    /** Transaction commands seen: `begin`, `commit`, `abort`. */
    transactions = [];
    /** Live MIDI LUNA delivered through `/sessions/send_midi` and `send_midi_all_notes_off`, oldest first. */
    midiSent = [];
    constructor(options = {}) {
      this.nodes.set("/", { properties: /* @__PURE__ */ new Map(), readOnly: /* @__PURE__ */ new Set(), commands: /* @__PURE__ */ new Map(), children: [] });
      this.addNode("/status", { properties: { timeout_ms: 0, version: "mock", name: "LUNA" } });
      this.addNode("/sessions", {
        properties: { focused_session: "" },
        commands: {
          new_session: (data, engine) => {
            const body = data ?? {};
            const uid = `s${engine.children("/sessions").length + 1}`;
            engine.addSession(uid, { name: body.name ?? "Untitled", focused: false });
            engine.setValue(`/sessions/${uid}`, "loaded", false);
            return { session_uid: uid };
          },
          open_session: (data, engine) => {
            const body = data ?? {};
            const uid = `s${engine.children("/sessions").length + 1}`;
            engine.addSession(uid, { name: body.session_package_uid ?? "Opened", focused: false, ...body.session_package_uid ? { packageUid: body.session_package_uid } : {} });
            engine.setValue(`/sessions/${uid}`, "loaded", false);
            return { session_uid: uid };
          },
          load_session: (data, engine) => {
            const body = data ?? {};
            if (!body.session_uid || !engine.has(`/sessions/${body.session_uid}`)) {
              throw new UAError("uasrv.invalid_object", "load_session: unknown session", { cmd: "post", path: "/sessions/load_session" });
            }
            setTimeout(() => {
              if (engine.has(`/sessions/${body.session_uid}`)) {
                engine.setValue(`/sessions/${body.session_uid}`, "loaded", true);
                engine.setValue("/sessions", "focused_session", body.session_uid);
              }
            }, 5);
            return null;
          },
          close_session: (data, engine) => {
            const body = data ?? {};
            if (body.session_uid) engine.removeNode(`/sessions/${body.session_uid}`);
            return null;
          },
          // Facts 108 and 109, after deviced's Edit_SendMidi.
          send_midi: (data, engine) => {
            const body = data ?? {};
            const invalid = () => new UAError("uasrv.invalid_property", "post /sessions/send_midi: uasrv.invalid_property", { cmd: "post", path: "/sessions/send_midi" });
            const { byte_0, byte_1, byte_2 } = body;
            if (typeof byte_0 !== "number" || typeof byte_1 !== "number" || typeof byte_2 !== "number") throw invalid();
            const bytes = [byte_0, byte_1, byte_2];
            const live = (uid) => !!uid && engine.has(`/sessions/${uid}`);
            if (body.session_uid !== void 0 && body.track_uid !== void 0) {
              if (!live(body.session_uid) || !body.track_uid) throw invalid();
              engine.midiSent.push({ sessionUid: body.session_uid, trackUid: body.track_uid, bytes, recordEnabled: body.record_enabled === true });
              return null;
            }
            if (body.session_uid !== void 0 && Array.isArray(body.tracks)) {
              if (live(body.session_uid)) {
                for (const t of body.tracks) {
                  if (t.track_uid && typeof t.record_enabled === "boolean") engine.midiSent.push({ sessionUid: body.session_uid, trackUid: t.track_uid, bytes, recordEnabled: t.record_enabled });
                }
              }
              throw invalid();
            }
            if (body.midi_input_source !== void 0) {
              engine.midiSent.push({ midiInputSource: body.midi_input_source, bytes, recordEnabled: false });
              return null;
            }
            throw invalid();
          },
          send_midi_all_notes_off: (_data, engine) => {
            engine.midiSent.push({ allNotesOff: true, bytes: [176, 123, 0], recordEnabled: false });
            return null;
          }
        }
      });
      this.addNode("/ping", {});
      this.addNode("/workspace/sessions");
      this.addNode("/workspace", {
        properties: { type: "folder" },
        commands: {
          query: (data, engine) => {
            const body = data ?? {};
            let rows = engine.children("/workspace/sessions").map((uid) => ({
              uid,
              name: String(engine.value(`/workspace/sessions/${uid}`, "file_name") ?? uid),
              path: `${String(engine.value(`/workspace/sessions/${uid}`, "directory_path") ?? "")}/${String(engine.value(`/workspace/sessions/${uid}`, "file_name") ?? "")}`,
              file_online: true,
              session_type: 0,
              factory: false,
              favorite: Boolean(engine.value(`/workspace/sessions/${uid}`, "favorite")),
              created: Number(engine.value(`/workspace/sessions/${uid}`, "created") ?? 0),
              modified: 0,
              last_opened: Number(engine.value(`/workspace/sessions/${uid}`, "last_opened") ?? 0),
              tags: []
            }));
            if (body.search) rows = rows.filter((r) => r.name.toLowerCase().includes(body.search.toLowerCase()));
            if (body.order_by) {
              const key = body.order_by;
              rows.sort((a, b) => a[key] - b[key]);
              if (body.order_as === "desc") rows.reverse();
            }
            if (body.limit !== void 0) rows = rows.slice(0, body.limit);
            const results = { num_rows: rows.length };
            for (const k of Object.keys(rows[0] ?? { uid: 0 })) results[k] = rows.map((r) => r[k]);
            return { results };
          },
          full_text_search: () => ({ results: { num_rows: 0 } }),
          /**
           * The chunked import protocol (fact 42): `begin` answers a uid, each `transfer`
           * appends base64 bytes, `end` files the finished source under the package's audio
           * folder, and `cancel` throws the partial away. Bytes identical to an uploaded source
           * already in the package are not filed again: `end` answers that source's uid.
           */
          import_file: (data, engine) => {
            const body = data ?? {};
            const pkg = body.session_package_uid ?? "";
            switch (body.phase) {
              case "begin": {
                const uid = `src${engine.imports.size + engine.children(`/workspace/sessions/${pkg}/audio`).length + 1}`;
                engine.imports.set(uid, { pkg, name: body.name ?? uid, bytes: 0, content: "" });
                return { uid };
              }
              case "transfer": {
                const pending2 = engine.imports.get(body.uid ?? "");
                if (!pending2) throw new UAError("uasrv.invalid_object", "import_file: no import in progress for that uid", { cmd: "post", path: "/workspace/import_file" });
                const encoded = body.file_data ?? "";
                const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
                pending2.bytes += Math.max(0, encoded.length / 4 * 3 - padding);
                pending2.content += encoded;
                return null;
              }
              case "end": {
                const uid = body.uid ?? "";
                const pending2 = engine.imports.get(uid);
                if (!pending2) throw new UAError("uasrv.invalid_object", "import_file: no import in progress for that uid", { cmd: "post", path: "/workspace/import_file" });
                engine.imports.delete(uid);
                const same = engine.uploaded.get(`${pending2.pkg}:${pending2.content}`);
                if (same && engine.has(`/workspace/sessions/${pending2.pkg}/audio/${same}`)) return { uid: same };
                engine.uploaded.set(`${pending2.pkg}:${pending2.content}`, uid);
                engine.addNode(`/workspace/sessions/${pending2.pkg}/audio/${uid}`, {
                  properties: { uid, name: body.name ?? pending2.name, stem_format: "stereo", length: 0, sample_rate: 48e3, created: 0, size: pending2.bytes }
                });
                return { uid };
              }
              case "cancel":
                engine.imports.delete(body.uid ?? "");
                return null;
              case "local_copy":
              default: {
                const uid = `src${engine.children(`/workspace/sessions/${pkg}/audio`).length + 1}`;
                engine.addNode(`/workspace/sessions/${pkg}/audio/${uid}`, {
                  properties: { uid, name: body.name ?? uid, stem_format: "stereo", length: 0, sample_rate: 48e3, created: 0, size: 0 }
                });
                return { uid };
              }
            }
          }
        }
      });
      this.addNode("/plugins", { properties: { type: "folder" }, commands: { rescan: () => null } });
      this.addNode("/presets", {
        properties: { type: "folder" },
        commands: {
          query: (data, engine) => {
            const body = data ?? {};
            if (!body.plugin_id && !body.device_type_id) throw new UAError("uasrv.invalid_type", "query: plugin_id or device_type_id required", { cmd: "post", path: "/presets/query" });
            const root = `/presets/plugins/${body.plugin_id ?? ""}/presets`;
            let rows = engine.children(root).map((uid) => ({
              uid,
              name: String(engine.value(`${root}/${uid}`, "preset_name") ?? uid),
              version: Number(engine.value(`${root}/${uid}`, "version") ?? 1),
              favorite: engine.value(`${root}/${uid}`, "favorite") ? 1 : 0,
              factory: engine.value(`${root}/${uid}`, "factory") ? 1 : 0,
              path: String(engine.value(`${root}/${uid}`, "path") ?? "")
            }));
            if (body.search) rows = rows.filter((r) => r.name.toLowerCase().includes(body.search.toLowerCase()));
            if (body.favorite) rows = rows.filter((r) => r.favorite === 1);
            if (body.limit !== void 0) rows = rows.slice(0, body.limit);
            const results = { num_rows: rows.length };
            for (const k of Object.keys(rows[0] ?? { uid: 0 })) results[k] = rows.map((r) => r[k]);
            return { results, folders: [] };
          }
        }
      });
      this.addNode("/drivers", { properties: { connected: [{ id: "mock", name: "Mock Device", type: "built_in", num_inputs: 2, num_outputs: 2 }], unsupported: [], sample_rates: [44100, 48e3] } });
      this.addNode("/preferences", { properties: { io_buffer_size: 256, play_from_stop_location: false, record_mute: false, metronome_sound: "click", metronome_sounds: ["click", "beep"] } });
      this.addNode("/renders", {
        properties: { type: "folder" },
        commands: {
          new: (data, engine) => {
            const body = data ?? {};
            const uid = body.uid ?? `r${engine.children("/renders").length + 1}`;
            engine.addNode(`/renders/${uid}`, {
              properties: {
                uid,
                name: body.name ?? "Bounce",
                type: body.type ?? "bounce",
                session_uid: body.session_uid ?? "",
                state: "created",
                percent_complete: 0,
                error_message: null,
                render_is_offline: body.real_time !== true,
                time_remaining: body.real_time === true ? 0 : void 0,
                total_samples: 0
              }
            });
            return { uid };
          },
          start: (data, engine) => {
            const body = data ?? {};
            const path = `/renders/${body.uid}`;
            if (!engine.has(path)) throw new UAError("uasrv.invalid_object", "start: no such render", { cmd: "post", path: "/renders/start" });
            engine.setValue(path, "state", "running");
            return null;
          },
          abort: (data, engine) => {
            const body = data ?? {};
            const path = `/renders/${body.uid}`;
            if (engine.has(path)) engine.setValue(path, "state", "aborted");
            return null;
          },
          delete: (data, engine) => {
            const body = data ?? {};
            const path = `/renders/${body.uid}`;
            if (engine.has(path)) engine.removeNode(path);
            return null;
          }
        }
      });
      this.addNode("/jobs");
      this.addNode("/devices");
      this.addNode("/gui", {
        properties: { prior_launch_count: 1 },
        commands: {
          set_page: (data, engine) => {
            const body = data ?? {};
            engine.setValue(`/gui/windows/${body.context_type ?? "main"}`, "page", body.page ?? "timeline");
            return null;
          },
          open_url: () => null,
          reveal_path: () => null,
          open_settings: () => null,
          open_plugin_manager: () => null,
          show_feedback: () => null,
          show_session_in_finder: () => null,
          show_add_on: () => null,
          execute: () => null,
          add_task: () => null,
          update_task: () => null,
          remove_task: () => null,
          release_file_chooser: () => null,
          release_save_dialog: () => null,
          show_open_dialog: (_data, engine) => {
            const uid = `fc${engine.nextRow()}`;
            engine.addNode(`/gui/file_chooser/${uid}`, { properties: { status: "pending", files: [] } });
            setTimeout(() => {
              if (!engine.has(`/gui/file_chooser/${uid}`)) return;
              engine.setValue(`/gui/file_chooser/${uid}`, "files", engine.nextDialogFiles.map((p) => ({ path: p })));
              engine.setValue(`/gui/file_chooser/${uid}`, "status", engine.nextDialogFiles.length ? "selected" : "cancelled");
            }, 5);
            return { uid };
          },
          show_folder_dialog: (_data, engine) => {
            const uid = `fc${engine.nextRow()}`;
            engine.addNode(`/gui/file_chooser/${uid}`, { properties: { status: "pending", files: [] } });
            setTimeout(() => {
              if (!engine.has(`/gui/file_chooser/${uid}`)) return;
              engine.setValue(`/gui/file_chooser/${uid}`, "files", engine.nextDialogFiles.map((p) => ({ path: p })));
              engine.setValue(`/gui/file_chooser/${uid}`, "status", engine.nextDialogFiles.length ? "selected" : "cancelled");
            }, 5);
            return { uid };
          },
          // Fact 106: validation, hidden entries and order (naturalCompare) as LUNA's list_files.
          list_files: (data, engine) => {
            const fail = (code, why) => new UAError(code, `list_files: ${why}`, { cmd: "post", path: "/gui/list_files" });
            const path = typeof data === "object" && data !== null ? data.path : void 0;
            if (path === void 0 || path === null) throw fail("uasrv.missing_field", "path is required");
            if (typeof path !== "string" || !/^(\/|[A-Za-z]:[\\/])/.test(path)) throw fail("uasrv.invalid_value", "path must be absolute");
            const dir = path.length > 1 ? path.replace(/[\\/]+$/, "") : path;
            const names = engine.folders[dir];
            if (!names) {
              const cut = dir.lastIndexOf("/");
              const isFile = engine.folders[cut > 0 ? dir.slice(0, cut) : "/"]?.includes(dir.slice(cut + 1));
              throw fail(isFile ? "uasrv.invalid_value" : "uasrv.filesystem_error", isFile ? "path is a file" : "no folder at path");
            }
            const files = names.map((raw) => ({ name: raw.replace(/\/$/, ""), is_directory: raw.endsWith("/") })).filter((e) => !e.name.startsWith(".")).sort((a, b) => naturalCompare(a.name, b.name) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)).map((e) => ({ name: e.name, path: `${dir === "/" ? "" : dir}/${e.name}`, is_directory: e.is_directory }));
            return { files };
          },
          show_save_dialog: (_data, engine) => {
            const uid = `fc${engine.nextRow()}`;
            engine.addNode(`/gui/file_chooser/${uid}`, { properties: { status: "pending", files: [] } });
            setTimeout(() => {
              if (!engine.has(`/gui/file_chooser/${uid}`)) return;
              engine.setValue(`/gui/file_chooser/${uid}`, "files", engine.nextDialogFiles.map((p) => ({ path: p })));
              engine.setValue(`/gui/file_chooser/${uid}`, "status", engine.nextDialogFiles.length ? "selected" : "cancelled");
            }, 5);
            return { uid };
          }
        }
      });
      this.addNode("/gui/windows/main", { properties: { page: "timeline" } });
      this.addNode("/gui/transport", { properties: { arm_mode: false } });
      this.addNode("/gui/add_ons/com.example.demo", { properties: { id: "com.example.demo", name: "Demo", target: "window", icon: "", floating: true, show_with_session: false, manufacturer: "Example Co" } });
      this.addNode("/gui/file_chooser");
      if (options.gui === false) this.removeNode("/gui");
    }
    /** What the next mock file dialog "selects"; empty means the user cancelled. */
    nextDialogFiles = [];
    /**
     * The disk `/gui/list_files` reads: each folder's absolute path to the names inside it,
     * a trailing `/` marking a subfolder. A name starting with `.` is hidden, as in LUNA.
     *
     * @example
     * engine.folders['/Samples'] = ['kick.wav', 'Loops/', '.DS_Store'];
     */
    folders = {};
    rowCounter = 100;
    /** @internal */
    nextRow() {
      return ++this.rowCounter;
    }
    /** @internal Find a control node by its `uid` property. */
    /**
     * Route `output` to the bus at `busPath` the way LUNA records it (fact 83): append a row to
     * `assignments` and add an `assignment_objects/<uid>` node. Returns the assignment uid.
     */
    addAssignment(output, busUid, busPath) {
      const uid = `asg${this.nextRow()}`;
      const name = String(this.value(busPath, "name") ?? busUid);
      const stem = String(this.value(busPath, "stem_format") ?? "stereo");
      const busType = this.value(busPath, "bus_type");
      const desc = { bus_uid: busUid, name, stem_format: stem, is_bus: "true", sidechain_in_use: "false" };
      this.addNode(`${output}/assignment_objects/${uid}`, {
        properties: { type: "assignment", rowid: this.nextRow(), uid, bus_uid: busUid, output_node_uid: busUid, connection_error: "", output_desc: desc },
        readOnly: ["type", "rowid", "uid", "bus_uid", "output_node_uid", "connection_error", "output_desc"]
      });
      const rows = this.value(output, "assignments") ?? [];
      this.setValue(output, "assignments", [...rows, { connection_error: null, name, stem_format: stem, type: typeof busType === "string" ? busType : null, value: busUid, sidechain_in_use: "false" }]);
      return uid;
    }
    /** @internal Remove one destination: its `assignments` row and its object, which share an index. */
    removeAssignment(output, uid) {
      const index = this.children(`${output}/assignment_objects`).indexOf(uid);
      if (index < 0) return;
      const rows = [...this.value(output, "assignments") ?? []];
      rows.splice(index, 1);
      this.removeNode(`${output}/assignment_objects/${uid}`);
      this.setValue(output, "assignments", rows);
    }
    /** @internal A deleted bus does not cascade: assignments to it stay, marked `device.missing_bus` (fact 83). */
    danglingAssignments(sessionUid, busUid) {
      const base = `/sessions/${sessionUid}`;
      for (const kind of ["tracks", "buses"]) {
        for (const ch of this.children(`${base}/${kind}`)) {
          for (const out of this.children(`${base}/${kind}/${ch}/outputs`)) {
            const output = `${base}/${kind}/${ch}/outputs/${out}`;
            const objects = this.children(`${output}/assignment_objects`);
            const rows = this.value(output, "assignments") ?? [];
            if (!rows.some((r) => r["value"] === busUid)) continue;
            for (const uid of objects) {
              const object = `${output}/assignment_objects/${uid}`;
              if (this.value(object, "bus_uid") !== busUid) continue;
              this.setValue(object, "output_node_uid", null);
              this.setValue(object, "connection_error", "device.missing_bus");
            }
            this.setValue(output, "assignments", rows.map((r) => r["value"] === busUid ? { ...r, value: null, connection_error: "device.missing_bus" } : r));
          }
        }
      }
    }
    controlPathByUid(uid) {
      for (const [path, node] of this.nodes) {
        if (node.properties.get("control_type") !== void 0 && node.properties.get("uid") === uid) return path;
      }
      return void 0;
    }
    /** Add a plugin to the catalog. */
    addPlugin(pluginId, options = {}) {
      this.addNode(`/plugins/${pluginId}`, {
        properties: {
          plugin_id: pluginId,
          name: options.name ?? pluginId,
          version: "1.0.0",
          description: "",
          installed: true,
          favorite: false,
          authorized: null,
          default_preset_uid: null,
          manifest: { manufacturer: options.manufacturer ?? "Mock", name: options.name ?? pluginId, plugin_id: pluginId, categories: options.categories ?? [], short_names: [] }
        }
      });
    }
    /** Add a preset for a plugin to the library (fact 98). Returns its uid. */
    addPreset(pluginId, name, options = {}) {
      const root = `/presets/plugins/${pluginId}/presets`;
      const uid = options.uid ?? `preset_${this.children(root).length + 1}_${pluginId}`;
      this.addNode(`${root}/${uid}`, {
        properties: { uid, preset_name: name, version: options.version ?? 1, favorite: options.favorite ?? false, factory: options.factory ?? false, path: "" }
      });
      return uid;
    }
    /** Register a session package in the workspace. */
    addPackage(uid, options = {}) {
      this.addNode(`/workspace/sessions/${uid}`, {
        properties: { uid, file_name: `${options.name ?? uid}.luna`, directory_path: `/tmp/${options.name ?? uid}`, session_type: "default", factory: false, favorite: options.favorite ?? false, created: options.lastOpened ?? 0, modified: 0, last_opened: options.lastOpened ?? 0, comments: "" }
      });
    }
    /** A new client connection. */
    port() {
      const port = new MockPort(this);
      this.ports.add(port);
      return port;
    }
    // ---------------------------------------------------------------------------------------
    // Tree building
    // ---------------------------------------------------------------------------------------
    /** Create a node (and any missing ancestors). Pushes `added` to subscribers. */
    addNode(path, spec = {}) {
      const clean = normalize(path);
      if (clean !== "/" && !this.nodes.has(parentOf(clean))) this.addNode(parentOf(clean));
      const node = {
        properties: new Map(Object.entries(spec.properties ?? {})),
        readOnly: new Set(spec.readOnly ?? []),
        commands: new Map(Object.entries(spec.commands ?? {})),
        children: []
      };
      const existed = this.nodes.has(clean);
      this.nodes.set(clean, node);
      if (clean !== "/") {
        const parent = this.nodes.get(parentOf(clean));
        const name = splitPath(clean).name;
        if (parent && !parent.children.includes(name)) parent.children.push(name);
      }
      if (!existed && clean !== "/") this.push({ path: clean, operation: "added" }, void 0);
    }
    /** Remove a node and its subtree. Pushes `removed` to subscribers. */
    removeNode(path) {
      const clean = normalize(path);
      if (!this.nodes.has(clean)) return;
      for (const key of [...this.nodes.keys()]) {
        if (key === clean || key.startsWith(clean + "/")) this.nodes.delete(key);
      }
      const parent = this.nodes.get(parentOf(clean));
      const name = splitPath(clean).name;
      if (parent) parent.children = parent.children.filter((c) => c !== name);
      this.push({ path: clean, operation: "removed" }, void 0);
    }
    /** Engine-side property change: updates the tree and pushes to every subscribed port. */
    setValue(nodePath, property, value) {
      const clean = normalize(nodePath);
      const node = this.nodes.get(clean);
      if (!node) throw new Error(`MockEngine: no node ${nodePath}`);
      node.properties.set(property, value);
      this.push({ path: `${clean}/${property}/value`, data: value }, void 0);
      if (property === "play_start" && /^\/sessions\/[^/]+$/.test(clean) && node.properties.get("playing") !== true) {
        this.setValue(clean, "location", this.locationAt(clean, Number(value)));
      }
    }
    /**
     * The session `location` LUNA reports for `tick`: bar|beat from the session's time
     * signatures, whose `bar` numbers need not put bar 1 at tick 0 (fact 91), and `min_sec`
     * from the tempo map (fact 96).
     */
    locationAt(sessionPath, tick) {
      const beatTicks = 96e9;
      const sigs = this.children(`${sessionPath}/time_signatures`).map((id) => this.nodes.get(`${sessionPath}/time_signatures/${id}`).properties).map((p) => ({ tick: Number(p.get("tick") ?? 0), bar: Number(p.get("bar") ?? 1), n: Number(p.get("numerator") ?? 4), d: Number(p.get("denominator") ?? 4) })).sort((a, b) => a.tick - b.tick);
      const sig = sigs.filter((x) => x.tick <= tick).at(-1) ?? sigs[0] ?? { tick: 0, bar: 1, n: 4, d: 4 };
      const beat = beatTicks * 4 / sig.d;
      const rel = tick - sig.tick;
      const inBar = (rel % (beat * sig.n) + beat * sig.n) % (beat * sig.n);
      const seconds = this.secondsAt(sessionPath, tick);
      const previous2 = this.nodes.get(sessionPath)?.properties.get("location");
      return {
        tick,
        bar_beat: { bar: sig.bar + Math.floor(rel / (beat * sig.n)), beat: 1 + Math.floor(inBar / beat), tick: inBar % beat },
        min_sec: { minutes: Math.floor(seconds / 60), seconds: seconds % 60 },
        tempo: previous2?.tempo ?? 120,
        time_signature: { numerator: sig.n, denominator: sig.d },
        playing: this.nodes.get(sessionPath)?.properties.get("playing") === true
      };
    }
    /** Seconds at `tick`, integrating the session's tempo map (constant tempo between events). */
    secondsAt(sessionPath, tick) {
      const beatTicks = 96e9;
      const tempos = this.children(`${sessionPath}/tempo_map`).map((id) => this.nodes.get(`${sessionPath}/tempo_map/${id}`).properties).map((p) => ({ tick: Number(p.get("tick") ?? 0), tempo: Number(p.get("tempo") ?? 120) })).sort((a, b) => a.tick - b.tick);
      if (tempos.length === 0) return tick / beatTicks * 0.5;
      let seconds = 0;
      let at = 0;
      let tempo = tempos[0].tempo;
      for (const t of tempos) {
        if (t.tick >= tick) break;
        if (t.tick > at) {
          seconds += (t.tick - at) / beatTicks * (60 / tempo);
          at = t.tick;
        }
        tempo = t.tempo;
      }
      return Math.max(0, seconds + (tick - at) / beatTicks * (60 / tempo));
    }
    /**
     * A MIDI clip's table (facts 39-41): apply `rows` and push the matching delta, exactly as
     * LUNA does — the stored property stays the whole table, so a `get` answers the table
     * while subscribers see only the delta.
     *
     * `added` and `changed` carry rows; `deleted` needs only their `rowid`s. Rows given
     * without a `rowid` get the next free one. Ticks are table ticks.
     *
     * @example
     * engine.midiEdit(clipPath, 'added', [{ tick: 0, status: 0x90, data1: 60, data2: 100 }]);
     * engine.midiEdit(clipPath, 'deleted', [{ rowid: 1 }]);
     */
    midiEdit(clipPath, operation, rows) {
      const table = `${normalize(clipPath)}/midi/table`;
      if (!this.nodes.has(table)) this.addNode(table, { properties: { row_data: EMPTY_MIDI_TABLE() } });
      const stored = decodeMidiTable(this.value(table, "row_data"));
      let next = stored.length ? Math.max(...stored.map((r) => r.rowid)) + 1 : 1;
      const applied = [];
      for (const row of rows) {
        const rowid = row.rowid ?? next++;
        if (operation === "deleted") {
          applied.push({ rowid, tick: 0, status: 0, data1: 0, data2: 0, enabled: true });
          continue;
        }
        const merged = { rowid, tick: row.tick ?? 0, status: row.status ?? 144, data1: row.data1 ?? 60, data2: row.data2 ?? 0, enabled: row.enabled ?? true };
        applied.push(merged);
      }
      const kept = operation === "deleted" ? stored.filter((r) => !applied.some((a) => a.rowid === r.rowid)) : [...stored.filter((r) => !applied.some((a) => a.rowid === r.rowid)), ...applied];
      const node = this.nodes.get(table);
      node?.properties.set("row_data", encodeMidiTable("update", kept));
      this.push({ path: `${table}/row_data/value`, data: operation === "deleted" ? { operation, row_ids: applied.map((r) => r.rowid) } : encodeMidiTable(operation, applied) }, void 0);
    }
    /**
     * Drive a render to a terminal state, the way LUNA's engine would (fact 44). With
     * `percent` only, it reports progress without finishing.
     *
     * @example
     * engine.finishRender(uid, { percent: 50 });
     * engine.finishRender(uid, { state: 'completed' });
     */
    finishRender(uid, options = {}) {
      const path = `/renders/${uid}`;
      if (!this.has(path)) throw new Error(`MockEngine: no render ${uid}`);
      if (options.percent !== void 0) this.setValue(path, "percent_complete", options.percent);
      if (options.error !== void 0) this.setValue(path, "error_message", options.error);
      if (options.state) {
        if (options.state === "completed") this.setValue(path, "percent_complete", 100);
        this.setValue(path, "state", options.state);
      }
      if (options.remove) this.removeNode(path);
    }
    /** @internal The rows of a clip's MIDI table, decoded. */
    midiRows(clipPath) {
      return decodeMidiTable(this.value(`${normalize(clipPath)}/midi/table`, "row_data"));
    }
    /**
     * @internal The rows `selection_notes` names, per clip. The selection holds
     * `[pitch, start, stop, rowid]` in absolute ticks, so rows are matched by rowid and the
     * note-off that terminates each one is included.
     */
    selectedRows(sessionBase) {
      const out = /* @__PURE__ */ new Map();
      const selection = this.value(`${sessionBase}/contexts/main`, "selection_notes");
      if (!Array.isArray(selection)) return out;
      for (const entry of selection) {
        const playlist = entry?.playlist_uid;
        if (!playlist || !Array.isArray(entry.notes)) continue;
        const rowids = new Set(entry.notes.map((n) => n[3]).filter((v) => typeof v === "number"));
        for (const clipUid of this.children(`${sessionBase}/playlists/${playlist}/clips`)) {
          const clip = `${sessionBase}/playlists/${playlist}/clips/${clipUid}`;
          const rows = this.midiRows(clip);
          const picked = [];
          for (const row of rows) {
            if (!rowids.has(row.rowid)) continue;
            picked.push({ ...row, noteOn: true });
            const off = rows.find((r) => r.tick >= row.tick && r.rowid !== row.rowid && r.data1 === row.data1 && ((r.status & 240) === 128 || (r.status & 240) === 144 && r.data2 === 0) && (r.status & 15) === (row.status & 15));
            if (off && !picked.some((p) => p.rowid === off.rowid)) picked.push({ ...off, noteOn: false });
          }
          if (picked.length) out.set(clip, picked);
        }
      }
      return out;
    }
    /** @internal The path of a clip by uid, across every playlist of a session. */
    findClip(sessionBase, clipUid) {
      for (const pl of this.children(`${sessionBase}/playlists`)) {
        const path = `${sessionBase}/playlists/${pl}/clips/${clipUid}`;
        if (this.has(path)) return path;
      }
      return void 0;
    }
    /** Read a property directly (no port involved). */
    value(nodePath, property) {
      return this.nodes.get(normalize(nodePath))?.properties.get(property);
    }
    has(path) {
      return this.nodes.has(normalize(path));
    }
    children(nodePath) {
      return [...this.nodes.get(normalize(nodePath))?.children ?? []];
    }
    /** @internal Uploads between `begin` and `end` (fact 42). */
    imports = /* @__PURE__ */ new Map();
    /** @internal Uploaded content (package and base64) to the source it was filed as, for fact 42's de-duplication. */
    uploaded = /* @__PURE__ */ new Map();
    /**
     * Replace the handler of the command at `path` (for example
     * `/sessions/abc/set_marker`), to reproduce a verb that answers without acting (fact 71).
     *
     * @example
     * engine.overrideCommand('/sessions/abc/delete_clip', () => null);
     */
    overrideCommand(path, handler) {
      const { node: nodePath, name } = splitPath(normalize(path));
      const node = this.nodes.get(nodePath);
      if (!node || !node.commands.has(name)) throw new UAError("uasrv.invalid_object", `overrideCommand: no command at ${path}`, { path });
      node.commands.set(name, handler);
    }
    /** Make the next `times` requests on `path` fail with `code`. */
    fail(path, code, times = 1) {
      this.faults.set(normalize(path), { code, remaining: times });
    }
    /**
     * Convenience: a session shaped like LUNA's, with a transport, a master bus, named tracks
     * (each with `outputs/main/controls/{gain,pan,mute}`, `controls/solo`, a meter and one
     * playlist), and the session-level commands the SDK uses.
     */
    addSession(uid, options = {}) {
      const base = `/sessions/${uid}`;
      const pkg = options.packageUid ?? `pkg_${uid}`;
      const sessionCommands = {
        new_track: (data, engine) => {
          const body = data ?? {};
          if (body.track_type === "bus") {
            const id2 = `bus${engine.children(`${base}/buses`).length + 1}`;
            engine.addBus(uid, id2, { name: body.name ?? "Bus", busType: "aux", stemFormat: body.stem_format ?? "stereo" });
            return { uid: id2 };
          }
          const id = `t${engine.children(`${base}/tracks`).length + 1}`;
          engine.addTrack(uid, id, { name: body.name ?? "Untitled", trackType: body.track_type ?? "audio", stemFormat: body.stem_format ?? "mono" });
          return { track_uid: id };
        },
        delete_tracks: (data, engine) => {
          const body = data ?? {};
          const ids = Array.isArray(body.track_uid) ? body.track_uid : body.track_uid ? [body.track_uid] : [];
          for (const id of ids) {
            if (engine.has(`${base}/buses/${id}`)) {
              engine.removeNode(`${base}/buses/${id}`);
              engine.danglingAssignments(uid, id);
            } else engine.removeNode(`${base}/tracks/${id}`);
          }
          return { deleted_channels: ids };
        },
        duplicate_tracks: (data, engine) => {
          const body = data ?? {};
          const out = [];
          for (const id of body.track_uid ?? []) {
            const copy = `${id}_copy`;
            engine.addTrack(uid, copy, { name: `${String(engine.value(`${base}/tracks/${id}`, "name"))} copy` });
            out.push(copy);
          }
          return { duplicated_channels: out.map((id) => ({ channel_id: id })) };
        },
        begin_transaction: (_d, engine) => {
          engine.transactions.push("begin");
          return null;
        },
        commit_transaction: (_d, engine) => {
          engine.transactions.push("commit");
          return null;
        },
        abort_transaction: (_d, engine) => {
          engine.transactions.push("abort");
          return null;
        },
        undo: () => ({ did_undo: true }),
        redo: () => ({ did_redo: true }),
        save_session: () => null,
        // While playing, 'now' restarts from the play start; next_bar and loop_end defer, and
        // stopped it does nothing (fact 90). The mock applies 'now' only.
        sync_playback: (data, engine) => {
          const body = data ?? {};
          const path = `/sessions/${body.session_uid}`;
          if (engine.value(path, "playing") === true && !body.next_bar && !body.loop_end) engine.setValue(path, "location", engine.locationAt(path, Number(engine.value(path, "play_start") ?? 0)));
          return null;
        },
        import_files: () => null,
        export_session: (data, engine) => {
          const body = data ?? {};
          const uid2 = `export_${engine.children("/renders").length + 1}`;
          const name = body.bounce_name ?? "Export";
          engine.addNode(`/renders/${uid2}`, {
            properties: {
              uid: uid2,
              name,
              type: "export",
              session_uid: body.session_uid ?? "",
              state: "running",
              percent_complete: 0,
              error_message: null,
              render_is_offline: body.realtime !== true,
              time_remaining: body.realtime === true ? 0 : void 0,
              total_samples: 0
            }
          });
          return { render_uid: uid2, file: `/exports/${name} - MAIN.wav` };
        },
        insert_clip: (data, engine) => {
          const body = data ?? {};
          const playlist = body.playlist_uid ?? (body.track_uid ? String(engine.value(`${base}/tracks/${body.track_uid}`, "playlist_uid")) : void 0);
          if (!playlist) throw new UAError("uasrv.invalid_object", "insert_clip: no playlist", { cmd: "post", path: `${base}/insert_clip` });
          const id = `clip${engine.children(`${base}/playlists/${playlist}/clips`).length + 1}`;
          engine.addNode(`${base}/playlists/${playlist}/clips/${id}`, {
            properties: { uid: id, name: body.name ?? "Clip", start: body.start ?? 0, stop: body.stop ?? 0, source_uid: body.source_uid ?? "", source_start: body.source_start ?? 0, source_stop: body.source_stop ?? 0, clip_type: body.clip_type ?? 0, gain: 0, bypass: false, midi_source_start: 0, layer: 0, mute: false }
          });
          if (body.clip_type === 2) engine.addNode(`${base}/playlists/${playlist}/clips/${id}/midi/table`, { properties: { row_data: EMPTY_MIDI_TABLE() } });
          return { uid: id };
        },
        delete_clip: (data, engine) => {
          const body = data ?? {};
          for (const pl of engine.children(`${base}/playlists`)) {
            if (engine.has(`${base}/playlists/${pl}/clips/${body.uid}`)) engine.removeNode(`${base}/playlists/${pl}/clips/${body.uid}`);
          }
          return null;
        },
        bring_to_front: () => null,
        send_to_back: () => null,
        new_playlists: (data, engine) => {
          const body = data ?? {};
          for (const t of body.track_uid ?? []) {
            const n = engine.children(`${base}/playlists`).filter((p) => engine.value(`${base}/playlists/${p}`, "track_uid") === t).length + 1;
            engine.addNode(`${base}/playlists/pl_${t}_${n}`, { properties: { uid: `pl_${t}_${n}`, name: `V${n}`, track_uid: t, version: n, stem_format: "mono", frozen: false } });
            engine.addNode(`${base}/playlists/pl_${t}_${n}/clips`);
          }
          return null;
        },
        set_playlists: () => null,
        set_inserts: (data, engine) => {
          const body = data ?? {};
          const channel = engine.has(`${base}/tracks/${body.channel_uid}`) ? `${base}/tracks/${body.channel_uid}` : `${base}/buses/${body.channel_uid}`;
          for (const ins of body.inserts ?? []) {
            const slot = ins.insert_type ?? `effect_${ins.index ?? 0}`;
            const path = `${channel}/effects/${slot}`;
            if (!engine.has(path)) throw new UAError("uasrv.invalid_object", `set_inserts: no slot ${slot}`, { cmd: "post", path: `${base}/set_inserts` });
            const empty = !ins.plugin_id;
            const known = !empty && engine.has(`/plugins/${ins.plugin_id}`);
            engine.setValue(path, "plugin_id", empty ? null : ins.plugin_id);
            engine.setValue(path, "plugin_name", null);
            if (!empty && ins.preset_name !== void 0) engine.setValue(path, "preset_name", ins.preset_name);
            if (!empty && ins.preset_uid !== void 0) {
              engine.setValue(path, "preset_uid", ins.preset_uid);
              const preset = `/presets/plugins/${ins.plugin_id}/presets/${ins.preset_uid}`;
              if (engine.has(preset)) engine.setValue(path, "preset_name", engine.value(preset, "preset_name"));
            }
            engine.setValue(path, "plugin_error", empty || known ? null : "mixer.missing_plug-in");
            engine.setValue(path, "external_sdk_instance_id", known ? engine.nextRow() : null);
            if (empty || !known) {
              engine.setValue(path, "bypass_control", null);
              for (const c of engine.children(`${path}/controls`)) {
                engine.setValue(`${path}/controls/${c}`, "initialized", null);
                engine.setValue(`${path}/controls/${c}`, "normalized_value", null);
              }
            } else {
              engine.setValue(path, "bypass_control", "bypass");
              engine.setValue(path, "bypass_control_active_low", false);
              engine.addControl(`${path}/controls/bypass`, "parameter", { discrete: true, value: 1, real: true, str: "in", automatable: true });
              engine.addControl(`${path}/controls/input`, "parameter", { discrete: false, value: 0.5, real: 0, str: "0.0", automatable: true, normalized: 0.5 });
            }
          }
          return null;
        },
        set_tempo: (data, engine) => {
          const body = data ?? {};
          const tick = body.tick ?? 0;
          const existing = engine.children(`${base}/tempo_map`).find((id) => engine.value(`${base}/tempo_map/${id}`, "tick") === tick);
          if (existing) engine.setValue(`${base}/tempo_map/${existing}`, "tempo", body.tempo ?? 120);
          else engine.addNode(`${base}/tempo_map/${engine.children(`${base}/tempo_map`).length + 1}`, { properties: { tick, time: 0, tempo: body.tempo ?? 120 } });
          return { tempo: body.tempo, position_ticks: tick };
        },
        delete_tempo: (data, engine) => {
          const body = data ?? {};
          for (const id of engine.children(`${base}/tempo_map`)) if (engine.value(`${base}/tempo_map/${id}`, "tick") === body.tick && body.tick !== 0) engine.removeNode(`${base}/tempo_map/${id}`);
          return null;
        },
        set_time_signature: (data, engine) => {
          const body = data ?? {};
          const id = engine.children(`${base}/time_signatures`).length + 1;
          engine.addNode(`${base}/time_signatures/${id}`, { properties: { tick: 0, bar: body.bar ?? 1, partial: false, numerator: body.numerator ?? 4, denominator: body.denominator ?? 4 } });
          return null;
        },
        set_key_signature: () => null,
        set_automode_on_tracks: (data, engine) => {
          const body = data ?? {};
          const names = ["off", "read", "write", "touch", "latch"];
          for (const t of body.tracks ?? []) if (engine.has(`${base}/tracks/${t}`)) engine.setValue(`${base}/tracks/${t}`, "automation_mode", names[body.automation_mode ?? 1] ?? "read");
          return null;
        },
        insert_bp: (data, engine) => {
          const body = data ?? {};
          const ctl = engine.controlPathByUid(body.control_uid ?? "");
          if (!ctl) throw new UAError("uasrv.invalid_object", "insert_bp: unknown control", { cmd: "post", path: `${base}/insert_bp` });
          if (body.start !== void 0 && body.stop !== void 0) {
            for (const id of engine.children(`${ctl}/automation`)) {
              const t = Number(engine.value(`${ctl}/automation/${id}`, "start"));
              if (t >= body.start && t <= body.stop) engine.removeNode(`${ctl}/automation/${id}`);
            }
          }
          for (const v of body.values ?? []) engine.addNode(`${ctl}/automation/${engine.nextRow()}`, { properties: { start: v.location, value: wireFloat(v.value) } });
          return null;
        },
        delete_bp: (data, engine) => {
          const body = data ?? {};
          const ctl = engine.controlPathByUid(body.control_uid ?? "");
          if (!ctl) return null;
          for (const id of engine.children(`${ctl}/automation`)) {
            const t = Number(engine.value(`${ctl}/automation/${id}`, "start"));
            if (t === body.start || body.stop !== void 0 && t >= (body.start ?? 0) && t <= body.stop) engine.removeNode(`${ctl}/automation/${id}`);
          }
          return null;
        },
        move_bp: (data, engine) => {
          const body = data ?? {};
          const ctl = engine.controlPathByUid(body.control_uid ?? "");
          if (!ctl) return null;
          for (const id of engine.children(`${ctl}/automation`)) {
            const path = `${ctl}/automation/${id}`;
            if (Number(engine.value(path, "start")) === body.location) {
              engine.setValue(path, "start", body.new_location ?? body.location);
              break;
            }
          }
          return null;
        },
        trim_bp: (data, engine) => {
          const body = data ?? {};
          const ctl = engine.controlPathByUid(body.control_uid ?? "");
          if (!ctl) return null;
          for (const id of engine.children(`${ctl}/automation`)) {
            const path = `${ctl}/automation/${id}`;
            if (Number(engine.value(path, "start")) === body.location) {
              engine.setValue(path, "value", wireFloat(body.value));
              break;
            }
          }
          return null;
        },
        /**
         * Routing, as measured (facts 43, 83): LUNA **appends**; each destination is a row of the
         * output's `assignments` (`value` is the bus uid) and an `assignment_objects/<uid>` node,
         * whose uid is the handle for deletion. The output's own `bus_uid` stays null.
         */
        new_output_assignment: (data, engine) => {
          const body = data ?? {};
          const cmdPath = `${base}/new_output_assignment`;
          const channel = body.track_uid !== void 0 ? `${base}/tracks/${body.track_uid}` : `${base}/buses/${body.bus_src_uid}`;
          const outputType = body.output_type ?? "main";
          const bus = `${base}/buses/${body.bus_uid}`;
          if (body.bus_src_uid !== void 0 && String(engine.value(channel, "bus_type") ?? "").startsWith("cue_")) {
            throw new UAError("device.database_error", "new_output_assignment: a cue bus cannot be a source", { cmd: "post", path: cmdPath });
          }
          if (!engine.has(channel) || !engine.has(bus) || outputType.startsWith("cue_") || !engine.has(`${channel}/outputs/${outputType}`)) {
            throw new UAError("uasrv.invalid_type", "new_output_assignment: uasrv.invalid_type", { cmd: "post", path: cmdPath });
          }
          return { uid: engine.addAssignment(`${channel}/outputs/${outputType}`, String(body.bus_uid), bus) };
        },
        delete_output_assignment: (data, engine) => {
          const body = data ?? {};
          const cmdPath = `${base}/delete_output_assignment`;
          const target = String(body.uid ?? "");
          for (const kind of ["tracks", "buses"]) {
            for (const ch of engine.children(`${base}/${kind}`)) {
              if (ch === target) throw new UAError("device.database_error", "delete_output_assignment: a channel uid is not an assignment", { cmd: "post", path: cmdPath });
              for (const out of engine.children(`${base}/${kind}/${ch}/outputs`)) {
                const output = `${base}/${kind}/${ch}/outputs/${out}`;
                if (engine.children(`${output}/assignment_objects`).includes(target)) {
                  engine.removeAssignment(output, target);
                  return null;
                }
              }
            }
          }
          throw new UAError("uasrv.invalid_type", "delete_output_assignment: uasrv.invalid_type", { cmd: "post", path: cmdPath });
        },
        /** Moves the routing under new assignment uids and copies the slot's control values; the source keeps its values (fact 83). */
        move_send: (data, engine) => {
          const body = data ?? {};
          const find = (channelUid, out) => {
            for (const kind of ["tracks", "buses"]) {
              const path = `${base}/${kind}/${channelUid}/outputs/${out}`;
              if (engine.has(path)) return path;
            }
            return void 0;
          };
          const from = find(body.source_uid ?? "", body.source ?? "");
          const to = find(body.destination_uid ?? "", body.destination ?? "");
          if (!from || !to) throw new UAError("uasrv.invalid_object", "move_send: no such send", { cmd: "post", path: `${base}/move_send` });
          const rows = engine.value(from, "assignments") ?? [];
          for (const row of rows) if (row.value) engine.addAssignment(to, row.value, `${base}/buses/${row.value}`);
          for (const name of engine.children(`${from}/controls`)) {
            if (engine.has(`${to}/controls/${name}`)) for (const prop of ["value", "real_value", "normalized_value", "string_value"]) engine.setValue(`${to}/controls/${name}`, prop, engine.value(`${from}/controls/${name}`, prop));
          }
          if (body.copy !== true) for (const uid2 of [...engine.children(`${from}/assignment_objects`)]) engine.removeAssignment(from, uid2);
          return null;
        },
        add_midi: (data, engine) => {
          const body = data ?? {};
          for (const [clipUid, rows] of groupByClip(body.midi ?? [])) {
            const path = engine.findClip(base, clipUid);
            if (!path) continue;
            engine.midiEdit(
              path,
              "added",
              rows.map((r) => ({ tick: r.tick ?? 0, status: r.byte_0 ?? 144, data1: r.byte_1 ?? 60, data2: r.byte_2 ?? 0 }))
            );
          }
          return null;
        },
        move_clips: () => null,
        set_bar_one: () => null,
        set_marker: (data, engine) => {
          const body = data ?? {};
          if (body.rowid !== void 0 && !engine.has(`${base}/markers/${body.rowid}`)) return null;
          const id = body.rowid ?? engine.nextRow();
          const path = `${base}/markers/${id}`;
          if (engine.has(path)) {
            if (body.name !== void 0) engine.setValue(path, "name", body.name);
            if (body.location !== void 0) engine.setValue(path, "location", body.location);
            if (body.color !== void 0) engine.setValue(path, "color", body.color);
            if (body.comments !== void 0) engine.setValue(path, "comments", body.comments);
          } else {
            engine.addNode(path, { properties: { rowid: id, location: body.location ?? 0, name: body.name ?? "Marker", color: body.color ?? 0, comments: body.comments ?? "" } });
          }
          return { rowid: id };
        },
        delete_marker: (data, engine) => {
          const body = data ?? {};
          engine.removeNode(`${base}/markers/${body.rowid}`);
          return null;
        },
        set_chord: (data, engine) => {
          const body = data ?? {};
          if (body.rowid !== void 0) {
            const path = `${base}/chords/${body.rowid}`;
            if (!engine.has(path)) throw new UAError("device.database_error", "set_chord: no such rowid", { cmd: "post", path: `${base}/set_chord` });
            if (body.location !== void 0) {
              const occupant = engine.chordAt(uid, body.location);
              if (occupant !== void 0) engine.removeNode(`${base}/chords/${occupant}`);
              if (engine.has(path)) engine.setValue(path, "location", body.location);
            }
            if (body.name) engine.setValue(path, "name", normalizeChordName(body.name));
            return null;
          }
          if (body.location === void 0) throw new UAError("uasrv.missing_field", "set_chord: location is required to add a chord", { cmd: "post", path: `${base}/set_chord` });
          engine.addChord(uid, body.location, body.name ?? "");
          return null;
        },
        delete_chord: (data, engine) => {
          const body = data ?? {};
          const rows = body.all === true ? engine.children(`${base}/chords`) : body.rowid !== void 0 ? [String(body.rowid)] : body.location !== void 0 ? [engine.chordAt(uid, body.location)].filter((r) => r !== void 0) : void 0;
          if (!rows) throw new UAError("uasrv.missing_field", "delete_chord: rowid, location or all is required", { cmd: "post", path: `${base}/delete_chord` });
          for (const row of rows) engine.removeNode(`${base}/chords/${row}`);
          return null;
        }
      };
      this.addNode(base, {
        properties: {
          uid,
          name: options.name ?? uid,
          loaded: true,
          read_only: false,
          session_package_uid: pkg,
          session_package_path: `/tmp/${uid}.luna`,
          can_undo: false,
          can_redo: false,
          change_count: 0,
          solo_mode: "latch",
          tempo_established: false,
          command_status: null,
          command_percent_complete: 0,
          playing: false,
          record_enabled: false,
          looping: false,
          play_start: 0,
          loop_start: 0,
          arrangement_start: 0,
          arrangement_end: -1,
          loop_stop: 0,
          location: { tick: 0, bar_beat: { bar: 1, beat: 1, tick: 0 }, min_sec: { minutes: 0, seconds: 0 }, tempo: 120, time_signature: { numerator: 4, denominator: 4 }, playing: false },
          counting_in: false,
          punched_in: false,
          max_tick: 0,
          tempo_percent: 100,
          rec_play_mode: "normal",
          count_in_enabled: false,
          pre_roll_enabled: false,
          post_roll_enabled: false
        },
        readOnly: ["uid", "loaded", "session_package_uid", "can_undo", "can_redo", "change_count", "location"],
        commands: sessionCommands
      });
      this.addNode(`${base}/tracks`);
      this.addNode(`${base}/playlists`);
      this.addNode(`${base}/buses`);
      this.addNode(`${base}/contexts/main`, {
        properties: { context_type: "main", focus: "tracks", selection_start: null, selection_stop: null, selection_tracks: null, selection_playlists: null, selection_notes: null, last_selected_track: null, pixels_per_tick: 1e-10, grid_enable: true, grid: "1_4", settings: "{}" }
      });
      this.addNode(`${base}/contexts/main/commands`, {
        commands: {
          set_inserts_in_out: (data, engine) => {
            const body = data ?? {};
            const channel = engine.has(`${base}/tracks/${body.channel_uid}`) ? `${base}/tracks/${body.channel_uid}` : `${base}/buses/${body.channel_uid}`;
            for (const slot of body.inserts ?? []) {
              const ctl = engine.value(`${channel}/effects/${slot}`, "bypass_control");
              if (typeof ctl === "string" && ctl) engine.setValue(`${channel}/effects/${slot}/controls/${ctl}`, "value", body.value ? 1 : 0);
            }
            return null;
          },
          /** A command of the edit context, not of the session. */
          trim_clip: (data, engine) => {
            const body = data ?? {};
            const path = engine.findClip(base, body.clip_uid ?? "");
            if (!path) return null;
            if (body.start !== void 0) engine.setValue(path, "start", body.start);
            if (body.stop !== void 0) engine.setValue(path, "stop", body.stop);
            return null;
          },
          select_all: () => null,
          copy: () => null,
          cut: () => null,
          paste: () => null,
          duplicate: () => null,
          /**
           * Acts on `selection_notes`, not on a clip (fact 74): deletes the selected note-on
           * rows and the note-offs that terminate them.
           */
          clear: (_d, engine) => {
            for (const [clip, rows] of engine.selectedRows(base)) engine.midiEdit(clip, "deleted", rows.map((r) => ({ rowid: r.rowid })));
            return null;
          },
          /** A toggle over the selection (fact 74): flips `enabled` on each selected note-on row. */
          mute_notes: (_d, engine) => {
            for (const [clip, rows] of engine.selectedRows(base)) {
              engine.midiEdit(
                clip,
                "changed",
                rows.filter((r) => r.noteOn).map((r) => ({ rowid: r.rowid, tick: r.tick, status: r.status, data1: r.data1, data2: r.data2, enabled: !r.enabled }))
              );
            }
            return null;
          },
          /**
           * Writes notes onto a playlist, making the MIDI clip to hold them if there is none
           * there, and then **selects** what it made: that is where the caller reads the new
           * row ids from (fact 74).
           */
          create_note: (data, engine) => {
            const body = data ?? {};
            const playlist = body.playlist_uid;
            if (!playlist || !engine.has(`${base}/playlists/${playlist}`)) throw new UAError("uasrv.invalid_object", "create_note: no such playlist", { cmd: "post", path: `${base}/create_note` });
            const notes = body.notes ?? (body.note !== void 0 ? [{ note: body.note, start: body.start, stop: body.stop, velocity: body.velocity }] : []);
            if (!notes.length) return null;
            const span = { start: Math.min(...notes.map((n) => n.start ?? 0)), stop: Math.max(...notes.map((n) => n.stop ?? 0)) };
            let clipUid = engine.children(`${base}/playlists/${playlist}/clips`).find((uid2) => engine.value(`${base}/playlists/${playlist}/clips/${uid2}`, "clip_type") === 2);
            if (!clipUid) {
              clipUid = `midi${engine.children(`${base}/playlists/${playlist}/clips`).length + 1}`;
              engine.addNode(`${base}/playlists/${playlist}/clips/${clipUid}`, {
                properties: { uid: clipUid, name: "MIDI", start: span.start, stop: span.stop, source_uid: "", source_start: 0, source_stop: 0, clip_type: 2, gain: 0, bypass: false, render_source_uid: null, render_state: "none", midi_source_start: 0 }
              });
              engine.addNode(`${base}/playlists/${playlist}/clips/${clipUid}/midi/table`, { properties: { row_data: EMPTY_MIDI_TABLE() } });
            }
            const clipPath = `${base}/playlists/${playlist}/clips/${clipUid}`;
            const origin = Number(engine.value(clipPath, "midi_source_start") ?? 0);
            const before = new Set(engine.midiRows(clipPath).map((r) => r.rowid));
            engine.midiEdit(
              clipPath,
              "added",
              notes.flatMap((n) => [
                { tick: (n.start ?? 0) + origin, status: 144, data1: n.note ?? 60, data2: n.velocity_on ?? n.velocity ?? 100 },
                { tick: (n.stop ?? 0) + origin, status: 128, data1: n.note ?? 60, data2: n.velocity_off ?? 0 }
              ])
            );
            const added = engine.midiRows(clipPath).filter((r) => !before.has(r.rowid) && (r.status & 240) === 144 && r.data2 > 0);
            engine.setValue(`${base}/contexts/main`, "focus", "notes");
            engine.setValue(`${base}/contexts/main`, "selection_playlists", [playlist]);
            engine.setValue(`${base}/contexts/main`, "selection_start", span.start);
            engine.setValue(`${base}/contexts/main`, "selection_stop", span.stop);
            engine.setValue(`${base}/contexts/main`, "selection_notes", [
              { playlist_uid: playlist, notes: added.map((r) => [r.data1, r.tick - origin, r.tick - origin, r.rowid]) }
            ]);
            return null;
          },
          /** Addresses rows by rowid, unlike the other two (fact 74). */
          change_velocity: (data, engine) => {
            const body = data ?? {};
            const wanted = /* @__PURE__ */ new Map();
            for (const n of body.notes ?? []) if (typeof n.rowid === "number") wanted.set(n.rowid, n.velocity ?? 0);
            for (const pl of engine.children(`${base}/playlists`)) {
              for (const clipUid of engine.children(`${base}/playlists/${pl}/clips`)) {
                const clip = `${base}/playlists/${pl}/clips/${clipUid}`;
                const rows = engine.midiRows(clip).filter((r) => wanted.has(r.rowid));
                if (rows.length) engine.midiEdit(clip, "changed", rows.map((r) => ({ ...r, data2: wanted.get(r.rowid) })));
              }
            }
            return null;
          },
          nudge: () => null,
          separate_clips: () => null,
          consolidate: () => null,
          mute_clips: () => null
        }
      });
      this.addNode(`${base}/tempo_map/1`, { properties: { tick: 0, time: 0, tempo: 120 } });
      this.addNode(`${base}/time_signatures/1`, { properties: { tick: 0, bar: 1, partial: false, numerator: 4, denominator: 4 } });
      this.addNode(`${base}/key_signatures`);
      this.addNode(`${base}/markers`);
      this.addNode(`${base}/chords`);
      this.addPackage(pkg, { name: options.name ?? uid, lastOpened: Date.now() });
      for (let i = 0; i < 4; i++) this.addBus(uid, `cue${i + 1}_${uid}`, { name: `CUE ${i + 1}`, busType: `cue_${i}`, stemFormat: "stereo" });
      this.addBus(uid, `master_${uid}`, { name: "Main Output", busType: "master", stemFormat: "stereo", color: 4294948970 });
      this.addNode(`/workspace/sessions/${pkg}/audio`);
      for (const name of options.tracks ?? []) this.addTrack(uid, name, { name });
      if (options.focused ?? true) this.setValue("/sessions", "focused_session", uid);
    }
    /** Add a track with the standard control layout and one playlist. */
    addTrack(sessionUid, id, options = {}) {
      const base = `/sessions/${sessionUid}`;
      const order = this.children(`${base}/tracks`).length;
      const playlist = `pl_${id}_1`;
      this.addChannel(
        `${base}/tracks/${id}`,
        {
          uid: id,
          name: options.name ?? id,
          track_type: options.trackType ?? "audio",
          io_type: "mono",
          stem_format: options.stemFormat ?? "mono",
          order,
          color: 4278190335,
          comments: "",
          automation_mode: "read",
          folder_uid: null,
          frozen: false,
          enabled: true,
          record_enabled: false,
          input_monitor: false,
          input_monitor_state: false,
          input_monitor_source: "node",
          input_desc: null,
          input_node_uid: null,
          playlist_uid: playlist,
          has_preamp: false,
          record_mute: false
        },
        options.stemFormat === "stereo"
      );
      this.routeCues(sessionUid, `${base}/tracks/${id}`);
      this.addNode(`${base}/playlists/${playlist}`, { properties: { uid: playlist, name: "V1", track_uid: id, version: 1, stem_format: options.stemFormat ?? "mono", frozen: false } });
      this.addNode(`${base}/playlists/${playlist}/clips`);
    }
    /**
     * Add a source audio file to a session package's workspace folder. With `analysis`, it also
     * carries a fine and a coarse overview, sized from its length the way LUNA's is: one fine
     * pair per 125 samples at 48 kHz, one coarse pair per twelve fine (fact 72).
     */
    addSource(packageUid, uid, options = {}) {
      const path = `/workspace/sessions/${packageUid}/audio/${uid}`;
      const lengthNs = options.lengthNs ?? 1e9;
      const channels = options.stemFormat === "stereo" ? 2 : 1;
      this.addNode(path, {
        properties: { uid, name: options.name ?? `${uid}.wav`, stem_format: options.stemFormat ?? "mono", length: lengthNs, sample_rate: options.sampleRate ?? 48e3 }
      });
      if (options.analysis === false) return;
      for (const [kind, pairNs2] of [
        ["overview", 125e9 / 48e3],
        ["overview_coarse", 125e9 / 48e3 * 12]
      ]) {
        const count = Math.max(1, Math.floor(lengthNs / pairNs2));
        this.addNode(`${path}/analysis/${kind}`, { properties: { count, md5: `md5-${uid}-${kind}` } });
        this.addNode(`${path}/analysis/${kind}/file`, { properties: { data: { count, channels } } });
      }
    }
    /**
     * Add a hardware device with `inputs` named inputs, the shape `luna.audioInputs()` reads
     * (fact 76).
     *
     * @example
     * engine.addDevice('Apollo', { inputs: ['In 1', 'In 2'] });
     */
    addDevice(id, options = {}) {
      const path = `/devices/${id}`;
      this.addNode(path, { properties: { name: id, device_type: "audio", online: options.online ?? true, sample_rate: 48e3, clock_source: "internal" } });
      this.addNode(`${path}/inputs`);
      (options.inputs ?? []).forEach((name, i) => {
        this.addNode(`${path}/inputs/in_${i + 1}`, { properties: { name, stem_format: options.stemFormat ?? "mono", device_id: id, in_use: false } });
      });
    }
    /**
     * Finish a record pass the way LUNA does: punch in, then on the caller's stop drop a
     * finalized take clip on the track's active playlist with a source to match (fact 75).
     *
     * @example
     * engine.onRecord(({ sessionUid, trackUid }) => engine.finishTake(sessionUid, trackUid, { startTick: 0, stopTick: Luna.WHOLE_NOTE }));
     */
    finishTake(sessionUid, trackUid, options = {}) {
      const base = `/sessions/${sessionUid}`;
      const playlist = String(this.value(`${base}/tracks/${trackUid}`, "playlist_uid"));
      const pkg = String(this.value(base, "session_package_uid"));
      const n = this.children(`${base}/playlists/${playlist}/clips`).length + 1;
      const clipUid = `take${n}`;
      const sourceUid = `src_${clipUid}`;
      const startTick = options.startTick ?? 0;
      const stopTick = options.stopTick ?? startTick + 96e9 * 4;
      this.addSource(pkg, sourceUid, { name: `${options.name ?? "Take"}.wav`, lengthNs: (stopTick - startTick) / 96e9 * 5e8 });
      this.addNode(`${base}/playlists/${playlist}/clips/${clipUid}`, {
        properties: {
          uid: clipUid,
          name: options.name ?? `Take ${n}`,
          start: startTick,
          stop: stopTick,
          source_uid: sourceUid,
          source_start: 0,
          source_stop: (stopTick - startTick) / 96e9 * 5e8,
          clip_type: 0,
          gain: 0,
          bypass: false,
          render_source_uid: null,
          render_state: "none",
          midi_source_start: 0
        }
      });
      return clipUid;
    }
    /**
     * Put a chord on a session's Chord ruler, as a user typing one in LUNA would: it replaces
     * any chord at `tick`, and `♭`/`♯` are stored as `b`/`#` (fact 100). Returns the rowid.
     *
     * @example engine.addChord('abc', 0, 'Am7');
     */
    addChord(sessionUid, tick, name) {
      const base = `/sessions/${sessionUid}/chords`;
      const existing = this.chordAt(sessionUid, tick);
      if (existing !== void 0) this.removeNode(`${base}/${existing}`);
      const rowid = this.nextRow();
      this.addNode(`${base}/${rowid}`, { properties: { rowid, location: tick, name: normalizeChordName(name) } });
      return rowid;
    }
    /** @internal The rowid of the chord at `tick`, if any. */
    chordAt(sessionUid, tick) {
      const base = `/sessions/${sessionUid}/chords`;
      return this.children(base).find((row) => this.value(`${base}/${row}`, "location") === tick);
    }
    /**
     * Add a bus. `busType` is `aux`, `master` or `cue_0`..`cue_3`; cue buses have only a main
     * output (fact 83). Orders after everything already in the session.
     */
    addBus(sessionUid, id, options = {}) {
      const base = `/sessions/${sessionUid}`;
      const busType = options.busType ?? "aux";
      const stereo = (options.stemFormat ?? "stereo") === "stereo";
      const order = this.children(`${base}/buses`).length;
      this.addChannel(
        `${base}/buses/${id}`,
        { uid: id, name: options.name ?? id, bus_type: busType, order, stem_format: options.stemFormat ?? "stereo", color: options.color ?? 4282400832, folder_mode: "none", folder_uid: null, automation_mode: "read", frozen: false, enabled: true, comments: "" },
        stereo,
        !busType.startsWith("cue_")
      );
      if (!busType.startsWith("cue_")) this.routeCues(sessionUid, `${base}/buses/${id}`);
    }
    /** LUNA routes a new channel's cue outputs to CUE 1-4 (fact 83). */
    routeCues(sessionUid, channel) {
      const base = `/sessions/${sessionUid}`;
      for (const bus of this.children(`${base}/buses`)) {
        const busType = String(this.value(`${base}/buses/${bus}`, "bus_type") ?? "");
        const out = `${channel}/outputs/${busType}`;
        if (busType.startsWith("cue_") && this.has(out)) this.addAssignment(out, bus, `${base}/buses/${bus}`);
      }
    }
    /**
     * The standard strip: `controls/solo`, a main output, and (unless `slots` is false) eight
     * sends and four cue outputs. Pan is `pan` on a mono channel and `pan_left`/`pan_right` on
     * a stereo one, on the main output and on every send alike (fact 84).
     */
    addChannel(path, properties, stereo, slots = true) {
      const pans = stereo ? ["pan_left", "pan_right"] : ["pan"];
      this.addNode(path, { properties, readOnly: ["uid", "order", "track_type", "bus_type", "io_type", "folder_uid", "playlist_uid", "input_monitor_state"] });
      this.addNode(`${path}/controls`);
      this.addControl(`${path}/controls/solo`, "solo", { discrete: true, value: 0, real: false, str: "false", automatable: false });
      const outputs = ["main", ...slots ? [...Array.from({ length: 8 }, (_, i) => `send_${i}`), ...Array.from({ length: 4 }, (_, i) => `cue_${i}`)] : []];
      for (const out of outputs) {
        const main = out === "main";
        this.addNode(`${path}/outputs/${out}`, { properties: { uid: `${path}_${out}`, output_type: out, bus_uid: null, assignments: main ? [{ value: "out12", name: "OUTPUT 1-2", stem_format: "stereo" }] : [] } });
        this.addNode(`${path}/outputs/${out}/controls`);
        this.addNode(`${path}/outputs/${out}/assignment_objects`);
        const names = main ? ["gain", ...pans, "mute", "gain_trim"] : ["gain", ...pans, "mute", "pre_fader", "enabled", "gain_trim"];
        for (const name of names) {
          const isSwitch = name === "mute" || name === "pre_fader" || name === "enabled";
          const isPan = name.startsWith("pan");
          this.addControl(`${path}/outputs/${out}/controls/${name}`, name, isSwitch ? { discrete: true, value: 0, real: false, str: "false", automatable: true } : { discrete: false, value: 0, real: 0, str: isPan ? "C" : "0.0", automatable: true, normalized: isPan ? 0.5 : 0.78 });
        }
        this.addNode(`${path}/outputs/${out}/meters/level`, { properties: { type: "meter", name: "Level", enabled: true, num_streams: stereo ? 2 : 1, level: stereo ? [0, 0] : [0], peak: stereo ? [0, 0] : [0], clip: stereo ? [0, 0] : [0] } });
      }
      this.addNode(`${path}/effects`);
      for (const slot of ["tape", "console", "reserved_0", ...Array.from({ length: 8 }, (_, i) => `effect_${i}`), "sidechain_filter", ...Array.from({ length: 4 }, (_, i) => `record_fx_${i}`)]) {
        this.addNode(`${path}/effects/${slot}`, {
          properties: { uid: `${path}_${slot}`, insert_type: slot, plugin_id: null, plugin_name: null, external_sdk_instance_id: null, bypass_control: null, bypass_control_active_low: null, enabled: true, plugin_power: true, preset_name: null, preset_uid: null, preset_uid_dirty: false, frozen: false, sidechain_allowed: false, sidechain_in_use: false, plugin_error: null, plugin_license_error: null },
          readOnly: ["uid", "insert_type", "plugin_id", "plugin_name"]
        });
        this.addNode(`${path}/effects/${slot}/controls`);
        this.addNode(`${path}/effects/${slot}/commands`, { commands: { preset_browser_increment: () => null, preset_browser_decrement: () => null, preset_browser_toggle: () => null } });
      }
    }
    /** @internal */
    addControl(path, controlType, o) {
      this.addNode(path, {
        properties: {
          uid: `ctl_${path.replaceAll("/", "_")}`,
          name: controlType,
          control_type: controlType,
          value: o.value,
          real_value: o.real,
          normalized_value: o.normalized ?? o.value,
          string_value: o.str,
          automatable: o.automatable,
          discrete: o.discrete,
          num_steps: o.discrete ? 2 : 0,
          initialized: true,
          touch_count: 0,
          real_values: o.discrete ? [false, true] : [],
          string_values: o.discrete ? ["false", "true"] : []
        },
        readOnly: ["uid", "control_type", "automatable", "discrete", "num_steps"],
        commands: {
          set_touch: (data, engine, nodePath) => {
            const touching = Boolean(data?.touch);
            engine.touches.push(`${nodePath}:${touching ? "on" : "off"}`);
            const count = Number(engine.value(nodePath, "touch_count") ?? 0) + (touching ? 1 : -1);
            if (count < 0) throw new UAError("uasrv.invalid_value", "set_touch: control is not touched", { cmd: "post", path: `${nodePath}/set_touch` });
            engine.setValue(nodePath, "touch_count", count);
            return null;
          },
          // The control's default is the value it was created with; LUNA answers the default
          // real value (fact 92).
          set_control_default_value: (_data, engine, nodePath) => {
            const defaults = { value: o.value, real_value: o.real, normalized_value: o.normalized ?? o.value, string_value: o.str };
            for (const [prop, v] of Object.entries(defaults)) if (engine.value(nodePath, prop) !== v) engine.setValue(nodePath, prop, v);
            return o.real;
          }
        }
      });
      this.addNode(`${path}/automation`);
    }
    /**
     * A small ready-made engine: one focused session, `Demo`, with four audio tracks. What a
     * page gets from `?engine=mock` when it defines no `LunaMockSetup`.
     *
     * @example
     * const engine = Luna.MockEngine.demo();
     * const luna = await Luna.connect({ port_: engine.port() });
     */
    static demo(options = {}) {
      const engine = new _MockEngine(options);
      engine.addSession("demo", { name: "Demo", tracks: ["Vocal", "Guitar", "Bass", "Drums"] });
      return engine;
    }
    /** Resolves once every queued push has been delivered. */
    settled() {
      if (this.pendingDeliveries === 0) return Promise.resolve();
      return new Promise((resolve) => this.settleWaiters.push(resolve));
    }
    // ---------------------------------------------------------------------------------------
    // Request handling (called by MockPort)
    // ---------------------------------------------------------------------------------------
    /** @internal */
    handle(from, verb, rawPath, data) {
      this.requests.push({ verb, path: rawPath, data });
      const path = normalize(rawPath);
      const params = parseQuery(rawPath);
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const fault = this.faults.get(path);
          if (fault && fault.remaining > 0) {
            fault.remaining--;
            if (fault.remaining === 0) this.faults.delete(path);
            reject(new UAError(fault.code, `${verb} ${rawPath}: ${fault.code}`, { cmd: verb, path }));
            return;
          }
          try {
            resolve(this.execute(from, verb, path, params, data));
          } catch (err) {
            reject(err);
          }
        }, 0);
      });
    }
    execute(from, verb, path, params, data) {
      switch (verb) {
        case "get":
          return this.get(path, params);
        case "set":
          return this.set(from, path, data instanceof FloatLiteral ? data.value : data);
        case "post":
          return this.post(path, data);
        case "subscribe":
        case "unsubscribe":
          return null;
      }
    }
    get(path, params) {
      if (path === "/ping") return null;
      if (path.endsWith("/file/data") && path.includes("/analysis/")) return { value: this.overviewPage(path, params) };
      const node = this.nodes.get(path);
      if (node) return this.describe(path, node, params, params["recursive"] === "1" ? Infinity : Number(params["levels"] ?? 1));
      const { node: nodePath, name } = splitPath(path);
      const owner = this.nodes.get(nodePath);
      if (owner && owner.properties.has(name)) {
        const value = owner.properties.get(name);
        return params["flatvalue"] === "1" ? value : { value };
      }
      if (name === "value") {
        const inner = splitPath(nodePath);
        const holder = this.nodes.get(inner.node);
        if (holder && holder.properties.has(inner.name)) return holder.properties.get(inner.name);
      }
      return {};
    }
    /**
     * A bounded page of overview pairs, generated rather than stored: `count` int16 min/max
     * pairs per channel, clamped to what the analysis holds. A request past the end answers an
     * empty page, as LUNA's does.
     */
    overviewPage(path, params) {
      const holder = this.nodes.get(splitPath(path).node);
      const info = holder?.properties.get("data");
      if (!info) return void 0;
      const total = info.count ?? 0;
      const channels = info.channels ?? 1;
      const index = Math.max(0, Number(params["index"] ?? 0));
      const want = Math.max(0, Number(params["count"] ?? 1024));
      const n = Math.max(0, Math.min(want, total - index));
      const data = [];
      for (let c = 0; c < channels; c++) {
        const min = [];
        const max = [];
        for (let i = 0; i < n; i++) {
          const amp = Math.round(16384 * Math.abs(Math.sin((index + i) / 32 + c)));
          min.push(-amp);
          max.push(amp);
        }
        data.push({ min, max });
      }
      return { count: n, data };
    }
    describe(path, node, params, levels) {
      const out = {};
      const flat = params["flatvalue"] === "1";
      const filter = params["propfilter"] ? new Set(params["propfilter"].split(",")) : void 0;
      if (params["properties"] !== "0" && node.properties.size > 0) {
        const properties = {};
        for (const [name, value] of node.properties) {
          if (filter && !filter.has(name)) continue;
          properties[name] = flat ? value : { value };
        }
        if (Object.keys(properties).length > 0) out["properties"] = properties;
      }
      if (params["children"] !== "0" && node.children.length > 0) {
        out["children"] = node.children.map((name) => {
          const entry = { path: name };
          if (levels > 1) {
            const child = this.nodes.get(`${path === "/" ? "" : path}/${name}`);
            if (child) Object.assign(entry, this.describe(`${path === "/" ? "" : path}/${name}`, child, params, levels - 1));
          }
          return entry;
        });
      }
      if (params["commands"] !== "0" && node.commands.size > 0) out["commands"] = [...node.commands.keys()].map((name) => ({ path: name }));
      return out;
    }
    set(from, path, data) {
      if (this.nodes.has(path)) {
        throw new UAError("uasrv.invalid_property", `set ${path}: uasrv.invalid_property`, { cmd: "set", path });
      }
      let { node: nodePath, name } = splitPath(path);
      if (name === "value") ({ node: nodePath, name } = splitPath(nodePath));
      const node = this.nodes.get(nodePath);
      if (!node || !node.properties.has(name)) {
        throw new UAError("uasrv.invalid_object", `set ${path}: uasrv.invalid_object`, { cmd: "set", path });
      }
      if (node.readOnly.has(name)) throw new UAError("uasrv.read_only", `set ${path}: uasrv.read_only`, { cmd: "set", path });
      const isTrack = /^\/sessions\/[^/]+\/tracks\/[^/]+$/.test(nodePath);
      if (isTrack && name === "input_monitor" && data === true && this.value("/preferences", "record_mute") === true) {
        throw new UAError("uasrv.invalid_value", `set ${path}: uasrv.invalid_value`, { cmd: "set", path });
      }
      if (node.properties.get("control_type") !== void 0 && CONTROL_VIEWS.has(name)) {
        this.writeControl(nodePath, node, name, data, from);
        return null;
      }
      node.properties.set(name, data);
      this.push({ path: `${nodePath}/${name}/value`, data }, from);
      if (name === "record_enabled" && /^\/sessions\/[^/]+$/.test(nodePath)) this.runRecord(nodePath, data === true || data === 1);
      if (name === "play_start" && /^\/sessions\/[^/]+$/.test(nodePath) && node.properties.get("playing") !== true) this.setValue(nodePath, "location", this.locationAt(nodePath, Number(data)));
      if (isTrack && name === "input_monitor") this.setValue(nodePath, "input_monitor_state", data === true);
      return null;
    }
    /**
     * A client write to one view of a control (fact 97): re-derive the other three and push
     * them to every port — the writer too, since they are derived (fact 6); only the written
     * view itself is withheld from the writer. A switch snaps to a step of its
     * `real_values`/`string_values`; a continuous control goes through the mock's stand-in
     * taper and format (see {@link faderToReal}); a plugin `parameter`'s `value` tracks its
     * normalized view, since plugin units are plugin-specific (fact 85).
     */
    writeControl(nodePath, node, written, data, from) {
      const p = node.properties;
      const views = {};
      if (p.get("discrete") === true) {
        const reals = p.get("real_values") ?? [false, true];
        const strings = p.get("string_values") ?? ["false", "true"];
        const steps = Math.max(reals.length, 2);
        const index = Math.max(
          0,
          Math.min(
            steps - 1,
            written === "real_value" ? reals.includes(data) ? reals.indexOf(data) : data ? 1 : 0 : written === "string_value" ? Math.max(0, strings.indexOf(String(data))) : written === "normalized_value" ? Math.round(Number(data) * (steps - 1)) : Math.round(Number(data))
          )
        );
        views["value"] = index;
        views["real_value"] = reals[index] ?? index;
        views["normalized_value"] = index / (steps - 1);
        views["string_value"] = strings[index] ?? String(index);
      } else {
        const pan = String(p.get("control_type") ?? "").startsWith("pan");
        const parameter = p.get("control_type") === "parameter";
        const real = written === "real_value" ? Number(data) : written === "string_value" ? pan ? parsePan(String(data)) : Number(data) || 0 : written === "normalized_value" || parameter ? pan ? Number(data) * 200 - 100 : faderToReal(Number(data)) : Number(data);
        const normalized = written === "normalized_value" || parameter && written === "value" ? Number(data) : pan ? Math.min(1, Math.max(0, (real + 100) / 200)) : faderToNormalized(real);
        views["real_value"] = real;
        views["normalized_value"] = normalized;
        views["string_value"] = pan ? formatPan(real) : real.toFixed(1);
        views["value"] = parameter ? normalized : real;
      }
      views[written] = data;
      for (const [prop, value] of Object.entries(views)) {
        p.set(prop, value);
        this.push({ path: `${nodePath}/${prop}/value`, data: value }, prop === written ? from : void 0);
      }
    }
    /**
     * Model LUNA's record pass (fact 75): arming the session rolls the transport and punches in
     * once any count-in is over; disarming finalizes a take on every armed track, but only when
     * the punch point lay inside the loop marks — outside them LUNA rolls and captures nothing.
     */
    runRecord(sessionPath, armed) {
      const uid = sessionPath.slice("/sessions/".length);
      if (armed) {
        this.setValue(sessionPath, "playing", true);
        this.setValue(sessionPath, "punched_in", true);
        this.recording.set(uid, this.children(`${sessionPath}/tracks`).filter((t) => this.value(`${sessionPath}/tracks/${t}`, "record_enabled") === true));
        return;
      }
      const armedTracks = this.recording.get(uid) ?? [];
      this.recording.delete(uid);
      const punchAt = Number(this.value(sessionPath, "play_start") ?? 0);
      const loopStart = Number(this.value(sessionPath, "loop_start") ?? 0);
      const loopStop = Number(this.value(sessionPath, "loop_stop") ?? 0);
      this.setValue(sessionPath, "punched_in", false);
      this.setValue(sessionPath, "playing", false);
      if (!(punchAt >= loopStart && punchAt < loopStop)) return;
      for (const track of armedTracks) this.finishTake(uid, track, { startTick: punchAt, stopTick: punchAt + 96e9 * 4 });
    }
    /** @internal Tracks armed when each session's record pass began. */
    recording = /* @__PURE__ */ new Map();
    post(path, data) {
      const { node: nodePath, name } = splitPath(path);
      const node = this.nodes.get(nodePath);
      const handler = node?.commands.get(name);
      if (!node || !handler) throw new UAError("uasrv.invalid_object", `post ${path}: uasrv.invalid_object`, { cmd: "post", path });
      const result = handler(data, this, nodePath);
      return result === void 0 ? null : result;
    }
    push(message, except) {
      const event = toEvent(message);
      const targets = [...this.ports].filter((port) => port !== except && port.wantsEvent(event.path));
      this.pendingDeliveries++;
      setTimeout(() => {
        for (const port of targets) port.deliver(event);
        this.pendingDeliveries--;
        if (this.pendingDeliveries === 0) {
          const waiters = this.settleWaiters;
          this.settleWaiters = [];
          for (const w of waiters) w();
        }
      }, 0);
    }
    /** @internal */
    detach(port) {
      this.ports.delete(port);
    }
  };
  function parseQuery(path) {
    const q = path.indexOf("?");
    const params = {};
    if (q < 0) return params;
    for (const pair of path.slice(q + 1).split("&")) {
      const eq = pair.indexOf("=");
      if (eq < 0) params[decodeURIComponent(pair)] = "";
      else params[decodeURIComponent(pair.slice(0, eq))] = decodeURIComponent(pair.slice(eq + 1));
    }
    return params;
  }
  var MockPort = class {
    /** @internal */
    constructor(engine) {
      this.engine = engine;
    }
    engine;
    status = "connected";
    subscriptions = /* @__PURE__ */ new Map();
    statusListeners = /* @__PURE__ */ new Set();
    get connected() {
      return this.status === "connected";
    }
    get(path, options) {
      const params = getOptionsToParams(options);
      const query = Object.entries(params).map(([k, v]) => `${k}=${v}`).join("&");
      return this.request("get", query ? `${path}${path.includes("?") ? "&" : "?"}${query}` : path, void 0);
    }
    async set(path, data) {
      await this.request("set", path, data);
    }
    post(path, data) {
      return this.request("post", path, data);
    }
    subscribe(path, handler, _options) {
      let sub = this.subscriptions.get(path);
      if (!sub) {
        sub = { path, handlers: /* @__PURE__ */ new Set() };
        this.subscriptions.set(path, sub);
        void this.request("subscribe", path, void 0).catch(() => void 0);
      }
      sub.handlers.add(handler);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        const current = this.subscriptions.get(path);
        if (!current) return;
        current.handlers.delete(handler);
        if (current.handlers.size === 0) {
          this.subscriptions.delete(path);
          void this.request("unsubscribe", path, void 0).catch(() => void 0);
        }
      };
    }
    onStatus(listener) {
      this.statusListeners.add(listener);
      return () => {
        this.statusListeners.delete(listener);
      };
    }
    async close() {
      if (this.status === "closed") return;
      this.engine.detach(this);
      this.setStatus("closed");
    }
    /**
     * Simulate a drop and recovery; subscriptions survive as they do on the real port.
     * Anything `during` does happens while the port is down, so its pushes are missed.
     */
    async reconnect(during) {
      this.setStatus("disconnected");
      await during?.();
      await this.engine.settled();
      await new Promise((r) => setTimeout(r, 0));
      this.setStatus("connected");
    }
    /** @internal */
    wantsEvent(path) {
      if (this.status !== "connected") return false;
      for (const sub of this.subscriptions.values()) {
        if (eventMatches(sub.path, path)) return true;
      }
      return false;
    }
    /** @internal */
    deliver(event) {
      if (this.status !== "connected") return;
      for (const sub of this.subscriptions.values()) {
        if (!eventMatches(sub.path, event.path)) continue;
        for (const handler of sub.handlers) handler(event);
      }
    }
    request(verb, path, data) {
      if (this.status !== "connected") return Promise.reject(new ConnectionLost(verb, path));
      return this.engine.handle(this, verb, path, data);
    }
    setStatus(status) {
      if (this.status === status) return;
      this.status = status;
      for (const listener of this.statusListeners) listener(status);
    }
  };
  function naturalCompare(a, b) {
    const s1 = [...a].map((c) => c.codePointAt(0)).concat(0);
    const s2 = [...b].map((c) => c.codePointAt(0)).concat(0);
    const isSpace = (c) => c === 32 || c >= 9 && c <= 13;
    const isDigit = (c) => c >= 48 && c <= 57;
    const isAlnum = (c) => isDigit(c) || c >= 65 && c <= 90 || c >= 97 && c <= 122;
    const upper = (c) => c >= 97 && c <= 122 ? c - 32 : c;
    let i = 0;
    let j = 0;
    for (let first = true; ; first = false) {
      const space1 = isSpace(s1[i]);
      const space2 = isSpace(s2[j]);
      if (!first && space1 !== space2) {
        if (s1[i] === 0) return -1;
        if (s2[j] === 0) return 1;
        return space2 ? 1 : -1;
      }
      while (isSpace(s1[i])) i++;
      while (isSpace(s2[j])) j++;
      if (isDigit(s1[i]) && isDigit(s2[j])) {
        const result = s1[i] === 48 || s2[j] === 48 ? digitsLeft(s1, i, s2, j) : digitsRight(s1, i, s2, j);
        if (result !== 0) return result;
      }
      let c1 = s1[i++];
      let c2 = s2[j++];
      if (c1 !== c2) {
        c1 = upper(c1);
        c2 = upper(c2);
      }
      if (c1 === c2) {
        if (c1 === 0) return 0;
        continue;
      }
      const alnum1 = isAlnum(c1);
      const alnum2 = isAlnum(c2);
      if (alnum2 && !alnum1) return -1;
      if (alnum1 && !alnum2) return 1;
      return c1 < c2 ? -1 : 1;
    }
    function digitsRight(x, xi, y, yi) {
      for (let bias = 0; ; xi++, yi++) {
        const d1 = isDigit(x[xi]);
        const d2 = isDigit(y[yi]);
        if (!d1 && !d2) return bias;
        if (!d1) return -1;
        if (!d2) return 1;
        if (x[xi] !== y[yi] && bias === 0) bias = x[xi] < y[yi] ? -1 : 1;
      }
    }
    function digitsLeft(x, xi, y, yi) {
      for (; ; xi++, yi++) {
        const d1 = isDigit(x[xi]);
        const d2 = isDigit(y[yi]);
        if (!d1 && !d2) return 0;
        if (!d1) return -1;
        if (!d2) return 1;
        if (x[xi] < y[yi]) return -1;
        if (x[xi] > y[yi]) return 1;
      }
    }
  }

  // src/wire/wasm-port.ts
  var METHOD = { get: 0, set: 1, post: 2, subscribe: 3, unsubscribe: 4 };
  function wasmUpdateToEvent(path, json) {
    let data = void 0;
    if (json !== "") {
      try {
        data = JSON.parse(json);
      } catch {
        data = json;
      }
    }
    if (path.endsWith("/value")) return { path: stripValueSuffix(path), data };
    if (data === null) return { path, data: void 0, operation: "removed" };
    if (data !== null && typeof data === "object" && !Array.isArray(data) && ("properties" in data || "children" in data)) {
      return { path, data, operation: "added" };
    }
    return { path, data };
  }
  var WasmPort = class {
    constructor(engine, options = {}) {
      this.engine = engine;
      this.requestTimeoutMs = options.requestTimeoutMs ?? 2e4;
      this.onUnhandled = options.onUnhandled;
      engine.attach(
        (id, error, json) => this.handleReply(id, error, json),
        (path, json) => this.handleUpdate(path, json)
      );
      this.stateUnsub = engine.onState((state, detail) => {
        if (state === "running") this.setStatus("connected");
        else if (state === "stopped" || state === "error") {
          this.failPending();
          this.setStatus("closed", detail);
        } else if (state === "booting" || state === "loading") this.setStatus("connecting");
      });
      if (engine.state === "running") this.status = "connected";
    }
    engine;
    status = "disconnected";
    pending = /* @__PURE__ */ new Map();
    subscriptions = /* @__PURE__ */ new Map();
    statusListeners = /* @__PURE__ */ new Set();
    requestTimeoutMs;
    onUnhandled;
    stateUnsub;
    get connected() {
      return this.status === "connected";
    }
    /** Engine descriptor for logs. */
    get url() {
      return `wasm:${this.engine.engineUrl}`;
    }
    get(path, options) {
      const params = getOptionsToParams(options);
      delete params["ignore_response"];
      return this.request("get", appendParams(path, params), "");
    }
    async set(path, data) {
      await this.request("set", path, encodePayload(data));
    }
    post(path, data) {
      return this.request("post", path, encodePayload(data));
    }
    subscribe(path, handler, options) {
      const recursive = options?.recursive === true;
      const key = `${path}|${recursive ? 1 : 0}`;
      let sub = this.subscriptions.get(key);
      if (!sub) {
        sub = { path, recursive, handlers: /* @__PURE__ */ new Set() };
        this.subscriptions.set(key, sub);
        if (this.connected) void this.request("subscribe", recursive ? appendParams(path, { recursive: "1" }) : path, "").catch(() => void 0);
      }
      sub.handlers.add(handler);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        const current = this.subscriptions.get(key);
        if (!current) return;
        current.handlers.delete(handler);
        if (current.handlers.size === 0) {
          this.subscriptions.delete(key);
          if (this.connected) void this.request("unsubscribe", current.path, "").catch(() => void 0);
        }
      };
    }
    onStatus(listener) {
      this.statusListeners.add(listener);
      return () => {
        this.statusListeners.delete(listener);
      };
    }
    /** Detach from the engine. The engine keeps running; use `engine.shutdown()` to stop it. */
    async close() {
      if (this.status === "closed") return;
      this.failPending();
      this.stateUnsub?.();
      this.stateUnsub = void 0;
      this.setStatus("closed");
    }
    // -----------------------------------------------------------------------------------------
    request(verb, path, body) {
      if (!this.connected) return Promise.reject(new ConnectionLost(verb, path));
      const id = this.engine.send(METHOD[verb], path, body);
      if (!id) return Promise.reject(new ConnectionLost(verb, path));
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new RequestTimeout(verb, path, this.requestTimeoutMs));
        }, this.requestTimeoutMs);
        this.pending.set(id, { verb, path, resolve, reject, timer });
      });
    }
    handleReply(id, error, json) {
      const p = this.pending.get(id);
      if (!p) return;
      this.pending.delete(id);
      clearTimeout(p.timer);
      if (error) {
        p.reject(new UAError(error, `${p.verb} ${p.path}: ${error}`, { cmd: p.verb, path: p.path }));
        return;
      }
      let data = null;
      if (json !== "") {
        try {
          data = JSON.parse(json);
        } catch {
          data = json;
        }
      }
      p.resolve(data);
    }
    handleUpdate(path, json) {
      const event = wasmUpdateToEvent(path, json);
      let delivered = false;
      for (const sub of this.subscriptions.values()) {
        if (!eventMatches(sub.path, event.path)) continue;
        delivered = true;
        for (const h of sub.handlers) {
          try {
            h(event);
          } catch (err) {
            console.error("[Luna.WasmPort] subscription handler threw", err);
          }
        }
      }
      if (!delivered) this.onUnhandled?.(event);
    }
    failPending() {
      for (const [id, p] of this.pending) {
        clearTimeout(p.timer);
        this.pending.delete(id);
        p.reject(new ConnectionLost(p.verb, p.path));
      }
    }
    setStatus(status, detail) {
      if (this.status === status) return;
      this.status = status;
      for (const l of this.statusListeners) {
        try {
          l(status, detail);
        } catch (err) {
          console.error("[Luna.WasmPort] status listener threw", err);
        }
      }
    }
  };

  // src/engine/loader.ts
  var WasmEngine = class {
    /** @internal */
    constructor(module, engineUrl) {
      this.module = module;
      this.engineUrl = engineUrl;
    }
    module;
    engineUrl;
    currentState = "loading";
    stateListeners = /* @__PURE__ */ new Set();
    replyHandler;
    updateHandler;
    get state() {
      return this.currentState;
    }
    get isRunning() {
      return this.currentState === "running" && Boolean(this.module.ccall("wasmd_is_running_export", "number", [], []));
    }
    onState(listener) {
      this.stateListeners.add(listener);
      return () => {
        this.stateListeners.delete(listener);
      };
    }
    /** @internal Route replies and updates to the port. */
    attach(reply, update) {
      this.replyHandler = reply;
      this.updateHandler = update;
    }
    /** @internal Send one request; returns the request id or 0 on failure. */
    send(method, path, bodyJson) {
      return Number(this.module.ccall("wasmd_send_export", "number", ["number", "string", "string"], [method, path, bodyJson]));
    }
    /** @internal The hooks object installed on the page. */
    hooks() {
      return {
        onReply: (id, error, json) => this.replyHandler?.(id, error, json),
        onUpdate: (path, json) => this.updateHandler?.(path, json),
        onState: (state, detail) => this.setState(state, detail)
      };
    }
    /** @internal */
    setState(state, detail = "") {
      this.currentState = state;
      for (const l of [...this.stateListeners]) l(state, detail);
    }
    /**
     * Resume the AudioContext. Browsers only allow this after a user gesture, so call it from a
     * click handler. Resolves true if the context is running afterwards.
     */
    async resumeAudio() {
      const ok = Boolean(this.module.ccall("wasmd_resume_audio_export", "number", [], []));
      return ok && this.audio().contextState === 1;
    }
    /** Ask for microphone input (getUserMedia). Needs a secure context and a user gesture. */
    requestAudioInput() {
      return Boolean(this.module.ccall("wasmd_request_audio_input_export", "number", [], []));
    }
    audio() {
      const n = (name) => Number(this.module.ccall(name, "number", [], []));
      return {
        contextState: n("wasmd_audio_state_export"),
        callbacks: n("wasmd_audio_callbacks_export"),
        underruns: n("wasmd_audio_underruns_export"),
        peak: n("wasmd_audio_peak_export"),
        inputState: n("wasmd_audio_input_state_export"),
        inputPeak: n("wasmd_audio_input_peak_export")
      };
    }
    /** OPFS persistence status, when the module was built with it. */
    persistStatus() {
      return this.module.UAPersist?.status();
    }
    /** Stop the engine. Terminal: reload the page to boot again. */
    shutdown() {
      this.setState("stopping");
      this.module.ccall("wasmd_shutdown_export", null, [], []);
    }
  };
  var booting;
  function bootWasmEngine(options = {}) {
    booting ??= doBoot(options).catch((err) => {
      booting = void 0;
      throw err;
    });
    return booting;
  }
  async function doBoot(options) {
    const engineUrl = (options.engineUrl ?? "/__engine/").replace(/\/?$/, "/");
    const log = options.log ?? ((line, level) => level === "err" ? console.warn("[wasm]", line) : console.debug("[wasm]", line));
    const factory = options.factory_ ?? await loadFactory(engineUrl);
    const target = options.hooksTarget_ ?? globalThis;
    let engine;
    let resolveRunning;
    let rejectRunning;
    const running = new Promise((res, rej) => {
      resolveRunning = res;
      rejectRunning = rej;
    });
    const pending2 = [];
    target.WasmDeviced = {
      onReply: (id, error, json) => engine?.hooks().onReply(id, error, json),
      onUpdate: (path, json) => engine?.hooks().onUpdate(path, json),
      onState: (state, detail) => {
        if (engine) engine.hooks().onState(state, detail);
        else pending2.push({ state, detail });
        if (state === "running") resolveRunning();
        if (state === "error" || state === "stopped") rejectRunning(new UAError("engine_boot", `wasm engine ${state}${detail ? ": " + detail : ""}`));
      }
    };
    const timeoutMs = options.timeoutMs ?? 12e4;
    const timer = setTimeout(() => rejectRunning(new UAError("engine_boot", `wasm engine did not reach running within ${timeoutMs} ms`)), timeoutMs);
    try {
      const module = await factory({
        print: (t) => log(t, "out"),
        printErr: (t) => log(t, "err"),
        onAbort: (what) => {
          log(`abort: ${String(what)}`, "err");
          rejectRunning(new UAError("engine_boot", `wasm engine aborted: ${String(what)}`));
        },
        locateFile: (path, prefix) => `${prefix || engineUrl}${path}${options.strip && path.endsWith(".wasm") ? "?strip=1" : ""}`,
        UAPersistDisabled: options.persist === false,
        UAPersistLog: (t) => log(`persist ${t}`, "out")
      });
      engine = new WasmEngine(module, engineUrl);
      for (const p of pending2) engine.setState(p.state, p.detail);
      await running;
      if (engine.state !== "running") engine.setState("running");
      return engine;
    } finally {
      clearTimeout(timer);
    }
  }
  async function loadFactory(engineUrl) {
    const g = globalThis;
    if (typeof g.createDevicedModule === "function") return g.createDevicedModule;
    if (!g.document) throw new UAError("engine_boot", "the wasm engine needs a browser page");
    await new Promise((resolve, reject) => {
      const script = g.document.createElement("script");
      script.src = `${engineUrl}devicedwasm.js`;
      script.onload = () => resolve();
      script.onerror = () => reject(new UAError("engine_boot", `could not load ${script.src}; is the engine served at ${engineUrl}?`));
      g.document.head.appendChild(script);
    });
    if (typeof g.createDevicedModule !== "function") throw new UAError("engine_boot", "devicedwasm.js loaded but createDevicedModule is missing");
    return g.createDevicedModule;
  }

  // src/store/prop.ts
  var Scheduler = class {
    dirty = /* @__PURE__ */ new Set();
    scheduled = false;
    rafHandle;
    timerHandle;
    waiters = [];
    /** Queue `notify` to run once at the next flush. */
    enqueue(notify) {
      this.dirty.add(notify);
      if (this.scheduled) return;
      this.scheduled = true;
      const g = globalThis;
      if (typeof g.requestAnimationFrame === "function") {
        this.rafHandle = g.requestAnimationFrame(() => this.flush());
        this.timerHandle = setTimeout(() => this.flush(), 100);
      } else {
        this.timerHandle = setTimeout(() => this.flush(), 0);
      }
    }
    /** Run every queued notification now. */
    flush() {
      if (!this.scheduled) return;
      this.scheduled = false;
      const g = globalThis;
      if (this.rafHandle !== void 0 && typeof g.cancelAnimationFrame === "function") g.cancelAnimationFrame(this.rafHandle);
      if (this.timerHandle !== void 0) clearTimeout(this.timerHandle);
      this.rafHandle = void 0;
      this.timerHandle = void 0;
      const batch = [...this.dirty];
      this.dirty.clear();
      for (const notify of batch) {
        try {
          notify();
        } catch (err) {
          console.error("[Luna] change listener threw", err);
        }
      }
      const waiters = this.waiters;
      this.waiters = [];
      for (const w of waiters) w();
    }
    /** Resolves after the next flush (or immediately if nothing is queued). */
    settled() {
      if (!this.scheduled) return Promise.resolve();
      return new Promise((resolve) => this.waiters.push(resolve));
    }
  };
  var versionCounter = 0;
  function nextVersion() {
    return ++versionCounter;
  }
  var Cell = class {
    constructor(scheduler, initial) {
      this.scheduler = scheduler;
      this.current = initial;
    }
    scheduler;
    current;
    stamp = 0;
    listeners = /* @__PURE__ */ new Set();
    notify = () => {
      for (const l of [...this.listeners]) l();
    };
    get value() {
      return this.current;
    }
    /** Version of the current value; 0 until first written. */
    get version() {
      return this.stamp;
    }
    /**
     * Write with a stamp. Returns true if the value changed. A write stamped older than the
     * current value is ignored, so a read that was answered late cannot undo a push or a
     * write that landed while it was in flight.
     */
    update(value, version = nextVersion(), equals = shallowEquals) {
      if (version < this.stamp) return false;
      this.stamp = version;
      if (equals(this.current, value)) return false;
      this.current = value;
      if (this.listeners.size > 0) this.scheduler.enqueue(this.notify);
      return true;
    }
    onChange(listener) {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    }
    /** @internal */
    get listenerCount() {
      return this.listeners.size;
    }
  };
  function shallowEquals(a, b) {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((v, i) => shallowEquals(v, b[i]));
    }
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => shallowEquals(a[k], b[k]));
  }
  function derived(sources, compute, options = {}) {
    const listeners = /* @__PURE__ */ new Set();
    let subscriptions = [];
    let last;
    const fanOut = () => {
      if (options.distinct) {
        const next = compute();
        if (shallowEquals(last, next)) return;
        last = next;
      }
      for (const l of [...listeners]) l();
    };
    return {
      get value() {
        return compute();
      },
      onChange(listener) {
        if (listeners.size === 0) {
          if (options.distinct) last = compute();
          subscriptions = sources.map((s) => s.onChange(fanOut));
        }
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
          if (listeners.size === 0) {
            for (const u of subscriptions) u();
            subscriptions = [];
          }
        };
      }
    };
  }
  function writable(view, setter) {
    return {
      get value() {
        return view.value;
      },
      onChange: (l) => view.onChange(l),
      set: setter
    };
  }
  function listOf(source, idOf) {
    return {
      get value() {
        return source.value ?? [];
      },
      get items() {
        return source.value ?? [];
      },
      onChange: (l) => source.onChange(l),
      byId(id) {
        return (source.value ?? []).find((item) => idOf(item) === id);
      }
    };
  }

  // src/store/store.ts
  function isNodeReply(data) {
    return data !== null && typeof data === "object" && !Array.isArray(data) && ("properties" in data || "children" in data || "commands" in data);
  }
  var Store = class {
    constructor(port, scheduler = new Scheduler()) {
      this.port = port;
      this.scheduler = scheduler;
      this.statusUnsub = port.onStatus((status) => {
        if (status === "disconnected") this.wasDisconnected = true;
        if (status === "connected" && this.wasDisconnected) {
          this.wasDisconnected = false;
          void this.reloadAll();
        }
      });
    }
    port;
    scheduler;
    cells = /* @__PURE__ */ new Map();
    childCells = /* @__PURE__ */ new Map();
    watches = /* @__PURE__ */ new Map();
    loaded = /* @__PURE__ */ new Map();
    /** Nodes that have had at least one property written, by a read or a push. */
    propertied = /* @__PURE__ */ new Set();
    /** Reads sent and not yet answered, for {@link readsSettled}. */
    inflight = /* @__PURE__ */ new Set();
    eventListeners = /* @__PURE__ */ new Set();
    /** The last value the engine confirmed for each property cell, for rolling back a refused write. */
    confirmed = /* @__PURE__ */ new Map();
    statusUnsub;
    wasDisconnected = false;
    closed = false;
    /** The cell for `<node>/<property>`. Created on demand, `undefined` until loaded or pushed. */
    cell(nodePath, property) {
      const key = `${nodePath}/${property}`;
      let cell = this.cells.get(key);
      if (!cell) {
        cell = new Cell(this.scheduler);
        this.cells.set(key, cell);
      }
      return cell;
    }
    /** The cell holding a node's child names, in engine order. */
    children(nodePath) {
      let cell = this.childCells.get(nodePath);
      if (!cell) {
        cell = new Cell(this.scheduler);
        this.childCells.set(nodePath, cell);
      }
      return cell;
    }
    /** True once `load` or a push has given this node a child list. */
    knowsNode(nodePath) {
      return this.childCells.has(nodePath);
    }
    /**
     * `get` a path and apply the reply to cells. Resolves to the raw reply. A property path fills
     * its own cell; a node path fills its properties and children, recursing into nested children
     * when the reply carries them (`levels`/`recursive`).
     */
    load(path, options) {
      const read = this.read(path, options);
      this.inflight.add(read);
      const done = () => {
        this.inflight.delete(read);
      };
      read.then(done, done);
      return read;
    }
    /**
     * Resolve once no read is in flight, including reads started while waiting (a member the
     * engine just added is fetched on its own, and that fetch can start another). Never
     * rejects; a failed read counts as finished.
     *
     * @example
     * await luna.store.readsSettled();
     */
    async readsSettled() {
      for (let round = 0; this.inflight.size > 0 && round < 16; round++) {
        await Promise.allSettled([...this.inflight]);
      }
    }
    /** How many reads are in flight. */
    get pendingReads() {
      return this.inflight.size;
    }
    /** True once any property of `nodePath` has been written by a read or a push. */
    hasProperties(nodePath) {
      return this.propertied.has(nodePath);
    }
    async read(path, options) {
      const opts = { flatvalue: true, commands: false, ...options };
      const version = nextVersion();
      const data = await this.port.get(path, opts);
      this.loaded.set(path, options);
      const depth = opts.children === false ? 0 : opts.recursive ? Infinity : opts.levels ?? 1;
      this.apply(path, data, version, depth);
      return data;
    }
    /**
     * Subscribe to `path` and load it. Refcounted: the wire subscription is shared and released
     * when the last watcher calls `release`.
     */
    watch(path, options = {}) {
      if (this.closed) return { ready: Promise.resolve(), release: () => {
      } };
      const recursive = options.recursive === true;
      const key = `${path}|${recursive ? 1 : 0}`;
      let watch = this.watches.get(key);
      if (!watch) {
        const subOptions = recursive ? { recursive: true } : {};
        const off = this.port.subscribe(path, (e) => this.onEvent(e), subOptions);
        let subscribed = true;
        const unsubscribe = () => {
          if (!subscribed) return;
          subscribed = false;
          off();
        };
        const ready = options.load === false ? Promise.resolve() : this.load(path, recursive ? { recursive: true, ...options.load } : options.load).then(() => void 0);
        const created = { path, recursive, refs: 0, unsubscribe, ready };
        ready.catch(() => {
          if (this.watches.get(key) !== created) return;
          this.watches.delete(key);
          created.unsubscribe();
        });
        watch = created;
        this.watches.set(key, watch);
      }
      watch.refs++;
      let released = false;
      const w = watch;
      return {
        ready: w.ready,
        release: () => {
          if (released) return;
          released = true;
          w.refs--;
          if (w.refs === 0) {
            w.unsubscribe();
            if (this.watches.get(key) === w) {
              this.watches.delete(key);
              this.loaded.delete(path);
            }
          }
        }
      };
    }
    /**
     * Optimistic write. The cell takes `value` immediately with a fresh version; the engine's
     * acknowledgement resolves the promise. On rejection the previous value is restored if the
     * cell still holds our write, then the error is rethrown.
     */
    async set(nodePath, property, value) {
      const key = `${nodePath}/${property}`;
      const cell = this.cell(nodePath, property);
      const fallback = this.confirmed.has(key) ? this.confirmed.get(key) : cell.value;
      const ours = nextVersion();
      cell.update(value, ours);
      try {
        await this.port.set(key, value);
        if (cell.version === ours) this.confirmed.set(key, value);
      } catch (err) {
        if (cell.version === ours) cell.update(fallback);
        throw err;
      }
    }
    onEvent(arg) {
      if (typeof arg === "function") {
        this.eventListeners.add(arg);
        return () => {
          this.eventListeners.delete(arg);
        };
      }
      for (const l of this.eventListeners) l(arg);
      this.applyEvent(arg);
    }
    /** Drop a subtree from the mirror (after a `removed`, or when a view is disposed). */
    forget(nodePath) {
      for (const key of [...this.cells.keys()]) {
        if (key.startsWith(nodePath + "/")) this.cells.delete(key);
      }
      for (const key of [...this.confirmed.keys()]) {
        if (key.startsWith(nodePath + "/")) this.confirmed.delete(key);
      }
      for (const key of [...this.childCells.keys()]) {
        if (key === nodePath || key.startsWith(nodePath + "/")) this.childCells.delete(key);
      }
      for (const key of [...this.loaded.keys()]) {
        if (key === nodePath || key.startsWith(nodePath + "/")) this.loaded.delete(key);
      }
      for (const key of [...this.propertied]) {
        if (key === nodePath || key.startsWith(nodePath + "/")) this.propertied.delete(key);
      }
    }
    /** Re-`get` every loaded path. Called automatically after a reconnect. */
    async reloadAll() {
      const entries = [...this.loaded.entries()];
      await Promise.all(
        entries.map(
          ([path, options]) => this.load(path, options).catch(() => {
          })
        )
      );
    }
    async close() {
      if (this.closed) return;
      this.closed = true;
      this.statusUnsub();
      for (const w of this.watches.values()) w.unsubscribe();
      this.watches.clear();
      this.loaded.clear();
    }
    // -----------------------------------------------------------------------------------------
    applyEvent(event) {
      if (event.operation) {
        const { node: parent, name: name2 } = splitPath(event.path);
        const list = this.children(parent);
        const current = list.value ?? [];
        if (event.operation === "added") {
          if (!current.includes(name2)) list.update([...current, name2]);
          if (isNodeReply(event.data)) this.apply(event.path, event.data, nextVersion(), 0);
          else if (!this.knowsNode(event.path)) this.children(event.path).update([]);
        } else {
          if (current.includes(name2)) list.update(current.filter((c) => c !== name2));
          this.forget(event.path);
        }
        return;
      }
      const { node, name } = splitPath(event.path);
      this.write(node, name, event.data, nextVersion());
    }
    /** Write a value the engine reported, and remember it as confirmed if it took. */
    write(node, name, value, version) {
      const cell = this.cell(node, name);
      this.propertied.add(node);
      cell.update(value, version);
      if (cell.version === version) this.confirmed.set(`${node}/${name}`, value);
    }
    /**
     * Apply a `get` reply. `depth` is how many levels below `path` the reply lists children
     * completely: there a missing `children` section means "no children" (fact 18); deeper,
     * a child is a bare name and says nothing about its own children.
     */
    apply(path, data, version, depth = 1) {
      if (data !== null && typeof data === "object" && !Array.isArray(data) && Object.keys(data).length === 0) {
        if (depth >= 1 || !this.knowsNode(path)) this.children(path).update([], version);
        return;
      }
      if (isNodeReply(data)) {
        if (data.properties) {
          for (const [name2, raw] of Object.entries(data.properties)) this.write(path, name2, propertyValue(raw), version);
        }
        if (!Array.isArray(data.children)) {
          if (depth >= 1 || !this.knowsNode(path)) this.children(path).update([], version);
        } else {
          const names = [];
          for (const child of data.children) {
            const name2 = typeof child.path === "string" ? child.path.split("/").filter(Boolean).pop() : void 0;
            if (!name2) continue;
            names.push(name2);
            const childPath = `${path === "/" ? "" : path}/${name2}`;
            if (isNodeReply(child)) this.apply(childPath, child, version, depth - 1);
            else if (depth - 1 >= 1) this.children(childPath).update([], version);
            else if (!this.knowsNode(childPath)) this.children(childPath).update([], version);
          }
          this.children(path).update(names, version);
        }
        return;
      }
      const { node, name } = splitPath(path);
      this.write(node, name, propertyValue(data), version);
    }
  };

  // src/model/ticks.ts
  var DISPLAY_TICKS_PER_BEAT = 960;
  var TICKS_PER_DISPLAY_TICK = 1e8;
  var TICKS_PER_BEAT = DISPLAY_TICKS_PER_BEAT * TICKS_PER_DISPLAY_TICK;
  var WHOLE_NOTE = TICKS_PER_BEAT * 4;
  var HALF_NOTE = TICKS_PER_BEAT * 2;
  var QUARTER_NOTE = TICKS_PER_BEAT;
  var EIGHTH_NOTE = TICKS_PER_BEAT / 2;
  var SIXTEENTH_NOTE = TICKS_PER_BEAT / 4;
  function ticksToBeats(ticks) {
    return ticks / TICKS_PER_BEAT;
  }
  function beatsToTicks(beats) {
    return Math.round(beats * TICKS_PER_BEAT);
  }
  function ticksToSeconds(ticks, bpm) {
    return ticks / TICKS_PER_BEAT * (60 / bpm);
  }
  function secondsToTicks(seconds, bpm) {
    return Math.round(seconds / 60 * bpm * TICKS_PER_BEAT);
  }
  function formatBarBeat(bb) {
    if (!bb) return "-|-|---";
    return `${bb.bar}|${bb.beat}|${String(Math.floor(bb.tick / TICKS_PER_DISPLAY_TICK)).padStart(3, "0")}`;
  }
  function formatTimeSignature(ts) {
    if (!ts) return "-/-";
    return `${ts.numerator}/${ts.denominator}`;
  }
  function formatMinSec(seconds, options = {}) {
    const fraction = options.fraction ?? 0;
    if (seconds === void 0 || !Number.isFinite(seconds)) return `--:--${fraction > 0 ? "." + "-".repeat(fraction) : ""}`;
    const total = Math.max(0, seconds);
    const whole = Math.floor(total);
    const clock = `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
    if (fraction <= 0) return clock;
    const frac = Math.floor((total - whole) * 10 ** fraction);
    return `${clock}.${String(frac).padStart(fraction, "0")}`;
  }

  // src/model/node.ts
  var Node = class {
    /** @internal */
    constructor(client, path) {
      this.client = client;
      this.path = path;
    }
    client;
    path;
    loading;
    isDisposed = false;
    disposeListeners;
    /** Last path segment: the uid or name the engine addresses this node by. */
    get id() {
      return this.path.slice(this.path.lastIndexOf("/") + 1);
    }
    /**
     * Fetch this node's properties (and child names) once. Later calls return the same promise.
     * Pushes keep the cells current afterwards as long as an ancestor is watched.
     */
    load(options) {
      if (!this.loading) {
        this.loading = this.client.store.load(this.path, options).then(() => void 0);
      }
      return this.loading;
    }
    /** Fetch again, ignoring the once-only cache of {@link load}. */
    reload(options) {
      this.loading = this.client.store.load(this.path, options).then(() => void 0);
      return this.loading;
    }
    /**
     * Subscribe to this node so its props follow engine pushes, and load it. Nodes under a
     * session that called `ready()` are already covered; use this for nodes outside a session
     * (for example `luna.gui.main`, `luna.preferences`). Call `release` when done.
     */
    watch(options = {}) {
      const w = this.client.store.watch(this.path, { ...options.recursive !== void 0 ? { recursive: options.recursive } : {}, load: { flatvalue: true, commands: false } });
      this.loading ??= w.ready;
      return w;
    }
    /** Read-only property view. `value` is `undefined` until loaded or pushed. */
    prop(name) {
      return this.client.store.cell(this.path, name);
    }
    /**
     * Any property of this node by its engine name, for properties the typed surface does not
     * cover yet. Prefer a typed member when one exists.
     *
     * @example
     * track.property<number>('latency_override').value
     * await track.property<string>('comments').set('take 3')
     */
    property(name) {
      return this.writableProp(name);
    }
    /** Invoke any command on this node by name. Prefer a typed method when one exists. */
    command(name, payload) {
      return this.post(name, payload);
    }
    /** Writable property view; `set` is optimistic with rollback, and refuses once disposed. */
    writableProp(name) {
      const cell = this.client.store.cell(this.path, name);
      return writable(cell, (v) => this.isDisposed ? Promise.reject(new Disposed(this.constructor.name, this.path)) : this.client.store.set(this.path, name, v));
    }
    /** The cell holding this node's child names. */
    childNames() {
      return this.client.store.children(this.path);
    }
    /** Invoke a command on this node. Refuses once disposed. */
    post(command, payload) {
      if (this.isDisposed) return Promise.reject(new Disposed(this.constructor.name, this.path));
      return this.wire.post(`${this.path}/${command}`, payload);
    }
    /**
     * `client.raw` for this object's own commands, refusing with {@link Disposed} once the
     * object is gone. Domain methods post through this rather than `client.raw`.
     */
    get wire() {
      const raw = this.client.raw;
      const check = (run2) => this.isDisposed ? Promise.reject(new Disposed(this.constructor.name, this.path)) : run2();
      return {
        get: (path, options) => check(() => raw.get(path, options)),
        set: (path, data) => check(() => raw.set(path, data)),
        post: (path, data) => check(() => raw.post(path, data))
      };
    }
    /** Throw {@link Disposed} if this object is gone. Commands that post elsewhere call it first. */
    assertLive() {
      if (this.isDisposed) throw new Disposed(this.constructor.name, this.path);
    }
    /**
     * True once the engine removed this node or its owner was disposed. A disposed object's
     * props stop updating and its commands reject with {@link Disposed}.
     */
    get disposed() {
      return this.isDisposed;
    }
    /**
     * Called once when this object is disposed. Returns an unsubscribe.
     *
     * @example
     * track.onDispose(() => row.remove());
     */
    onDispose(listener) {
      if (this.isDisposed) {
        listener();
        return () => {
        };
      }
      (this.disposeListeners ??= []).push(listener);
      return () => {
        this.disposeListeners = this.disposeListeners?.filter((l) => l !== listener);
      };
    }
    /** @internal Called when the engine removes this node or its owner goes. Idempotent. */
    dispose() {
      if (this.isDisposed) return;
      this.isDisposed = true;
      this.release();
      const listeners = this.disposeListeners ?? [];
      this.disposeListeners = void 0;
      for (const l of listeners) {
        try {
          l();
        } catch (err) {
          console.error("[Luna] onDispose listener threw", err);
        }
      }
    }
    /** Release what this object owns. Subclasses override this, not {@link dispose}. */
    release() {
    }
  };

  // src/model/collection.ts
  var Collection = class {
    /** @internal */
    constructor(client, path, create, loadOptions = { levels: 2 }) {
      this.client = client;
      this.path = path;
      this.create = create;
      this.loadOptions = loadOptions;
      this.sync();
      this.announced = this.ordered;
      this.namesUnsub = this.client.store.children(this.path).onChange(() => {
        this.sync();
        this.announce();
      });
    }
    client;
    path;
    create;
    loadOptions;
    members = /* @__PURE__ */ new Map();
    ordered = [];
    loading;
    listeners = /* @__PURE__ */ new Set();
    namesUnsub;
    syncedVersion = -1;
    /** Member paths already fetched, so a new child is loaded once and only once. */
    fetched = /* @__PURE__ */ new Set();
    /** Added members whose first read has not landed, by name. `onChange` waits for them. */
    pending = /* @__PURE__ */ new Map();
    disposed = false;
    /** The members listeners were last told about. */
    announced = [];
    /** Members in engine order. Empty until loaded or pushed. */
    get items() {
      this.ensureSynced();
      return this.ordered;
    }
    get value() {
      return this.items;
    }
    byId(id) {
      this.ensureSynced();
      return this.members.get(id);
    }
    /**
     * Resolve once every member the engine has added has its properties loaded. Resolves at
     * once when nothing is being fetched.
     *
     * @example
     * await session.insertClip({ trackUid: track.id, sourceUid, startTick: 0, stopTick: Luna.WHOLE_NOTE });
     * await Luna.settle(() => lane.clips.items.length > before, 'insert clip');
     * await lane.clips.membersReady();
     * lane.clips.items.at(-1).start.value;   // loaded, not undefined
     */
    async membersReady() {
      this.ensureSynced();
      while (this.pending.size > 0) await Promise.allSettled([...this.pending.values()]);
    }
    /** Fetch the member list (and, with the default `levels: 2`, each member's properties). */
    load() {
      if (!this.loading) {
        this.loading = this.client.store.load(this.path, this.loadOptions).then(() => void 0);
      }
      return this.loading;
    }
    /**
     * Fetch the member list again, ignoring the once-only cache of {@link load}, and re-sync
     * the members. Use it after an edit whose push LUNA held back, or inside a transaction.
     *
     * @example
     * await session.tracks.reload();
     */
    async reload() {
      this.loading = this.client.store.load(this.path, this.loadOptions).then(() => void 0);
      await this.loading;
      this.sync();
    }
    /**
     * Subscribe to this folder on the wire and load it, so members and their properties
     * follow engine pushes. Collections under a session that called `ready()` are already
     * covered; use this for folders outside one, such as `/renders` or `/jobs` (fact 34).
     * Refcounted through the Store; call `release` when done.
     *
     * @example
     * const w = luna.renders.watch();
     * await w.ready;
     * luna.renders.onChange(() => draw(luna.renders.items));
     */
    watch(options = {}) {
      const w = this.client.store.watch(this.path, {
        ...options.recursive !== void 0 ? { recursive: options.recursive } : {},
        load: this.loadOptions
      });
      this.loading ??= w.ready;
      return { ready: w.ready.then(() => {
        this.sync();
      }), release: w.release };
    }
    /** Called when members are added or removed. */
    onChange(listener) {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    }
    /** @internal */
    dispose() {
      this.disposed = true;
      this.pending.clear();
      this.namesUnsub?.();
      this.namesUnsub = void 0;
      this.listeners.clear();
      for (const m of this.members.values()) m.dispose();
      this.members.clear();
      this.ordered = [];
    }
    /** Rebuild members if the child-name cell moved since the last sync. */
    ensureSynced() {
      if (this.client.store.children(this.path).version !== this.syncedVersion) this.sync();
    }
    /** Rebuild `members` from the child-name cell; keeps existing instances, disposes removed. */
    sync() {
      const cell = this.client.store.children(this.path);
      this.syncedVersion = cell.version;
      const names = cell.value ?? [];
      const next = /* @__PURE__ */ new Map();
      for (const name of names) {
        const existing = this.members.get(name);
        next.set(name, existing ?? this.create(`${this.path}/${name}`, name));
      }
      for (const [name, member] of this.members) {
        if (!next.has(name)) {
          member.dispose();
          this.fetched.delete(`${this.path}/${name}`);
          this.pending.delete(name);
        }
      }
      if (this.loading) {
        for (const [name] of next) {
          const path = `${this.path}/${name}`;
          if (this.members.has(name) || this.fetched.has(path)) continue;
          this.fetched.add(path);
          const hold = !this.client.store.hasProperties(path);
          const read = this.client.store.load(path, this.loadOptions).then(
            () => void 0,
            () => {
              this.fetched.delete(path);
            }
          );
          if (!hold) continue;
          const arrived = read.then(() => this.arrived(name, arrived));
          this.pending.set(name, arrived);
        }
      }
      this.members = next;
      this.ordered = names.map((n) => next.get(n));
    }
    /** A held member's first read landed (or failed): tell listeners. */
    arrived(name, read) {
      if (this.disposed || this.pending.get(name) !== read) return;
      this.pending.delete(name);
      this.announce();
    }
    /** Notify if the members a listener can see differ from those it was last told about. */
    announce() {
      const now = this.pending.size ? this.ordered.filter((m) => !this.pending.has(nameOf(m))) : this.ordered;
      if (sameMembers(this.announced, now)) return;
      this.announced = now;
      for (const l of [...this.listeners]) l();
    }
    /** @internal Re-read the child cell without notifying (used before first `onChange`). */
    refresh() {
      this.sync();
      return this.ordered;
    }
  };
  function sameMembers(a, b) {
    return a.length === b.length && a.every((m, i) => m === b[i]);
  }
  function nameOf(node) {
    return node.path.slice(node.path.lastIndexOf("/") + 1);
  }

  // src/model/settle.ts
  var EDIT_TIMEOUT_MS = 4e3;
  var REFRESH_AFTER_MS = 120;
  var REFRESH_EVERY_MS = 300;
  function yieldTask() {
    return new Promise((resolve) => {
      if (typeof MessageChannel === "function") {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => {
          channel.port1.close();
          resolve();
        };
        channel.port2.postMessage(0);
      } else setTimeout(resolve, 0);
    });
  }
  async function settle(done, what, options = {}) {
    const started = Date.now();
    const timeoutMs = options.timeoutMs ?? EDIT_TIMEOUT_MS;
    const deadline = started + timeoutMs;
    let nextRefresh = started + REFRESH_AFTER_MS;
    while (!done()) {
      if (options.disposed?.()) throw new UAError("disposed", `${what}: the object was disposed while waiting`, options.path ? { path: options.path } : {});
      if (Date.now() > deadline) throw new UAError("no_effect", `${what}: LUNA answered, but the change did not appear in ${timeoutMs} ms`, options.path ? { path: options.path } : {});
      for (let i = 0; i < 8 && !done(); i++) await yieldTask();
      if (done()) return;
      if (options.refresh && Date.now() >= nextRefresh) {
        nextRefresh = Date.now() + REFRESH_EVERY_MS;
        await options.refresh().catch((err) => {
          if (err?.code === "disconnected") throw err;
        });
        options.flush?.();
        for (let i = 0; i < 8 && !done(); i++) await yieldTask();
        if (done()) return;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  function requireTick(value, what) {
    if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
      throw new UAError("out_of_range", `${what} must be an integer tick count`);
    }
    return value;
  }
  function midiByte(value, what, min = 0) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > 127) {
      throw new UAError("out_of_range", `${what} must be an integer ${min}-127`);
    }
    return value;
  }

  // src/model/automation.ts
  var AUTOMATION_MODES = ["off", "read", "write", "touch", "latch"];
  function automationModeOrdinal(mode) {
    return AUTOMATION_MODES.indexOf(mode);
  }
  var BreakpointNode = class extends Node {
    start;
    value;
    /** @internal */
    constructor(client, path) {
      super(client, path);
      this.start = this.prop("start");
      this.value = this.prop("value");
    }
  };
  var Automation = class extends Collection {
    /** @internal */
    constructor(client, controlPath, controlUidProp, sessionUid, lane = "automation") {
      super(client, `${controlPath}/${lane}`, (p) => new BreakpointNode(client, p), { levels: 2, commands: false, flatvalue: true });
      this.controlUidProp = controlUidProp;
      this.sessionUid = sessionUid;
    }
    controlUidProp;
    sessionUid;
    /** Breakpoints sorted by tick. */
    get breakpoints() {
      return this.items.map((b) => ({ tick: b.start.value ?? 0, value: b.value.value ?? 0 })).sort((a, b) => a.tick - b.tick);
    }
    post(command, payload) {
      const controlUid = this.controlUidProp.value;
      if (!controlUid) return Promise.reject(new UAError("unavailable", "control uid not loaded; call control.load() first", { path: this.path }));
      return this.client.raw.post(`/sessions/${this.sessionUid}/${command}`, { session_uid: this.sessionUid, control_uid: controlUid, ...payload });
    }
    /**
     * Wait until the lane shows the edit. The breakpoint verbs answer `null` whether or not
     * anything changed (fact 71), and LUNA holds pushes inside a batch but answers reads
     * (fact 60), so the lane is re-read while waiting.
     */
    settled(done, what) {
      return settle(done, what, { path: this.path, refresh: () => this.reload() });
    }
    at(tick) {
      return this.breakpoints.find((b) => b.tick === tick);
    }
    /**
     * Insert breakpoints. With `clearRange`, existing breakpoints in that range are removed first;
     * without it, new points stack on existing ones. Values go on the wire as float literals,
     * because LUNA stores a bare whole number as 0 (fact 82). Resolves once every point is in
     * the lane.
     *
     * @example
     * await track.gain.automation.insert([{ tick: 0, value: 0 }, { tick: Luna.WHOLE_NOTE, value: -6 }]);
     */
    async insert(points, clearRange) {
      const values = points.map((p) => ({ location: requireTick(p.tick, "breakpoint tick"), value: float(p.value) }));
      const payload = { values };
      if (clearRange) {
        payload["start"] = requireTick(clearRange.startTick, "clearRange.startTick");
        payload["stop"] = requireTick(clearRange.stopTick, "clearRange.stopTick");
      }
      await this.post("insert_bp", payload);
      await this.settled(() => points.every((p) => sameValue(this.at(p.tick)?.value, p.value)), "insert breakpoints");
    }
    /**
     * Delete the breakpoint at `tick`, or every breakpoint in `[startTick, stopTick]`. Resolves
     * once they are gone.
     *
     * @example
     * await track.gain.automation.clear(0, Luna.WHOLE_NOTE * 4);
     */
    async clear(startTick, stopTick) {
      const payload = { start: requireTick(startTick, "startTick") };
      if (stopTick !== void 0) payload["stop"] = requireTick(stopTick, "stopTick");
      await this.post("delete_bp", payload);
      const gone = (b) => stopTick === void 0 ? b.tick !== startTick : b.tick < startTick || b.tick > stopTick;
      await this.settled(() => this.breakpoints.every(gone), "clear breakpoints");
    }
    /**
     * Move the breakpoint at `fromTick` to `toTick`. Resolves once it has moved.
     *
     * @example
     * await track.gain.automation.move(0, Luna.QUARTER_NOTE);
     */
    async move(fromTick, toTick) {
      const value = this.at(fromTick)?.value;
      await this.post("move_bp", { location: requireTick(fromTick, "fromTick"), new_location: requireTick(toTick, "toTick") });
      if (fromTick === toTick) return;
      await this.settled(() => this.at(toTick) !== void 0 && (value === void 0 || this.at(fromTick) === void 0), "move breakpoint");
    }
    /**
     * Set the value of the breakpoint at `tick`, sent as a float literal (fact 82). Resolves
     * once the lane shows it.
     *
     * @example
     * await track.gain.automation.setValue(0, -3);
     */
    async setValue(tick, value) {
      await this.post("trim_bp", { location: requireTick(tick, "tick"), value: float(value) });
      await this.settled(() => sameValue(this.at(tick)?.value, value), "set breakpoint value");
    }
  };
  function sameValue(stored, wanted) {
    return stored !== void 0 && Math.abs(stored - wanted) <= 1e-5 * Math.max(1, Math.abs(wanted));
  }

  // src/model/control.ts
  var Control = class extends Node {
    /** @internal */
    constructor(client, path, sessionUid = sessionUidFromPath(path)) {
      super(client, path);
      this.sessionUid = sessionUid;
      this.value = this.gated(this.writableProp("value"));
      this.normalized = this.gated(this.writableProp("normalized_value"));
      this.real = this.gated(this.writableProp("real_value"));
      this.display = this.prop("string_value");
      this.uid = this.prop("uid");
      this.name = this.prop("name");
      this.controlType = this.prop("control_type");
      this.automatable = this.prop("automatable");
      this.discrete = this.prop("discrete");
      this.numSteps = this.prop("num_steps");
      this.touchCount = this.prop("touch_count");
      this.initialized = this.prop("initialized");
      this.realValues = this.prop("real_values");
      this.displayValues = this.prop("string_values");
    }
    sessionUid;
    /** Engine-native value. Writing here is undoable. */
    value;
    /** 0..1 view. */
    normalized;
    /** Value in units (dB, pan position) or boolean for switches. */
    real;
    /** Formatted for display, as the engine formats it. */
    display;
    uid;
    name;
    controlType;
    automatable;
    discrete;
    numSteps;
    touchCount;
    /**
     * `true` on a live control. A plugin parameter left behind when its slot was cleared has
     * `initialized: null` (fact 86); {@link Effect.params} lists only live ones.
     */
    initialized;
    /** For discrete controls: the real value of each step. */
    realValues;
    /** For discrete controls: the display string of each step. */
    displayValues;
    gestureDepth = 0;
    /** Whether the outermost {@link begin} sent a touch, so {@link end} releases only that. */
    gestureTouched = false;
    automationLane;
    recordingLane;
    /** Playback automation lane. Call `load()` on it before reading breakpoints. */
    get automation() {
      this.automationLane ??= new Automation(this.client, this.path, this.uid, this.sessionUid, "automation");
      return this.automationLane;
    }
    /** Automation captured during the current record pass. */
    get automationRecording() {
      this.recordingLane ??= new Automation(this.client, this.path, this.uid, this.sessionUid, "automation_recording");
      return this.recordingLane;
    }
    release() {
      this.automationLane?.dispose();
      this.recordingLane?.dispose();
    }
    /** True when `real` is boolean-like (mute, solo, switches). */
    get isSwitch() {
      return this.discrete.value === true && this.numSteps.value === 2;
    }
    /** For switches: current state as a boolean. */
    get on() {
      const r = this.real.value;
      if (typeof r === "boolean") return r;
      return (this.value.value ?? 0) !== 0;
    }
    /** For switches: flip the state. */
    async toggle() {
      await this.real.set(!this.on);
    }
    /**
     * True when writes to this control are touch-bracketed: automatable controls, and discrete
     * ones (switches, stepped parameters), which LUNA's GUI always brackets (fact 78). A control
     * whose `automatable` has not arrived yet counts as automatable.
     *
     * @example
     * track.gain.touchable; // true
     * track.solo.touchable; // true: a switch, though not automatable
     */
    get touchable() {
      return this.automatable.value !== false || this.discrete.value === true;
    }
    /**
     * Start a continuous gesture (pointer down). Sends `set_touch` on for a {@link touchable}
     * control; writes until {@link end} are not bracketed individually. Nested calls are
     * counted and only the outermost touches. Always pair with {@link end}, including on
     * cancelled drags; {@link bindGesture} does the pairing for a DOM element.
     *
     * @example
     * gain.begin();
     * await gain.normalized.set(0.6);
     * gain.end();
     */
    begin() {
      if (this.gestureDepth++ > 0) return;
      this.gestureTouched = this.touchable;
      if (this.gestureTouched) void this.touch(true);
    }
    /**
     * Finish a continuous gesture (pointer up). Releases the touch the matching {@link begin}
     * took; an unmatched call is ignored, since LUNA rejects a release it never saw a touch for
     * (fact 78).
     */
    end() {
      if (this.gestureDepth === 0) return;
      if (--this.gestureDepth > 0 || !this.gestureTouched) return;
      this.gestureTouched = false;
      void this.touch(false);
    }
    /**
     * Put the control back to its default value (`set_control_default_value`). LUNA knows each
     * control's default, so there is no default to read or hard-code: a double-click-to-reset
     * calls this. Like a one-shot write it is touch-bracketed, so it makes one undo step; inside
     * a {@link begin}/{@link end} gesture it is not bracketed again. The new value arrives by
     * push. A plugin parameter whose plugin gives LUNA no default keeps its value (fact 92).
     *
     * @example
     * fader.addEventListener('dblclick', () => track.gain.resetToDefault());  // 0 dB
     * panKnob.addEventListener('dblclick', () => track.main.pans[0]?.resetToDefault()); // centre
     */
    async resetToDefault() {
      const reset = () => this.post("set_control_default_value", {}).then(() => void 0);
      if (this.gestureDepth > 0 || !this.touchable) return reset();
      await this.touch(true);
      try {
        await reset();
      } finally {
        await this.touch(false);
      }
    }
    /** True while inside a {@link begin}/{@link end} pair. */
    get inGesture() {
      return this.gestureDepth > 0;
    }
    /** Raw touch state on the engine (`set_touch` command). Prefer begin/end; errors are swallowed. */
    touch(touching) {
      return this.post("set_touch", { touch: touching }).then(() => void 0, () => void 0);
    }
    /** Wrap a writable view so one-shot writes outside a gesture are touch-bracketed. */
    gated(view) {
      const set = view.set;
      return {
        get value() {
          return view.value;
        },
        onChange: (l) => view.onChange(l),
        set: async (v) => {
          if (this.gestureDepth > 0 || !this.touchable) {
            await set(v);
            return;
          }
          await this.touch(true);
          try {
            await set(v);
          } finally {
            await this.touch(false);
          }
        }
      };
    }
  };
  function sessionUidFromPath(path) {
    const m = /^\/sessions\/([^/]+)/.exec(path);
    return m?.[1] ?? "";
  }

  // src/model/gesture.ts
  function bindGesture(target, controls, options = {}) {
    const list = Array.isArray(controls) ? controls : [controls];
    const el = target;
    const view = el.ownerDocument?.defaultView ?? globalThis.window;
    let active = false;
    let pointerId;
    let releaseHold;
    const samePointer = (e) => pointerId === void 0 || e.pointerId === void 0 || e.pointerId === pointerId;
    const finish = (event) => {
      if (!active) return;
      active = false;
      view?.removeEventListener("pointerup", onRelease);
      view?.removeEventListener("pointercancel", onRelease);
      view?.removeEventListener("blur", onBlur);
      if (pointerId !== void 0 && el.hasPointerCapture?.(pointerId)) el.releasePointerCapture?.(pointerId);
      pointerId = void 0;
      for (const c of list) c.end();
      try {
        options.onEnd?.(event);
      } finally {
        const done = releaseHold;
        releaseHold = void 0;
        done?.();
      }
    };
    const onRelease = (e) => {
      if (samePointer(e)) finish(e);
    };
    const onBlur = (e) => finish(e);
    const onDown = (e) => {
      const p = e;
      if (active || p.button !== void 0 && p.button !== 0) return;
      active = true;
      pointerId = p.pointerId;
      releaseHold = options.bindings?.hold();
      for (const c of list) c.begin();
      if (options.capture && pointerId !== void 0) {
        try {
          el.setPointerCapture?.(pointerId);
        } catch {
        }
      }
      view?.addEventListener("pointerup", onRelease);
      view?.addEventListener("pointercancel", onRelease);
      view?.addEventListener("blur", onBlur);
      options.onBegin?.(e);
    };
    target.addEventListener("pointerdown", onDown, true);
    target.addEventListener("pointerup", onRelease);
    target.addEventListener("pointercancel", onRelease);
    target.addEventListener("lostpointercapture", onRelease);
    const gesture = {
      get active() {
        return active;
      },
      end: () => finish(),
      dispose: () => {
        finish();
        target.removeEventListener("pointerdown", onDown, true);
        target.removeEventListener("pointerup", onRelease);
        target.removeEventListener("pointercancel", onRelease);
        target.removeEventListener("lostpointercapture", onRelease);
      }
    };
    options.bindings?.add(gesture);
    return gesture;
  }

  // src/model/bind.ts
  var clamp01 = (v) => Math.min(1, Math.max(0, v));
  function bindRange(input, control, options = {}) {
    const view = options.view ?? "normalized";
    const fail = options.onError ?? ((e) => console.error("[Luna] bindRange", e));
    const bounds = () => {
      const min = input.min === "" ? 0 : Number(input.min);
      const max = input.max === "" ? 100 : Number(input.max);
      return [min, max > min ? max : min + 1];
    };
    const sync = () => {
      if (view === "real") {
        const r = control.real.value;
        if (typeof r === "number") input.value = String(r);
        return;
      }
      const [min, max] = bounds();
      input.value = String(min + (control.normalized.value ?? 0) * (max - min));
    };
    const gesture = bindGesture(input, control, {
      ...options.onBegin ? { onBegin: options.onBegin } : {},
      ...options.bindings ? { bindings: options.bindings } : {},
      onEnd: (e) => {
        sync();
        options.onEnd?.(e);
      }
    });
    const onInput = () => {
      const v = Number(input.value);
      let write;
      if (view === "real") write = control.real.set(v);
      else {
        const [min, max] = bounds();
        write = control.normalized.set(clamp01((v - min) / (max - min)));
      }
      write.catch(fail);
    };
    const onDouble = () => void control.resetToDefault().catch(fail);
    const off = control[view].onChange(() => {
      if (!gesture.active) sync();
    });
    input.addEventListener("input", onInput);
    if (options.reset !== false) input.addEventListener("dblclick", onDouble);
    sync();
    return withBindings(options.bindings, gesture, sync, () => {
      off();
      input.removeEventListener("input", onInput);
      input.removeEventListener("dblclick", onDouble);
    });
  }
  function bindDrag(el, controls, options = {}) {
    const list = Array.isArray(controls) ? controls : [controls];
    const lead = list[0];
    if (!lead) throw new TypeError("bindDrag needs at least one control");
    const fail = options.onError ?? ((e) => console.error("[Luna] bindDrag", e));
    const axis = options.axis ?? "y";
    const perUnit = options.pixelsPerUnit ?? 200;
    const step = options.step ?? 0.01;
    if (el.tabIndex < 0 && !el.hasAttribute("tabindex")) el.tabIndex = 0;
    if (!el.hasAttribute("role")) el.setAttribute("role", "slider");
    el.setAttribute("aria-valuemin", "0");
    el.setAttribute("aria-valuemax", "1");
    if (options.label && !el.hasAttribute("aria-label")) el.setAttribute("aria-label", options.label);
    if (!el.style.touchAction) el.style.touchAction = "none";
    let value = 0;
    const paint = () => {
      el.setAttribute("aria-valuenow", value.toFixed(3));
      const text = lead.display.value;
      if (text) el.setAttribute("aria-valuetext", text);
      else el.removeAttribute("aria-valuetext");
      options.render?.(value);
    };
    const sync = () => {
      value = clamp01(lead.normalized.value ?? value);
      paint();
    };
    const write = (v) => {
      value = clamp01(v);
      paint();
      for (const c of list) c.normalized.set(value).catch(fail);
    };
    let from;
    const gesture = bindGesture(el, list, {
      capture: true,
      ...options.bindings ? { bindings: options.bindings } : {},
      onBegin: (e) => {
        const p = e;
        from = { x: p.clientX, y: p.clientY, value };
        options.onBegin?.(e);
      },
      onEnd: (e) => {
        from = void 0;
        sync();
        options.onEnd?.(e);
      }
    });
    const onMove = (e) => {
      if (!gesture.active || !from) return;
      const dx = e.clientX - from.x;
      const dy = from.y - e.clientY;
      const travel = axis === "x" ? dx : axis === "y" ? dy : dx + dy;
      write(from.value + travel / perUnit);
    };
    const onKey = (e) => {
      const next = {
        ArrowUp: value + step,
        ArrowRight: value + step,
        ArrowDown: value - step,
        ArrowLeft: value - step,
        PageUp: value + step * 10,
        PageDown: value - step * 10,
        Home: 0,
        End: 1
      };
      const v = next[e.key];
      if (v === void 0 || e.defaultPrevented) return;
      e.preventDefault();
      write(v);
    };
    const onDouble = () => {
      for (const c of list) c.resetToDefault().catch(fail);
    };
    const offs = [lead.normalized, lead.display].map(
      (p) => p.onChange(() => {
        if (!gesture.active) sync();
      })
    );
    el.addEventListener("pointermove", onMove);
    el.addEventListener("keydown", onKey);
    if (options.reset !== false) el.addEventListener("dblclick", onDouble);
    sync();
    return withBindings(options.bindings, gesture, sync, () => {
      for (const off of offs) off();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("dblclick", onDouble);
    });
  }
  function withBindings(bindings, gesture, sync, unbind) {
    let disposed = false;
    const binding = {
      get active() {
        return gesture.active;
      },
      sync,
      end: () => gesture.end(),
      dispose: () => {
        if (disposed) return;
        disposed = true;
        gesture.dispose();
        unbind();
      }
    };
    bindings?.add(binding);
    return binding;
  }

  // src/model/clock.ts
  function bindClock(el, transport, options = {}) {
    const render = options.render ?? ((seconds) => void (el.textContent = formatMinSec(seconds, { fraction: 1 })));
    const now = () => (globalThis.performance ?? Date).now();
    const hasRaf = typeof globalThis.requestAnimationFrame === "function";
    const raf = hasRaf ? (fn) => requestAnimationFrame(fn) : (fn) => setTimeout(fn, 33);
    const unraf = hasRaf ? (h) => cancelAnimationFrame(h) : (h) => clearTimeout(h);
    let anchor = { seconds: transport.seconds, at: now() };
    let frame;
    let released = false;
    const paint = () => render(anchor.seconds + (transport.playing.value === true ? (now() - anchor.at) / 1e3 : 0));
    const loop = () => {
      frame = void 0;
      if (released || transport.playing.value !== true) return;
      paint();
      frame = raf(loop);
    };
    const stopFrames = () => {
      if (frame !== void 0) unraf(frame);
      frame = void 0;
    };
    const reanchor = () => {
      anchor = { seconds: transport.seconds, at: now() };
      paint();
      if (transport.playing.value === true) {
        if (frame === void 0) frame = raf(loop);
      } else stopFrames();
    };
    const offs = [transport.location.onChange(reanchor), transport.playing.onChange(reanchor), transport.playStart.onChange(reanchor)];
    reanchor();
    const release2 = () => {
      if (released) return;
      released = true;
      stopFrames();
      for (const off of offs) off();
    };
    options.bindings?.add(release2);
    return release2;
  }

  // src/model/bindings.ts
  var Bindings = class {
    releases = [];
    holds = /* @__PURE__ */ new Set();
    pending;
    /** A {@link whenIdle} rebuild that has not settled yet (an async one still loading). */
    running = false;
    disposed = false;
    /** True while a drag bound with this group, or a {@link hold}, is in progress. */
    get busy() {
      return this.holds.size > 0;
    }
    /**
     * Release `item` with the group. After {@link dispose} it is released at once.
     *
     * @example
     * const g = bindings.add(Luna.bindGesture(canvas, control, { capture: true }));
     * bindings.add(() => clearInterval(timer));
     */
    add(item) {
      if (this.disposed) release(item);
      else this.releases.push(item);
      return item;
    }
    /**
     * Subscribe to `prop` for as long as the group lives.
     *
     * @example
     * bindings.on(track.name, () => { label.textContent = track.name.value ?? ''; });
     */
    on(prop, listener) {
      return this.add(prop.onChange(listener));
    }
    /**
     * Keep the group busy until the returned function is called, for an edit that is not a drag
     * (an inline rename). Releasing twice is harmless; {@link clear} drops every hold.
     *
     * @example
     * const done = bindings.hold();
     * input.addEventListener('blur', done, { once: true });
     */
    hold() {
      const token = {};
      this.holds.add(token);
      return () => {
        if (this.holds.delete(token)) this.flush();
      };
    }
    /**
     * Run `rebuild` now when the group is idle. While it is busy, or while an earlier async
     * `rebuild` is still running, run it once afterwards instead; asked again meanwhile, the
     * latest `rebuild` replaces the waiting one, so a burst of changes costs one rebuild. The
     * promise settles when the `rebuild` that finally ran has finished.
     *
     * An async `rebuild` can find the group busy again after an `await` (a drag began while it
     * loaded). It should then ask again and return without touching the DOM:
     * `if (strips.busy) { void strips.whenIdle(render); return; }`. Returning that promise
     * instead would wait on itself.
     *
     * @example
     * session.tracks.onChange(() => void strips.whenIdle(render));
     */
    whenIdle(rebuild) {
      if (!this.busy && !this.running) return this.start(rebuild);
      return new Promise((resolve, reject) => {
        const waiters = this.pending?.waiters ?? [];
        waiters.push({ resolve, reject });
        this.pending = { run: rebuild, waiters };
      });
    }
    /**
     * Release everything added so far, end any drag and drop the holds. The group stays usable:
     * call it in each rebuild, just before replacing the DOM. A rebuild still waiting in
     * {@link whenIdle} is kept, and runs once nothing holds the group.
     *
     * @example
     * function render() { strips.clear(); ... }
     */
    clear() {
      this.holds.clear();
      const releases = this.releases;
      this.releases = [];
      for (const item of releases) {
        try {
          release(item);
        } catch (err) {
          console.error("[Luna] release threw", err);
        }
      }
      this.flush();
    }
    /**
     * {@link clear}, drop any waiting {@link whenIdle} rebuild (its promise resolves), and
     * release anything added afterwards at once.
     */
    dispose() {
      this.disposed = true;
      const pending2 = this.pending;
      this.pending = void 0;
      this.clear();
      for (const w of pending2?.waiters ?? []) w.resolve();
    }
    start(rebuild) {
      this.running = true;
      const done = run(rebuild);
      const settle2 = () => {
        this.running = false;
        this.flush();
      };
      done.then(settle2, settle2);
      return done;
    }
    flush() {
      const pending2 = this.pending;
      if (!pending2 || this.busy || this.running) return;
      this.pending = void 0;
      this.start(pending2.run).then(
        () => pending2.waiters.forEach((w) => w.resolve()),
        (err) => pending2.waiters.forEach((w) => w.reject(err))
      );
    }
  };
  function release(item) {
    if (typeof item === "function") item();
    else item.dispose();
  }
  function run(fn) {
    try {
      return Promise.resolve(fn());
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // src/client/detect.ts
  function search() {
    const loc = globalThis.location;
    return typeof loc?.search === "string" ? loc.search : void 0;
  }
  function locationOptions() {
    const s = search();
    if (!s) return {};
    const params = new URLSearchParams(s);
    const out = {};
    const host = params.get("host");
    const port = params.get("port");
    if (host) out.host = host;
    if (port && Number.isFinite(Number(port))) out.port = Number(port);
    const engine = params.get("engine");
    if (engine === "wasm" || engine === "luna" || engine === "mock") out.engine = engine;
    const engineUrl = params.get("engine_url");
    if (engineUrl) out.engineUrl = engineUrl;
    return out;
  }
  function isEmbeddedInLuna() {
    return locationOptions().port !== void 0;
  }
  function isLunaEnginePort(port) {
    return port === DEFAULT_LUNA_PORT;
  }
  function hasNativeBridge() {
    const w = globalThis;
    return typeof w.lunaAPI?.setAcceptsFileDrops === "function";
  }

  // src/model/shortcuts.ts
  var DEFAULT_SHORTCUTS = Object.freeze({
    undo: ["Mod+Z"],
    redo: ["Mod+Shift+Z"],
    togglePlayback: ["Space", "Numpad0"],
    toggleRecord: ["Mod+Space", "Numpad3"]
  });
  var COMMANDS = ["undo", "redo", "togglePlayback", "toggleRecord"];
  var NO_REPEAT = /* @__PURE__ */ new Set(["togglePlayback", "toggleRecord"]);
  function detectPlatform() {
    const nav = globalThis.navigator;
    const name = nav?.userAgentData?.platform ?? nav?.platform ?? nav?.userAgent ?? "";
    return /mac|iphone|ipad/i.test(name) ? "mac" : "other";
  }
  function parseCombo(combo, platform) {
    const parts = combo.split("+").map((p) => p.trim());
    const key = combo.endsWith("++") ? "+" : parts.pop() ?? "";
    const out = { key, meta: false, ctrl: false, alt: false, shift: false };
    for (const raw of parts) {
      const m = raw.toLowerCase();
      if (m === "") continue;
      if (m === "mod") out[platform === "mac" ? "meta" : "ctrl"] = true;
      else if (m === "cmd" || m === "command" || m === "meta") out.meta = true;
      else if (m === "ctrl" || m === "control") out.ctrl = true;
      else if (m === "alt" || m === "option") out.alt = true;
      else if (m === "shift") out.shift = true;
      else throw new Error(`unknown modifier "${raw}" in shortcut "${combo}"`);
    }
    return out;
  }
  function keyMatches(key, event) {
    if (key === event.code) return true;
    if (key === "Space") return event.key === " ";
    return key.length === 1 ? event.key.toLowerCase() === key.toLowerCase() : event.key === key;
  }
  function comboMatches(c, event) {
    return c.meta === event.metaKey && c.ctrl === event.ctrlKey && c.alt === event.altKey && c.shift === event.shiftKey && keyMatches(c.key, event);
  }
  function isEditable(target) {
    const el = target;
    if (!el || typeof el.tagName !== "string") return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName.toUpperCase();
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag !== "INPUT") return false;
    const type = (el.type ?? "text").toLowerCase();
    return !["button", "checkbox", "radio", "range", "color", "file", "image", "reset", "submit"].includes(type);
  }
  var Shortcuts = class {
    constructor(client, options = {}) {
      this.client = client;
      this.options = options;
      this.platform = options.platform ?? detectPlatform();
      this.bindings = Object.freeze({ ...DEFAULT_SHORTCUTS, ...options.bindings });
      this.parsed = COMMANDS.flatMap((cmd) => this.bindings[cmd].map((combo) => [cmd, parseCombo(combo, this.platform)]));
    }
    client;
    options;
    /** The combos in effect, per command. */
    bindings;
    platform;
    parsed;
    /** The key whose keydown was handled, so its keyup cannot also click a focused button. */
    swallowKeyUp;
    /** The command `event` is bound to, if any. Ignores focus and `defaultPrevented`. */
    commandFor(event) {
      return this.parsed.find(([, combo]) => comboMatches(combo, event))?.[0];
    }
    /**
     * Run the command for a keydown the page has not handled. Returns true, having called
     * `preventDefault()`, when it ran one; false for a key that is claimed, typed into a text
     * field, unbound, a held-down transport key, or pressed with no session open.
     */
    handle(event) {
      if (event.defaultPrevented || event.isComposing || isEditable(event.target)) return false;
      const command = this.commandFor(event);
      if (!command || event.repeat && NO_REPEAT.has(command)) return false;
      const session = this.session();
      if (!session) return false;
      event.preventDefault();
      this.swallowKeyUp = event.code;
      this.options.onCommand?.(command, event);
      this.runOn(session, command).catch((e) => (this.options.onError ?? warn)(e, command));
      return true;
    }
    /**
     * Keyup half of {@link handle}: claims the keyup of a key whose keydown was handled, so
     * Space does not also activate a focused button.
     */
    handleKeyUp(event) {
      if (this.swallowKeyUp !== void 0 && event.code === this.swallowKeyUp) {
        this.swallowKeyUp = void 0;
        event.preventDefault();
      }
    }
    /**
     * Run a command on the focused session (or `options.session`), as LUNA's own shortcut
     * would. Resolves without doing anything when no session is open.
     */
    async run(command) {
      const session = this.session();
      if (session) await this.runOn(session, command);
    }
    session() {
      return this.options.session ? this.options.session() : this.client.sessions.current();
    }
    async runOn(session, command) {
      switch (command) {
        case "undo":
          await session.undo();
          return;
        case "redo":
          await session.redo();
          return;
        case "togglePlayback":
        case "toggleRecord": {
          await session.ready();
          await (command === "togglePlayback" ? session.transport.toggle() : session.transport.toggleRecord());
          return;
        }
      }
    }
  };
  function warn(error, command) {
    console.warn(`Luna shortcut ${command} failed:`, error);
  }
  function bindShortcuts(client, options = {}) {
    const shortcuts = new Shortcuts(client, options);
    if (hasNativeBridge()) return { shortcuts, installed: false, dispose: () => {
    } };
    const target = options.target ?? globalThis.window;
    const onDown = (e) => {
      shortcuts.handle(e);
    };
    const onUp = (e) => shortcuts.handleKeyUp(e);
    target?.addEventListener("keydown", onDown);
    target?.addEventListener("keyup", onUp);
    return {
      shortcuts,
      installed: true,
      dispose: () => {
        target?.removeEventListener("keydown", onDown);
        target?.removeEventListener("keyup", onUp);
      }
    };
  }

  // src/model/controls.ts
  var Controls = class extends Collection {
    named = /* @__PURE__ */ new Map();
    /** @internal */
    constructor(client, path) {
      super(client, path, (childPath) => new Control(client, childPath), { levels: 2, commands: false, flatvalue: true });
    }
    /**
     * The control called `name`. Always returns an object; its props are `undefined` until the
     * folder is loaded or the engine pushes it.
     */
    get(name) {
      const listed = this.byId(name);
      if (listed) return listed;
      let c = this.named.get(name);
      if (!c) {
        c = new Control(this.client, `${this.path}/${name}`);
        this.named.set(name, c);
      }
      return c;
    }
    /** @internal Dispose the listed controls and the ones handed out by name before they were listed. */
    dispose() {
      super.dispose();
      for (const c of this.named.values()) c.dispose();
      this.named.clear();
    }
  };

  // src/model/meter.ts
  var Meter = class extends Node {
    /** Current level per stream, 0..1. */
    level;
    /** Held peak per stream, 0..1. */
    peak;
    /** Clip indicator per stream (0/1). */
    clip;
    enabled;
    numStreams;
    listeners = 0;
    unwatch;
    /** @internal */
    constructor(client, path) {
      super(client, path);
      this.level = this.prop("level");
      this.peak = this.prop("peak");
      this.clip = this.prop("clip");
      this.enabled = this.prop("enabled");
      this.numStreams = this.prop("num_streams");
    }
    /** Streams metered: `num_streams` once read, else the length of the level array, at least 1. */
    get streams() {
      const n = this.numStreams.value;
      return typeof n === "number" && n > 0 ? n : Math.max(1, this.level.value?.length ?? 0);
    }
    /**
     * The highest current level across streams, 0..1: one number for a single bar.
     *
     * @example
     * track.meter.onChange(() => (bar.style.height = `${track.meter.max * 100}%`));
     */
    get max() {
      const levels = this.level.value ?? [];
      return levels.length ? Math.max(...levels) : 0;
    }
    /** Called on every meter push while subscribed. */
    onChange(listener) {
      if (this.listeners++ === 0) {
        this.unwatch = this.client.store.watch(this.path, { load: { flatvalue: true, commands: false, children: false } }).release;
      }
      const unsub = this.level.onChange(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        unsub();
        if (--this.listeners === 0) {
          this.unwatch?.();
          this.unwatch = void 0;
        }
      };
    }
    release() {
      this.unwatch?.();
      this.unwatch = void 0;
      this.listeners = 0;
    }
  };

  // src/model/output.ts
  var SEND_COUNT = 8;
  var CUE_COUNT = 4;
  var Output = class extends Node {
    uid;
    outputType;
    /** Raw destination rows. Prefer {@link destinations}, which carries the handle to delete one. */
    assignments;
    /**
     * Every destination, live, in LUNA's order. Usually zero or one; {@link assign} appends.
     *
     * @example
     * send.destinations.onChange(() => label.textContent = send.destinations.value.map((d) => d.name).join(', '));
     */
    destinations;
    /** The first destination, or `undefined` when unrouted. */
    destination;
    /** The first destination's bus uid, or `null` when unrouted. LUNA's own `bus_uid` property is always null. */
    busUid;
    controls;
    meter;
    objectsRequested = false;
    /** @internal */
    constructor(client, path) {
      super(client, path);
      this.uid = this.prop("uid");
      this.outputType = this.prop("output_type");
      this.assignments = this.prop("assignments");
      const objects = client.store.children(`${path}/assignment_objects`);
      this.destinations = derived([this.assignments, objects], () => {
        const rows = Array.isArray(this.assignments.value) ? this.assignments.value : [];
        const uids = objects.value ?? [];
        if (rows.length > uids.length) this.requestObjects();
        return Object.freeze(uids.map((uid, i) => destinationOf(uid, rows[i], client, `${path}/assignment_objects/${uid}`)));
      });
      this.destination = derived([this.destinations], () => this.list()[0]);
      this.busUid = derived([this.destinations], () => this.list()[0]?.busUid ?? null);
      this.controls = new Controls(client, `${path}/controls`);
      this.meter = new Meter(client, `${path}/meters/level`);
    }
    /** The current destinations; `Prop.value` is typed as possibly undefined. */
    list() {
      return this.destinations.value ?? [];
    }
    requestObjects() {
      if (this.objectsRequested) return;
      this.objectsRequested = true;
      void this.client.store.load(`${this.path}/assignment_objects`, { levels: 2, commands: false, flatvalue: true }).catch(() => {
        this.objectsRequested = false;
      });
    }
    /** Whether the output routes anywhere. */
    get assigned() {
      return this.list().length > 0;
    }
    /**
     * True on a stereo channel, where pan is two controls, `pan_left` and `pan_right`
     * (fact 84). Read from the owning channel's `stem_format`, or from the controls when
     * they are loaded.
     */
    get stereo() {
      if (this.controls.byId("pan_left")) return true;
      if (this.controls.byId("pan")) return false;
      const owner = /^(.*\/(?:tracks|buses)\/[^/]+)\/outputs\//.exec(this.path)?.[1];
      return owner !== void 0 && this.client.store.cell(owner, "stem_format").value === "stereo";
    }
    get gain() {
      return this.controls.get("gain");
    }
    /**
     * The pan control: `pan` on a mono channel; on a stereo channel `pan_left`, with
     * {@link panRight} beside it (fact 84). Use {@link pans} to handle both.
     *
     * @example
     * for (const p of track.main.pans) p.normalized.set(0.5);
     */
    get pan() {
      return this.stereo ? this.controls.get("pan_left") : this.controls.get("pan");
    }
    /** Left pan on a stereo channel; the one pan on a mono channel. */
    get panLeft() {
      return this.pan;
    }
    /** Right pan on a stereo channel; the one pan on a mono channel. */
    get panRight() {
      return this.stereo ? this.controls.get("pan_right") : this.controls.get("pan");
    }
    /** Every pan control: one on a mono channel, left and right on a stereo one. */
    get pans() {
      return this.stereo ? [this.controls.get("pan_left"), this.controls.get("pan_right")] : [this.controls.get("pan")];
    }
    get mute() {
      return this.controls.get("mute");
    }
    /** Pre- or post-fader, for a send. A control, not a node property. */
    get preFader() {
      return this.controls.get("pre_fader");
    }
    /** Send enable, for a send. A control, not a node property. */
    get enabled() {
      return this.controls.get("enabled");
    }
    /** `send_0`..`send_7`. */
    get isSend() {
      return this.id.startsWith("send_");
    }
    /** `cue_0`..`cue_3`. Cue outputs are routed by LUNA and refuse the routing commands. */
    get isCue() {
      return this.id.startsWith("cue_");
    }
    /** The slot number for a `send_N` or `cue_N` output, `undefined` for `main`. */
    get index() {
      const n = Number(this.id.slice(this.id.indexOf("_") + 1));
      return this.id.includes("_") && Number.isInteger(n) ? n : void 0;
    }
    /**
     * Who owns this output, read off its own path
     * (`/sessions/<session>/{tracks,buses}/<channel>/outputs/<id>`), so the routing commands
     * can name the session and channel without every caller threading them through.
     */
    owner() {
      this.assertLive();
      const m = /^((\/sessions\/([^/]+))\/(tracks|buses)\/([^/]+))\/outputs\//.exec(this.path);
      if (!m) throw new UAError("unavailable", `${this.path} is not a channel output, so it cannot be routed`, { path: this.path });
      return { channelPath: m[1], sessionPath: m[2], sessionUid: m[3], isTrack: m[4] === "tracks", channelUid: m[5] };
    }
    /** Wait for the routing to show an edit; the assignment verbs can answer before the model moves. */
    settled(done, what) {
      return settle(done, what, {
        path: this.path,
        disposed: () => this.disposed,
        refresh: () => this.client.store.load(this.path, { levels: 3, commands: false, flatvalue: true, propfilter: ["assignments", "uid", "output_type"] }),
        flush: () => this.client.store.scheduler.flush()
      });
    }
    /**
     * Route this send to a bus and resolve to the new assignment uid, once the destination is
     * in {@link destinations}. One "New Output Assignment" undo entry.
     *
     * LUNA **appends**: a send that is already routed keeps its old destination too
     * (fact 43), so use {@link retarget} to replace rather than add.
     *
     * @throws {UAError} `out_of_range` on a cue output; `uasrv.invalid_type` for an unknown bus.
     * @example
     * const reverb = session.buses.items.find((b) => b.name.value === 'Reverb');
     * await track.outputs.byId('send_0').assign(reverb.id);
     */
    async assign(bus) {
      if (this.isCue) throw new UAError("out_of_range", `${this.id}: a cue output is routed by LUNA; assign a send`, { path: this.path });
      const busUid = typeof bus === "string" ? bus : bus.id;
      if (!busUid) throw new UAError("out_of_range", "assign(): a bus uid is required", { path: this.path });
      const { sessionPath, sessionUid, channelUid, isTrack } = this.owner();
      const source = isTrack ? { track_uid: channelUid } : { bus_src_uid: channelUid };
      const reply = await this.wire.post(`${sessionPath}/new_output_assignment`, { session_uid: sessionUid, ...source, output_type: this.id, bus_uid: busUid });
      const uid = reply?.uid;
      if (typeof uid !== "string" || !uid) throw new UAError("invalid_response", "new_output_assignment answered without a uid", { path: this.path });
      await this.settled(() => this.list().some((d) => d.uid === uid && d.busUid !== void 0), "assign send");
      return uid;
    }
    /**
     * Remove one destination (a {@link Destination} or its uid), or every one when called
     * with nothing. One "Delete Output Assignment" entry per removal; nothing to remove is a
     * no-op. Resolves once the destinations are gone.
     *
     * @example await track.outputs.byId('send_0').unassign();
     */
    async unassign(target) {
      const { sessionPath, sessionUid } = this.owner();
      const uids = target === void 0 ? this.list().map((d) => d.uid) : [typeof target === "string" ? target : target.uid];
      if (uids.length === 0) return;
      for (const uid of uids) await this.wire.post(`${sessionPath}/delete_output_assignment`, { session_uid: sessionUid, uid });
      await this.settled(() => !this.list().some((d) => uids.includes(d.uid)), "unassign send");
    }
    /**
     * Replace every destination with `bus`: unassign, then assign, because the engine's
     * forward verb only appends (fact 43). One undo entry named `name` when the send was
     * already routed; inside a caller's `session.transaction()` it joins that batch.
     *
     * @example await track.outputs.byId('send_0').retarget(delayBus.id);
     */
    async retarget(bus, name = `Retarget ${this.id}`) {
      if (this.list().length === 0) return this.assign(bus);
      const { sessionUid } = this.owner();
      const session = this.client.sessions.items.byId(sessionUid);
      const replace = async () => {
        await this.unassign();
        return this.assign(bus);
      };
      if (session) return session.transaction(name, replace);
      return replace();
    }
    /**
     * Move this send's routing and control values to another channel's slot (`move_send`) —
     * the same slot number by default — or copy them with `copy: true`. One "Move Send"
     * entry. Resolves once this slot has emptied (or, for a copy, once LUNA has answered).
     *
     * @example await drums.outputs.byId('send_0').moveTo(bass.id);
     */
    async moveTo(channel, options = {}) {
      if (this.isCue) throw new UAError("out_of_range", `${this.id}: a cue output cannot be moved`, { path: this.path });
      const index = options.index ?? this.index;
      if (index === void 0 || !Number.isInteger(index) || index < 0 || index >= SEND_COUNT) {
        throw new UAError("out_of_range", `moveTo(): index must be 0..${SEND_COUNT - 1}`, { path: this.path });
      }
      const destinationUid = typeof channel === "string" ? channel : channel.id;
      const { sessionPath, sessionUid, channelUid: source } = this.owner();
      await this.wire.post(`${sessionPath}/move_send`, {
        session_uid: sessionUid,
        source_uid: source,
        source: this.id,
        destination_uid: destinationUid,
        destination: `send_${index}`,
        copy: options.copy === true
      });
      if (options.copy !== true) await this.settled(() => this.list().length === 0, "move send");
    }
    release() {
      this.controls.dispose();
      this.meter.dispose();
    }
  };
  function destinationOf(uid, row, client, objectPath) {
    const cell = (name) => client.store.cell(objectPath, name).value;
    const desc = cell("output_desc");
    const busUid = row ? row.value : cell("output_node_uid");
    const error = row ? row.connection_error : cell("connection_error");
    const stem = row?.stem_format ?? desc?.stem_format;
    return Object.freeze({
      uid,
      busUid: typeof busUid === "string" && busUid ? busUid : void 0,
      name: String(row?.name ?? desc?.name ?? ""),
      busType: typeof row?.type === "string" ? row.type : void 0,
      stereo: stem !== "mono",
      error: typeof error === "string" && error ? error : void 0
    });
  }

  // src/model/effect.ts
  var PLUGIN_ERROR_MISSING = "mixer.missing_plug-in";
  var Effect = class extends Node {
    /** @internal */
    constructor(client, path, sessionUid, channelUid) {
      super(client, path);
      this.sessionUid = sessionUid;
      this.channelUid = channelUid;
      this.uid = this.prop("uid");
      this.insertType = this.prop("insert_type");
      this.pluginId = this.prop("plugin_id");
      this.pluginName = this.prop("plugin_name");
      this.enabled = this.prop("enabled");
      this.pluginPower = this.prop("plugin_power");
      this.presetName = this.prop("preset_name");
      this.presetUid = this.prop("preset_uid");
      this.presetDirty = this.prop("preset_uid_dirty");
      this.frozen = this.prop("frozen");
      this.sidechainAllowed = this.prop("sidechain_allowed");
      this.sidechainInUse = this.prop("sidechain_in_use");
      this.pluginError = this.prop("plugin_error");
      this.pluginLicenseError = this.prop("plugin_license_error");
      this.bypassControl = this.prop("bypass_control");
      this.bypassControlActiveLow = this.prop("bypass_control_active_low");
      this.controls = new Controls(client, `${path}/controls`);
      this.instanceId = this.prop("external_sdk_instance_id");
      this.loaded = derived([this.pluginId, this.instanceId, this.pluginError], () => !this.isEmpty && this.instanceId.value !== null && this.instanceId.value !== void 0 && !this.pluginError.value);
      const bypassValue = derived([this.bypassControl], () => {
        const name = this.bypassControl.value;
        return name ? this.controls.get(name).value.value : void 0;
      });
      this.in = derived([bypassValue, this.bypassControlActiveLow], () => {
        const name = this.bypassControl.value;
        if (!name) return void 0;
        const v = this.controls.get(name).value.value;
        if (v === void 0) return void 0;
        const on = v !== 0;
        return this.bypassControlActiveLow.value === true ? !on : on;
      });
    }
    sessionUid;
    channelUid;
    uid;
    insertType;
    /** Plugin id (for example `com.uaudio.uadx.1176`), or `null` when the slot is empty. */
    pluginId;
    pluginName;
    /** Reported by the engine; not the bypass state. See {@link in}. */
    enabled;
    pluginPower;
    presetName;
    presetUid;
    presetDirty;
    frozen;
    sidechainAllowed;
    sidechainInUse;
    pluginError;
    pluginLicenseError;
    /** Name of the control that carries the IN/OUT state, or `null` if the plugin has none. */
    bypassControl;
    bypassControlActiveLow;
    /** IN (true) or bypassed (false); `undefined` until known or when the plugin has no bypass control. */
    in;
    /**
     * The plugin instance id, set once the plugin has loaded (fact 86). `plugin_name` is not a
     * load signal: it can stay null for a loaded plugin; the catalog has the name.
     */
    instanceId;
    /** True once a plugin is loaded in this slot without an error. */
    loaded;
    /**
     * Every child of the slot's `controls` folder, including parameters a cleared plugin left
     * behind (fact 86). Prefer {@link params}.
     */
    controls;
    get isEmpty() {
      const id = this.pluginId.value;
      return id === null || id === void 0 || id === "";
    }
    /** True for the user-facing `effect_N` slots. */
    get isEffectSlot() {
      return this.id.startsWith("effect_");
    }
    /** The control carrying the IN/OUT state, if the plugin has one. */
    get bypass() {
      const name = this.bypassControl.value;
      return name ? this.controls.get(name) : void 0;
    }
    /**
     * The plugin's live parameters, in engine order: the `controls` that are `initialized`.
     * A cleared slot keeps its old parameters as ghosts (fact 86); they are left out here.
     * Writes are touch-bracketed like any control, which makes them undoable (fact 85).
     *
     * @example
     * await slot.controls.load();
     * for (const p of slot.params) console.log(p.name.value, p.display.value);
     */
    get params() {
      return this.controls.items.filter((c) => c.initialized.value === true);
    }
    /**
     * Load a plugin into this slot (replacing any current one) and resolve once it has
     * loaded. `set_inserts` answers `null` whether or not the plugin exists (fact 86), so the
     * slot is the proof: an unknown or unusable plugin rejects with the slot's
     * `plugin_error` as the code (for example `mixer.missing_plug-in`). Pass `wait: false`
     * to resolve on the reply alone.
     *
     * A preset can ride in the same call: `presetUid` (from {@link Presets.find}) makes LUNA
     * load that preset onto the effect — state and identity, which is what the preset browser
     * keys on — while `presetName` alone only labels the effect (fact 99).
     *
     * @example
     * await slot.setPlugin('com.uaudio.uadx.1176');
     * slot.loaded.value; // true
     * const preset = await luna.presets.find('uaudio_qi', '4-Band EQ');
     * await slot.setPlugin('uaudio_qi', { presetName: preset?.name, presetUid: preset?.uid });
     */
    async setPlugin(pluginId, options = {}) {
      const insert = { insert_type: this.id, plugin_id: pluginId };
      if (options.pluginName !== void 0) insert["plugin_name"] = options.pluginName;
      if (options.presetName !== void 0) insert["preset_name"] = options.presetName;
      if (options.presetUid !== void 0) insert["preset_uid"] = options.presetUid;
      const reply = await this.wire.post(`/sessions/${this.sessionUid}/set_inserts`, { session_uid: this.sessionUid, channel_uid: this.channelUid, inserts: [insert] });
      if (options.wait === false) return reply;
      await this.waitForPlugin(options.timeoutMs, pluginId);
      const error = this.pluginError.value;
      if (error) throw new UAError(error, `${pluginId} did not load into ${this.id}: ${error}`, { path: this.path });
      return reply;
    }
    /** Remove the plugin from this slot. */
    clear() {
      return this.wire.post(`/sessions/${this.sessionUid}/set_inserts`, { session_uid: this.sessionUid, channel_uid: this.channelUid, inserts: [{ insert_type: this.id, plugin_id: "" }] });
    }
    /**
     * Resolve once the slot holds a loaded plugin (it has an instance id) or reports a
     * `plugin_error` (fact 86). With `pluginId`, wait for that plugin rather than whatever
     * the slot held before. Rejects with {@link RequestTimeout} after `timeoutMs`.
     *
     * @example
     * await slot.waitForPlugin();
     * if (slot.pluginError.value) show(slot.pluginError.value);
     */
    waitForPlugin(timeoutMs = 1e4, pluginId) {
      const done = () => {
        if (pluginId !== void 0 && this.pluginId.value !== pluginId) return false;
        return this.loaded.value === true || Boolean(this.pluginError.value);
      };
      if (done()) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const offs = [];
        const finish = (err) => {
          clearTimeout(timer);
          for (const off of offs) off();
          if (err) reject(err);
          else resolve();
        };
        const timer = setTimeout(() => finish(new RequestTimeout("set_inserts", this.path, timeoutMs)), timeoutMs);
        const check = () => {
          if (done()) finish();
        };
        offs.push(this.pluginId.onChange(check), this.instanceId.onChange(check), this.pluginError.onChange(check));
        void this.client.store.load(this.path, { children: false, commands: false, flatvalue: true }).then(check, () => {
        });
      });
    }
    /** Set IN (true) or bypass (false) through the engine's undoable, group-aware path. */
    setIn(on, contextType = "main") {
      return this.wire.post(`/sessions/${this.sessionUid}/contexts/${contextType}/commands/set_inserts_in_out`, {
        session_uid: this.sessionUid,
        channel_uid: this.channelUid,
        inserts: [this.id],
        value: on
      });
    }
    /** Step through the plugin's presets. */
    nextPreset() {
      return this.post("commands/preset_browser_increment");
    }
    previousPreset() {
      return this.post("commands/preset_browser_decrement");
    }
    release() {
      this.controls.dispose();
    }
  };

  // src/model/channel.ts
  var Channel = class extends Node {
    /** @internal */
    constructor(client, path, sessionUid) {
      super(client, path);
      this.sessionUid = sessionUid;
      this.uid = this.prop("uid");
      this.name = this.writableProp("name");
      this.order = this.prop("order");
      this.color = this.writableProp("color");
      this.comments = this.writableProp("comments");
      this.stemFormat = this.prop("stem_format");
      this.automationMode = this.prop("automation_mode");
      this.folderUid = this.prop("folder_uid");
      this.frozen = this.prop("frozen");
      this.enabled = this.prop("enabled");
      this.controls = new Controls(client, `${path}/controls`);
      this.outputs = new Collection(client, `${path}/outputs`, (p) => new Output(client, p), { levels: 3, commands: false, flatvalue: true });
      this.main = new Output(client, `${path}/outputs/main`);
      this.effects = new Collection(client, `${path}/effects`, (p) => new Effect(client, p, sessionUid, this.id), { levels: 2, commands: false, flatvalue: true });
    }
    sessionUid;
    uid;
    name;
    order;
    /** ARGB packed integer as the engine stores it. */
    color;
    comments;
    stemFormat;
    automationMode;
    folderUid;
    frozen;
    enabled;
    /** Strip-level controls (`solo`, trims, preamp). */
    controls;
    outputs;
    /** The `main` output, always present. */
    main;
    /** All insert slots, including `console` and `sidechain_filter`. See {@link effectSlots}. */
    effects;
    /** The user-facing `effect_0`..`effect_N` slots in order. */
    get effectSlots() {
      return this.effects.items.filter((e) => e.isEffectSlot).sort((a, b) => a.id.localeCompare(b.id, void 0, { numeric: true }));
    }
    /** Effect slots that hold a plugin. */
    get loadedEffects() {
      return this.effectSlots.filter((e) => !e.isEmpty);
    }
    /** Load a plugin into the first empty effect slot (or a named slot). */
    async insert(pluginId, slot) {
      await this.effects.load();
      const target = slot ? this.effects.byId(slot) : this.effectSlots.find((e) => e.isEmpty);
      if (!target) return void 0;
      await target.setPlugin(pluginId);
      return target;
    }
    /** Main output gain. */
    get gain() {
      return this.main.gain;
    }
    /** Main output pan. */
    get pan() {
      return this.main.pan;
    }
    /** Main output mute. */
    get mute() {
      return this.main.mute;
    }
    /** Main output level meter. */
    get meter() {
      return this.main.meter;
    }
    /** Load this strip's properties plus the main output's controls in two round trips. */
    async loadStrip() {
      await Promise.all([this.load({ flatvalue: true, commands: false }), this.main.controls.load()]);
    }
    release() {
      this.controls.dispose();
      this.outputs.dispose();
      this.main.dispose();
      this.effects.dispose();
    }
  };

  // src/model/track.ts
  var Track = class extends Channel {
    trackType;
    ioType;
    recordEnabled;
    /**
     * The track's input monitor switch (`input_monitor`). LUNA can monitor the input while
     * this is off, for example auto-monitoring an armed track; read `inputMonitoring` for what
     * is happening now. Turning it on rejects with `uasrv.invalid_value` while the record mute
     * preference is on and no Apollo is active (fact 88).
     *
     * @example
     * await t.inputMonitor.set(true);
     * t.inputMonitor.onChange(() => console.log('switch', t.inputMonitor.value));
     */
    inputMonitor;
    /**
     * Whether LUNA is monitoring this track's input right now (`input_monitor_state`,
     * read-only). It can be true while `inputMonitor` is false: an armed track is monitored
     * while stopped or punched in (fact 88).
     *
     * @example
     * t.inputMonitoring.onChange(() => led.classList.toggle('on', t.inputMonitoring.value === true));
     */
    inputMonitoring;
    /** Description of the assigned input. */
    inputDesc;
    inputNodeUid;
    /** Uid of the active playlist; the playlist object lives under `session.playlists`. */
    playlistUid;
    hasPreamp;
    recordMute;
    /** @internal */
    constructor(client, path, sessionUid) {
      super(client, path, sessionUid);
      this.trackType = this.prop("track_type");
      this.ioType = this.prop("io_type");
      this.recordEnabled = this.writableProp("record_enabled");
      this.inputMonitor = this.writableProp("input_monitor");
      this.inputMonitoring = this.prop("input_monitor_state");
      this.inputDesc = this.prop("input_desc");
      this.inputNodeUid = this.writableProp("input_node_uid");
      this.playlistUid = this.prop("playlist_uid");
      this.hasPreamp = this.prop("has_preamp");
      this.recordMute = this.prop("record_mute");
    }
    /** Track solo (a track-level control, unlike mute which is on the main output). */
    get solo() {
      return this.controls.get("solo");
    }
    /** Set the automation mode (`off | read | write | touch | latch`). */
    setAutomationMode(mode) {
      return this.wire.post(`/sessions/${this.sessionUid}/set_automode_on_tracks`, { uid: this.sessionUid, tracks: [this.id], automation_mode: automationModeOrdinal(mode) });
    }
    /** Delete this track. */
    async delete() {
      await this.wire.post(`/sessions/${this.sessionUid}/delete_tracks`, { session_uid: this.sessionUid, track_uid: [this.id] });
    }
    /** Duplicate this track. Resolves to the reply, which names the new channel. */
    duplicate(options = {}) {
      const payload = { session_uid: this.sessionUid, track_uid: [this.id] };
      if (options.includeContent !== void 0) payload["include_content"] = options.includeContent;
      return this.wire.post(`/sessions/${this.sessionUid}/duplicate_tracks`, payload);
    }
  };

  // src/model/bus.ts
  var Bus = class extends Channel {
    busType;
    folderMode;
    /** @internal */
    constructor(client, path, sessionUid) {
      super(client, path, sessionUid);
      this.busType = this.prop("bus_type");
      this.folderMode = this.prop("folder_mode");
    }
    get isMaster() {
      return this.busType.value === "master";
    }
    /** A folder is an aux bus whose folder mode is not `none`. */
    get isFolder() {
      const m = this.folderMode.value;
      return m !== void 0 && m !== "none";
    }
  };

  // src/model/transport.ts
  var Transport = class extends Node {
    /** @internal */
    constructor(client, sessionPath, musical) {
      super(client, sessionPath);
      this.musical = musical;
      this.playing = this.writableProp("playing");
      this.recordEnabled = this.writableProp("record_enabled");
      this.looping = this.writableProp("looping");
      this.playStart = this.writableProp("play_start");
      this.loopStart = this.writableProp("loop_start");
      this.loopStop = this.writableProp("loop_stop");
      this.arrangementStart = this.writableProp("arrangement_start");
      this.location = this.prop("location");
      this.tempo = derived([this.location], () => this.location.value?.tempo, { distinct: true });
      this.timeSignature = derived([this.location], () => this.location.value?.time_signature, { distinct: true });
      this.countingIn = this.prop("counting_in");
      this.punchedIn = this.prop("punched_in");
      this.maxTick = this.prop("max_tick");
      this.tempoPercent = this.prop("tempo_percent");
      this.recPlayMode = this.prop("rec_play_mode");
      this.countInEnabled = this.writableProp("count_in_enabled");
      this.preRollEnabled = this.writableProp("pre_roll_enabled");
      this.postRollEnabled = this.writableProp("post_roll_enabled");
    }
    musical;
    playing;
    recordEnabled;
    looping;
    /** Where playback starts (ticks); also the resting playhead when stopped. */
    playStart;
    loopStart;
    loopStop;
    /** Where {@link returnToZero} goes (ticks). LUNA reads it as 0 until it is set (fact 89). */
    arrangementStart;
    /** Live playhead, pushed many times per second while playing. */
    location;
    /**
     * Tempo in effect at the playhead (BPM), carved out of the `location` pushes (fact 95: a
     * tempo edit shows here at once). Notifies only when the number moves, so a BPM display is
     * not re-rendered on every playhead push.
     *
     * @example
     * t.tempo.onChange(() => bpm.textContent = `${t.tempo.value ?? '--'} BPM`);
     */
    tempo;
    /**
     * Time signature in effect at the playhead, carved out of the `location` pushes. Notifies
     * only when it changes. Format with `Luna.formatTimeSignature`.
     *
     * @example
     * t.timeSignature.onChange(() => meter.textContent = Luna.formatTimeSignature(t.timeSignature.value));
     */
    timeSignature;
    countingIn;
    punchedIn;
    maxTick;
    tempoPercent;
    recPlayMode;
    countInEnabled;
    preRollEnabled;
    postRollEnabled;
    /** Current playhead in ticks: the live location while playing, else the play start. */
    get tick() {
      return this.location.value?.tick ?? this.playStart.value ?? 0;
    }
    /**
     * Current playhead in wall-clock seconds: {@link tick} converted through the session's
     * tempo map (`session.musical.timeline.seconds`), so tempo changes are honoured. Like
     * {@link tick}, it is the live location while playing and the play start when stopped.
     *
     * The tempo map loads with the session (`session.ready()`, which `luna.session()` awaits),
     * so it is safe to read on any session obtained normally. Read before that, it throws
     * `unavailable` rather than converting at a guessed tempo.
     *
     * @example
     * el.textContent = Luna.formatMinSec(t.seconds, { fraction: 1 });
     */
    get seconds() {
      if (!this.musical) throw new UAError("unavailable", "transport.seconds: this transport has no timeline", { path: this.path });
      const musical = this.musical();
      if (musical.tempoMap.items.length === 0) {
        throw new UAError("unavailable", "transport.seconds: the tempo map is not loaded; await session.ready() (or session.musical.ready()) first", { path: this.path });
      }
      return musical.timeline.seconds(this.tick);
    }
    play() {
      return this.playing.set(true);
    }
    stop() {
      return this.playing.set(false);
    }
    toggle() {
      return this.playing.set(!(this.playing.value ?? false));
    }
    /** Arm and start recording. */
    async record() {
      await this.recordEnabled.set(true);
      if (!this.playing.value) await this.play();
    }
    /**
     * LUNA's record toggle (fact 80): flip the session's `record_enabled`, and start playback
     * when that turned record on while stopped. Turning record off leaves playback running.
     */
    async toggleRecord() {
      const on = !(this.recordEnabled.value ?? false);
      await this.recordEnabled.set(on);
      if (on && !this.playing.value) await this.play();
    }
    /**
     * Move the playhead the way LUNA's own locate does (fact 89): the play start and both loop
     * points go to the target, so a drawn loop range is replaced by an empty one. Resolves once
     * LUNA shows the move; while playing, the playhead jumps as `options.sync` says.
     *
     * Tick 0 is not necessarily bar 1: a session with bars before bar 1 starts its timeline
     * earlier (fact 91). Seek to `{ bar: 1 }` for the downbeat of bar 1.
     *
     * @example
     * await t.seek({ bar: 1 });                    // the downbeat of bar 1, wherever it is
     * await t.seek({ bar: 9, beat: 3 });
     * await t.seek(Luna.WHOLE_NOTE * 4);           // a raw tick
     * await t.seek({ bar: 17 }, { sync: 'next_bar' });
     */
    async seek(to, options = {}) {
      const tick = requireTick(await this.resolve(to), "seek target");
      await Promise.all([this.playStart.set(tick), this.loopStart.set(tick), this.loopStop.set(tick)]);
      await this.confirmPlayStart(tick, "seek", options);
    }
    /**
     * Move the play start alone, leaving the loop range where it is: {@link seek} without
     * collapsing the loop marks. Resolves once LUNA shows the move (fact 90): stopped, the
     * playhead rests there; while playing, the playhead jumps as `options.sync` says.
     * Writing `playStart.set(tick)` instead only records the start, and while playing the
     * playhead carries on until a `sync`.
     *
     * @example
     * await t.setLoop(Luna.WHOLE_NOTE * 4, Luna.WHOLE_NOTE * 8);
     * await t.setPlayStart({ bar: 3 });               // start before the loop; the loop stays
     * await t.setPlayStart({ bar: 5 }, { sync: 'next_bar' });
     */
    async setPlayStart(to, options = {}) {
      const tick = requireTick(await this.resolve(to), "play start");
      await this.playStart.set(tick);
      await this.confirmPlayStart(tick, "setPlayStart", options);
    }
    async confirmPlayStart(tick, what, options) {
      if (this.playing.value === true) {
        const at = options.sync ?? "now";
        await this.sync(at);
        await this.reread(["play_start", "loop_start", "loop_stop", "playing"]);
        if (this.playStart.value !== tick) throw new UAError("no_effect", `${what}: play start reads ${String(this.playStart.value)}, not ${tick}`, { path: this.path });
        return;
      }
      await settle(() => this.location.value?.tick === tick, what, {
        path: this.path,
        refresh: () => this.reread(["play_start", "location", "playing"]),
        flush: () => this.client.store.scheduler.flush()
      });
    }
    /**
     * LUNA's Return To Zero (fact 89): {@link seek} to the arrangement start. That is tick 0
     * until the session sets one, and tick 0 need not be bar 1 (fact 91); for bar 1 use
     * `seek({ bar: 1 })`. Unlike LUNA's button it leaves the edit selection alone.
     *
     * @example
     * await session.transport.returnToZero();
     */
    async returnToZero(options = {}) {
      await this.reread(["arrangement_start", "playing"]);
      await this.seek(this.arrangementStart.value ?? 0, options);
    }
    async resolve(to) {
      if (typeof to === "number") return to;
      if (!this.musical) throw new UAError("unavailable", "seek: this transport has no timeline for bar positions", { path: this.path });
      const musical = this.musical();
      await musical.ready();
      return musical.timeline.tickAt(to);
    }
    reread(propfilter) {
      return this.client.store.load(this.path, { children: false, commands: false, propfilter });
    }
    async setLoop(startTick, stopTick) {
      await Promise.all([this.loopStart.set(startTick), this.loopStop.set(stopTick)]);
    }
    /** Restart playback, optionally quantised to the next bar or loop end. */
    sync(at = "now") {
      return this.post("sync_playback", { session_uid: this.id, next_bar: at === "next_bar", loop_end: at === "loop_end" }).then(() => void 0);
    }
  };

  // src/model/context.ts
  var SELECTION_PROPS = ["focus", "selection_start", "selection_stop", "selection_notes", "selection_playlists", "selection_tracks"];
  function selectedNotes(value) {
    if (!Array.isArray(value)) return Object.freeze([]);
    const out = [];
    for (const entry of value) {
      if (typeof entry !== "object" || entry === null) continue;
      const e = entry;
      if (typeof e.playlist_uid !== "string" || !Array.isArray(e.notes)) continue;
      const notes = e.notes.filter((n) => Array.isArray(n) && n.length === 4 && n.every((v) => typeof v === "number")).map((n) => Object.freeze([n[0], n[1], n[2], n[3]]));
      out.push(Object.freeze({ playlist_uid: e.playlist_uid, notes: Object.freeze(notes) }));
    }
    return Object.freeze(out);
  }
  var Context = class extends Node {
    /** @internal */
    constructor(client, path, sessionUid) {
      super(client, path);
      this.sessionUid = sessionUid;
      this.contextType = this.prop("context_type");
      this.selectionStart = this.writableProp("selection_start");
      this.selectionStop = this.writableProp("selection_stop");
      this.selectionTracks = this.writableProp("selection_tracks");
      this.selectionPlaylists = this.writableProp("selection_playlists");
      this.selectionNotes = this.writableProp("selection_notes");
      this.lastSelectedTrack = this.writableProp("last_selected_track");
      this.collapsedFolders = this.writableProp("collapsed_folders");
      this.pinnedTracks = this.prop("pinned_tracks");
      this.hiddenTracks = this.prop("hidden_tracks");
      this.pixelsPerTick = this.writableProp("pixels_per_tick");
      this.gridEnable = this.writableProp("grid_enable");
      this.grid = this.writableProp("grid");
      this.linkEditAndPlay = this.writableProp("link_edit_and_play");
      this.focus = this.prop("focus");
      this.settings = this.prop("settings");
      const settings = this.settings;
      this.waveformZoom = derived([settings], () => waveformZoomFrom(settings.value));
    }
    sessionUid;
    contextType;
    /** Selection range in ticks; `null` when nothing is selected. */
    selectionStart;
    selectionStop;
    selectionTracks;
    selectionPlaylists;
    /**
     * Selected notes per playlist, in absolute ticks. The selection-based MIDI verbs
     * (`mute_notes`, `clear`, `change_velocity`) act on this, not on a clip (fact 74).
     */
    selectionNotes;
    /** The focused track, distinct from the selected set. */
    lastSelectedTrack;
    collapsedFolders;
    pinnedTracks;
    hiddenTracks;
    /** Zoom. */
    pixelsPerTick;
    gridEnable;
    /** Grid size such as `1_4`, `1_8`, `bar`. */
    grid;
    linkEditAndPlay;
    focus;
    /** The window's saved settings, a JSON string LUNA writes on a delayed save. */
    settings;
    /**
     * LUNA's waveform zoom for this window: the amplitude multiplier its timeline draws audio
     * with, 1 by default, doubled or halved by Zoom In/Out Waveform and bounded 1/8..256. Pass
     * it with the clip gain to {@link waveformColumns} to draw at LUNA's height. It is read from
     * {@link settings}, which LUNA saves some time after a change rather than at once (fact 94).
     *
     * @example
     * const gain = session.context.waveformZoom.value * 10 ** ((clip.gain.value ?? 0) / 20);
     */
    waveformZoom;
    /** Set range and/or tracks in one go; omitted parts are left alone. */
    async select(options) {
      const writes = [];
      if (options.startTick !== void 0) writes.push(this.selectionStart.set(options.startTick));
      if (options.stopTick !== void 0) writes.push(this.selectionStop.set(options.stopTick));
      if (options.trackUids !== void 0) writes.push(this.selectionTracks.set(options.trackUids));
      await Promise.all(writes);
      if (writes.length) await this.wire.get(this.path, { children: false, commands: false, flatvalue: true, propfilter: ["selection_start", "selection_stop", "selection_tracks"] });
    }
    /** The selected notes, decoded. Empty when nothing is selected. */
    get notes() {
      return selectedNotes(this.selectionNotes.value);
    }
    /**
     * The six selection properties as LUNA holds them now. A wrapper that has to move the
     * user's selection to do its work takes one of these first and {@link restore}s it after,
     * so the page never disturbs what the user had selected.
     *
     * @example
     * const saved = ctx.snapshot();
     * try { await ctx.selectNotes(playlistUid, rows); await ctx.run('mute_notes'); }
     * finally { await ctx.restore(saved); }
     */
    snapshot() {
      const read = (p) => this.client.store.cell(this.path, p).value;
      return Object.freeze({
        focus: read("focus"),
        selection_start: read("selection_start"),
        selection_stop: read("selection_stop"),
        selection_notes: read("selection_notes"),
        selection_playlists: read("selection_playlists"),
        selection_tracks: read("selection_tracks")
      });
    }
    /** Write a snapshot back. No undo entry; LUNA echoes each property. */
    async restore(snapshot) {
      const record = snapshot;
      if (!SELECTION_PROPS.some((p) => record[p] !== void 0)) {
        throw new UAError("out_of_range", `restore(): expected a snapshot() value (keys ${SELECTION_PROPS.join(", ")})`, { path: this.path });
      }
      for (const p of SELECTION_PROPS) {
        const value = record[p];
        if (value === void 0) continue;
        await this.client.store.set(this.path, p, value);
      }
    }
    /**
     * Select exactly these notes on one playlist, with the range and focus to match. Ticks are
     * absolute, as LUNA stores them: `[pitch, start, stop, rowid]`.
     */
    async selectNotes(playlistUid, notes) {
      await this.client.store.set(this.path, "focus", "notes");
      await this.client.store.set(this.path, "selection_playlists", [playlistUid]);
      if (notes.length) {
        await this.client.store.set(this.path, "selection_start", Math.min(...notes.map((n) => n[1])));
        await this.client.store.set(this.path, "selection_stop", Math.max(...notes.map((n) => n[2])));
      }
      await this.client.store.set(this.path, "selection_notes", [{ playlist_uid: playlistUid, notes: notes.map((n) => [...n]) }]);
    }
    /** Re-read the six selection properties (they also arrive as events). */
    refreshSelection() {
      return this.client.store.load(this.path, { children: false, commands: false, propfilter: [...SELECTION_PROPS] });
    }
    /** Run one of the context's edit commands (`copy`, `paste`, `duplicate`, `select_all`, ...). */
    run(command, payload = {}) {
      return this.wire.post(`${this.path}/commands/${command}`, { session_uid: this.sessionUid, ...payload });
    }
    selectAll() {
      return this.run("select_all");
    }
    copy() {
      return this.run("copy");
    }
    cut() {
      return this.run("cut");
    }
    paste() {
      return this.run("paste");
    }
    duplicate() {
      return this.run("duplicate");
    }
    /** Delete the selected content. */
    clear() {
      return this.run("clear");
    }
    /** Move the selection by `ticks` (negative moves earlier). */
    nudge(ticks) {
      return this.run("nudge", { ticks });
    }
    separateClips() {
      return this.run("separate_clips");
    }
    consolidate() {
      return this.run("consolidate");
    }
    muteClips() {
      return this.run("mute_clips");
    }
  };
  function waveformZoomFrom(settings) {
    if (typeof settings !== "string" || !settings) return 1;
    try {
      const zoom = JSON.parse(settings).auido_waveform_zoom;
      return typeof zoom === "number" && Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
    } catch {
      return 1;
    }
  }

  // src/model/midi.ts
  function decodeMidiData(packed) {
    return { status: packed >>> 16 & 255, data1: packed >>> 8 & 127, data2: packed & 127 };
  }
  function encodeMidiData(status, data1, data2 = 0) {
    return (status & 255) << 16 | (data1 & 127) << 8 | data2 & 127;
  }
  function isRowData(v) {
    return typeof v === "object" && v !== null && Array.isArray(v.row_ids) && typeof v.operation === "string";
  }
  function rowsOf(data, origin) {
    const out = [];
    data.row_ids.forEach((rowid, i) => {
      const packed = data.midi_data?.[i];
      const tick = data.tick?.[i];
      if (typeof rowid !== "number" || typeof packed !== "number" || typeof tick !== "number") return;
      const { status, data1, data2 } = decodeMidiData(packed);
      out.push(Object.freeze({ rowid, tick: tick - origin, status, channel: status & 15, data1, data2, enabled: data.enabled?.[i] !== false }));
    });
    return out;
  }
  var byTick = (a, b) => a.tick - b.tick || a.rowid - b.rowid;
  var isNoteOn = (e) => (e.status & 240) === 144 && e.data2 > 0;
  var isNoteOff = (e) => (e.status & 240) === 128 || (e.status & 240) === 144 && e.data2 === 0;
  function pairNotes(rows) {
    const open = /* @__PURE__ */ new Map();
    const notes = [];
    for (const e of [...rows].sort(byTick)) {
      const key = `${e.channel}:${e.data1}`;
      if (isNoteOn(e)) {
        const list = open.get(key) ?? [];
        list.push(e);
        open.set(key, list);
      } else if (isNoteOff(e)) {
        const on = open.get(key)?.shift();
        if (!on) continue;
        notes.push(Object.freeze({ rowid: on.rowid, offRowid: e.rowid, pitch: on.data1, channel: on.channel, startTick: on.tick, stopTick: e.tick, velocity: on.data2, offVelocity: e.data2, muted: !on.enabled }));
      }
    }
    for (const list of open.values()) {
      for (const on of list) notes.push(Object.freeze({ rowid: on.rowid, offRowid: void 0, pitch: on.data1, channel: on.channel, startTick: on.tick, stopTick: void 0, velocity: on.data2, offVelocity: void 0, muted: !on.enabled }));
    }
    return notes.sort((a, b) => a.startTick - b.startTick || a.rowid - b.rowid);
  }
  function hostFromPath(clipPath) {
    const parts = clipPath.split("/");
    const sessionUid = parts[2] ?? "";
    return {
      sessionPath: `/sessions/${sessionUid}`,
      sessionUid,
      playlistUid: parts[4] ?? "",
      clipUid: parts[6] ?? "",
      startTick: () => void 0
    };
  }
  var MidiClip = class extends Node {
    /** @internal Created by {@link Clip.midi}. */
    constructor(client, clipPath, origin, host) {
      super(client, `${clipPath}/midi/table`);
      this.origin = origin;
      this.host = host ?? hostFromPath(clipPath);
      this.eventsCell = new Cell(client.store.scheduler, []);
      this.notesCell = new Cell(client.store.scheduler, []);
      this.events = listOf(this.eventsCell, (row) => String(row.rowid));
      this.notes = listOf(this.notesCell, (note) => String(note.rowid));
    }
    origin;
    /** Every row, in tick order. `byId` takes a row id. */
    events;
    /** Paired notes, in start order. `byId` takes a note-on row id. */
    notes;
    rows = /* @__PURE__ */ new Map();
    eventsCell;
    notesCell;
    releases = [];
    /** Deltas applied since the last whole table, stamped so a re-read can discard older ones. */
    deltas = [];
    /**
     * The last whole table and the version it arrived at. Kept here rather than read back
     * from the cell, because the cell also receives the deltas (the store applies every push
     * to it), so its value is not necessarily a whole table.
     */
    table = { operation: "update", row_ids: [] };
    tableVersion = 0;
    readyPromise;
    /** The clip this table belongs to, and how to reach its session's edit context. */
    host;
    contextView;
    /** The table tick that sits at the clip's start (fact 41). */
    get shift() {
      return this.origin.value ?? 0;
    }
    /**
     * Read the table and start following edits. Idempotent, like `Node.load`.
     *
     * @example
     * await clip.midi.ready();
     */
    ready() {
      this.readyPromise ??= this.seed();
      return this.readyPromise;
    }
    async seed() {
      const cell = this.client.store.cell(this.path, "row_data");
      this.releases.push(this.client.store.onEvent((event) => this.onEvent(event.path, event.data, event.operation !== void 0)));
      await this.client.store.load(this.path, { children: false, flatvalue: true, commands: false, propfilter: "row_data" });
      if (this.disposed) return;
      this.replace(isRowData(cell.value) ? cell.value : { operation: "update", row_ids: [] }, cell.version);
      this.releases.push(
        cell.onChange(() => {
          if (isRowData(cell.value) && cell.value.operation === "update") this.replace(cell.value, cell.version);
        })
      );
      this.releases.push(this.origin.onChange(() => this.replace(this.table, this.tableVersion)));
      this.client.store.scheduler.flush();
    }
    onEvent(path, data, structural) {
      if (this.disposed || structural) return;
      if (path !== `${this.path}/row_data` || !isRowData(data)) return;
      if (data.operation === "update") return;
      this.deltas.push({ stamp: nextVersion(), delta: data });
      if (this.deltas.length > 256) this.deltas.splice(0, this.deltas.length - 256);
      this.apply(data);
      this.publish();
    }
    replace(table, version) {
      this.table = table;
      this.tableVersion = version;
      this.rows.clear();
      for (const row of rowsOf(table, this.shift)) this.rows.set(row.rowid, row);
      this.deltas = this.deltas.filter((d) => d.stamp > version);
      for (const { delta } of this.deltas) this.apply(delta);
      this.publish();
    }
    apply(delta) {
      if (delta.operation === "deleted") {
        for (const rowid of delta.row_ids) this.rows.delete(rowid);
        return;
      }
      for (const row of rowsOf(delta, this.shift)) this.rows.set(row.rowid, row);
    }
    publish() {
      const events = Object.freeze([...this.rows.values()].sort(byTick));
      this.eventsCell.update(events);
      this.notesCell.update(Object.freeze(pairNotes(events)));
    }
    // ── editing ───────────────────────────────────────────────────────────────────────────
    // Each verb posts once and then waits for the rows to show the change: LUNA answers `null`
    // whether or not anything happened (fact 71), so the reply is not proof.
    /** The session's `main` edit context, for the selection the note verbs act through. */
    get context() {
      this.contextView ??= new Context(this.client, `${this.host.sessionPath}/contexts/main`, this.host.sessionUid);
      return this.contextView;
    }
    /**
     * Set several notes' velocities in one post: one "Change Velocities" undo entry for the
     * whole batch, where {@link setVelocity} in a loop would be one entry per note. `off`
     * targets each note's note-off row instead of its note-on.
     *
     * @example
     * // Scale every velocity in the clip by a percentage, as one undo entry.
     * await clip.midi.setVelocities(clip.midi.notes.items.map((n) => ({ note: n, velocity: Math.max(1, Math.min(127, Math.round(n.velocity * 1.25))) })));
     */
    async setVelocities(changes, options = {}) {
      if (this.disposed) throw new UAError("disposed", "setVelocities(): the clip is gone", { path: this.path });
      if (changes.length === 0) throw new UAError("out_of_range", "setVelocities(): no changes given", { path: this.path });
      const rows = [];
      const expected = [];
      for (const change of changes) {
        const note = this.resolveOne(change.note);
        const rowid = options.off ? note.offRowid : note.rowid;
        if (rowid === void 0) throw new UAError("not_found", "setVelocities(): a note has no note-off row", { path: this.path });
        const velocity = midiByte(change.velocity, "velocity", 1);
        rows.push({ rowid, velocity });
        expected.push({ rowid: note.rowid, velocity });
      }
      await this.wire.post(`${this.host.sessionPath}/contexts/main/commands/change_velocity`, { session_uid: this.host.sessionUid, velocity_on: options.off !== true, notes: rows });
      await settle(() => expected.every((e) => (options.off ? this.notes.byId(String(e.rowid))?.offVelocity : this.notes.byId(String(e.rowid))?.velocity) === e.velocity), "change velocities", this.settleOptions());
    }
    /** Set one note's velocity. `off` targets the note-off row. One "Change Velocities" undo entry. */
    setVelocity(note, velocity, options = {}) {
      return this.setVelocities([{ note, velocity }], options);
    }
    /**
     * Mute or unmute notes. LUNA's `mute_notes` is a toggle over the selection (fact 74), so
     * this selects only the notes whose state must change, posts once, and restores the user's
     * selection. Nothing is posted — and no undo entry made — when nothing needs changing.
     *
     * @example
     * // Mute everything quieter than 40, as one undo entry.
     * await clip.midi.setMuted(clip.midi.notes.items.filter((n) => n.velocity < 40), true);
     */
    async setMuted(notes, muted) {
      const targets = this.resolve(notes).filter((n) => n.muted !== muted);
      if (!targets.length) return;
      await this.withSelection(targets, async () => {
        await this.wire.post(`${this.host.sessionPath}/contexts/main/commands/mute_notes`, { session_uid: this.host.sessionUid });
        await settle(() => targets.every((t) => this.notes.byId(String(t.rowid))?.muted === muted), "mute notes", this.settleOptions());
      });
    }
    /**
     * Delete notes: `clear` over a selection of exactly these notes, one undo entry, with the
     * user's selection restored afterwards.
     *
     * @example
     * await clip.midi.deleteNotes([clip.midi.notes.items[0]!]);
     */
    async deleteNotes(notes) {
      const targets = this.resolve(notes);
      if (!targets.length) return;
      await this.withSelection(targets, async () => {
        await this.wire.post(`${this.host.sessionPath}/contexts/main/commands/clear`, { session_uid: this.host.sessionUid });
        await settle(() => targets.every((t) => this.notes.byId(String(t.rowid)) === void 0), "delete notes", this.settleOptions());
      });
    }
    resolveOne(note) {
      const found = this.notes.byId(String(typeof note === "number" ? note : note.rowid));
      if (!found) throw new UAError("not_found", "no such note in this clip", { path: this.path });
      return found;
    }
    resolve(notes) {
      if (this.disposed) throw new UAError("disposed", "the clip is gone", { path: this.path });
      return notes.map((n) => this.resolveOne(n));
    }
    /** Save the user's selection, select `targets` (absolute ticks), run `fn`, restore. */
    async withSelection(targets, fn) {
      if (this.host.batching?.()) {
        throw new UAError(
          "busy",
          "setMuted()/deleteNotes() select the notes through LUNA's edit context, which a transaction() batch holds until its commit (the verb would then act on nothing): call them outside the batch",
          { path: this.path }
        );
      }
      const base = this.host.startTick();
      if (base === void 0) throw new UAError("unavailable", "the clip has no start tick yet", { path: this.path });
      const context = this.context;
      await context.refreshSelection().catch(() => {
      });
      const saved = context.snapshot();
      await context.selectNotes(
        this.host.playlistUid,
        targets.map((t) => [t.pitch, base + t.startTick, base + (t.stopTick ?? t.startTick), t.rowid])
      );
      try {
        await fn();
      } finally {
        await context.restore(saved).catch(() => {
        });
      }
    }
    settleOptions() {
      return { path: this.path, disposed: () => this.disposed, refresh: () => this.refresh(), flush: () => this.client.store.scheduler.flush() };
    }
    /**
     * Re-read the whole table. LUNA holds deltas back inside a batch transaction, so call
     * this after one if the lists look behind; deltas that arrive later still apply.
     */
    async refresh() {
      if (this.disposed) return;
      await this.client.store.load(this.path, { children: false, flatvalue: true, commands: false, propfilter: "row_data" });
    }
    release() {
      for (const release2 of this.releases) release2();
      this.releases.length = 0;
      this.client.store.forget(this.path);
    }
  };

  // src/model/clip.ts
  var CLIP_TYPES = { 0: "audio", 1: "video", 2: "midi" };
  function clipTypeFrom(raw) {
    if (typeof raw === "number") return CLIP_TYPES[raw];
    if (raw === "audio" || raw === "video" || raw === "midi") return raw;
    return void 0;
  }
  var Clip = class extends Node {
    /** @internal */
    constructor(client, path, sessionUid, batching) {
      super(client, path);
      this.sessionUid = sessionUid;
      this.batching = batching;
      this.uid = this.prop("uid");
      this.name = this.writableProp("name");
      this.start = this.prop("start");
      this.stop = this.prop("stop");
      this.sourceStart = this.prop("source_start");
      this.sourceStop = this.prop("source_stop");
      this.sourceUid = this.prop("source_uid");
      this.gain = this.writableProp("gain");
      this.layer = this.prop("layer");
      const mute = this.prop("mute");
      this.muted = derived([mute], () => mute.value === void 0 || mute.value === null ? void 0 : mute.value === true || mute.value === 1);
      const rawType = this.prop("clip_type");
      this.clipType = derived([rawType], () => clipTypeFrom(rawType.value));
      this.bypass = this.prop("bypass");
      this.renderSourceUid = this.prop("render_source_uid");
      this.renderState = this.prop("render_state");
      this.midiSourceStart = this.prop("midi_source_start");
    }
    sessionUid;
    batching;
    midiClip;
    deleting = false;
    uid;
    name;
    /** Timeline start, ticks. */
    start;
    /** Timeline end, ticks. */
    stop;
    /** Offset into the source file, nanoseconds. */
    sourceStart;
    /** End offset into the source file, nanoseconds. */
    sourceStop;
    /** Uid of the source audio file under the session's workspace `audio` folder. */
    sourceUid;
    /** Clip gain in dB. */
    gain;
    /** Stacking layer on its playlist; the higher layer plays where clips overlap. */
    layer;
    /** Whether the clip is muted (`mute`, reported as a boolean or 0/1). */
    muted;
    clipType;
    bypass;
    /**
     * The time-stretched source LUNA renders when the clip's tick span does not match its
     * source span at the session tempo, and the state of that render (`current` when it is the
     * audio actually played). {@link clipAudio} picks between this and `sourceUid` (fact 73).
     */
    renderSourceUid;
    renderState;
    /**
     * For a MIDI clip: the MIDI table tick that sits at this clip's start (fact 41). 0 for
     * rows created in place; the clip's start tick for an imported MIDI file.
     */
    midiSourceStart;
    /**
     * This clip's MIDI as live `events` and `notes` lists. Created on first use and shared;
     * call `ready()` before reading. Empty for an audio clip.
     *
     * @example
     * await clip.midi.ready();
     * clip.midi.notes.onChange(() => draw(clip.midi.notes.items));
     */
    get midi() {
      this.midiClip ??= new MidiClip(this.client, this.path, this.midiSourceStart, {
        sessionPath: `/sessions/${this.sessionUid}`,
        sessionUid: this.sessionUid,
        playlistUid: this.playlistUid,
        clipUid: this.id,
        startTick: () => this.start.value,
        batching: this.batching
      });
      return this.midiClip;
    }
    /**
     * Every field at once, as a frozen plain object, so a view draws one consistent state
     * rather than reading props across a push.
     *
     * @example
     * playlist.clips.onChange(() => draw(playlist.clips.items.map((c) => c.snapshot())));
     */
    snapshot() {
      return Object.freeze({
        uid: this.id,
        name: this.name.value,
        clipType: this.clipType.value,
        start: this.start.value,
        stop: this.stop.value,
        sourceUid: this.sourceUid.value,
        sourceStart: this.sourceStart.value,
        sourceStop: this.sourceStop.value,
        layer: this.layer.value,
        muted: this.muted.value,
        gain: this.gain.value,
        renderSourceUid: this.renderSourceUid.value,
        renderState: this.renderState.value,
        midiSourceStart: this.midiSourceStart.value
      });
    }
    /** The playlist this clip sits on, taken from its path. */
    get playlistUid() {
      return this.path.split("/")[4] ?? "";
    }
    /** Length on the timeline, ticks. */
    get length() {
      const a = this.start.value;
      const b = this.stop.value;
      return a === void 0 || b === void 0 ? void 0 : b - a;
    }
    sessionPost(command, payload) {
      if (this.disposed) return Promise.reject(new Disposed("Clip", this.path));
      return this.wire.post(`/sessions/${this.sessionUid}/${command}`, { session_uid: this.sessionUid, ...payload });
    }
    /** The cell listing this clip's siblings, and a re-read of it for {@link settle}. */
    settleOptions() {
      const parent = this.path.slice(0, this.path.lastIndexOf("/"));
      return { path: this.path, disposed: () => this.disposed && !this.deleting, refresh: () => this.client.store.load(parent, { levels: 2, commands: false, flatvalue: true }), flush: () => this.client.store.scheduler.flush() };
    }
    /**
     * Delete this clip and resolve once it has left its playlist. `delete_clip` answers the
     * same whether or not anything was deleted (fact 71), so the model is the proof.
     *
     * @example
     * await clip.delete();
     */
    async delete() {
      const reply = await this.sessionPost("delete_clip", { uid: this.id });
      const parent = this.path.slice(0, this.path.lastIndexOf("/"));
      this.deleting = true;
      try {
        await settle(() => !(this.client.store.children(parent).value ?? []).includes(this.id), "delete clip", this.settleOptions());
      } finally {
        this.deleting = false;
      }
      this.client.store.scheduler.flush();
      return reply;
    }
    /**
     * Set new timeline bounds (ticks). With `split`, cut the clip instead of trimming it; with
     * `stretch`, time-compress or expand the content to fit rather than revealing or hiding
     * source audio.
     *
     * `trim_clip` is a command of the **edit context**, not of the session.
     *
     * @example
     * await clip.trim(clip.start.value!, clip.stop.value! - Luna.QUARTER_NOTE);
     */
    async trim(startTick, stopTick, options = {}) {
      this.assertLive();
      const payload = { session_uid: this.sessionUid, clip_uid: this.id, start: requireTick(startTick, "startTick"), stop: requireTick(stopTick, "stopTick") };
      if (options.split !== void 0) payload["split"] = options.split;
      if (options.stretch !== void 0) payload["enable_tce"] = options.stretch;
      let reply;
      try {
        reply = await this.wire.post(`/sessions/${this.sessionUid}/contexts/main/commands/trim_clip`, payload);
      } catch (err) {
        if (err.code !== "uasrv.invalid_object") throw err;
        reply = await this.sessionPost("trim_clip", { clip_uid: this.id, context_type: "main", start: startTick, stop: stopTick, ...options.split !== void 0 ? { split: options.split } : {} });
      }
      if (options.split !== true) {
        await settle(() => this.start.value === startTick && this.stop.value === stopTick, "trim clip", { ...this.settleOptions(), refresh: () => this.client.store.load(this.path, { children: false, commands: false, flatvalue: true }) });
      }
      return reply;
    }
    /** Add raw MIDI events to this (MIDI) clip in one undo step. */
    addMidi(events) {
      const origin = this.midiSourceStart.value ?? 0;
      return this.sessionPost("add_midi", {
        midi: events.map((e) => {
          const ev = { clip_uid: this.id, tick: e.tick + origin, byte_0: e.status, byte_1: e.data1 };
          if (e.data2 !== void 0) ev["byte_2"] = e.data2;
          return ev;
        })
      });
    }
    /** Add a note: note-on at `tick`, note-off at `tick + lengthTicks`. */
    addNote(note, tick, lengthTicks, velocity = 100, channel = 0) {
      return this.addNotes([{ pitch: note, tick, lengthTicks, velocity, channel }]);
    }
    /**
     * Add several notes to this (MIDI) clip in one `add_midi` post, so they land as one undo
     * step. Each note is a note-on at `tick` and a note-off at `tick + lengthTicks`.
     *
     * @example
     * // A C major triad on beat 1, then its arpeggio.
     * await clip.addNotes([
     *   ...[60, 64, 67].map((pitch) => ({ pitch, tick: 0, lengthTicks: Luna.QUARTER_NOTE })),
     *   ...[60, 64, 67].map((pitch, i) => ({ pitch, tick: (i + 1) * Luna.QUARTER_NOTE, lengthTicks: Luna.QUARTER_NOTE, velocity: 80 })),
     * ]);
     */
    addNotes(notes) {
      if (!notes.length) return Promise.reject(new UAError("out_of_range", "addNotes(): give at least one note", { path: this.path }));
      let events;
      try {
        events = notes.flatMap((n) => {
          const pitch = midiByte(n.pitch, "pitch");
          const tick = requireTick(n.tick, "tick");
          const length = requireTick(n.lengthTicks, "lengthTicks");
          if (length <= 0) throw new UAError("out_of_range", "addNotes(): lengthTicks must be positive", { path: this.path });
          const velocity = midiByte(n.velocity ?? 100, "velocity", 1);
          const ch = n.channel ?? 0;
          if (!Number.isInteger(ch) || ch < 0 || ch > 15) throw new UAError("out_of_range", "addNotes(): channel must be an integer 0-15", { path: this.path });
          return [
            { tick, status: 144 | ch, data1: pitch, data2: velocity },
            { tick: tick + length, status: 128 | ch, data1: pitch, data2: 0 }
          ];
        });
      } catch (err) {
        return Promise.reject(err);
      }
      return this.addMidi(events);
    }
    bringToFront() {
      return this.sessionPost("bring_to_front", { uid: this.id });
    }
    sendToBack() {
      return this.sessionPost("send_to_back", { uid: this.id });
    }
    release() {
      this.midiClip?.dispose();
      this.midiClip = void 0;
    }
  };

  // src/model/playlist.ts
  var Playlist = class extends Node {
    uid;
    name;
    trackUid;
    /** Take number, 1-based. */
    version;
    stemFormat;
    frozen;
    clips;
    sessionUid;
    batching;
    contextView;
    /** @internal */
    constructor(client, path, sessionUid, batching) {
      super(client, path);
      this.uid = this.prop("uid");
      this.name = this.prop("name");
      this.trackUid = this.prop("track_uid");
      this.version = this.prop("version");
      this.stemFormat = this.prop("stem_format");
      this.frozen = this.prop("frozen");
      this.clips = new Collection(client, `${path}/clips`, (p) => new Clip(client, p, sessionUid, batching), { levels: 2, commands: false, flatvalue: true });
      this.sessionUid = sessionUid;
      this.batching = batching;
    }
    /** The session's `main` edit context, which `create_note` both reads and overwrites. */
    get context() {
      this.contextView ??= new Context(this.client, `/sessions/${this.sessionUid}/contexts/main`, this.sessionUid);
      return this.contextView;
    }
    /**
     * Write notes onto this lane, making the MIDI clip to hold them if there is none there
     * (LUNA's `create_note`). One undo entry for the whole batch. Ticks are absolute.
     *
     * LUNA answers `null` and instead *selects* what it created, so the new row ids are read
     * back out of the selection — which means this cannot run inside a `transaction()` batch,
     * where LUNA holds selection writes until the commit. The user's selection is restored
     * afterwards.
     *
     * @example
     * const bar = session.musical.timeline.tickAt({ bar: 1 });
     * const { clip, notes } = await lane.createNotes(
     *   [60, 64, 67].map((pitch, i) => ({ pitch, startTick: bar + i * Luna.TICKS_PER_BEAT, stopTick: bar + (i + 1) * Luna.TICKS_PER_BEAT })),
     * );
     */
    async createNotes(notes) {
      if (!notes.length) throw new UAError("out_of_range", "createNotes(): give at least one note", { path: this.path });
      if (this.batching?.()) {
        throw new UAError("busy", "createNotes() reads the new row ids back out of LUNA's selection, which a transaction() batch holds until its commit: call it outside the batch", { path: this.path });
      }
      const body = notes.map((n) => {
        const start = requireTick(n.startTick, "startTick");
        const stop = requireTick(n.stopTick, "stopTick");
        if (stop <= start) throw new UAError("out_of_range", "createNotes(): stopTick must be after startTick", { path: this.path });
        const entry = { note: midiByte(n.pitch, "pitch"), start, stop, velocity: midiByte(n.velocity ?? 100, "velocity", 1) };
        if (n.velocityOff !== void 0) {
          entry["velocity_on"] = entry["velocity"];
          entry["velocity_off"] = midiByte(n.velocityOff, "velocityOff");
        }
        return entry;
      });
      const context = this.context;
      await context.refreshSelection().catch(() => {
      });
      const saved = context.snapshot();
      const previous2 = new Set(context.notes.flatMap((s) => s.notes.map((n) => n[3])));
      let rowids = [];
      let clip;
      let found = [];
      try {
        await this.wire.post(`/sessions/${this.sessionUid}/contexts/main/commands/create_note`, { session_uid: this.sessionUid, playlist_uid: this.id, notes: body });
        await settle(
          () => {
            rowids = context.notes.filter((s) => s.playlist_uid === this.id).flatMap((s) => s.notes.map((n) => n[3])).filter((id) => !previous2.has(id));
            return rowids.length >= notes.length;
          },
          "create notes (selection)",
          { path: this.path, refresh: () => context.refreshSelection(), flush: () => this.client.store.scheduler.flush() }
        );
        await settle(
          () => {
            for (const candidate of this.clips.items) {
              if (candidate.clipType.value !== "midi") continue;
              const hits = rowids.map((id) => candidate.midi.notes.byId(String(id))).filter((n) => n !== void 0);
              if (hits.length === rowids.length) {
                clip = candidate;
                found = hits;
                return true;
              }
            }
            return false;
          },
          "create notes",
          {
            path: this.path,
            refresh: async () => {
              await this.clips.reload();
              for (const candidate of this.clips.items) if (candidate.clipType.value === "midi") await candidate.midi.ready().then(() => candidate.midi.refresh());
            },
            flush: () => this.client.store.scheduler.flush()
          }
        );
      } finally {
        await context.restore(saved).catch(() => {
        });
      }
      return { clip, notes: found };
    }
    release() {
      this.clips.dispose();
    }
  };

  // src/model/audio-source.ts
  var FIXED16_SCALE = 32768;
  var MAX_PAGE = 4096;
  var MAX_CHANNELS = 64;
  var analysisName = (kind) => kind === "coarse" ? "overview_coarse" : "overview";
  var AudioSource = class extends Node {
    name;
    /** `mono` or `stereo`. */
    stemFormat;
    /** Duration in nanoseconds. */
    length;
    sampleRate;
    created;
    /** @internal */
    constructor(client, path) {
      super(client, path);
      this.name = this.prop("name");
      this.stemFormat = this.prop("stem_format");
      this.length = this.prop("length");
      this.sampleRate = this.prop("sample_rate");
      this.created = this.prop("created");
    }
    get channelCount() {
      return this.stemFormat.value === "stereo" ? 2 : 1;
    }
    /** Duration in seconds. */
    get seconds() {
      const ns = this.length.value;
      return ns === void 0 ? void 0 : ns / 1e9;
    }
    /**
     * The analysis node's pair count and digest, or `undefined` when there is no analysis yet
     * (a file LUNA has not finished scanning, or a render it has named but not written).
     *
     * @example
     * const info = await source.overviewInfo();
     * if (info) for (let n = 0; n * 1024 < info.count; n++) draw(await source.overview({ index: n * 1024 }));
     */
    async overviewInfo(options = {}) {
      const kind = options.kind ?? "fine";
      const reply = await this.client.raw.get(`${this.path}/analysis/${analysisName(kind)}`, { children: false, commands: false, propfilter: ["count", "md5"] }).catch(() => void 0);
      const count = readProperty(reply, "count");
      if (typeof count !== "number" || !Number.isInteger(count) || count < 0) return void 0;
      const md5 = readProperty(reply, "md5");
      return Object.freeze({ count, md5: typeof md5 === "string" ? md5 : void 0 });
    }
    /**
     * Read one bounded page of the waveform overview. Bins are int16 min/max pairs per channel
     * on the wire; here they are floats in -1..1.
     *
     * A bare number is the legacy form and means `{ index }` with the default count.
     *
     * @example
     * const page = await source.overview({ index: 0, count: 512, kind: 'coarse' });
     */
    async overview(options = {}) {
      const { index = 0, count = 1024, kind = "fine" } = typeof options === "number" ? { index: options } : options;
      if (!Number.isSafeInteger(index) || index < 0 || !Number.isSafeInteger(count) || count < 1 || count > MAX_PAGE) {
        throw new UAError("out_of_range", `overview(): index must be >= 0 and count 1-${MAX_PAGE}`, { path: this.path });
      }
      const path = `${this.path}/analysis/${analysisName(kind)}/file/data`;
      const query = `count=${count}${index > 0 ? `&index=${index}` : ""}`;
      const reply = await this.client.raw.get(`${path}?${query}`, { properties: true });
      const value = reply && "value" in reply ? reply.value : reply;
      if (!value || !Array.isArray(value.data)) return void 0;
      if (value.data.length > MAX_CHANNELS) throw new UAError("invalid_response", "overview(): implausible channel count", { path });
      const channels = value.data.map((ch) => ({ min: toFloats(ch.min, count, path), max: toFloats(ch.max, count, path) }));
      const returned = channels[0]?.min.length ?? 0;
      if (channels.some((ch) => ch.min.length !== returned || ch.max.length !== returned)) {
        throw new UAError("invalid_response", "overview(): channels disagree on length", { path });
      }
      return { index, count: returned, kind, binsPerSecond: 1e9 / pairNs(kind), channels };
    }
  };
  var OVERVIEW_PAIR_NS = 125e9 / 48e3;
  var COARSE_PAIRS_PER_FINE = 12;
  var COARSE_PAIR_NS = OVERVIEW_PAIR_NS * COARSE_PAIRS_PER_FINE;
  function pairNs(kind) {
    return kind === "coarse" ? COARSE_PAIR_NS : OVERVIEW_PAIR_NS;
  }
  function readProperty(reply, name) {
    if (typeof reply !== "object" || reply === null) return void 0;
    const node = reply;
    const properties = node["properties"];
    if (Array.isArray(properties)) {
      for (const entry of properties) {
        if (typeof entry === "object" && entry !== null && entry.name === name) return unwrap(entry.value);
      }
    } else if (typeof properties === "object" && properties !== null && name in properties) {
      return unwrap(properties[name]);
    }
    if (name in node) return unwrap(node[name]);
    return void 0;
  }
  function unwrap(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value) && "value" in value ? value.value : value;
  }
  function toFloats(ints, limit, path) {
    if (ints && ints.length > limit) throw new UAError("invalid_response", "overview(): page longer than requested", { path });
    const out = new Float32Array(ints?.length ?? 0);
    if (ints) for (let i = 0; i < ints.length; i++) out[i] = Number(ints[i]) / FIXED16_SCALE;
    return out;
  }

  // src/model/waveform.ts
  var WAVEFORM_PAGE = 1024;
  function kindForScale(nsPerPixel) {
    if (!Number.isFinite(nsPerPixel) || nsPerPixel <= 0) throw new UAError("out_of_range", "kindForScale(): nsPerPixel must be a positive number");
    return nsPerPixel >= COARSE_PAIR_NS ? "coarse" : "fine";
  }
  function pairRange(startNs, stopNs, kind = "fine") {
    if (!Number.isFinite(startNs) || !Number.isFinite(stopNs) || startNs < 0) {
      throw new UAError("out_of_range", "pairRange(): source offsets must be finite nanoseconds with start >= 0");
    }
    const p = pairNs(kind);
    const index = Math.floor(startNs / p);
    if (stopNs <= startNs) return Object.freeze({ index, count: 0 });
    return Object.freeze({ index, count: Math.ceil(stopNs / p) - index });
  }
  function snapshotOf(clip) {
    const uid = clip.sourceUid;
    if (typeof uid !== "object" || uid === null) return clip;
    const c = clip;
    return {
      sourceUid: c.sourceUid.value,
      sourceStartNs: c.sourceStart.value,
      sourceStopNs: c.sourceStop.value,
      renderSourceUid: c.renderSourceUid.value,
      renderState: c.renderState.value
    };
  }
  function clipAudio(clip, sources) {
    const find = (uid) => Array.isArray(sources) ? sources.find((s) => s.id === uid) : sources.byId(uid);
    const snap = snapshotOf(clip);
    if (snap.renderState === "current" && snap.renderSourceUid) {
      const render = find(snap.renderSourceUid);
      const length = render?.length.value;
      if (!render || length === void 0) return void 0;
      return Object.freeze({ source: render, startNs: 0, stopNs: length, stretched: true });
    }
    if (!snap.sourceUid || snap.sourceStartNs === void 0 || snap.sourceStopNs === void 0) return void 0;
    const source = find(snap.sourceUid);
    if (!source) return void 0;
    return Object.freeze({ source, startNs: snap.sourceStartNs, stopNs: snap.sourceStopNs, stretched: false });
  }
  function audioNsAtTick(timeline, clip, audio, tick) {
    const startTicks = "startTicks" in clip ? clip.startTicks : clip.start.value;
    if (startTicks === void 0) throw new UAError("out_of_range", "audioNsAtTick(): the clip has no start tick");
    const offset = timeline.seconds(tick) - timeline.seconds(startTicks);
    return audio.startNs + offset * 1e9;
  }
  var Waveforms = class {
    pages = /* @__PURE__ */ new Map();
    inFlight = /* @__PURE__ */ new Map();
    max;
    constructor(options = {}) {
      this.max = Math.max(1, options.maxPages ?? 256);
    }
    /** Pages held right now. */
    get size() {
      return this.pages.size;
    }
    /** Drop one source's pages, or everything. */
    invalidate(uid) {
      if (uid === void 0) {
        this.pages.clear();
        return;
      }
      for (const key of [...this.pages.keys()]) if (key.startsWith(`${uid}:`)) this.pages.delete(key);
    }
    /** The pairs covering `[startNs, stopNs)` of `source`, assembled from cached and fresh pages. */
    async range(source, startNs, stopNs, kind = "fine") {
      const { index, count } = pairRange(startNs, stopNs, kind);
      const p = pairNs(kind);
      if (count === 0) return Object.freeze({ kind, pairNs: p, index, count: 0, channels: Object.freeze([]), complete: true });
      const first = Math.floor(index / WAVEFORM_PAGE);
      const last = Math.floor((index + count - 1) / WAVEFORM_PAGE);
      const pages = [];
      for (let n = first; n <= last; n++) {
        const page = await this.page(source, kind, n);
        if (!page) break;
        pages.push(page);
        if (page.count < WAVEFORM_PAGE) break;
      }
      const channelCount = Math.max(0, ...pages.map((pg) => pg.channels.length));
      const channels = [];
      for (let c = 0; c < channelCount; c++) {
        const min = [];
        const max = [];
        for (const page of pages) {
          const ch = page.channels[c];
          if (!ch) continue;
          const from = Math.max(index, page.index) - page.index;
          const to = Math.min(index + count, page.index + page.count) - page.index;
          if (to <= from) continue;
          for (let i = from; i < to; i++) {
            min.push(ch.min[i]);
            max.push(ch.max[i]);
          }
        }
        channels.push(Object.freeze({ min: Float32Array.from(min), max: Float32Array.from(max) }));
      }
      const returned = channels[0]?.min.length ?? 0;
      return Object.freeze({ kind, pairNs: p, index, count: returned, channels: Object.freeze(channels), complete: returned === count });
    }
    page(source, kind, n) {
      const key = `${source.id}:${kind}:${n}`;
      const hit = this.pages.get(key);
      if (hit) {
        this.pages.delete(key);
        this.pages.set(key, hit);
        return Promise.resolve(hit);
      }
      let pending2 = this.inFlight.get(key);
      if (!pending2) {
        pending2 = source.overview({ index: n * WAVEFORM_PAGE, count: WAVEFORM_PAGE, kind }).then((page) => {
          if (page && page.count === WAVEFORM_PAGE) {
            this.pages.set(key, page);
            while (this.pages.size > this.max) this.pages.delete(this.pages.keys().next().value);
          }
          return page;
        });
        this.inFlight.set(key, pending2);
        void pending2.catch(() => {
        }).finally(() => this.inFlight.delete(key));
      }
      return pending2;
    }
  };
  function waveformPeak(range) {
    let peak = 0;
    for (const ch of range.channels) {
      for (let p = 0; p < ch.min.length; p++) peak = Math.max(peak, Math.abs(ch.min[p]), Math.abs(ch.max[p]));
    }
    return peak;
  }
  var OWN = 1;
  var BETWEEN = 2;
  function waveformColumns(range, width, nsAt, options = {}) {
    if (!Number.isInteger(width) || width < 0) throw new UAError("out_of_range", "waveformColumns(): width must be a whole number of columns >= 0");
    const gain = options.gain ?? 1;
    if (!Number.isFinite(gain) || gain <= 0) throw new UAError("out_of_range", "waveformColumns(): gain must be a finite number > 0");
    const out = range.channels.map(() => ({ min: new Float32Array(width).fill(Number.NaN), max: new Float32Array(width).fill(Number.NaN) }));
    const pairAt = (ns) => Math.floor(ns / range.pairNs) - range.index;
    const inside = (p) => p >= 0 && p < range.count;
    const reduce = (i, a, b) => {
      range.channels.forEach((ch, c) => {
        let lo = 0;
        let hi = 0;
        for (let p = a; p < b; p++) {
          if (ch.min[p] < lo) lo = ch.min[p];
          if (ch.max[p] > hi) hi = ch.max[p];
        }
        out[c].min[i] = lo;
        out[c].max[i] = hi;
      });
    };
    const state = new Uint8Array(width);
    const lefts = new Float64Array(width);
    let next = pairAt(nsAt(0));
    for (let i = 0; i < width; i++) {
      const first = next;
      next = pairAt(nsAt(i + 1));
      lefts[i] = first;
      if (!Number.isFinite(first) || !Number.isFinite(next)) continue;
      const a = Math.max(0, first);
      const b = Math.min(range.count, next);
      if (b > a) {
        reduce(i, a, b);
        state[i] = OWN;
      } else if (inside(first)) {
        state[i] = BETWEEN;
      }
    }
    const scratch = { min: new Float32Array(range.channels.length), max: new Float32Array(range.channels.length) };
    const pairValue = (p, into) => {
      range.channels.forEach((ch, c) => {
        into.min[c] = Math.min(0, ch.min[p]);
        into.max[c] = Math.max(0, ch.max[p]);
      });
    };
    for (let s = 0; s < width; s++) {
      if (state[s] !== BETWEEN) continue;
      let e = s;
      while (e < width && state[e] === BETWEEN) e++;
      const prev = { min: new Float32Array(range.channels.length), max: new Float32Array(range.channels.length) };
      if (s > 0 && state[s - 1] === OWN) out.forEach((ch, c) => {
        prev.min[c] = ch.min[s - 1];
        prev.max[c] = ch.max[s - 1];
      });
      else pairValue(lefts[s], prev);
      if (e < width && state[e] === OWN) out.forEach((ch, c) => {
        scratch.min[c] = ch.min[e];
        scratch.max[c] = ch.max[e];
      });
      else pairValue(lefts[e - 1], scratch);
      const span = e - s + 1;
      for (let i = s; i < e; i++) {
        const t = (i - s + 1) / span;
        out.forEach((ch, c) => {
          ch.min[i] = prev.min[c] + (scratch.min[c] - prev.min[c]) * t;
          ch.max[i] = prev.max[c] + (scratch.max[c] - prev.max[c]) * t;
        });
      }
      s = e - 1;
    }
    if (gain !== 1) {
      for (const ch of out) {
        for (let i = 0; i < width; i++) {
          ch.min[i] = Math.max(-1, ch.min[i] * gain);
          ch.max[i] = Math.min(1, ch.max[i] * gain);
        }
      }
    }
    return Object.freeze({ width, channels: Object.freeze(out.map((ch) => Object.freeze(ch))) });
  }
  function waveformLanes(channels, top, height, gap = 1) {
    if (!Number.isInteger(channels) || channels < 0) throw new UAError("out_of_range", "waveformLanes(): channels must be a whole number >= 0");
    const lane = channels ? height / channels : 0;
    const half = Math.max(0, lane / 2 - gap);
    return Object.freeze(Array.from({ length: channels }, (_, c) => Object.freeze({ mid: top + lane * (c + 0.5), half })));
  }
  function traceWaveform(target, channel, lane, x0, options = {}) {
    const { columnWidth = 1, axis = 0.5 } = options;
    if (!Number.isFinite(columnWidth) || columnWidth <= 0) throw new UAError("out_of_range", "traceWaveform(): columnWidth must be a finite number > 0");
    const { mid, half } = lane;
    const width = Math.min(channel.min.length, channel.max.length);
    const top = (i) => mid - axis - channel.max[i] * half;
    const bottom = (i) => mid + axis - channel.min[i] * half;
    const centre = (i) => x0 + (i + 0.5) * columnWidth;
    for (let s = 0; s < width; s++) {
      if (Number.isNaN(channel.max[s]) || Number.isNaN(channel.min[s])) continue;
      let e = s;
      while (e < width && !Number.isNaN(channel.max[e]) && !Number.isNaN(channel.min[e])) e++;
      target.moveTo(x0 + s * columnWidth, top(s));
      for (let i = s; i < e; i++) target.lineTo(centre(i), top(i));
      target.lineTo(x0 + e * columnWidth, top(e - 1));
      target.lineTo(x0 + e * columnWidth, bottom(e - 1));
      for (let i = e - 1; i >= s; i--) target.lineTo(centre(i), bottom(i));
      target.lineTo(x0 + s * columnWidth, bottom(s));
      target.closePath();
      s = e;
    }
  }

  // src/model/markers.ts
  var Marker = class extends Node {
    /** @internal */
    constructor(client, path, sessionUid, timeline) {
      super(client, path);
      this.sessionUid = sessionUid;
      this.rowid = this.prop("rowid");
      this.location = this.prop("location");
      this.name = this.prop("name");
      this.comments = this.prop("comments");
      this.color = this.prop("color");
      const maps = { value: void 0, onChange: (l) => timeline().onChange(l) };
      const at = (f) => () => {
        const tick = this.location.value;
        return tick === void 0 ? void 0 : f(timeline(), tick);
      };
      this.barBeat = derived([this.location, maps], at((t, tick) => t.barBeat(tick)), { distinct: true });
      this.seconds = derived([this.location, maps], at((t, tick) => t.seconds(tick)), { distinct: true });
    }
    sessionUid;
    rowid;
    /** Position in ticks. */
    location;
    name;
    comments;
    /** ARGB packed integer. */
    color;
    /**
     * {@link location} as bar|beat, following the marker and the session's time signatures, so
     * a marker list needs no listeners of its own. Format it with `Luna.formatBarBeat`.
     * Assumes 4/4 until `session.musical` has loaded.
     *
     * @example
     * marker.barBeat.onChange(() => cell.textContent = Luna.formatBarBeat(marker.barBeat.value));
     */
    barBeat;
    /**
     * {@link location} in seconds from the session start, following the marker and the tempo
     * map. Assumes 120 BPM until `session.musical` has loaded.
     *
     * @example
     * marker.seconds.onChange(() => cell.textContent = Luna.formatMinSec(marker.seconds.value));
     */
    seconds;
    get row() {
      return this.rowid.value ?? Number(this.id);
    }
    /**
     * `set_marker` and `delete_marker` answer `null` whether or not the rowid matched
     * (fact 71), so each edit resolves once this marker shows it.
     */
    async edit(fields, done, what) {
      this.assertLive();
      const reply = await this.wire.post(`/sessions/${this.sessionUid}/set_marker`, { session_uid: this.sessionUid, rowid: this.row, ...fields });
      await settle(done, what, { path: this.path, disposed: () => this.disposed, refresh: () => this.client.store.load(this.path, { children: false, commands: false, flatvalue: true }), flush: () => this.client.store.scheduler.flush() });
      return reply;
    }
    /** @example await marker.rename('Bridge'); */
    rename(name) {
      return this.edit({ name }, () => this.name.value === name, "rename marker");
    }
    /** @example await marker.moveTo(Luna.WHOLE_NOTE * 16); */
    moveTo(tick) {
      requireTick(tick, "marker tick");
      return this.edit({ location: tick }, () => this.location.value === tick, "move marker");
    }
    /** @example await marker.setColor(0xffff0000); */
    setColor(argb) {
      return this.edit({ color: argb }, () => this.color.value === argb, "recolor marker");
    }
    /** @example await marker.setComments('double chorus'); */
    setComments(comments) {
      return this.edit({ comments }, () => this.comments.value === comments, "comment marker");
    }
    /**
     * Delete this marker and resolve once it has left the list.
     *
     * @example await marker.delete();
     */
    async delete() {
      this.assertLive();
      const reply = await this.wire.post(`/sessions/${this.sessionUid}/delete_marker`, { session_uid: this.sessionUid, rowid: this.row });
      const parent = this.path.slice(0, this.path.lastIndexOf("/"));
      await settle(() => !(this.client.store.children(parent).value ?? []).includes(this.id), "delete marker", {
        path: this.path,
        refresh: () => this.client.store.load(parent, { levels: 2, commands: false, flatvalue: true }),
        flush: () => this.client.store.scheduler.flush()
      });
      return reply;
    }
  };
  var Markers = class extends Collection {
    /** @internal */
    constructor(client, sessionPath, sessionUid, timeline) {
      super(client, `${sessionPath}/markers`, (p) => new Marker(client, p, sessionUid, timeline), { levels: 2, commands: false, flatvalue: true });
    }
    /** Markers in timeline order. */
    get sorted() {
      return [...this.items].sort((a, b) => (a.location.value ?? 0) - (b.location.value ?? 0));
    }
    /** The last marker at or before `tick`. */
    at(tick) {
      return this.sorted.filter((m) => (m.location.value ?? 0) <= tick).at(-1);
    }
  };

  // src/model/chords.ts
  var CHORD_NAME = /^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/;
  function normalizeChordName2(name) {
    return name.replace(/♭/g, "b").replace(/♯/g, "#");
  }
  function parseChord(name) {
    const match = CHORD_NAME.exec(normalizeChordName2(name.trim()));
    if (!match) return void 0;
    return { root: match[1], type: match[2], bass: match[3] ?? null };
  }
  function requireName(name, what) {
    if (typeof name !== "string" || name.trim() === "") throw new UAError("out_of_range", `${what} must be a non-empty chord name`);
    return name;
  }
  var Chord = class extends Node {
    /** @internal */
    constructor(client, path, sessionUid) {
      super(client, path);
      this.sessionUid = sessionUid;
      this.rowid = this.prop("rowid");
      this.location = this.prop("location");
      this.name = this.prop("name");
    }
    sessionUid;
    rowid;
    /** Position in ticks. */
    location;
    /** The chord symbol as LUNA shows it, e.g. `Am7`, `C/E`. */
    name;
    get row() {
      return this.rowid.value ?? Number(this.id);
    }
    /** {@link name} split into root, type and bass; `undefined` for text that is not a chord. */
    get parsed() {
      return this.name.value === void 0 ? void 0 : parseChord(this.name.value);
    }
    async edit(fields, done, what) {
      this.assertLive();
      await this.wire.post(`/sessions/${this.sessionUid}/set_chord`, { session_uid: this.sessionUid, rowid: this.row, ...fields });
      await settle(done, what, { path: this.path, disposed: () => this.disposed, refresh: () => this.client.store.load(this.path, { children: false, commands: false, flatvalue: true }), flush: () => this.client.store.scheduler.flush() });
    }
    /** @example await chord.rename('C/E'); */
    rename(name) {
      const wanted = normalizeChordName2(requireName(name, "chord name"));
      return this.edit({ name }, () => this.name.value === wanted, "rename chord");
    }
    /**
     * Move this chord to `tick`. A chord already at `tick` is replaced, as in LUNA (fact 100).
     *
     * @example await chord.moveTo(Luna.WHOLE_NOTE * 2);
     */
    async moveTo(tick) {
      requireTick(tick, "chord tick");
      if (this.location.value === tick) return;
      await this.edit({ location: tick }, () => this.location.value === tick, "move chord");
    }
    /**
     * Delete this chord and resolve once it has left the ruler.
     *
     * @example await chord.delete();
     */
    async delete() {
      this.assertLive();
      await this.wire.post(`/sessions/${this.sessionUid}/delete_chord`, { session_uid: this.sessionUid, rowid: this.row });
      const parent = this.path.slice(0, this.path.lastIndexOf("/"));
      await settle(() => !(this.client.store.children(parent).value ?? []).includes(this.id), "delete chord", {
        path: this.path,
        refresh: () => this.client.store.load(parent, { levels: 2, commands: false, flatvalue: true }),
        flush: () => this.client.store.scheduler.flush()
      });
    }
  };
  var Chords = class extends Collection {
    /** @internal */
    constructor(client, sessionPath, sessionUid) {
      super(client, `${sessionPath}/chords`, (p) => new Chord(client, p, sessionUid), { levels: 2, commands: false, flatvalue: true });
    }
    /** Chords in timeline order. */
    get sorted() {
      return [...this.items].sort((a, b) => (a.location.value ?? 0) - (b.location.value ?? 0));
    }
    /** The chord sounding at `tick`: the last one at or before it. */
    at(tick) {
      return this.sorted.filter((c) => (c.location.value ?? 0) <= tick).at(-1);
    }
  };
  function checkChordSpecs(chords) {
    const ticks = /* @__PURE__ */ new Set();
    for (const c of chords) {
      requireTick(c.tick, "chord tick");
      requireName(c.name, "chord name");
      if (ticks.has(c.tick)) throw new UAError("out_of_range", `setChords(): two chords at tick ${c.tick}; the ruler holds one per tick`);
      ticks.add(c.tick);
    }
  }

  // src/model/gui.ts
  var AddOn = class extends Node {
    /** The manifest's `id`, in lowercase: LUNA compares ids without case. */
    addOnId;
    /** The manifest's `name`: its menu item and panel header. */
    name;
    target;
    /** Absolute file path of the icon, or `''`. */
    icon;
    /** The manifest's `floating`: `true` unless it says `false`. Meaningful for `'window'` only. */
    floating;
    /** The manifest's `show_with_session`: `false` unless it says `true`. Meaningful for `'window'` only. */
    showWithSession;
    /** The manifest's `manufacturer`, or `''` when it has none. */
    manufacturer;
    /** @internal */
    constructor(client, path) {
      super(client, path);
      this.addOnId = this.prop("id");
      this.name = this.prop("name");
      this.target = this.prop("target");
      this.icon = this.prop("icon");
      this.floating = this.prop("floating");
      this.showWithSession = this.prop("show_with_session");
      this.manufacturer = this.prop("manufacturer");
    }
    /** Show it in LUNA by target: navigate to an `'app'`, open a `'window'` (toggling it like its
     *  menu item), show a `'browser'` in the secondary browser, or an `'editor'` in the Timeline's
     *  editor panel (never toggling either closed). */
    show() {
      return this.wire.post("/gui/show_add_on", { id: this.id });
    }
  };
  var GuiWindow = class extends Node {
    /** Current page; writable for `mixer | timeline | home | addon | dashboard`. */
    page;
    /** @internal */
    constructor(client, path) {
      super(client, path);
      this.page = this.writableProp("page");
    }
  };
  var Gui = class extends Node {
    /** Installed Add Ons, by manifest id in lowercase (`byId('com.example.foo')`). */
    addOns;
    /** Windows by context type; `main` is the arrangement window. */
    windows;
    /** Record-arm mode of LUNA's transport bar. */
    armMode;
    priorLaunchCount;
    presence;
    /** @internal */
    constructor(client) {
      super(client, "/gui");
      this.addOns = new Collection(client, "/gui/add_ons", (p) => new AddOn(client, p), { levels: 2, commands: false, flatvalue: true });
      this.windows = new Collection(client, "/gui/windows", (p) => new GuiWindow(client, p), { levels: 2, commands: false, flatvalue: true });
      this.armMode = client.store.cell("/gui/transport", "arm_mode");
      this.armMode = {
        get value() {
          return client.store.cell("/gui/transport", "arm_mode").value;
        },
        onChange: (l) => client.store.cell("/gui/transport", "arm_mode").onChange(l),
        set: (v) => client.store.set("/gui/transport", "arm_mode", v)
      };
      this.priorLaunchCount = this.prop("prior_launch_count");
    }
    /**
     * True when the engine has LUNA's `/gui` (fact 103). Read once per connection: the
     * root's children are listed, because a `get` of a missing `/gui` answers `{}` (fact 10).
     *
     * @example
     * const paths = (await luna.gui.available()) ? await luna.gui.chooseFiles() : [];
     */
    available() {
      this.presence ??= this.client.raw.get("/", { children: true, properties: false, commands: false }).then((reply) => rootChildNames(reply).includes("gui")).catch((err) => {
        this.presence = void 0;
        throw err;
      });
      return this.presence;
    }
    /** Commands go to `/gui`, so refuse at once, not after a timeout, when it is absent. */
    async post(command, payload) {
      if (!await this.available()) throw new Unsupported(`luna.gui.${command}: this engine has no /gui (a headless engine). Check luna.gui.available() first.`);
      return super.post(command, payload);
    }
    /** The main window. */
    get main() {
      return this.windows.byId("main") ?? new GuiWindow(this.client, "/gui/windows/main");
    }
    /** Switch the main window (or another context's window) to a page. */
    setPage(page, contextType = "main") {
      return this.post("set_page", { page, context_type: contextType });
    }
    openUrl(url) {
      return this.post("open_url", { url });
    }
    /** Reveal a file or folder in Finder / Explorer. */
    revealPath(path) {
      return this.post("reveal_path", { path });
    }
    openSettings() {
      return this.post("open_settings");
    }
    openPluginManager() {
      return this.post("open_plugin_manager");
    }
    showFeedback() {
      return this.post("show_feedback");
    }
    showSessionInFinder(sessionPackageUid) {
      return this.post("show_session_in_finder", sessionPackageUid ? { session_package_uid: sessionPackageUid } : {});
    }
    showAddOn(id) {
      return this.post("show_add_on", { id });
    }
    /** Run a LUNA rack command by id with extra fields as its data. Escape hatch. */
    execute(command, data = {}) {
      return this.post("execute", { ...data, command });
    }
    /**
     * LUNA's native open-file dialog. Resolves to the chosen **absolute paths**, or `[]` if
     * cancelled. `filters` are wildcards such as `['*.wav', '*.aif;*.aiff']`.
     *
     * This is the **path route**, an optimization for getting files into the session: the
     * engine reads the paths from disk (`session.importPath()`, `session.importFile()`), so the
     * bytes never pass through the page. The page itself cannot read these paths; `fetch`
     * and XHR refuse them. Needs `/gui` ({@link Gui.available}) and a native engine that can
     * see the file.
     *
     * Want the audio in the page (decode, audition, slice)? Do not use this: use
     * `<input type="file">`, which gives `File` objects everywhere, and
     * `session.uploadFile({ bytes: file })` to put one into the session.
     *
     * @example
     * const [path] = await luna.gui.chooseFiles({ filters: ['*.wav'] });
     * if (path) await session.importPath(path);
     */
    chooseFiles(options = {}) {
      const payload = {};
      if (options.title !== void 0) payload["title"] = options.title;
      if (options.filters !== void 0) payload["filters"] = options.filters;
      if (options.allowMultiple !== void 0) payload["allow_multiple"] = options.allowMultiple;
      if (options.defaultPath !== void 0) payload["default_path"] = options.defaultPath;
      return this.dialog("show_open_dialog", payload, "release_file_chooser", options.timeoutMs);
    }
    /**
     * LUNA's native folder dialog. Resolves to the chosen folders' **absolute paths**, or `[]`
     * if cancelled. A path route like {@link chooseFiles}: hand the paths to
     * {@link listFiles} or the engine, not to `fetch`. Needs `/gui` ({@link Gui.available}) and a
     * LUNA that has the dialog (fact 106); an older one rejects with `Luna.Unsupported`.
     *
     * @example
     * const [folder] = await luna.gui.chooseFolders({ title: 'Choose a sample folder' });
     * if (folder) console.log(await luna.gui.listFiles(folder));
     */
    chooseFolders(options = {}) {
      const payload = {};
      if (options.title !== void 0) payload["title"] = options.title;
      if (options.allowMultiple !== void 0) payload["allow_multiple"] = options.allowMultiple;
      if (options.defaultPath !== void 0) payload["default_path"] = options.defaultPath;
      return this.dialog("show_folder_dialog", payload, "release_file_chooser", options.timeoutMs).catch(olderLuna("chooseFolders", "show_folder_dialog"));
    }
    /**
     * The files and folders directly inside the folder at `path`, as LUNA sees the disk (fact
     * 106). Hidden entries are left out; the rest are in natural order, as LUNA's own browsers
     * sort: case ignored, and numbers by value, so `take2` comes before `take10`. `path` must
     * be absolute.
     *
     * Rejects with a `Luna.Error` whose `code` is `uasrv.filesystem_error` when nothing is at
     * `path` or it cannot be read, and `uasrv.invalid_value` when `path` is relative or names
     * a file. An older LUNA without the command rejects with `Luna.Unsupported`.
     *
     * @example
     * for (const entry of await luna.gui.listFiles('/Users/me/Samples')) {
     *   if (!entry.isDirectory && entry.name.endsWith('.wav')) await session.importPath(entry.path);
     * }
     */
    async listFiles(path) {
      const reply = await this.post("list_files", { path }).catch(olderLuna("listFiles", "list_files"));
      return (reply?.files ?? []).map((f) => ({ name: f.name, path: f.path, isDirectory: f.is_directory }));
    }
    /**
     * LUNA's native save dialog. Resolves to the chosen absolute path, or `undefined` if
     * cancelled. Like {@link chooseFiles} the path is for the engine (for example a render's
     * `outputPaths`); the page cannot write to it.
     *
     * @example
     * const path = await luna.gui.chooseSavePath({ extensions: ['wav'] });
     */
    async chooseSavePath(options = {}) {
      const payload = {};
      if (options.defaultPath !== void 0) payload["default_path"] = options.defaultPath;
      if (options.extensions !== void 0) payload["extensions"] = options.extensions;
      const files = await this.dialog("show_save_dialog", payload, "release_save_dialog", options.timeoutMs);
      return files[0];
    }
    /** Show a progress task in LUNA. Call `progress()` with 0..100, then `done()`. */
    async startTask(title, options = {}) {
      const taskUid = randomUid();
      const payload = { task_uid: taskUid, title };
      if (options.nativeProgressBar !== void 0) payload["use_native_progress_bar"] = options.nativeProgressBar;
      await this.post("add_task", payload);
      return {
        progress: (percent) => this.post("update_task", { task_uid: taskUid, percent_complete: percent }).then(() => void 0),
        done: () => this.post("remove_task", { task_uid: taskUid }).then(() => void 0)
      };
    }
    async dialog(command, payload, release2, timeoutMs = 10 * 6e4) {
      const reply = await this.post(command, payload);
      const uid = typeof reply === "string" ? reply : reply?.uid;
      if (!uid) return [];
      const node = `/gui/file_chooser/${uid}`;
      const status = this.client.store.cell(node, "status");
      const files = this.client.store.cell(node, "files");
      const watch = this.client.store.watch(node, { load: { flatvalue: true, commands: false } });
      try {
        await watch.ready;
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            unsub();
            reject(new RequestTimeout(command, node, timeoutMs));
          }, timeoutMs);
          const check = () => {
            const s = status.value;
            if (s === "selected" || s === "cancelled") {
              clearTimeout(timer);
              unsub();
              resolve();
            }
          };
          const unsub = status.onChange(check);
          check();
        });
        return status.value === "selected" ? (files.value ?? []).map((f) => f.path) : [];
      } finally {
        watch.release();
        await this.post(release2, { uid }).catch(() => void 0);
      }
    }
  };
  function olderLuna(method, command) {
    return (err) => {
      if (err instanceof UAError && err.code === "uasrv.invalid_object") {
        throw new Unsupported(`luna.gui.${method}: this LUNA has no /gui/${command}; it needs a newer LUNA.`);
      }
      throw err;
    };
  }
  function randomUid() {
    const g = globalThis;
    const raw = g.crypto?.randomUUID?.() ?? `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
    return raw.replaceAll("-", "");
  }
  function rootChildNames(reply) {
    const children = typeof reply === "object" && reply !== null ? reply.children : void 0;
    if (!Array.isArray(children)) return [];
    const out = [];
    for (const child of children) {
      const raw = typeof child === "string" ? child : typeof child === "object" && child !== null ? child.path ?? child.name : void 0;
      if (typeof raw === "string") out.push(raw.slice(raw.lastIndexOf("/") + 1));
    }
    return out;
  }

  // src/model/send-midi.ts
  var STATUS_NOTE_OFF = 128;
  var STATUS_NOTE_ON = 144;
  var STATUS_CONTROL_CHANGE = 176;
  var STATUS_PROGRAM_CHANGE = 192;
  var CC_BANK_SELECT_MSB = 0;
  var CC_BANK_SELECT_LSB = 32;
  function statusByte(value) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 128 || value > 255) {
      throw new UAError("out_of_range", "status byte must be an integer 0x80-0xff");
    }
    return value;
  }
  function channelOf(value) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 15) {
      throw new UAError("out_of_range", "channel must be an integer 0-15");
    }
    return value;
  }
  function checked(build, then) {
    let value;
    try {
      value = build();
    } catch (e) {
      return Promise.reject(e);
    }
    return then(value);
  }
  var SendMidi = class {
    constructor(client) {
      this.client = client;
    }
    client;
    /**
     * Send a note-on or note-off on channel 1 to one track. It also hands the note to LUNA's
     * record input (`record_enabled`), so record-enabled tracks hear it too.
     *
     * @example
     * await midi.sendMidiNote(session.uid, track.id, 60, 100, true);  // note-on
     * await midi.sendMidiNote(session.uid, track.id, 60, 0, false);   // note-off
     */
    sendMidiNote(sessionUid, trackUid, note, velocity, noteOn) {
      return this.sendMidi(sessionUid, trackUid, noteOn ? STATUS_NOTE_ON : STATUS_NOTE_OFF, note, velocity);
    }
    /**
     * Send any 3-byte MIDI message to one track: pitch bend, channel pressure and anything else
     * not wrapped here. The channel is in the status byte's low nibble.
     *
     * @example
     * await midi.sendMidi(session.uid, track.id, 0xe0, 0x00, 0x40);  // pitch bend centre
     */
    sendMidi(sessionUid, trackUid, byte0, byte1, byte2) {
      return checked(
        () => ({ session_uid: sessionUid, track_uid: trackUid, byte_0: statusByte(byte0), byte_1: midiByte(byte1, "data byte 1"), byte_2: midiByte(byte2, "data byte 2"), record_enabled: true }),
        (payload) => this.post("send_midi", payload)
      );
    }
    /**
     * Send the same note-on or note-off to several tracks. LUNA's own multi-track form delivers
     * the note but answers `uasrv.invalid_property` every time (fact 109), so this sends one
     * message per track instead, and hands the note to the record input once when any entry
     * asks for it, which is what LUNA's form does.
     *
     * @example
     * await midi.sendNoteToTracks(session.uid, [
     *   { trackUid: piano.id, recordEnable: true },
     *   { trackUid: pad.id },
     * ], 60, 100, true);
     */
    sendNoteToTracks(sessionUid, tracks, note, velocity, noteOn) {
      return checked(
        () => {
          if (!tracks.length) throw new UAError("out_of_range", "sendNoteToTracks(): give at least one track");
          const bytes = { byte_0: noteOn ? STATUS_NOTE_ON : STATUS_NOTE_OFF, byte_1: midiByte(note, "note"), byte_2: midiByte(velocity, "velocity") };
          const recordAt = tracks.findIndex((t) => t.recordEnable === true);
          return tracks.map((t, i) => ({ session_uid: sessionUid, track_uid: t.trackUid, ...bytes, record_enabled: i === recordAt }));
        },
        async (payloads) => {
          await Promise.all(payloads.map((p) => this.post("send_midi", p)));
        }
      );
    }
    /**
     * Send a Control Change to a track.
     *
     * @param controller CC number, 0-127 (7 volume, 10 pan, 64 sustain).
     * @param value CC value, 0-127.
     * @param channel MIDI channel, 0-15. Default 0.
     *
     * @example
     * await midi.sendController(session.uid, track.id, 64, 127);  // sustain down
     */
    sendController(sessionUid, trackUid, controller, value, channel = 0) {
      return checked(
        () => STATUS_CONTROL_CHANGE | channelOf(channel),
        (status) => this.sendMidi(sessionUid, trackUid, status, controller, value)
      );
    }
    /**
     * Send a Program Change to a track, after Bank Select MSB and LSB (CC 0 and CC 32) when
     * either bank is given; the one left out is sent as 0. The messages go in order, one at a
     * time, so another sender on the same track could land between them.
     *
     * @example
     * await midi.sendProgramChange(session.uid, track.id, 0);         // program only
     * await midi.sendProgramChange(session.uid, track.id, 5, 0, 12);  // bank 0/12, program 5
     */
    sendProgramChange(sessionUid, trackUid, program, bankMSB, bankLSB) {
      return checked(
        () => {
          midiByte(program, "program");
          if (bankMSB !== void 0) midiByte(bankMSB, "bankMSB");
          if (bankLSB !== void 0) midiByte(bankLSB, "bankLSB");
          return bankMSB !== void 0 || bankLSB !== void 0;
        },
        async (needsBank) => {
          if (needsBank) {
            await this.sendMidi(sessionUid, trackUid, STATUS_CONTROL_CHANGE, CC_BANK_SELECT_MSB, bankMSB ?? 0);
            await this.sendMidi(sessionUid, trackUid, STATUS_CONTROL_CHANGE, CC_BANK_SELECT_LSB, bankLSB ?? 0);
          }
          await this.sendMidi(sessionUid, trackUid, STATUS_PROGRAM_CHANGE, program, 0);
        }
      );
    }
    /**
     * Panic: send All Notes Off to every MIDI-capable track and connected MIDI device, in every
     * session.
     *
     * @example
     * await midi.sendAllNotesOff();
     */
    async sendAllNotesOff() {
      await this.client.raw.post("/sessions/send_midi_all_notes_off", {});
    }
    /**
     * Send a note-on or note-off on channel 1 to a MIDI input source by name, as though it came
     * from that device, bypassing track routing. LUNA answers success for a name it does not know
     * (fact 108), so a typo fails silently.
     *
     * @example
     * await midi.sendDeviceNote('IAC Driver Bus 1', 60, 100, true);
     */
    sendDeviceNote(midiInputSource, note, velocity, noteOn) {
      return checked(
        () => ({ midi_input_source: midiInputSource, byte_0: noteOn ? STATUS_NOTE_ON : STATUS_NOTE_OFF, byte_1: midiByte(note, "note"), byte_2: midiByte(velocity, "velocity") }),
        (payload) => this.post("send_midi", payload)
      );
    }
    async post(command, payload) {
      await this.client.raw.post(`/sessions/${command}`, payload);
    }
  };

  // src/model/qwerty-midi.ts
  var NOTE_OFFSETS = {
    A: 0,
    W: 1,
    S: 2,
    E: 3,
    D: 4,
    F: 5,
    T: 6,
    G: 7,
    Y: 8,
    H: 9,
    U: 10,
    J: 11,
    K: 12,
    O: 13,
    L: 14,
    P: 15,
    ";": 16
  };
  var OCTAVE_MIN = 0;
  var OCTAVE_MAX = 9;
  var VELOCITY_STEP = 8;
  var VELOCITY_MIN = 1;
  var VELOCITY_MAX = 127;
  var clamp = (v, min, max) => Math.min(max, Math.max(min, Math.round(v)));
  function isEditable2(target) {
    const el = target;
    if (!el || typeof el.tagName !== "string") return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName.toUpperCase();
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag !== "INPUT") return false;
    const type = (el.type ?? "text").toLowerCase();
    return !["button", "checkbox", "radio", "range", "color", "file", "image", "reset", "submit"].includes(type);
  }
  var keyOf = (e) => e.key.length === 1 ? e.key.toUpperCase() : e.key;
  var QwertyMidi = class {
    constructor(sendMidi) {
      this.sendMidi = sendMidi;
      const scheduler = sendMidi.client.store.scheduler;
      this.octaveCell = new Cell(scheduler, 4);
      this.velocityCell = new Cell(scheduler, 100);
      this.octave = writable(this.octaveCell, async (v) => void this.octaveCell.update(clamp(v, OCTAVE_MIN, OCTAVE_MAX)));
      this.velocity = writable(this.velocityCell, async (v) => void this.velocityCell.update(clamp(v, VELOCITY_MIN, VELOCITY_MAX)));
    }
    sendMidi;
    /** The octave the note keys play, 0-9. A is C in this octave. `set` clamps. */
    octave;
    /** The note-on velocity, 1-127. `set` clamps. */
    velocity;
    octaveCell;
    velocityCell;
    /** Held notes by key: suppresses key repeat and sends the right note-off on keyup. */
    heldNotes = /* @__PURE__ */ new Map();
    /**
     * Handle a keydown. Returns true, having called `preventDefault()`, when the key was a note
     * or a control key; a repeat of a held note key is claimed but not replayed.
     *
     * @example
     * document.addEventListener('keydown', (e) => qwerty.handleKeyDown(e, session.uid, track.id));
     */
    handleKeyDown(e, sessionUid, trackUid) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing || isEditable2(e.target)) return false;
      const key = keyOf(e);
      const octave = this.octaveCell.value ?? 4;
      const velocity = this.velocityCell.value ?? 100;
      switch (key) {
        case "Z":
          this.octaveCell.update(Math.min(OCTAVE_MAX, octave + 1));
          e.preventDefault();
          return true;
        case "X":
          this.octaveCell.update(Math.max(OCTAVE_MIN, octave - 1));
          e.preventDefault();
          return true;
        case "C":
          this.velocityCell.update(Math.min(VELOCITY_MAX, velocity + VELOCITY_STEP));
          e.preventDefault();
          return true;
        case "V":
          this.velocityCell.update(Math.max(VELOCITY_MIN, velocity - VELOCITY_STEP));
          e.preventDefault();
          return true;
      }
      const offset = NOTE_OFFSETS[key];
      if (offset === void 0) return false;
      e.preventDefault();
      if (this.heldNotes.has(key)) return true;
      const note = octave * 12 + offset;
      this.heldNotes.set(key, { note, sessionUid, trackUid });
      void this.sendMidi.sendMidiNote(sessionUid, trackUid, note, velocity, true).catch(warn2);
      return true;
    }
    /**
     * Handle a keyup. Returns true, having called `preventDefault()`, when it released a held
     * note. The note-off goes to the track and pitch the note-on went to, even if the octave
     * changed while it was held.
     *
     * @example
     * document.addEventListener('keyup', (e) => qwerty.handleKeyUp(e));
     */
    handleKeyUp(e) {
      const key = keyOf(e);
      const held = this.heldNotes.get(key);
      if (held === void 0) return false;
      this.heldNotes.delete(key);
      e.preventDefault();
      void this.sendMidi.sendMidiNote(held.sessionUid, held.trackUid, held.note, 0, false).catch(warn2);
      return true;
    }
    /**
     * Send a note-off for every held note. Call it when the page loses focus, which swallows
     * the keyups.
     *
     * @example
     * window.addEventListener('blur', () => qwerty.releaseAll());
     */
    releaseAll() {
      const held = [...this.heldNotes.values()];
      this.heldNotes.clear();
      for (const h of held) void this.sendMidi.sendMidiNote(h.sessionUid, h.trackUid, h.note, 0, false).catch(warn2);
    }
    /** Forget held notes without sending note-offs, after the connection was replaced. */
    resetConnection() {
      this.heldNotes.clear();
    }
    /** Release every held note and forget them. */
    destroy() {
      this.releaseAll();
    }
  };
  function warn2(error) {
    console.warn("Luna.QwertyMidi send failed:", error);
  }

  // src/model/plugins.ts
  var Plugin = class extends Node {
    pluginId;
    name;
    version;
    description;
    installed;
    favorite;
    /** `true`/`false` when licensing applies; `null` for plugins without UA licensing. */
    authorized;
    manifest;
    defaultPresetUid;
    /** @internal */
    constructor(client, path) {
      super(client, path);
      this.pluginId = this.prop("plugin_id");
      this.name = this.prop("name");
      this.version = this.prop("version");
      this.description = this.prop("description");
      this.installed = this.prop("installed");
      this.favorite = this.prop("favorite");
      this.authorized = this.prop("authorized");
      this.manifest = this.prop("manifest");
      this.defaultPresetUid = this.prop("default_preset_uid");
    }
    get manufacturer() {
      return this.manifest.value?.manufacturer;
    }
    get categories() {
      return this.manifest.value?.categories ?? [];
    }
  };
  var Plugins = class extends Collection {
    /** @internal */
    constructor(client) {
      super(client, "/plugins", (p) => new Plugin(client, p), { levels: 2, commands: false, flatvalue: true });
    }
    /** Case-insensitive match on name, short names, manufacturer or id. */
    find(query) {
      const q = query.toLowerCase();
      return this.items.filter((p) => {
        const m = p.manifest.value;
        return (p.name.value ?? "").toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || (m?.manufacturer ?? "").toLowerCase().includes(q) || (m?.short_names ?? []).some((s) => s.toLowerCase().includes(q));
      });
    }
    byCategory(category) {
      return this.items.filter((p) => p.categories.includes(category));
    }
    /** All categories in the catalog, sorted. */
    get categories() {
      const set = /* @__PURE__ */ new Set();
      for (const p of this.items) for (const c of p.categories) set.add(c);
      return [...set].sort();
    }
    /** Ask the engine to rescan installed plugins. */
    rescan() {
      return this.client.raw.post("/plugins/rescan");
    }
  };

  // src/model/presets.ts
  var Presets = class extends Node {
    /** @internal */
    constructor(client) {
      super(client, "/presets");
    }
    /**
     * Query the preset database (fact 98). Columnar on the wire; rows here.
     *
     * @example
     * const rows = await luna.presets.query({ pluginId: 'uaudio_qi', search: 'EQ' });
     * rows[0]?.uid; rows[0]?.name; rows[0]?.factory;
     */
    async query(options = {}) {
      const payload = {};
      if (options.pluginId !== void 0) payload["plugin_id"] = options.pluginId;
      if (options.deviceTypeId !== void 0) payload["device_type_id"] = options.deviceTypeId;
      if (options.search !== void 0) payload["search"] = options.search;
      if (options.favorite !== void 0) payload["favorite"] = options.favorite;
      if (options.limit !== void 0) payload["limit"] = options.limit;
      const reply = await this.post("query", payload);
      return rowsFrom(reply?.results);
    }
    /**
     * The plugin's preset named exactly `name` (case-insensitive), or `undefined`. When the
     * library holds a user preset and a factory preset of the same name, the user one wins,
     * matching what LUNA's preset browser opens.
     *
     * @example
     * const preset = await luna.presets.find('uaudio_qi', '4-Band EQ');
     * preset?.uid;
     */
    async find(pluginId, name) {
      const rows = await this.query({ pluginId, search: name });
      const q = name.trim().toLowerCase();
      const named = rows.filter((r) => r.name.trim().toLowerCase() === q);
      return named.find((r) => !r.factory) ?? named[0];
    }
  };
  function rowsFrom(results) {
    if (!results) return [];
    const n = typeof results.num_rows === "number" ? results.num_rows : results["uid"]?.length ?? 0;
    const col = (name, i, fallback) => {
      const arr = results[name];
      return Array.isArray(arr) && arr[i] !== void 0 ? arr[i] : fallback;
    };
    const rows = [];
    for (let i = 0; i < n; i++) {
      rows.push({
        uid: col("uid", i, ""),
        name: col("name", i, ""),
        version: col("version", i, 0),
        // The engine sends favorite and factory as 0/1 integers (fact 98).
        favorite: Boolean(col("favorite", i, 0)),
        factory: Boolean(col("factory", i, 0)),
        path: col("path", i, "")
      });
    }
    return rows;
  }

  // src/model/musical.ts
  var TempoEvent = class extends Node {
    tick;
    /** Seconds at this event, as the engine computed it. */
    time;
    /** BPM from this event on. Writable: LUNA's own tempo field sets it directly (fact 95). */
    tempo;
    /** @internal */
    constructor(client, path) {
      super(client, path);
      this.tick = this.prop("tick");
      this.time = this.prop("time");
      this.tempo = this.writableProp("tempo");
    }
  };
  var TimeSignature = class extends Node {
    tick;
    bar;
    numerator;
    denominator;
    partial;
    /** @internal */
    constructor(client, path) {
      super(client, path);
      this.tick = this.prop("tick");
      this.bar = this.prop("bar");
      this.numerator = this.prop("numerator");
      this.denominator = this.prop("denominator");
      this.partial = this.prop("partial");
    }
    /** Ticks in one bar of this signature. */
    get ticksPerBar() {
      const n = this.numerator.value ?? 4;
      const d = this.denominator.value ?? 4;
      return n * (TICKS_PER_BEAT * 4 / d);
    }
    /** Ticks in one beat of this signature. */
    get ticksPerBeat() {
      const d = this.denominator.value ?? 4;
      return TICKS_PER_BEAT * 4 / d;
    }
  };
  var KeySignature = class extends Node {
    tick;
    /** Positive for sharps, negative for flats. */
    sharpsAndFlats;
    isMinor;
    /** @internal */
    constructor(client, path) {
      super(client, path);
      this.tick = this.prop("tick");
      this.sharpsAndFlats = this.prop("sharps_and_flats");
      this.isMinor = this.prop("is_minor");
    }
  };
  var Timeline = class {
    /** @internal */
    constructor(tempos, signatures, subscribe = () => () => {
    }) {
      this.tempos = tempos;
      this.signatures = signatures;
      this.subscribe = subscribe;
    }
    tempos;
    signatures;
    subscribe;
    /**
     * Called when a tempo event or time signature is added, removed or edited, so anything
     * computed from this timeline (bar|beat, seconds) should be recomputed. `marker.barBeat`
     * and `marker.seconds` already follow it.
     *
     * @example
     * session.musical.timeline.onChange(() => redrawRuler());
     */
    onChange(listener) {
      return this.subscribe(listener);
    }
    sortedTempos() {
      return this.tempos().map((t) => ({ tick: t.tick.value ?? 0, tempo: t.tempo.value ?? 120 })).sort((a, b) => a.tick - b.tick);
    }
    sortedSignatures() {
      return this.signatures().map((s) => ({ tick: s.tick.value ?? 0, bar: s.bar.value ?? 1, n: s.numerator.value ?? 4, d: s.denominator.value ?? 4 })).sort((a, b) => a.tick - b.tick);
    }
    tempoAt(tick) {
      let tempo = 120;
      for (const t of this.sortedTempos()) {
        if (t.tick <= tick) tempo = t.tempo;
        else break;
      }
      return tempo;
    }
    /** Ticks to seconds, integrating the tempo map (constant tempo between events). */
    seconds(tick) {
      const tempos = this.sortedTempos();
      if (tempos.length === 0) return tick / TICKS_PER_BEAT * 0.5;
      let seconds = 0;
      let at = 0;
      let tempo = tempos[0].tempo;
      for (const t of tempos) {
        if (t.tick >= tick) break;
        if (t.tick > at) {
          seconds += (t.tick - at) / TICKS_PER_BEAT * (60 / tempo);
          at = t.tick;
        }
        tempo = t.tempo;
      }
      seconds += (tick - at) / TICKS_PER_BEAT * (60 / tempo);
      return seconds;
    }
    /**
     * The inverse of {@link barBeat}: the tick a bar|beat|tick position lands on. `beat`
     * defaults to 1 and `tick` to 0, so `tickAt({ bar: 9 })` is the downbeat of bar 9 and
     * matches {@link tickAtBar}.
     *
     * @example
     * const tick = timeline.tickAt({ bar: 5, beat: 3, tick: 0 });
     * timeline.barBeat(tick);   // { bar: 5, beat: 3, tick: 0 }
     */
    tickAt(at) {
      const sigs = this.sortedSignatures();
      const applicable = sigs.filter((s) => s.bar <= at.bar);
      const sig = applicable.at(-1) ?? { tick: 0, bar: 1, n: 4, d: 4 };
      const beatTicks = TICKS_PER_BEAT * 4 / sig.d;
      return sig.tick + (at.bar - sig.bar) * beatTicks * sig.n + ((at.beat ?? 1) - 1) * beatTicks + (at.tick ?? 0);
    }
    /**
     * The inverse of {@link seconds}: the tick a wall-clock offset lands on, walking the same
     * tempo map. Use it to place a clip that must play unstretched — its span in ticks
     * depends on the tempo where it sits.
     *
     * @example
     * const start = 4 * Luna.TICKS_PER_BEAT;
     * const stop = timeline.tickAtSeconds(timeline.seconds(start) + source.length.value / 1e9);
     */
    tickAtSeconds(seconds) {
      if (!(seconds > 0)) return 0;
      const tempos = this.sortedTempos();
      if (tempos.length === 0) return seconds / 0.5 * TICKS_PER_BEAT;
      let elapsed = 0;
      let at = 0;
      let tempo = tempos[0].tempo;
      for (const t of tempos) {
        if (t.tick <= at) {
          tempo = t.tempo;
          continue;
        }
        const spanSeconds = (t.tick - at) / TICKS_PER_BEAT * (60 / tempo);
        if (elapsed + spanSeconds >= seconds) return at + (seconds - elapsed) / (60 / tempo) * TICKS_PER_BEAT;
        elapsed += spanSeconds;
        at = t.tick;
        tempo = t.tempo;
      }
      return at + (seconds - elapsed) / (60 / tempo) * TICKS_PER_BEAT;
    }
    /**
     * Bar, beat (1-based) and the engine ticks left over within the beat at `tick`, honouring
     * time signature changes. Same units as `location.bar_beat`, so it passes straight to
     * {@link formatBarBeat} (or `Luna.formatBarBeat`) with no conversion.
     *
     * @example
     * timeline.barBeat(Luna.TICKS_PER_BEAT * 5 + Luna.TICKS_PER_DISPLAY_TICK * 120);   // { bar: 2, beat: 2, tick: 12_000_000_000 }
     */
    barBeat(tick) {
      const sigs = this.sortedSignatures();
      let sig = sigs.find((s) => s.tick <= tick) ? sigs.filter((s) => s.tick <= tick).at(-1) : { tick: 0, bar: 1, n: 4, d: 4 };
      if (sigs.length === 0) sig = { tick: 0, bar: 1, n: 4, d: 4 };
      const beatTicks = TICKS_PER_BEAT * 4 / sig.d;
      const barTicks = beatTicks * sig.n;
      const rel = Math.max(0, tick - sig.tick);
      const bar = sig.bar + Math.floor(rel / barTicks);
      const inBar = rel % barTicks;
      const beat = 1 + Math.floor(inBar / beatTicks);
      return { bar, beat, tick: inBar % beatTicks };
    }
    /**
     * `tick` as LUNA's bar|beat counter shows it, `1|1|000` with display ticks (960 per beat):
     * `Luna.formatBarBeat(timeline.barBeat(tick))` in one call.
     *
     * @example
     * timeline.formatBarBeat(marker.location.value!);   // "5|3|240"
     */
    formatBarBeat(tick) {
      return formatBarBeat(tick === void 0 ? void 0 : this.barBeat(tick));
    }
    /** Tick at the start of `bar` (1-based). */
    tickAtBar(bar) {
      const sigs = this.sortedSignatures();
      let sig = { tick: 0, bar: 1, n: 4, d: 4 };
      for (const s of sigs) {
        if (s.bar <= bar) sig = s;
        else break;
      }
      const barTicks = TICKS_PER_BEAT * 4 / sig.d * sig.n;
      return sig.tick + (bar - sig.bar) * barTicks;
    }
  };
  var Musical = class {
    /** @internal */
    constructor(client, sessionPath, sessionUid, transaction = (_name, fn) => fn()) {
      this.client = client;
      this.sessionPath = sessionPath;
      this.sessionUid = sessionUid;
      this.transaction = transaction;
      const opts = { levels: 2, commands: false, flatvalue: true };
      this.tempoMap = new Collection(client, `${sessionPath}/tempo_map`, (p) => new TempoEvent(client, p), opts);
      this.timeSignatures = new Collection(client, `${sessionPath}/time_signatures`, (p) => new TimeSignature(client, p), opts);
      this.keySignatures = new Collection(client, `${sessionPath}/key_signatures`, (p) => new KeySignature(client, p), opts);
      this.chords = new Chords(client, sessionPath, sessionUid);
      this.timeline = new Timeline(
        () => this.tempoMap.items,
        () => this.timeSignatures.items,
        (listener) => this.onMapsChange(listener)
      );
    }
    client;
    sessionPath;
    sessionUid;
    transaction;
    tempoMap;
    timeSignatures;
    keySignatures;
    /** LUNA's Chord ruler. */
    chords;
    timeline;
    readyPromise;
    /** Follow membership of both maps and the fields the timeline reads from each row. */
    onMapsChange(listener) {
      let rows = [];
      const follow = () => {
        for (const u of rows) u();
        rows = [
          ...this.tempoMap.items.flatMap((t) => [t.tick, t.tempo].map((p) => p.onChange(listener))),
          ...this.timeSignatures.items.flatMap((s) => [s.tick, s.bar, s.numerator, s.denominator].map((p) => p.onChange(listener)))
        ];
      };
      const membership = () => {
        follow();
        listener();
      };
      follow();
      const offTempos = this.tempoMap.onChange(membership);
      const offSignatures = this.timeSignatures.onChange(membership);
      return () => {
        offTempos();
        offSignatures();
        for (const u of rows) u();
        rows = [];
      };
    }
    /** Load the three maps and the Chord ruler. Idempotent. */
    ready() {
      this.readyPromise ??= Promise.all([this.tempoMap.load(), this.timeSignatures.load(), this.keySignatures.load(), this.chords.load()]).then(() => void 0);
      return this.readyPromise;
    }
    tempoAt(tick) {
      return this.timeline.tempoAt(tick);
    }
    post(command, payload) {
      return this.client.raw.post(`${this.sessionPath}/${command}`, { session_uid: this.sessionUid, ...payload });
    }
    /**
     * The tempo event in effect at `tick`: the last one at or before it, or the first when the
     * tick is before them all. `undefined` only while the map is empty or unloaded.
     *
     * @example
     * const row = session.musical.tempoEventAt(session.transport.tick);
     */
    tempoEventAt(tick) {
      const rows = [...this.tempoMap.items].filter((t) => t.tick.value !== void 0).sort((a, b) => a.tick.value - b.tick.value);
      let row = rows[0];
      for (const t of rows) {
        if (t.tick.value <= tick) row = t;
        else break;
      }
      return row;
    }
    /**
     * Change the tempo in effect at `tick` to `bpm`, as LUNA's own tempo field does: it writes
     * the `tempo` of that tempo event rather than adding one (fact 95). In a single-tempo session
     * that is the session tempo. Rejects with `out_of_range` for a non-positive or non-finite
     * BPM, and `not_found` when the map has no events yet.
     *
     * @example
     * await session.musical.ready();
     * await session.musical.setTempoInEffectAt(96, session.transport.tick);
     */
    async setTempoInEffectAt(bpm, tick) {
      if (!Number.isFinite(bpm) || bpm <= 0) throw new UAError("out_of_range", "setTempoInEffectAt(): bpm must be a finite number > 0");
      const row = this.tempoEventAt(tick);
      if (!row) throw new UAError("not_found", "setTempoInEffectAt(): the tempo map has no events; await musical.ready() first");
      await row.tempo.set(bpm);
    }
    /**
     * Add a tempo event at a tick with `set_tempo` (default: the session start). On the measured
     * build `set_tempo` answered `device.database_error`; to change the tempo in effect, use
     * {@link setTempoInEffectAt}.
     */
    setTempo(bpm, tick = 0) {
      return this.post("set_tempo", { tempo: bpm, tick });
    }
    deleteTempo(tick) {
      return this.post("delete_tempo", { tick });
    }
    /** Set the time signature from `bar` (1-based). */
    setTimeSignature(numerator, denominator, bar = 1) {
      return this.post("set_time_signature", { numerator, denominator, bar });
    }
    /** `sharpsAndFlats`: 1..7 sharps, -1..-7 flats, 0 for C / A minor. */
    setKeySignature(sharpsAndFlats, isMinor, tick = 0) {
      return this.post("set_key_signature", { tick, sharps_and_flats: sharpsAndFlats, is_minor: isMinor });
    }
    /** Move bar one to `tick`. */
    setBarOne(tick) {
      return this.post("set_bar_one", { tick });
    }
    settleChords(done, what) {
      return settle(done, what, {
        path: this.chords.path,
        refresh: () => this.chords.reload(),
        flush: () => this.client.store.scheduler.flush()
      });
    }
    hasChord(tick, name, fresh = () => true) {
      const wanted = normalizeChordName2(name);
      return this.chords.items.some((c) => c.location.value === tick && c.name.value === wanted && fresh(c));
    }
    /**
     * Add a chord to the Chord ruler at `tick` and resolve to it once it is in {@link chords}.
     * A chord already at `tick` is replaced, as in LUNA (fact 100). One undo entry.
     *
     * @example
     * const chord = await session.musical.addChord(Luna.WHOLE_NOTE * 4, 'Am7');
     */
    async addChord(tick, name) {
      requireTick(tick, "chord tick");
      if (typeof name !== "string" || name.trim() === "") throw new UAError("out_of_range", "chord name must be a non-empty chord name");
      const before = new Set(this.chords.items.map((c) => c.id));
      await this.post("set_chord", { location: tick, name });
      const fresh = (c) => !before.has(c.id);
      await this.settleChords(() => this.hasChord(tick, name, fresh), "add chord");
      return this.chords.items.find((c) => c.location.value === tick && fresh(c));
    }
    /**
     * Write a chord progression as one undo entry. Each chord replaces any chord at its tick.
     * With `replaceRange: [start, stop]`, every other chord from `start` up to (not including)
     * `stop` is deleted first, so the span holds exactly the progression. Chords already on the
     * ruler as asked are not rewritten, and a call that changes nothing makes no undo entry.
     * Resolves once {@link chords} shows the result.
     *
     * @example
     * const bar = Luna.WHOLE_NOTE;
     * await session.musical.setChords(
     *   ['C', 'Am', 'F', 'G'].map((name, i) => ({ tick: i * bar, name })),
     *   { replaceRange: [0, 4 * bar] },
     * );
     */
    async setChords(chords, options = {}) {
      checkChordSpecs(chords);
      const range = options.replaceRange;
      if (range) {
        requireTick(range[0], "replaceRange start");
        requireTick(range[1], "replaceRange stop");
      }
      const ticks = new Set(chords.map((c) => c.tick));
      const inRange = (c) => range !== void 0 && (c.location.value ?? 0) >= range[0] && (c.location.value ?? 0) < range[1];
      const stale = this.chords.items.filter((c) => inRange(c) && !ticks.has(c.location.value ?? 0));
      const staleIds = new Set(stale.map((c) => c.id));
      const writes = chords.filter((c) => !this.hasChord(c.tick, c.name));
      if (stale.length === 0 && writes.length === 0) return;
      await this.transaction(options.undoName ?? "Set Chords", async () => {
        for (const c of stale) await this.post("delete_chord", { rowid: c.rowid.value ?? Number(c.id) });
        for (const c of writes) await this.post("set_chord", { location: c.tick, name: c.name });
      });
      await this.settleChords(
        () => chords.every((c) => this.hasChord(c.tick, c.name)) && !this.chords.items.some((c) => staleIds.has(c.id)),
        "set chords"
      );
    }
    /**
     * Delete every chord on the ruler as one undo entry ("Clear Chords").
     *
     * @example await session.musical.clearChords();
     */
    async clearChords() {
      await this.post("delete_chord", { all: true });
      await this.settleChords(() => this.chords.items.length === 0, "clear chords");
    }
    /** @internal */
    dispose() {
      this.chords.dispose();
      this.tempoMap.dispose();
      this.timeSignatures.dispose();
      this.keySignatures.dispose();
    }
  };

  // src/model/workspace.ts
  var SessionPackage = class extends Node {
    uid;
    fileName;
    directoryPath;
    sessionType;
    factory;
    favorite;
    comments;
    created;
    modified;
    lastOpened;
    /** @internal */
    constructor(client, path) {
      super(client, path);
      this.uid = this.prop("uid");
      this.fileName = this.prop("file_name");
      this.directoryPath = this.prop("directory_path");
      this.sessionType = this.prop("session_type");
      this.factory = this.prop("factory");
      this.favorite = this.writableProp("favorite");
      this.comments = this.writableProp("comments");
      this.created = this.prop("created");
      this.modified = this.prop("modified");
      this.lastOpened = this.prop("last_opened");
    }
    /** Display name without the `.luna` extension. */
    get name() {
      return (this.fileName.value ?? this.id).replace(/\.luna$/, "");
    }
  };
  var Workspace = class extends Node {
    /** All packages. Large; prefer {@link query} or {@link recent} unless you need live updates. */
    packages;
    /** @internal */
    constructor(client) {
      super(client, "/workspace");
      this.packages = new Collection(client, "/workspace/sessions", (p) => new SessionPackage(client, p), { levels: 2, commands: false, flatvalue: true });
    }
    /** Query the workspace database. Columnar on the wire; rows here. */
    async query(options = {}) {
      const payload = { table_id: options.table ?? "sessions", tags: true, include_online: true };
      if (options.sessionPackageUid !== void 0) payload["session_package_uid"] = options.sessionPackageUid;
      if (options.factory !== void 0) payload["factory"] = options.factory;
      if (options.favorite !== void 0) payload["favorite"] = options.favorite;
      if (options.tags !== void 0) payload["tag"] = options.tags;
      if (options.anyTag !== void 0) payload["union"] = options.anyTag;
      if (options.search !== void 0) payload["search"] = options.search;
      if (options.orderBy !== void 0) payload["order_by"] = options.orderBy;
      if (options.orderAs !== void 0) payload["order_as"] = options.orderAs;
      if (options.lastOpenedMin !== void 0) payload["last_opened_min"] = options.lastOpenedMin;
      if (options.limit !== void 0) payload["limit"] = options.limit;
      const reply = await this.post("query", payload);
      return rowsFrom2(reply?.results);
    }
    /** Most recently opened packages, newest first. */
    recent(limit = 20) {
      return this.query({ orderBy: "last_opened", orderAs: "desc", limit });
    }
    /** Full-text search over session metadata. */
    async search(text) {
      return this.post("full_text_search", { search_text: text });
    }
    release() {
      this.packages.dispose();
    }
  };
  function rowsFrom2(results) {
    if (!results) return [];
    const n = typeof results.num_rows === "number" ? results.num_rows : results["uid"]?.length ?? 0;
    const col = (name, i, fallback) => {
      const arr = results[name];
      return Array.isArray(arr) && arr[i] !== void 0 ? arr[i] : fallback;
    };
    const rows = [];
    for (let i = 0; i < n; i++) {
      rows.push({
        uid: col("uid", i, ""),
        name: col("name", i, "").replace(/\.luna$/, ""),
        path: col("path", i, ""),
        online: col("file_online", i, true),
        sessionType: col("session_type", i, 0),
        factory: col("factory", i, false),
        favorite: col("favorite", i, false),
        created: col("created", i, 0),
        modified: col("modified", i, 0),
        lastOpened: col("last_opened", i, 0),
        tags: col("tags", i, [])
      });
    }
    return rows;
  }

  // src/model/system.ts
  var Drivers = class extends Node {
    connected;
    unsupported;
    sampleRates;
    /** @internal */
    constructor(client) {
      super(client, "/drivers");
      this.connected = this.prop("connected");
      this.unsupported = this.prop("unsupported");
      this.sampleRates = this.prop("sample_rates");
    }
  };
  var Device = class extends Node {
    name;
    deviceType;
    online;
    sampleRate;
    clockSource;
    /** @internal */
    constructor(client, path) {
      super(client, path);
      this.name = this.prop("name");
      this.deviceType = this.prop("device_type");
      this.online = this.prop("online");
      this.sampleRate = this.prop("sample_rate");
      this.clockSource = this.prop("clock_source");
    }
  };
  var Devices = class extends Collection {
    /** @internal */
    constructor(client) {
      super(client, "/devices", (p) => new Device(client, p), { levels: 2, commands: false, flatvalue: true });
    }
  };
  var Preferences = class extends Node {
    ioBufferSize;
    playFromStopLocation;
    recordMute;
    metronomeSound;
    metronomeSounds;
    /** @internal */
    constructor(client) {
      super(client, "/preferences");
      this.ioBufferSize = this.writableProp("io_buffer_size");
      this.playFromStopLocation = this.writableProp("play_from_stop_location");
      this.recordMute = this.writableProp("record_mute");
      this.metronomeSound = this.writableProp("metronome_sound");
      this.metronomeSounds = this.prop("metronome_sounds");
    }
  };
  var Render = class extends Node {
    state;
    /** 0..100, as the engine reports it. {@link progress} is the 0..1 view. */
    percentComplete;
    errorMessage;
    name;
    renderType;
    /** Seconds left, as the engine estimates it; absent for an offline render. */
    timeRemaining;
    /** True for an offline (faster than real time) render, which reports no time remaining. */
    isOffline;
    totalSamples;
    /** 0..1, ready for a `<progress>` element. */
    progress;
    /** @internal */
    constructor(client, path) {
      super(client, path);
      this.state = this.prop("state");
      this.percentComplete = this.prop("percent_complete");
      this.errorMessage = this.prop("error_message");
      this.name = this.prop("name");
      this.renderType = this.prop("type");
      this.timeRemaining = this.prop("time_remaining");
      this.isOffline = this.prop("render_is_offline");
      this.totalSamples = this.prop("total_samples");
      this.progress = derived([this.percentComplete], () => (this.percentComplete.value ?? 0) / 100);
    }
    /** `completed`, `aborted` or `failed`: nothing more will happen. */
    get isTerminal() {
      const s = this.state.value;
      return s === "completed" || s === "aborted" || s === "failed";
    }
    /**
     * Resolve when the render completes; reject when it is aborted, fails, or the engine
     * removes the node before it was seen to finish. A short offline render can finish and
     * vanish before anything observes it (fact 44), which surfaces as a `removed` rejection
     * even though the output was written.
     */
    done(timeoutMs = 10 * 6e4) {
      const watch = this.client.store.watch("/renders", { recursive: true, load: false });
      return new Promise((resolve, reject) => {
        let finish = () => void 0;
        const settle2 = () => {
          const s = this.state.value;
          if (s === "completed") {
            finish();
            resolve();
            return true;
          }
          if (s === "aborted" || s === "failed") {
            finish();
            reject(new UAError(s, `render ${this.name.value ?? this.id} ${s}${this.errorMessage.value ? `: ${this.errorMessage.value}` : ""}`, { path: this.path }));
            return true;
          }
          return false;
        };
        const timer = setTimeout(() => {
          finish();
          reject(new UAError("no_effect", `render ${this.id} did not settle within ${timeoutMs} ms`, { path: this.path }));
        }, timeoutMs);
        const offState = this.state.onChange(() => settle2());
        const renders = this.client.store.children("/renders");
        const offChildren = renders.onChange(() => {
          if (settle2()) return;
          if (!(renders.value ?? []).includes(this.id)) {
            finish();
            reject(new UAError("removed", `render ${this.id} was removed before it was seen to finish`, { path: this.path }));
          }
        });
        finish = () => {
          clearTimeout(timer);
          offState();
          offChildren();
          watch.release();
        };
        settle2();
      });
    }
    abort() {
      return this.wire.post("/renders/abort", { uid: this.id });
    }
    delete() {
      return this.wire.post("/renders/delete", { uid: this.id });
    }
  };
  var Renders = class extends Collection {
    /** @internal */
    constructor(client) {
      super(client, "/renders", (p) => new Render(client, p), { levels: 2, commands: false, flatvalue: true });
    }
  };
  var Job = class extends Node {
    uid;
    /** Nil uuid (32 zeros) when the job belongs to no session. */
    sessionUid;
    jobType;
    /** `queued | running | canceling | completed | failed | canceled`. */
    status;
    stage;
    error;
    warning;
    /** Track uid the job targets, when any. */
    targetUid;
    cancellable;
    percentComplete;
    /** @internal */
    constructor(client, path) {
      super(client, path);
      this.uid = this.prop("uid");
      this.sessionUid = this.prop("session_uid");
      this.jobType = this.prop("job_type");
      this.status = this.prop("status");
      this.stage = this.prop("stage");
      this.error = this.prop("error");
      this.warning = this.prop("warning");
      this.targetUid = this.prop("target_uid");
      this.cancellable = this.prop("cancellable");
      this.percentComplete = this.prop("percent_complete");
    }
    get isTerminal() {
      const s = this.status.value;
      return s === "completed" || s === "failed" || s === "canceled";
    }
    cancel() {
      return this.post("commands/cancel_job", {});
    }
  };
  var Jobs = class extends Collection {
    /** @internal */
    constructor(client) {
      super(client, "/jobs", (p) => new Job(client, p), { levels: 2, commands: false, flatvalue: true });
    }
  };

  // src/model/session.ts
  var SYSTEM_TRACK_TYPES = /* @__PURE__ */ new Set(["click", "count_in"]);
  var RECORD_LOOP_MARGIN_TICKS = TICKS_PER_BEAT * 4;
  var CLIP_PROPS = ["uid", "name", "start", "stop", "source_start", "source_stop", "source_uid", "clip_type", "gain", "bypass", "render_source_uid", "render_state", "midi_source_start"];
  var Session = class extends Node {
    uid;
    name;
    loaded;
    readOnly;
    sessionPackageUid;
    sessionPackagePath;
    canUndo;
    canRedo;
    changeCount;
    soloMode;
    tempoEstablished;
    commandStatus;
    commandPercentComplete;
    transport;
    tracks;
    buses;
    /** All playlists (take lanes) in the session; each names its track. */
    playlists;
    /** Tempo map, time and key signatures, and tick/bar/seconds conversion. */
    musical;
    markers;
    /** Edit contexts (`main`, `editor`, `alt_<n>`). */
    contexts;
    /** The `main` edit context: selection, zoom and the context edit commands. */
    context;
    /**
     * The track the user is working on: the main context's `lastSelectedTrack`, else the first
     * selected track, else the first visible track. `undefined` only when the session has no
     * visible track. Notifies when the answer moves to a different track, not on every
     * selection write. The last fallback follows tracks being added and removed, not a reorder.
     *
     * @example
     * const draw = () => (label.textContent = session.focusedTrack.value?.name.value ?? 'No track');
     * session.focusedTrack.onChange(draw);
     * draw();
     */
    focusedTrack;
    sourcesCollection;
    sourcesRelease;
    batchDepth = 0;
    watchRelease;
    readyPromise;
    /** @internal */
    constructor(client, uid) {
      super(client, `/sessions/${uid}`);
      this.uid = uid;
      this.name = this.writableProp("name");
      this.loaded = this.prop("loaded");
      this.readOnly = this.prop("read_only");
      this.sessionPackageUid = this.prop("session_package_uid");
      this.sessionPackagePath = this.prop("session_package_path");
      this.canUndo = this.prop("can_undo");
      this.canRedo = this.prop("can_redo");
      this.changeCount = this.prop("change_count");
      this.soloMode = this.prop("solo_mode");
      this.tempoEstablished = this.prop("tempo_established");
      this.commandStatus = this.prop("command_status");
      this.commandPercentComplete = this.prop("command_percent_complete");
      this.transport = new Transport(client, this.path, () => this.musical);
      this.tracks = new Collection(client, `${this.path}/tracks`, (p) => new Track(client, p, uid), { levels: 2, commands: false, flatvalue: true });
      this.buses = new Collection(client, `${this.path}/buses`, (p) => new Bus(client, p, uid), { levels: 2, commands: false, flatvalue: true });
      this.playlists = new Collection(client, `${this.path}/playlists`, (p) => new Playlist(client, p, uid, () => this.batching), { levels: 2, commands: false, flatvalue: true });
      this.musical = new Musical(client, this.path, uid, (name, fn) => this.transaction(name, fn));
      this.markers = new Markers(client, this.path, uid, () => this.musical.timeline);
      this.contexts = new Collection(client, `${this.path}/contexts`, (p) => new Context(client, p, uid), { levels: 2, commands: false, flatvalue: true });
      this.context = new Context(client, `${this.path}/contexts/main`, uid);
      const focusedId = derived([this.context.lastSelectedTrack, this.context.selectionTracks, this.tracks], () => this.focusedTrackId(), { distinct: true });
      this.focusedTrack = derived([focusedId], () => {
        const id = focusedId.value;
        return id === void 0 ? void 0 : this.tracks.byId(id);
      });
    }
    /** The uid behind {@link focusedTrack}; a uid that names no track (a bus, a deleted track) is skipped. */
    focusedTrackId() {
      const isTrack = (id) => typeof id === "string" && this.tracks.byId(id) !== void 0;
      const last = this.context.lastSelectedTrack.value;
      if (isTrack(last)) return last;
      const selected = this.context.selectionTracks.value;
      const first = Array.isArray(selected) ? selected.find(isTrack) : void 0;
      return first ?? this.visibleTracks[0]?.id;
    }
    /**
     * Subscribe to the whole session and load its properties, tracks and buses.
     * Idempotent; resolves when the initial state is in the cells.
     */
    ready() {
      if (!this.readyPromise) {
        const watch = this.client.store.watch(this.path, { recursive: true, load: { flatvalue: true, commands: false } });
        this.watchRelease = watch.release;
        this.readyPromise = watch.ready.then(() => Promise.all([this.tracks.load(), this.buses.load(), this.playlists.load(), this.musical.ready(), this.markers.load(), this.contexts.load()])).then(() => void 0);
      }
      return this.readyPromise;
    }
    /**
     * Source audio files of this session, under `/workspace/sessions/<package uid>/audio`.
     * `undefined` until the session's package uid is known (after `ready()`).
     */
    get sources() {
      const pkg = this.sessionPackageUid.value;
      if (!pkg) return void 0;
      if (!this.sourcesCollection || !this.sourcesCollection.path.includes(pkg)) {
        this.sourcesCollection?.dispose();
        this.sourcesRelease?.();
        this.sourcesCollection = new Collection(this.client, `/workspace/sessions/${pkg}/audio`, (p) => new AudioSource(this.client, p), { levels: 2, commands: false, flatvalue: true });
        this.sourcesRelease = this.sourcesCollection.watch().release;
      }
      return this.sourcesCollection;
    }
    /** The active playlist of a track, once playlists are loaded. */
    playlistFor(track) {
      const uid = track.playlistUid.value;
      return uid ? this.playlists.byId(uid) : void 0;
    }
    /** The master bus, once buses are loaded. */
    get master() {
      return this.buses.items.find((b) => b.isMaster);
    }
    /** Tracks sorted by their `order` key. */
    get tracksInOrder() {
      return [...this.tracks.items].sort((a, b) => (a.order.value ?? 0) - (b.order.value ?? 0));
    }
    /**
     * Tracks a user sees: `tracksInOrder` without LUNA's system `click` and `count_in` tracks
     * (fact 28).
     */
    get visibleTracks() {
      return this.tracksInOrder.filter((t) => !SYSTEM_TRACK_TYPES.has(t.trackType.value ?? ""));
    }
    // ---------------------------------------------------------------------------------------
    // Commands
    // ---------------------------------------------------------------------------------------
    /** Create a track. Resolves to the engine reply. */
    newTrack(options = {}) {
      const payload = { uid: this.uid, name: options.name ?? "Untitled", track_type: options.trackType ?? "audio", stem_format: options.stemFormat ?? "mono" };
      if (options.count !== void 0) payload["count"] = options.count;
      if (options.makeNameUnique !== void 0) payload["make_name_unique"] = options.makeNameUnique;
      if (options.folderUid !== void 0) payload["folder_uid"] = options.folderUid;
      return this.post("new_track", payload);
    }
    /**
     * Create an aux bus (`new_track` with `track_type: "bus"`, fact 83) in one undo step, and
     * resolve to the {@link Bus} once it is listed in {@link buses} with its properties loaded.
     *
     * @example
     * const reverb = await session.newBus({ name: 'Reverb' });
     * await track.outputs.byId('send_0').assign(reverb);
     */
    async newBus(options = {}) {
      const reply = await this.post("new_track", { uid: this.uid, name: options.name ?? "Bus", track_type: "bus", stem_format: options.stemFormat ?? "stereo" });
      const uid = reply?.uid;
      if (typeof uid !== "string" || !uid) throw new UAError("invalid_response", "new_track answered without a bus uid", { path: `${this.path}/new_track` });
      await settle(() => this.buses.byId(uid) !== void 0, "new bus", {
        path: `${this.path}/buses`,
        refresh: () => this.buses.reload(),
        flush: () => this.client.store.scheduler.flush()
      });
      await this.buses.membersReady();
      return this.buses.byId(uid);
    }
    undo(count = 1) {
      return this.post("undo", { session_uid: this.uid, count });
    }
    redo(count = 1) {
      return this.post("redo", { session_uid: this.uid, count });
    }
    /** Save (commit) the session. */
    save(options = {}) {
      const payload = { session_uid: this.uid };
      if (options.label !== void 0) payload["label"] = options.label;
      if (options.comments !== void 0) payload["comments"] = options.comments;
      return this.post("save_session", payload);
    }
    /**
     * Run `fn` as one undoable step. Aborts (discarding pending changes) if `fn` throws.
     * Called while a batch is already open, `fn` runs inside that batch: wrappers that batch
     * their own steps (`Output.retarget`) then join the caller's undo entry instead of nesting.
     *
     * @example
     * await session.transaction('Rename all', async () => {
     *   for (const t of session.tracks.items) await t.name.set(`${t.name.value} (mix)`);
     * });
     */
    async transaction(name, fn, options = {}) {
      if (this.batching) return fn();
      await this.post("begin_transaction", { session_uid: this.uid, name, is_continuous: options.continuous ?? false });
      this.batchDepth++;
      try {
        const result = await fn();
        this.batchDepth--;
        await this.post("commit_transaction", { session_uid: this.uid });
        return result;
      } catch (err) {
        this.batchDepth--;
        await this.post("abort_transaction", { session_uid: this.uid }).catch(() => void 0);
        throw err;
      }
    }
    /**
     * True while a {@link transaction} batch is open. LUNA holds selection writes and MIDI
     * deltas until the commit, so the selection-based verbs refuse to run inside one.
     */
    get batching() {
      return this.batchDepth > 0;
    }
    /**
     * Insert a clip from a source file onto a track's active playlist. Timeline position is in
     * ticks; source offsets are nanoseconds (fact 16).
     */
    insertClip(options) {
      const payload = { session_uid: this.uid, source_uid: options.sourceUid, start: options.startTick, stop: options.stopTick };
      if (options.trackUid !== void 0) payload["track_uid"] = options.trackUid;
      if (options.playlistUid !== void 0) payload["playlist_uid"] = options.playlistUid;
      if (options.sourceStartNs !== void 0) payload["source_start"] = options.sourceStartNs;
      if (options.sourceStopNs !== void 0) payload["source_stop"] = options.sourceStopNs;
      if (options.name !== void 0) payload["name"] = options.name;
      if (options.clipType !== void 0) payload["clip_type"] = { audio: 0, video: 1, midi: 2 }[options.clipType];
      return this.post("insert_clip", payload);
    }
    /** Create a new playlist version on the given tracks, empty or duplicating the current one. */
    newPlaylists(trackUids, options = {}) {
      return this.post("new_playlists", { session_uid: this.uid, track_uid: trackUids, context_type: "main", duplicate: options.duplicate ?? false });
    }
    /** Make a playlist version active on a track. */
    setPlaylist(trackUid, version) {
      return this.post("set_playlists", { session_uid: this.uid, track_uid: [trackUid], version, context_type: "main" });
    }
    /** Add a marker at `tick`. Resolves to the reply (`{ rowid }` on current engines). */
    /**
     * Add a marker at `tick` and resolve once it is in {@link markers}. `set_marker` answers
     * `null` whether or not it did anything (fact 71), so the list is the proof.
     *
     * @example
     * await session.addMarker(Luna.WHOLE_NOTE * 8, 'Chorus');
     */
    async addMarker(tick, name, options = {}) {
      const payload = { session_uid: this.uid, location: requireTick(tick, "marker tick"), name };
      if (options.color !== void 0) payload["color"] = options.color;
      if (options.comments !== void 0) payload["comments"] = options.comments;
      const before = new Set(this.markers.items.map((m) => m.id));
      const reply = await this.post("set_marker", payload);
      await settle(() => this.markers.items.some((m) => !before.has(m.id) && m.location.value === tick && m.name.value === name), "add marker", {
        path: `${this.path}/markers`,
        refresh: () => this.markers.reload(),
        flush: () => this.client.store.scheduler.flush()
      });
      return reply;
    }
    /**
     * Move or copy the clips in a tick range (or the context selection when omitted) so they
     * start at `toTick`.
     */
    moveClips(toTick, options = {}) {
      const payload = { session_uid: this.uid, context_type: options.contextType ?? "main", location: toTick };
      if (options.startTick !== void 0) payload["start"] = options.startTick;
      if (options.stopTick !== void 0) payload["stop"] = options.stopTick;
      if (options.trackUids !== void 0) payload["track_uid"] = options.trackUids;
      if (options.copy !== void 0) payload["copy"] = options.copy;
      return this.post("move_clips", payload);
    }
    /**
     * Delete tracks by uid in one undo step, and resolve once they have left {@link tracks}.
     *
     * @example
     * await session.deleteTracks([scratch.id]);
     */
    async deleteTracks(trackUids) {
      const reply = await this.post("delete_tracks", { session_uid: this.uid, track_uid: trackUids });
      await settle(() => trackUids.every((id) => this.tracks.byId(id) === void 0 && this.buses.byId(id) === void 0), "delete tracks", {
        path: `${this.path}/tracks`,
        refresh: () => Promise.all([this.tracks.reload(), this.buses.reload()]),
        flush: () => this.client.store.scheduler.flush()
      });
      return reply;
    }
    /**
     * Upload a file the engine cannot read from disk - a browser `File`, or any bytes - into
     * this session's package as a new audio source, and resolve to it once the workspace
     * lists it (fact 42).
     *
     * This is the **File route**, and the one that works everywhere: in LUNA and in a browser,
     * with no `/gui`. Get the `File` from `<input type="file">` or an HTML
     * `drop` event; the page can decode and audition the same `File` too. When the page only
     * needs the file in the session and has an engine-readable path (from
     * `luna.gui.chooseFiles()` or `Luna.onPathDrop()`), {@link importPath} is the faster path
     * route: nothing is copied through the page.
     *
     * The bytes go up base64-encoded in `chunkBytes` pieces through the engine's
     * `begin`/`transfer`/`end` phases, with `onProgress` after each chunk. A failed transfer
     * is cancelled, so a half-written file is not left behind. No clip is made: pass the
     * returned source's `id` to {@link insertClip} for that. LUNA files identical bytes only
     * once: uploading a file already in the session resolves to that source (fact 42). Use
     * {@link importFile} instead
     * when LUNA can already read the path itself.
     *
     * In LUNA 3.1.0.4589 and earlier `<input type="file">` opens nothing (fact 104), so offer an
     * HTML drop zone as well: `zone.ondrop = (e) => { e.preventDefault(); load(e.dataTransfer.files[0]); }`
     * with `zone.ondragover = (e) => e.preventDefault()`.
     *
     * @example
     * const source = await session.uploadFile({
     *   bytes: fileInput.files[0],
     *   onProgress: (sent, total) => (bar.value = sent / total),
     * });
     * await session.insertClip({ trackUid: track.id, sourceUid: source.id, startTick: 0, stopTick: 4 * Luna.TICKS_PER_BEAT });
     */
    async uploadFile(options) {
      await this.ready();
      const sources = this.sources;
      if (!sources) throw new UAError("unavailable", "uploadFile(): the session package uid is not known yet", { path: this.path });
      const pkg = this.sessionPackageUid.value;
      const name = options.name ?? fileName(options.bytes);
      if (!name) throw new UAError("out_of_range", "uploadFile(): give a name, or bytes that carry one", { path: this.path });
      const data = await toBytes(options.bytes);
      if (!data.length) throw new UAError("out_of_range", "uploadFile(): the file is empty", { path: this.path });
      const chunk = Math.max(1024, Math.min(options.chunkBytes ?? 256 * 1024, 4 * 1024 * 1024));
      const body = { session_package_uid: pkg, type: "audio" };
      const importId = Math.floor(Math.random() * 2147483647);
      const post = (payload) => this.wire.post("/workspace/import_file", { ...body, import_id: importId, ...payload });
      const begun = await post({ phase: "begin", name });
      const uid = begun?.uid;
      if (typeof uid !== "string") throw new UAError("invalid_response", "uploadFile(): import_file begin answered without a uid", { path: "/workspace/import_file" });
      let ended;
      try {
        for (let offset = 0; offset < data.length; offset += chunk) {
          await post({ phase: "transfer", uid, file_data: base64(data.subarray(offset, offset + chunk)) });
          options.onProgress?.(Math.min(data.length, offset + chunk), data.length);
        }
        ended = await post({ phase: "end", uid, name });
      } catch (err) {
        await post({ phase: "cancel", uid, name }).catch(() => void 0);
        throw err;
      }
      const filed = typeof ended?.uid === "string" && ended.uid ? ended.uid : uid;
      return this.listedSource(filed, options.timeoutMs ?? 3e4);
    }
    /** Wait for `uid` to appear in the workspace audio folder, re-reading it while waiting. */
    async listedSource(uid, timeoutMs) {
      const sources = this.sources;
      if (!sources) throw new UAError("unavailable", "the session package uid went away during an import", { path: this.path });
      const deadline = Date.now() + timeoutMs;
      for (; ; ) {
        const found = sources.byId(uid);
        if (found) return found;
        if (Date.now() > deadline) throw new UAError("no_effect", `the workspace did not list source ${uid} within ${timeoutMs} ms`, { path: sources.path });
        await this.client.store.load(sources.path, { levels: 2, commands: false, flatvalue: true });
        if (sources.refresh().some((s) => s.id === uid)) continue;
        await new Promise((r) => setTimeout(r, 50));
      }
    }
    /**
     * Copy a file the engine can read from disk into this session's package as a new audio
     * source, and resolve to it once the workspace lists it (fact 42, `local_copy`). No clip
     * is made: pass the source's `id` to {@link insertClip}.
     *
     * This is the **path route**, an optimization: the engine reads `path` itself, so the bytes
     * never pass through the page. Take the path from `luna.gui.chooseFiles()` or
     * `Luna.onPathDrop()`. It needs no `/gui`, but the engine must see the file: a native
     * engine on the same machine. A path the engine cannot open rejects
     * with LUNA's `device.database_error`. For a browser `File`, use {@link uploadFile}.
     *
     * @example
     * const [path] = await luna.gui.chooseFiles({ filters: ['*.wav'] });
     * if (path) {
     *   const source = await session.importPath(path);
     *   await session.insertClip({ trackUid: track.id, sourceUid: source.id, startTick: 0, stopTick: 4 * Luna.TICKS_PER_BEAT });
     * }
     */
    async importPath(path, options = {}) {
      await this.ready();
      const sources = this.sources;
      if (!sources) throw new UAError("unavailable", "importPath(): the session package uid is not known yet", { path: this.path });
      const name = options.name ?? path.slice(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);
      if (!name) throw new UAError("out_of_range", `importPath(): no file name in ${JSON.stringify(path)}`, { path: this.path });
      const reply = await this.wire.post("/workspace/import_file", {
        session_package_uid: this.sessionPackageUid.value,
        type: "audio",
        import_id: Math.floor(Math.random() * 2147483647),
        phase: "local_copy",
        path,
        name
      });
      const uid = reply?.uid;
      if (typeof uid !== "string") throw new UAError("invalid_response", "importPath(): import_file local_copy answered without a uid", { path: "/workspace/import_file" });
      return this.listedSource(uid, options.timeoutMs ?? 3e4);
    }
    /**
     * LUNA's own import: the File > Import action. Imports an audio, MIDI or video file at
     * the selection start, onto `trackUid` or a new track, making a clip as LUNA does.
     *
     * A **path route** command run by LUNA's UI, so it needs `/gui`: without it (a headless
     * engine) it rejects with `Luna.Unsupported` (fact 103). To add a source without a
     * clip, or without `/gui`, use {@link importPath}; for a browser `File`, {@link uploadFile}.
     *
     * @example
     * const [path] = await luna.gui.chooseFiles({ filters: ['*.wav', '*.mid'] });
     * if (path) await session.importFile(path, track.id);
     */
    async importFile(path, trackUid) {
      if (!await this.client.gui.available()) throw new Unsupported("importFile(): LUNA imports through its UI, and this engine has no /gui. Use session.importPath(), or session.uploadFile() for a File.");
      const payload = { path };
      if (trackUid !== void 0) payload["track_uid"] = trackUid;
      return this.post("import_files", payload);
    }
    /**
     * Bounce channels through LUNA's render engine (fact 44). Resolves once the render is
     * running, so the caller can watch `render.progress` and `await render.done()`.
     *
     * Without `outputPaths` the finished audio is added to the session as sources, one per
     * channel, under the returned `fileUids`; with them it is written to those paths instead.
     *
     * @example
     * const { render } = await session.bounce({ channelUids: [vocal.id], range: { startTick: 0, stopTick: 8 * Luna.TICKS_PER_BEAT } });
     * await render.done();
     */
    async bounce(options) {
      if (!options.channelUids.length) throw new UAError("out_of_range", "bounce(): give at least one channel", { path: this.path });
      if (options.outputPaths && options.outputPaths.length !== options.channelUids.length) {
        throw new UAError("out_of_range", `bounce(): ${options.outputPaths.length} outputPaths for ${options.channelUids.length} channels`, { path: this.path });
      }
      const tracks = {};
      const buses = {};
      const files = {};
      const fileUids = [];
      options.channelUids.forEach((uid2, i) => {
        const fileUid = newUid();
        fileUids.push(fileUid);
        if (this.tracks.byId(uid2)) tracks[uid2] = fileUid;
        else if (this.buses.byId(uid2)) buses[uid2] = fileUid;
        else throw new UAError("not_found", `bounce(): no channel ${uid2} in this session`, { path: this.path });
        if (options.outputPaths) files[fileUid] = options.outputPaths[i];
      });
      const uid = newUid();
      const addToSession = !options.outputPaths;
      const body = {
        uid,
        type: "bounce",
        name: options.name ?? "Bounce",
        session_uid: this.uid,
        real_time: options.realTime === true,
        add_to_session: addToSession,
        record_point: options.recordPoint ?? "post_pan"
      };
      if (Object.keys(tracks).length) body["tracks"] = tracks;
      if (Object.keys(buses).length) body["buses"] = buses;
      if (options.outputPaths) body["output_paths"] = files;
      const restore = await this.selectRange(options.range);
      try {
        await this.wire.post("/renders/new", body);
        const render = new Render(this.client, `/renders/${uid}`);
        await this.wire.post("/renders/start", { uid });
        await render.reload({ children: false, flatvalue: true, commands: false });
        return { render, fileUids };
      } finally {
        await restore();
      }
    }
    /**
     * LUNA's own export (`export_session`): the main bus over the timeline selection, or
     * `range`, to the session's export folder. The reply carries the path it wrote.
     *
     * The render is already running when this resolves, so a very short offline export can
     * finish and be dropped before anything observes it; `render.done()` then rejects with
     * `removed` although the file was written (fact 44).
     *
     * @example const { render, file } = await session.exportMain({ name: 'Rough mix' });
     */
    async exportMain(options = {}) {
      const restore = await this.selectRange(options.range);
      try {
        const body = { session_uid: this.uid, realtime: options.realTime === true };
        if (options.name !== void 0) body["bounce_name"] = options.name;
        const reply = await this.post("export_session", body);
        const uid = reply?.render_uid;
        if (typeof uid !== "string" || !uid) throw new UAError("no_effect", "exportMain(): LUNA answered without a render_uid", { path: this.path });
        const render = new Render(this.client, `/renders/${uid}`);
        await render.reload({ children: false, flatvalue: true, commands: false }).catch(() => void 0);
        return { render, file: typeof reply.file === "string" ? reply.file : void 0 };
      } finally {
        await restore();
      }
    }
    /**
     * Apply `range` as the timeline selection for the duration of a render, and hand back a
     * function that puts the user's selection back. A no-op when no range is given.
     */
    async selectRange(range) {
      if (!range) return async () => void 0;
      const { startTick, stopTick } = range;
      if (!Number.isFinite(startTick) || !Number.isFinite(stopTick) || startTick < 0 || stopTick <= startTick) {
        throw new UAError("out_of_range", `range ${startTick}..${stopTick} is not a positive tick span`, { path: this.path });
      }
      await this.contexts.load();
      const saved = { start: this.context.selectionStart.value, stop: this.context.selectionStop.value };
      await this.context.select({ startTick: Math.round(startTick), stopTick: Math.round(stopTick) });
      return async () => {
        if (saved.start === null || saved.start === void 0 || saved.stop === null || saved.stop === void 0) return;
        await this.context.select({ startTick: saved.start, stopTick: saved.stop }).catch(() => void 0);
      };
    }
    /**
     * Record one pass onto an audio track and resolve to the finalized take.
     *
     * The flow measured on 4543 (fact 75): route and arm the track and confirm the arm by a
     * read, roll the transport in record (writing the session's `record_enabled` starts
     * playback by itself), wait for `punchedIn` so any count-in is over and capture has really
     * begun, hold for `seconds` or until `signal` aborts, then stop and disarm. The take
     * finalizes onto the track's active playlist as a clip whose source is born under
     * `<session>/record/audio/<uid>` and migrates to the workspace audio folder about half a
     * second later, so this waits for the source to be listed too — the take is drawable by
     * {@link clipAudio} the moment it resolves.
     *
     * LUNA punches in only when the punch point lies inside `loop_start..loop_stop`, looping on
     * or not; outside it the transport rolls, the count-in completes and nothing is captured.
     * The marks are therefore widened around the punch and put back afterwards.
     *
     * The capture is always stopped and the track disarmed, even on error.
     *
     * @example
     * const inputs = await luna.audioInputs();
     * const take = await session.record({ track: drums, inputUid: inputs[0]?.uid, seconds: 8 });
     * console.log(take.name.value, take.length! / Luna.TICKS_PER_BEAT, 'beats');
     */
    async record(options) {
      await this.ready();
      const track = typeof options.track === "string" ? this.tracks.byId(options.track) : options.track;
      if (!track) throw new UAError("not_found", `record(): no track ${String(typeof options.track === "string" ? options.track : "")}`, { path: this.path });
      if (track.trackType.value !== "audio") throw new UAError("out_of_range", `record(): ${String(track.name.value)} is not an audio track`, { path: track.path });
      const lane = this.playlistFor(track);
      if (!lane) throw new UAError("unavailable", `record(): ${String(track.name.value)} has no active playlist`, { path: track.path });
      await lane.clips.load();
      if (options.seconds === void 0 && !options.signal) throw new UAError("out_of_range", "record(): give seconds, a signal, or both", { path: this.path });
      if (options.seconds !== void 0 && (!Number.isFinite(options.seconds) || options.seconds <= 0)) {
        throw new UAError("out_of_range", "record(): seconds must be greater than 0", { path: this.path });
      }
      if (options.inputUid !== void 0) await track.inputNodeUid.set(options.inputUid);
      await track.recordEnabled.set(true);
      await settle(() => track.recordEnabled.value === true, "arm track", {
        path: track.path,
        refresh: () => this.client.store.load(track.path, { children: false, commands: false, propfilter: ["record_enabled"] }),
        flush: () => this.client.store.scheduler.flush()
      });
      await this.transport.looping.set(false);
      if (options.startTick !== void 0) await this.transport.playStart.set(requireTick(options.startTick, "startTick"));
      await this.client.store.load(this.path, { children: false, commands: false, propfilter: ["play_start", "loop_start", "loop_stop"] });
      const punchAt = options.startTick ?? this.transport.playStart.value ?? 0;
      const loopWas = { start: this.transport.loopStart.value, stop: this.transport.loopStop.value };
      let widened = false;
      if (loopWas.start !== void 0 && loopWas.stop !== void 0 && !(punchAt >= loopWas.start && punchAt < loopWas.stop)) {
        await this.transport.setLoop(Math.min(loopWas.start, punchAt), Math.max(loopWas.stop, punchAt + RECORD_LOOP_MARGIN_TICKS));
        widened = true;
      }
      const before = new Set(lane.clips.items.map((c) => c.id));
      try {
        await this.transport.recordEnabled.set(true);
        await settle(() => this.transport.punchedIn.value === true, "punch in", {
          path: this.path,
          timeoutMs: 3e4,
          refresh: () => this.client.store.load(this.path, { children: false, commands: false, propfilter: ["punched_in", "counting_in", "playing"] }),
          flush: () => this.client.store.scheduler.flush()
        });
        await captureWindow(options.seconds, options.maxSeconds ?? 600, options.signal);
      } finally {
        await this.transport.recordEnabled.set(false).catch(() => {
        });
        await this.transport.playing.set(false).catch(() => {
        });
        await track.recordEnabled.set(false).catch(() => {
        });
        await this.client.store.load(track.path, { children: false, commands: false, propfilter: ["record_enabled", "record_mute", "input_monitor", "input_monitor_state"] }).catch(() => {
        });
        await this.client.store.load(this.path, { children: false, commands: false, propfilter: ["record_enabled", "playing", "punched_in", "counting_in"] }).catch(() => {
        });
        if (widened && loopWas.start !== void 0 && loopWas.stop !== void 0) await this.transport.setLoop(loopWas.start, loopWas.stop).catch(() => {
        });
      }
      let take;
      await settle(
        () => {
          take = lane.clips.items.find((c) => !before.has(c.id) && Boolean(c.sourceUid.value) && (c.stop.value ?? 0) > (c.start.value ?? 0));
          return take !== void 0;
        },
        "finalize take",
        {
          path: `${lane.path}/clips`,
          timeoutMs: 8e3,
          refresh: async () => {
            await this.client.store.load(`${lane.path}/clips`, { levels: 2, commands: false, flatvalue: true, propfilter: CLIP_PROPS });
            lane.clips.refresh();
          },
          flush: () => this.client.store.scheduler.flush()
        }
      );
      const sourceUid = take.sourceUid.value;
      if (sourceUid) await this.listedSource(sourceUid, 8e3).catch(() => void 0);
      return take;
    }
    /** Close this session. */
    close() {
      return this.wire.post("/sessions/close_session", { session_uid: this.uid });
    }
    release() {
      this.tracks.dispose();
      this.buses.dispose();
      this.playlists.dispose();
      this.musical.dispose();
      this.markers.dispose();
      this.contexts.dispose();
      this.sourcesCollection?.dispose();
      this.sourcesRelease?.();
      this.sourcesRelease = void 0;
      this.watchRelease?.();
      this.watchRelease = void 0;
      this.readyPromise = void 0;
      this.client.store.forget(this.path);
    }
  };
  function captureWindow(seconds, maxSeconds, signal) {
    const deadline = Date.now() + Math.min(seconds ?? maxSeconds, maxSeconds) * 1e3;
    return new Promise((resolve) => {
      let timer;
      const finish = () => {
        if (timer) clearInterval(timer);
        signal?.removeEventListener("abort", finish);
        resolve();
      };
      if (signal?.aborted) return finish();
      signal?.addEventListener("abort", finish, { once: true });
      timer = setInterval(() => {
        if (Date.now() >= deadline) finish();
      }, 50);
    });
  }
  async function toBytes(input) {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    return new Uint8Array(await input.arrayBuffer());
  }
  function fileName(input) {
    if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) return void 0;
    const name = input.name;
    return typeof name === "string" && name ? name : void 0;
  }
  function base64(bytes) {
    if (typeof Buffer !== "undefined") return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
    let binary = "";
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(binary);
  }
  function newUid() {
    return globalThis.crypto.randomUUID().replaceAll("-", "");
  }

  // src/model/sessions.ts
  var Sessions = class extends Node {
    /** Open sessions. */
    items;
    /** Uid of the focused session, writable. */
    focusedUid;
    /** The focused Session object, when it is among the open ones. */
    focused;
    readyPromise;
    /** @internal */
    constructor(client) {
      super(client, "/sessions");
      this.items = new Collection(client, "/sessions", (_path, uid) => new Session(client, uid), { levels: 1, commands: false, flatvalue: true });
      this.focusedUid = this.writableProp("focused_session");
      this.focused = derived([this.focusedUid, this.items], () => {
        const uid = this.focusedUid.value;
        return uid ? this.items.byId(uid) : void 0;
      });
    }
    /** Subscribe to `/sessions` and load the list. Idempotent. */
    ready() {
      if (!this.readyPromise) {
        const watch = this.client.store.watch("/sessions", { load: { flatvalue: true, commands: false } });
        this.readyPromise = watch.ready.then(() => {
          this.items.refresh();
        });
      }
      return this.readyPromise;
    }
    /** The focused session or, failing that, the first open one. Not yet `ready()`. */
    current() {
      return this.focused.value ?? this.items.items[0];
    }
    /** Create a new session, load it and wait until the engine reports it loaded. */
    async create(options) {
      const payload = { name: options.name };
      if (options.directoryPath !== void 0) payload["directory_path"] = options.directoryPath;
      const reply = await this.post("new_session", payload);
      const uid = reply?.session_uid;
      if (!uid) throw new Error("new_session did not return a session_uid");
      return this.loadSession(uid, options.timeoutMs);
    }
    /** Open an existing session package by its uid (see `/workspace/sessions`). */
    async open(sessionPackageUid, timeoutMs) {
      const reply = await this.post("open_session", { session_package_uid: sessionPackageUid.replaceAll("-", "") });
      const uid = reply?.session_uid;
      if (!uid) throw new Error("open_session did not return a session_uid");
      return this.loadSession(uid, timeoutMs);
    }
    /** Close a session by uid. */
    close(uid) {
      return this.post("close_session", { session_uid: uid });
    }
    /** `load_session` then wait for `/sessions/<uid>/loaded` to become true (fact 15). */
    async loadSession(uid, timeoutMs = 15e3) {
      await this.post("load_session", { session_uid: uid });
      await this.ready();
      await this.client.store.load("/sessions", { flatvalue: true, commands: false });
      const session = this.items.byId(uid) ?? new Session(this.client, uid);
      await session.ready();
      if (session.loaded.value !== true) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            unsub();
            reject(new RequestTimeout("load_session", session.path, timeoutMs));
          }, timeoutMs);
          const unsub = session.loaded.onChange(() => {
            if (session.loaded.value === true) {
              clearTimeout(timer);
              unsub();
              resolve();
            }
          });
          void this.client.store.load(`${session.path}/loaded`).catch(() => void 0);
        });
      }
      return session;
    }
  };

  // src/client/secrets.ts
  var MAX_SECRET_NAME_LENGTH = 128;
  var MAX_SECRET_BYTES = 2560;
  var NAME = /^[A-Za-z0-9._-]+$/;
  var TIMEOUT_MS = 3e4;
  var pending = /* @__PURE__ */ new Map();
  var memory = /* @__PURE__ */ new Map();
  var nextId = 1;
  var warned = false;
  var Secrets = class {
    /**
     * `'keychain'` inside a LUNA that stores secrets; `'memory'` elsewhere, where values last
     * only until the page reloads. Tell the user when it is `'memory'`.
     *
     * @example
     * if (luna.secrets.storage === 'memory') banner.textContent = 'Keys are kept until you close this page.';
     */
    get storage() {
      return bridge() ? "keychain" : "memory";
    }
    /**
     * The value stored under `name`, or `null` if there is none.
     *
     * @example
     * const key = await luna.secrets.get('openai.api_key');
     */
    get(name) {
      checkName(name);
      if (!bridge()) return Promise.resolve(memory.get(name) ?? null);
      return request({ op: "get", name });
    }
    /**
     * Store `value` under `name`, replacing any value already there.
     *
     * @example
     * await luna.secrets.set('openai.api_key', input.value);
     */
    async set(name, value) {
      checkName(name);
      if (typeof value !== "string") throw new UAError("invalid_request", "luna.secrets.set(): value must be a string");
      if (new TextEncoder().encode(value).length > MAX_SECRET_BYTES) {
        throw new UAError("too_large", `luna.secrets.set(): value is over ${MAX_SECRET_BYTES} bytes`);
      }
      if (!bridge()) {
        warnMemory();
        memory.set(name, value);
        return;
      }
      await request({ op: "set", name, value });
    }
    /**
     * Remove `name`. Removing a name that is not stored succeeds.
     *
     * @example
     * await luna.secrets.delete('openai.api_key');
     */
    async delete(name) {
      checkName(name);
      if (!bridge()) {
        memory.delete(name);
        return;
      }
      await request({ op: "delete", name });
    }
  };
  function bridge() {
    const send = globalThis.lunaAPI?.secretsRequest;
    return typeof send === "function" ? send : void 0;
  }
  function checkName(name) {
    if (typeof name !== "string" || name.length > MAX_SECRET_NAME_LENGTH || !NAME.test(name)) {
      throw new UAError("invalid_name", `luna.secrets: "${String(name)}" is not a valid name (1-${MAX_SECRET_NAME_LENGTH} of A-Z a-z 0-9 . _ -)`);
    }
  }
  function warnMemory() {
    if (warned) return;
    warned = true;
    console.warn("luna.secrets: no OS credential store here (not inside LUNA, or LUNA is too old); secrets are kept in page memory until reload.");
  }
  function request(body) {
    const send = bridge();
    if (!send) return Promise.reject(new UAError("unsupported", "luna.secrets: the LUNA bridge went away"));
    listen();
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new RequestTimeout(`secrets.${body.op}`, body.name, TIMEOUT_MS));
      }, TIMEOUT_MS);
      pending.set(id, { resolve, reject, timer });
      send({ id, ...body });
    });
  }
  function listen() {
    const g = globalThis;
    g.lunaHost ??= {};
    g.lunaHost.secretsResult = onResult;
  }
  function onResult(result) {
    if (typeof result?.id !== "number") return;
    const entry = pending.get(result.id);
    if (!entry) return;
    pending.delete(result.id);
    clearTimeout(entry.timer);
    if (result.ok === true) {
      entry.resolve(typeof result.value === "string" ? result.value : null);
      return;
    }
    const code = typeof result.error === "string" ? result.error : "store_error";
    entry.reject(new UAError(code, `luna.secrets: LUNA answered ${code}`));
  }

  // src/client/client.ts
  var Client = class {
    /** The transport. Escape hatch: `luna.raw.get('/sessions')`. */
    raw;
    /** The path-keyed mirror the domain objects read from. */
    store;
    /** Which engine this client is talking to: `'luna'` or `'mock'`. */
    engine;
    /** Connection status as a {@link Prop}. */
    status;
    /** Open sessions and the commands that create or open them. */
    sessions;
    /** The plugin catalog (`/plugins`). Call `load()` once before reading. */
    plugins;
    /** The preset library query (`/presets`). */
    presets;
    /** Session packages on disk and the workspace query. */
    workspace;
    drivers;
    devices;
    preferences;
    renders;
    jobs;
    /** LUNA's host surface (dialogs, pages, Add Ons). Only present inside LUNA. */
    gui;
    /** API keys and tokens in the OS credential store, scoped to this Add On (page memory outside LUNA). */
    secrets;
    statusCell;
    statusUnsub;
    /** @internal Use {@link connect}. */
    constructor(port, engine, store = new Store(port)) {
      registry.push(this);
      this.raw = port;
      this.store = store;
      this.engine = engine;
      this.statusCell = new Cell(store.scheduler, port.connected ? "connected" : "disconnected");
      this.status = this.statusCell;
      this.statusUnsub = port.onStatus((s) => this.statusCell.update(s));
      this.sessions = new Sessions(this);
      this.plugins = new Plugins(this);
      this.presets = new Presets(this);
      this.workspace = new Workspace(this);
      this.drivers = new Drivers(this);
      this.devices = new Devices(this);
      this.preferences = new Preferences(this);
      this.renders = new Renders(this);
      this.jobs = new Jobs(this);
      this.gui = new Gui(this);
      this.secrets = new Secrets();
    }
    /**
     * The focused session (or the first open one), subscribed and loaded.
     *
     * @example
     * const session = await luna.session();
     * console.log(session.name.value, session.tracks.items.length);
     */
    async session() {
      await this.sessions.ready();
      const current = this.sessions.current();
      if (!current) throw new NoSessionOpen();
      await current.ready();
      return current;
    }
    /**
     * The device inputs a track can record from (`/devices/<device>/inputs`, fact 76). Assign
     * one with `track.inputNodeUid.set(input.uid)`, or pass it to `session.record()`.
     *
     * Read on each call and not cached: devices come and go, and `inUse` changes as tracks are
     * armed.
     *
     * @example
     * const inputs = await luna.audioInputs();
     * for (const i of inputs) console.log(i.name, i.stemFormat, i.inUse ? '(in use)' : '');
     * await track.inputNodeUid.set(inputs[0]!.uid);
     */
    async audioInputs() {
      const devices = await this.raw.get("/devices", { children: true, properties: false, commands: false });
      const out = [];
      for (const device of childNames(devices)) {
        const inputs = await this.raw.get(`/devices/${device}/inputs`, { children: true, levels: 2, commands: false, propfilter: ["name", "stem_format", "device_id", "in_use"] }).catch(() => void 0);
        for (const child of childEntries(inputs)) {
          out.push(
            Object.freeze({
              uid: child.name,
              name: typeof child.properties["name"] === "string" ? child.properties["name"] : child.name,
              stemFormat: typeof child.properties["stem_format"] === "string" ? child.properties["stem_format"] : "mono",
              deviceId: typeof child.properties["device_id"] === "string" ? child.properties["device_id"] : device,
              inUse: child.properties["in_use"] === true
            })
          );
        }
      }
      return out;
    }
    get connected() {
      return this.raw.connected;
    }
    /**
     * The in-memory engine when `engine === 'mock'`, for driving the page as a second client
     * would: `luna.mock.setValue(path, 'name', 'Lead')`.
     */
    get mock() {
      return this.raw instanceof MockPort ? this.raw.engine : void 0;
    }
    /**
     * The in-page wasm engine (audio, persistence, health) when `engine === 'wasm'`.
     *
     * @hidden
     */
    get wasm() {
      return this.raw instanceof WasmPort ? this.raw.engine : void 0;
    }
    /**
     * Deliver every pending change notification now, and resolve once they have run. Handy in
     * tests: after `await engine.settled()` the prop *values* are already current, but
     * `onChange` listeners are coalesced to the next frame — this flushes them immediately, so
     * `await engine.settled(); await luna.settled();` is deterministic without waiting for a
     * requestAnimationFrame or timer.
     *
     * It also waits for reads in flight, such as the properties of a member the engine just
     * added (the collection holds that member's `onChange` until they land), so a new clip or
     * track has its values when this resolves.
     */
    async settled() {
      for (let round = 0; round < 8; round++) {
        this.store.scheduler.flush();
        await this.store.scheduler.settled();
        if (!this.store.pendingReads) return;
        await this.store.readsSettled();
      }
    }
    /** Disconnect and release everything. */
    async close() {
      const at = registry.indexOf(this);
      if (at >= 0) registry.splice(at, 1);
      this.statusUnsub();
      await this.store.close();
      await this.raw.close();
      this.statusCell.update("closed");
    }
  };
  var registry = [];
  function clients() {
    return [...registry];
  }
  function childNames(reply) {
    return childEntries(reply).map((c) => c.name);
  }
  function childEntries(reply) {
    if (typeof reply !== "object" || reply === null) return [];
    const children = reply.children;
    if (!Array.isArray(children)) return [];
    const out = [];
    for (const child of children) {
      if (typeof child === "string") {
        out.push({ name: child, properties: {} });
        continue;
      }
      if (typeof child !== "object" || child === null) continue;
      const record = child;
      const raw = record["path"] ?? record["name"] ?? record["id"];
      if (typeof raw !== "string") continue;
      const name = raw.slice(raw.lastIndexOf("/") + 1);
      const properties = {};
      for (const [key, value] of Object.entries(record)) {
        if (key !== "children" && key !== "commands" && key !== "path" && key !== "properties") properties[key] = unwrapValue(value);
      }
      const nested = record["properties"];
      if (Array.isArray(nested)) {
        for (const entry of nested) {
          if (typeof entry === "object" && entry !== null && typeof entry.name === "string") {
            properties[entry.name] = unwrapValue(entry.value);
          }
        }
      } else if (typeof nested === "object" && nested !== null) {
        for (const [key, value] of Object.entries(nested)) properties[key] = unwrapValue(value);
      }
      out.push({ name, properties });
    }
    return out;
  }
  function unwrapValue(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value) && "value" in value ? value.value : value;
  }

  // src/client/connect.ts
  async function connect(options = {}) {
    if (options.port_) {
      return new Client(options.port_, options.engine ?? "mock");
    }
    const fromLocation = locationOptions();
    if (options.engine === "mock" || options.engine === void 0 && fromLocation.engine === "mock") {
      const setup = options.setup ?? globalThis.LunaMockSetup;
      const engine2 = setup ? new MockEngine() : MockEngine.demo();
      await setup?.(engine2);
      await engine2.settled();
      return new Client(engine2.port(), "mock");
    }
    if (options.engine === "wasm" || options.engine === void 0 && fromLocation.engine === "wasm") {
      const boot = { ...options.wasm ?? {} };
      if (options.engineUrl !== void 0) boot.engineUrl = options.engineUrl;
      else if (fromLocation.engineUrl !== void 0) boot.engineUrl = fromLocation.engineUrl;
      const engine2 = await bootWasmEngine(boot);
      const port2 = new WasmPort(engine2, options.requestTimeoutMs !== void 0 ? { requestTimeoutMs: options.requestTimeoutMs } : {});
      return new Client(port2, "wasm");
    }
    const host = options.host ?? fromLocation.host;
    const port = options.port ?? fromLocation.port ?? DEFAULT_LUNA_PORT;
    const wsOptions = { port };
    if (options.url !== void 0) wsOptions.url = options.url;
    if (host !== void 0) wsOptions.host = host;
    if (options.requestTimeoutMs !== void 0) wsOptions.requestTimeoutMs = options.requestTimeoutMs;
    if (options.WebSocket !== void 0) wsOptions.WebSocket = options.WebSocket;
    if (options.log !== void 0) wsOptions.log = options.log;
    const wsPort = new WebSocketPort(wsOptions);
    await wsPort.open();
    const engine = options.engine ?? "luna";
    return new Client(wsPort, engine);
  }

  // src/client/path-drop.ts
  var registered = [];
  var installed;
  var previous;
  function canDropPaths() {
    return hasNativeBridge();
  }
  function onPathDrop(handlers) {
    const g = globalThis;
    const accept = g.lunaAPI?.setAcceptsFileDrops;
    if (typeof accept !== "function") {
      throw new Unsupported("onPathDrop(): native path drops exist only inside LUNA. Use an HTML drop listener, which gives File objects.");
    }
    const entry = typeof handlers === "function" ? { drop: handlers } : handlers;
    registered.push(entry);
    install(g);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      const i = registered.indexOf(entry);
      if (i >= 0) registered.splice(i, 1);
      if (registered.length === 0) uninstall(g);
    };
  }
  function install(g) {
    if (installed && g.lunaHost === installed) return;
    const each = (run2) => {
      for (const h of [...registered]) {
        try {
          run2(h);
        } catch (err) {
          console.warn("Luna.onPathDrop: a handler threw", err);
        }
      }
    };
    const host = {
      ...g.lunaHost,
      fileDragEnter: (info) => each((h) => h.dragOver?.(toDrop(info))),
      fileDragOver: (info) => each((h) => h.dragOver?.(toDrop(info))),
      fileDragLeave: () => each((h) => h.dragLeave?.()),
      filesDropped: (info) => {
        const drop = toDrop(info);
        if (drop.paths.length) each((h) => h.drop(drop));
      }
    };
    previous = g.lunaHost;
    g.lunaHost = host;
    installed = host;
    g.lunaAPI?.setAcceptsFileDrops?.(true);
  }
  function uninstall(g) {
    g.lunaAPI?.setAcceptsFileDrops?.(false);
    if (installed && g.lunaHost === installed) {
      if (previous) g.lunaHost = previous;
      else delete g.lunaHost;
    }
    installed = void 0;
    previous = void 0;
  }
  function toDrop(info) {
    const o = typeof info === "object" && info !== null ? info : {};
    return {
      paths: Array.isArray(o.paths) ? o.paths.filter((p) => typeof p === "string") : [],
      x: typeof o.x === "number" ? o.x : 0,
      y: typeof o.y === "number" ? o.y : 0
    };
  }

  // src/luna.ts
  var VERSION = "0.1.1.22";
  return __toCommonJS(global_exports);
})();
//# sourceMappingURL=luna.global.js.map