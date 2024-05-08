"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class KVAdapter {
    ns;
    constructor(ns) {
        this.ns = ns;
    }
    async get(key) {
        return (await this.ns.get(key));
    }
    async set(key, value) {
        await this.ns.put(key, value);
    }
    async has(key) {
        return (await this.ns.list()).keys.some((e) => e.name === key);
    }
    async delete(key) {
        await this.ns.delete(key);
        return true;
    }
    async *entries() {
        for (const { name } of (await this.ns.list()).keys)
            yield [name, await this.get(name)];
    }
}
exports.default = KVAdapter;
//# sourceMappingURL=KVAdapter.js.map