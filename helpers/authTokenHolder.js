let currentAccessToken = null;

export function setCurrentAccessToken(token) {
	currentAccessToken = token || null;
}

export function getCurrentAccessToken() {
	return currentAccessToken;
}
