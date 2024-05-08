/// <reference types="@cloudflare/workers-types" />
import type { JSONDatabaseAdapter } from './Meta.js';
export interface BareErrorBody {
    code: string;
    id: string;
    message?: string;
    stack?: string;
}
export declare class BareError extends Error {
    status: number;
    body: BareErrorBody;
    constructor(status: number, body: BareErrorBody);
}
export declare function json<T>(status: number, json: T): Response;
export type BareMaintainer = {
    email?: string;
    website?: string;
};
export type BareProject = {
    name?: string;
    description?: string;
    email?: string;
    website?: string;
    repository?: string;
    version?: string;
};
export type BareLanguage = 'NodeJS' | 'ServiceWorker' | 'Deno' | 'Java' | 'PHP' | 'Rust' | 'C' | 'C++' | 'C#' | 'Ruby' | 'Go' | 'Crystal' | 'Shell' | string;
export type BareManifest = {
    maintainer?: BareMaintainer;
    project?: BareProject;
    versions: string[];
    language: BareLanguage;
    memoryUsage?: number;
};
export interface Options {
    logErrors: boolean;
    localAddress?: string;
    maintainer?: BareMaintainer;
    database: JSONDatabaseAdapter;
}
export type RouteCallback = (request: Request, options: Options) => Promise<Response> | Response;
export default class Server extends EventTarget {
    routes: Map<string, RouteCallback>;
    socketRoutes: Map<string, RouteCallback>;
    private closed;
    private directory;
    private options;
    /**
     * Remove all timers and listeners
     */
    close(): void;
    shouldRoute(request: Request): boolean;
    get instanceInfo(): BareManifest;
    routeRequest(request: Request): Promise<Response>;
}
