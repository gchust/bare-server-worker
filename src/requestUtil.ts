export interface BareRemote {
	host: string;
	port: number | string;
	path: string;
	protocol: string;
}

export type BareHeaders = Record<string, string | string[]>;

export function randomHex(byteLength: number): string {
	const bytes = new Uint8Array(byteLength);
	crypto.getRandomValues(bytes);
	let hex = '';
	for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
	return hex;
}

const noBody = ['GET', 'HEAD'];

const specificDomains = ['*youtube.com', '*duckduckgo.com', '*dw.com']; // Specify the array of domain names to match

export async function bareFetch(
	request: Request,
	signal: AbortSignal,
	requestHeaders: BareHeaders,
	remote: BareRemote
): Promise<Response> {
	const targetDomain = remote.host.toLowerCase(); // Normalize to lowercase for comparison

	const finalHeaders = { ...requestHeaders };

	// Check if the request matches any of the specific domains (including wildcards)
	const matchesDomain = specificDomains.some((domain) => {
		const regex = new RegExp(
			`^${domain.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`
		);
		return regex.test(targetDomain);
	});

	if (matchesDomain) {
		const userAgentHeader = 'User-Agent';

		// Overwrite the User-Agent header (both lowercase and uppercase)
		finalHeaders[userAgentHeader.toLowerCase()] =
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.59 Safari/537.36 115Browser/8.6.4';
		finalHeaders[userAgentHeader.toUpperCase()] =
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.59 Safari/537.36 115Browser/8.6.4';
	}

	return await fetch(
		`${remote.protocol}//${remote.host}:${remote.port}${remote.path}`,
		{
			headers: finalHeaders as HeadersInit,
			method: request.method,
			body: noBody.includes(request.method) ? undefined : await request.blob(),
			signal,
			redirect: 'manual',
		}
	);
}

export async function upgradeBareFetch(
	request: Request,
	signal: AbortSignal,
	requestHeaders: BareHeaders,
	remote: BareRemote
): Promise<[Response, WebSocket]> {
	const res = await fetch(
		`${remote.protocol}//${remote.host}:${remote.port}${remote.path}`,
		{
			headers: requestHeaders as HeadersInit,
			method: request.method,
			signal,
		}
	);

	if (!res.webSocket) throw new Error("Server didn't accept WebSocket");

	return [res, res.webSocket];
}
