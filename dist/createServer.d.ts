import BareServer from './BareServer.js';
import type { BareMaintainer } from './BareServer.js';
import type { Database } from './Meta.js';
interface BareServerInit {
    logErrors?: boolean;
    localAddress?: string;
    maintainer?: BareMaintainer;
    database?: Database;
}
/**
 * Create a Bare server.
 * This will handle all lifecycles for unspecified options (httpAgent, httpsAgent, metaMap).
 */
export default function createBareServer(directory: string, init?: BareServerInit): BareServer;
export {};
