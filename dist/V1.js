"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BareServer_js_1 = require("./BareServer.js");
const encodeProtocol_js_1 = require("./encodeProtocol.js");
const requestUtil_js_1 = require("./requestUtil.js");
const requestUtil_js_2 = require("./requestUtil.js");
const validProtocols = ['http:', 'https:', 'ws:', 'wss:'];
function loadForwardedHeaders(forward, target, request) {
    for (const header of forward) {
        if (request.headers.has(header)) {
            target[header] = request.headers.get(header);
        }
    }
}
function readHeaders(request) {
    const remote = {};
    const headers = {};
    Reflect.setPrototypeOf(headers, null);
    for (const remoteProp of ['host', 'port', 'protocol', 'path']) {
        const header = `x-bare-${remoteProp}`;
        if (request.headers.has(header)) {
            const value = request.headers.get(header);
            switch (remoteProp) {
                case 'port':
                    if (isNaN(parseInt(value))) {
                        throw new BareServer_js_1.BareError(400, {
                            code: 'INVALID_BARE_HEADER',
                            id: `request.headers.${header}`,
                            message: `Header was not a valid integer.`,
                        });
                    }
                    break;
                case 'protocol':
                    if (!validProtocols.includes(value)) {
                        throw new BareServer_js_1.BareError(400, {
                            code: 'INVALID_BARE_HEADER',
                            id: `request.headers.${header}`,
                            message: `Header was invalid`,
                        });
                    }
                    break;
            }
            remote[remoteProp] = value;
        }
        else {
            throw new BareServer_js_1.BareError(400, {
                code: 'MISSING_BARE_HEADER',
                id: `request.headers.${header}`,
                message: `Header was not specified.`,
            });
        }
    }
    if (request.headers.has('x-bare-headers')) {
        try {
            const json = JSON.parse(request.headers.get('x-bare-headers'));
            for (const header in json) {
                if (typeof json[header] !== 'string' && !Array.isArray(json[header])) {
                    throw new BareServer_js_1.BareError(400, {
                        code: 'INVALID_BARE_HEADER',
                        id: `bare.headers.${header}`,
                        message: `Header was not a String or Array.`,
                    });
                }
            }
            Object.assign(headers, json);
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
    if (request.headers.has('x-bare-forward-headers')) {
        let json;
        try {
            json = JSON.parse(request.headers.get('x-bare-forward-headers'));
        }
        catch (error) {
            throw new BareServer_js_1.BareError(400, {
                code: 'INVALID_BARE_HEADER',
                id: `request.headers.x-bare-forward-headers`,
                message: `Header contained invalid JSON. (${error instanceof Error ? error.message : error})`,
            });
        }
        loadForwardedHeaders(json, headers, request);
    }
    else {
        throw new BareServer_js_1.BareError(400, {
            code: 'MISSING_BARE_HEADER',
            id: `request.headers.x-bare-forward-headers`,
            message: `Header was not specified.`,
        });
    }
    return { remote: remote, headers };
}
const tunnelRequest = async (request) => {
    const { remote, headers } = readHeaders(request);
    const response = await (0, requestUtil_js_2.bareFetch)(request, request.signal, headers, remote);
    const responseHeaders = new Headers();
    for (const [header, value] of response.headers) {
        if (header === 'content-encoding' || header === 'x-content-encoding')
            responseHeaders.set('content-encoding', value);
        else if (header === 'content-length')
            responseHeaders.set('content-length', value);
    }
    responseHeaders.set('x-bare-headers', JSON.stringify(Object.fromEntries(response.headers)));
    responseHeaders.set('x-bare-status', response.status.toString());
    responseHeaders.set('x-bare-status-text', response.statusText);
    return new Response(response.body, { status: 200, headers: responseHeaders });
};
const metaExpiration = 30e3;
const wsMeta = async (request, options) => {
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
    // check if meta isn't undefined and if the version equals 1
    if (meta?.value.v !== 1)
        throw new BareServer_js_1.BareError(400, {
            code: 'INVALID_BARE_HEADER',
            id: 'request.headers.x-bare-id',
            message: 'Unregistered ID',
        });
    await options.database.delete(id);
    return (0, BareServer_js_1.json)(200, {
        headers: meta.value.response?.headers,
    });
};
const wsNewMeta = async (request, options) => {
    const id = (0, requestUtil_js_2.randomHex)(16);
    await options.database.set(id, {
        value: { v: 1 },
        expires: Date.now() + metaExpiration,
    });
    return new Response(id);
};
const tunnelSocket = async (request, options) => {
    const [firstProtocol, data] = request.headers.get('sec-websocket-protocol')?.split(/,\s*/g) || [];
    if (firstProtocol !== 'bare')
        throw new BareServer_js_1.BareError(400, {
            code: 'INVALID_BARE_HEADER',
            id: `request.headers.sec-websocket-protocol`,
            message: `Meta was not specified.`,
        });
    const { remote, headers, forward_headers: forwardHeaders, id, } = JSON.parse((0, encodeProtocol_js_1.decodeProtocol)(data));
    loadForwardedHeaders(forwardHeaders, headers, request);
    if (!id)
        throw new BareServer_js_1.BareError(400, {
            code: 'INVALID_BARE_HEADER',
            id: `request.headers.sec-websocket-protocol`,
            message: `Expected ID.`,
        });
    const [remoteResponse, remoteSocket] = await (0, requestUtil_js_1.upgradeBareFetch)(request, request.signal, headers, remote);
    const meta = await options.database.get(id);
    if (meta?.value.v === 1) {
        meta.value.response = {
            headers: Object.fromEntries(remoteResponse.headers),
        };
        await options.database.set(id, meta);
    }
    return new Response(undefined, {
        status: 101,
        webSocket: remoteSocket,
    });
};
function registerV1(server) {
    server.routes.set('/v1/', tunnelRequest);
    server.routes.set('/v1/ws-new-meta', wsNewMeta);
    server.routes.set('/v1/ws-meta', wsMeta);
    server.socketRoutes.set('/v1/', tunnelSocket);
}
exports.default = registerV1;
//# sourceMappingURL=V1.js.map