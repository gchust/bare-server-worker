"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const KVAdapter_js_1 = __importDefault(require("./KVAdapter.js"));
const Meta_js_1 = require("./Meta.js");
const createServer_js_1 = __importDefault(require("./createServer.js"));
const kvDB = new KVAdapter_js_1.default(BARE);
const bare = (0, createServer_js_1.default)('/', {
    logErrors: true,
    database: kvDB,
});
addEventListener('fetch', (event) => {
    (0, Meta_js_1.cleanupDatabase)(kvDB);
    if (bare.shouldRoute(event.request))
        event.respondWith(bare.routeRequest(event.request));
});
//# sourceMappingURL=sw.js.map