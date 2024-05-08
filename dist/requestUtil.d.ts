/// <reference types="@cloudflare/workers-types" />
export interface BareRemote {
    host: string;
    port: number | string;
    path: string;
    protocol: string;
}
export type BareHeaders = Record<string, string | string[]>;
export declare function randomHex(byteLength: number): string;
export declare function bareFetch(request: Request, signal: AbortSignal, requestHeaders: BareHeaders, remote: BareRemote): Promise<Response>;
export declare function upgradeBareFetch(request: Request, signal: AbortSignal, requestHeaders: BareHeaders, remote: BareRemote): Promise<[Response, WebSocket]>;
