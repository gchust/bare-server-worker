"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BareServer_js_1 = require("./BareServer.js");
const requestUtil_js_1 = require("./requestUtil.js");
const requestUtil_js_2 = require("./requestUtil.js");
const splitHeaderUtil_js_1 = require("./splitHeaderUtil.js");
const validProtocols = ['http:', 'https:', 'ws:', 'wss:'];
const forbiddenForwardHeaders = [
    'connection',
    'transfer-encoding',
    'host',
    'connection',
    'origin',
    'referer',
];
const forbiddenPassHeaders = [
    'vary',
    'connection',
    'transfer-encoding',
    'access-control-allow-headers',
    'access-control-allow-methods',
    'access-control-expose-headers',
    'access-control-max-age',
    'access-control-request-headers',
    'access-control-request-method',
];
// common defaults
const defaultForwardHeaders = ['accept-encoding', 'accept-language'];
const defaultPassHeaders = [
    'content-encoding',
    'content-length',
    'last-modified',
];
// defaults if the client provides a cache key
const defaultCacheForwardHeaders = [
    'if-modified-since',
    'if-none-match',
    'cache-control',
];
const defaultCachePassHeaders = ['cache-control', 'etag'];
const cacheNotModified = 304;
function loadForwardedHeaders(forward, target, request) {
    for (const header of forward) {
        if (request.headers.has(header)) {
            target[header] = request.headers.get(header);
        }
    }
}
const splitHeaderValue = /,\s*/g;
function readHeaders(request) {
    const remote = Object.setPrototypeOf({}, null);
    const sendHeaders = Object.setPrototypeOf({}, null);
    const passHeaders = [...defaultPassHeaders];
    const passStatus = [];
    const forwardHeaders = [...defaultForwardHeaders];
    // should be unique
    const cache = new URL(request.url).searchParams.has('cache');
    if (cache) {
        passHeaders.push(...defaultCachePassHeaders);
        passStatus.push(cacheNotModified);
        forwardHeaders.push(...defaultCacheForwardHeaders);
    }
    const headers = (0, splitHeaderUtil_js_1.joinHeaders)(request.headers);
    if (headers.has('x-bare-url')) {
        const url = new URL(headers.get('x-bare-url'));
        if (!validProtocols.includes(url.protocol)) {
            throw new BareServer_js_1.BareError(400, {
                code: 'INVALID_BARE_HEADER',
                id: `request.headers.x-bare-url`,
                message: `Invalid protocol specified in URL.`,
            });
        }
        remote.protocol = url.protocol;
        remote.host = url.host;
        remote.port = url.port;
        remote.path = url.pathname;
    }
    else {
        throw new BareServer_js_1.BareError(400, {
            code: 'MISSING_BARE_HEADER',
            id: `request.headers.x-bare-url`,
            message: `Header was not specified.`,
        });
    }
    if (headers.has('x-bare-headers')) {
        try {
            const json = JSON.parse(headers.get('x-bare-headers'));
            for (const header in json) {
                const value = json[header];
                if (typeof value === 'string') {
                    sendHeaders[header] = value;
                }
                else if (Array.isArray(value)) {
                    const array = [];
                    for (const val of value) {
                        if (typeof val !== 'string') {
                            throw new BareServer_js_1.BareError(400, {
                                code: 'INVALID_BARE_HEADER',
                                id: `bare.headers.${header}`,
                                message: `Header was not a String.`,
                            });
                        }
                        array.push(val);
                    }
                    sendHeaders[header] = array;
                }
                else {
                    throw new BareServer_js_1.BareError(400, {
                        code: 'INVALID_BARE_HEADER',
                        id: `bare.headers.${header}`,
                        message: `Header was not a String.`,
                    });
                }
            }
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                throw new BareServer_js_1.BareError(400, {
                    code: 'INVALID_BARE_HEADER',
                    id: `request.headers.x-bare-headers`,
                    message: `Header contained invalid JSON. (${error.message})`,
                });
            }
            else {
                throw error;
            }
        }
    }
    else {
        throw new BareServer_js_1.BareError(400, {
            code: 'MISSING_BARE_HEADER',
            id: `request.headers.x-bare-headers`,
            message: `Header was not specified.`,
        });
    }
    if (headers.has('x-bare-pass-status')) {
        const parsed = headers.get('x-bare-pass-status').split(splitHeaderValue);
        for (const value of parsed) {
            const number = parseInt(value);
            if (isNaN(number)) {
                throw new BareServer_js_1.BareError(400, {
                    code: 'INVALID_BARE_HEADER',
                    id: `request.headers.x-bare-pass-status`,
                    message: `Array contained non-number value.`,
                });
            }
            else {
                passStatus.push(number);
            }
        }
    }
    if (headers.has('x-bare-pass-headers')) {
        const parsed = headers.get('x-bare-pass-headers').split(splitHeaderValue);
        for (let header of parsed) {
            header = header.toLowerCase();
            if (forbiddenPassHeaders.includes(header)) {
                throw new BareServer_js_1.BareError(400, {
                    code: 'FORBIDDEN_BARE_HEADER',
                    id: `request.headers.x-bare-forward-headers`,
                    message: `A forbidden header was passed.`,
                });
            }
            else {
                passHeaders.push(header);
            }
        }
    }
    if (headers.has('x-bare-forward-headers')) {
        const parsed = headers
            .get('x-bare-forward-headers')
            .split(splitHeaderValue);
        for (let header of parsed) {
            header = header.toLowerCase();
            if (forbiddenForwardHeaders.includes(header)) {
                throw new BareServer_js_1.BareError(400, {
                    code: 'FORBIDDEN_BARE_HEADER',
                    id: `request.headers.x-bare-forward-headers`,
                    message: `A forbidden header was forwarded.`,
                });
            }
            else {
                forwardHeaders.push(header);
            }
        }
    }
    return {
        remote,
        sendHeaders,
        passHeaders,
        passStatus,
        forwardHeaders,
    };
}
const tunnelRequest = async (request) => {
    const { remote, sendHeaders, passHeaders, passStatus, forwardHeaders } = readHeaders(request);
    loadForwardedHeaders(forwardHeaders, sendHeaders, request);
    const response = await (0, requestUtil_js_2.bareFetch)(request, request.signal, sendHeaders, remote);
    const responseHeaders = new Headers();
    for (const [header, value] of passHeaders) {
        if (!response.headers.has(header))
            continue;
        responseHeaders.set(header, value);
    }
    const status = passStatus.includes(response.status) ? response.status : 200;
    if (status !== cacheNotModified) {
        responseHeaders.set('x-bare-status', response.status.toString());
        responseHeaders.set('x-bare-status-text', response.statusText);
        responseHeaders.set('x-bare-headers', JSON.stringify(Object.fromEntries(response.headers)));
    }
    return new Response(response.body, {
        status,
        headers: (0, splitHeaderUtil_js_1.splitHeaders)(responseHeaders),
    });
};
const metaExpiration = 30e3;
const getMeta = async (request, options) => {
    if (request.method === 'OPTIONS') {
        return new Response(undefined, { status: 200 });
    }
    if (!request.headers.has('x-bare-id')) {
        throw new BareServer_js_1.BareError(400, {
            code: 'MISSING_BARE_HEADER',
            id: 'request.headers.x-bare-id',
            message: 'Header was not specified',
        });
    }
    const id = request.headers.get('x-bare-id');
    const meta = await options.database.get(id);
    if (meta?.value.v !== 2)
        throw new BareServer_js_1.BareError(400, {
            code: 'INVALID_BARE_HEADER',
            id: 'request.headers.x-bare-id',
            message: 'Unregistered ID',
        });
    if (!meta.value.response)
        throw new BareServer_js_1.BareError(400, {
            code: 'INVALID_BARE_HEADER',
            id: 'request.headers.x-bare-id',
            message: 'Meta not ready',
        });
    await options.database.delete(id);
    const responseHeaders = new Headers();
    responseHeaders.set('x-bare-status', meta.value.response.status.toString());
    responseHeaders.set('x-bare-status-text', meta.value.response.statusText);
    responseHeaders.set('x-bare-headers', JSON.stringify(meta.value.response.headers));
    return new Response(undefined, {
        status: 200,
        headers: (0, splitHeaderUtil_js_1.splitHeaders)(responseHeaders),
    });
};
const newMeta = async (request, options) => {
    const { remote, sendHeaders, forwardHeaders } = readHeaders(request);
    const id = (0, requestUtil_js_2.randomHex)(16);
    await options.database.set(id, {
        expires: Date.now() + metaExpiration,
        value: {
            v: 2,
            remote,
            sendHeaders,
            forwardHeaders,
        },
    });
    return new Response(id);
};
const tunnelSocket = async (request, options) => {
    const id = request.headers.get('sec-websocket-protocol');
    if (!id)
        throw new BareServer_js_1.BareError(400, {
            code: 'INVALID_BARE_HEADER',
            id: `request.headers.sec-websocket-protocol`,
            message: `Expected ID.`,
        });
    const meta = await options.database.get(id);
    if (meta?.value.v !== 2)
        throw new BareServer_js_1.BareError(400, {
            code: 'INVALID_BARE_HEADER',
            id: `request.headers.sec-websocket-protocol`,
            message: `Bad ID.`,
        });
    loadForwardedHeaders(meta.value.forwardHeaders, meta.value.sendHeaders, request);
    const [remoteResponse, remoteSocket] = await (0, requestUtil_js_1.upgradeBareFetch)(request, request.signal, meta.value.sendHeaders, meta.value.remote);
    // https://developers.cloudflare.com/workers/learning/using-websockets
    // returning it on to a client....
    meta.value.response = {
        headers: Object.fromEntries(remoteResponse.headers),
        status: remoteResponse.status,
        statusText: remoteResponse.statusText,
    };
    await options.database.set(id, meta);
    return new Response(undefined, {
        status: 101,
        webSocket: remoteSocket,
    });
};
function registerV3(server) {
    server.routes.set('/v3/', tunnelRequest);
    server.socketRoutes.set('/v3/', tunnelSocket);
}
exports.default = registerV3;
//# sourceMappingURL=V3.js.map