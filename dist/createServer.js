"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BareServer_js_1 = __importDefault(require("./BareServer.js"));
const Meta_js_1 = require("./Meta.js");
const Meta_js_2 = require("./Meta.js");
const V1_js_1 = __importDefault(require("./V1.js"));
const V2_js_1 = __importDefault(require("./V2.js"));
const V3_js_1 = __importDefault(require("./V3.js"));
/**
 * Create a Bare server.
 * This will handle all lifecycles for unspecified options (httpAgent, httpsAgent, metaMap).
 */
function createBareServer(directory, init = {}) {
    if (typeof directory !== 'string')
        throw new Error('Directory must be specified.');
    if (!directory.startsWith('/') || !directory.endsWith('/'))
        throw new RangeError('Directory must start and end with /');
    init.logErrors ??= false;
    const cleanup = [];
    if (!init.database) {
        const database = new Map();
        const interval = setInterval(() => (0, Meta_js_2.cleanupDatabase)(database), 1000);
        init.database = database;
        cleanup.push(() => clearInterval(interval));
    }
    const server = new BareServer_js_1.default(directory, {
        ...init,
        database: new Meta_js_1.JSONDatabaseAdapter(init.database),
    });
    (0, V1_js_1.default)(server);
    (0, V2_js_1.default)(server);
    (0, V3_js_1.default)(server);
    server.addEventListener('close', () => {
        for (const cb of cleanup)
            cb();
    });
    return server;
}
exports.default = createBareServer;
//# sourceMappingURL=createServer.js.map