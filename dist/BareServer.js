"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.json = exports.BareError = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
class BareError extends Error {
    status;
    body;
    constructor(status, body) {
        super(body.message || body.code);
        this.status = status;
        this.body = body;
    }
}
exports.BareError = BareError;
const project = {
    name: 'bare-server-worker',
    description: 'TOMPHTTP Cloudflare Bare Server',
    repository: 'https://github.com/tomphttp/bare-server-worker',
    version: '1.2.2',
};
function json(status, json) {
    return new Response(JSON.stringify(json, null, '\t'), {
        status,
        headers: {
            'content-type': 'application/json',
        },
    });
}
exports.json = json;
class Server extends EventTarget {
    routes = new Map();
    socketRoutes = new Map();
    closed = false;
    directory;
    options;
    /**
     * @internal
     */
    constructor(directory, options) {
        super();
        this.directory = directory;
        this.options = options;
    }
    /**
     * Remove all timers and listeners
     */
    close() {
        this.closed = true;
        this.dispatchEvent(new Event('close'));
    }
    shouldRoute(request) {
        return (!this.closed && new URL(request.url).pathname.startsWith(this.directory));
    }
    get instanceInfo() {
        return {
            versions: ['v1', 'v2', 'v3'],
            language: 'Cloudflare',
            maintainer: this.options.maintainer,
            project,
        };
    }
    async routeRequest(request) {
        const service = new URL(request.url).pathname.slice(this.directory.length - 1);
        let response;
        const isSocket = request.headers.get('upgrade') === 'websocket';
        try {
            if (request.method === 'OPTIONS') {
                response = new Response(undefined, { status: 200 });
            }
            else if (service === '/') {
                response = json(200, this.instanceInfo);
            }
            else if (!isSocket && this.routes.has(service)) {
                const call = this.routes.get(service);
                response = await call(request, this.options);
            }
            else if (isSocket && this.socketRoutes.has(service)) {
                const call = this.socketRoutes.get(service);
                response = await call(request, this.options);
            }
            else {
                throw new http_errors_1.default.NotFound();
            }
        }
        catch (error) {
            if (this.options.logErrors)
                console.error(error);
            if (http_errors_1.default.isHttpError(error)) {
                response = json(error.statusCode, {
                    code: 'UNKNOWN',
                    id: `error.${error.name}`,
                    message: error.message,
                    stack: error.stack,
                });
            }
            else if (error instanceof Error) {
                response = json(500, {
                    code: 'UNKNOWN',
                    id: `error.${error.name}`,
                    message: error.message,
                    stack: error.stack,
                });
            }
            else {
                response = json(500, {
                    code: 'UNKNOWN',
                    id: 'error.Exception',
                    message: error,
                    stack: new Error(error).stack,
                });
            }
            if (!(response instanceof Response)) {
                if (this.options.logErrors) {
                    console.error('Cannot', request.method, new URL(request.url).pathname, ': Route did not return a response.');
                }
                throw new http_errors_1.default.InternalServerError();
            }
        }
        response.headers.set('x-robots-tag', 'noindex');
        response.headers.set('access-control-allow-headers', '*');
        response.headers.set('access-control-allow-origin', '*');
        response.headers.set('access-control-allow-methods', '*');
        response.headers.set('access-control-expose-headers', '*');
        // don't fetch preflight on every request...
        // instead, fetch preflight every 10 minutes
        response.headers.set('access-control-max-age', '7200');
        return response;
    }
}
exports.default = Server;
//# sourceMappingURL=BareServer.js.map