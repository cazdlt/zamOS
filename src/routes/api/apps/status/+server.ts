import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface StatusCheckRequest {
	url: string;
}

async function checkAppStatus(
	url: string
): Promise<{ status: 'online' | 'offline'; responseTime: number }> {
	try {
		const startTime = Date.now();

		// Set a timeout for the request
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

		const response = await fetch(url, {
			method: 'GET',
			signal: controller.signal,
			headers: {
				'User-Agent': 'zamOS/1.0'
			}
		});

		clearTimeout(timeoutId);
		const responseTime = Date.now() - startTime;

		// Consider 2xx and 3xx status codes as "online"
		if (response.ok || (response.status >= 300 && response.status < 400)) {
			return { status: 'online', responseTime };
		}

		return { status: 'offline', responseTime };
	} catch {
		// Network error, timeout, or other failure
		return { status: 'offline', responseTime: 0 };
	}
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { url } = (await request.json()) as StatusCheckRequest;

		if (!url) {
			return json({ error: 'URL is required' }, { status: 400 });
		}

		const result = await checkAppStatus(url);

		return json({
			url,
			status: result.status,
			responseTime: result.responseTime,
			timestamp: Date.now()
		});
	} catch (error) {
		console.error('Error checking app status:', error);
		return json(
			{
				error: 'Failed to check app status',
				status: 'offline',
				responseTime: 0
			},
			{ status: 500 }
		);
	}
};
