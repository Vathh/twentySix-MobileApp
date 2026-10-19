export const SCORING_REQUEST_TIMEOUT_MS = 5000;

export async function fetchWithTimeout(url, options = {}, timeoutMs = SCORING_REQUEST_TIMEOUT_MS) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { ...options, signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}
