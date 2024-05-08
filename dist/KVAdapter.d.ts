/// <reference types="@cloudflare/workers-types" />
import type { Database } from './Meta';
export default class KVAdapter implements Database {
    private ns;
    constructor(ns: KVNamespace);
    get(key: string): Promise<string>;
    set(key: string, value: string): Promise<void>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    entries(): AsyncGenerator<[string, string], void, unknown>;
}
