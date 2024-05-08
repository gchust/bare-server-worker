import type { BareHeaders, BareRemote } from './requestUtil';
export interface MetaV1 {
    v: 1;
    response?: {
        headers: BareHeaders;
    };
}
export interface MetaV2 {
    v: 2;
    response?: {
        status: number;
        statusText: string;
        headers: BareHeaders;
    };
    sendHeaders: BareHeaders;
    remote: BareRemote;
    forwardHeaders: string[];
}
export interface MetaV3 {
    v: 3;
    response?: {
        status: number;
        statusText: string;
        headers: BareHeaders;
    };
    sendHeaders: BareHeaders;
    remote: BareRemote;
    forwardHeaders: string[];
}
export default interface CommonMeta {
    value: MetaV1 | MetaV2 | MetaV3;
    expires: number;
}
export interface Database {
    get(key: string): string | undefined | PromiseLike<string | undefined>;
    set(key: string, value: string): unknown;
    has(key: string): boolean | PromiseLike<boolean>;
    delete(key: string): boolean | PromiseLike<boolean>;
    entries(): IterableIterator<[string, string]> | AsyncIterableIterator<[string, string]> | PromiseLike<IterableIterator<[string, string]>> | PromiseLike<AsyncIterableIterator<[string, string]>>;
}
/**
 * Routine
 */
export declare function cleanupDatabase(database: Database): Promise<void>;
