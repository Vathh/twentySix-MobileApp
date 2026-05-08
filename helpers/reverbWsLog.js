/** Odporna na to, że Pusher/Reverb czasem przekaże `data` jako string JSON. */
export function normalizePusherPayload(payload) {
	if (payload == null) {
		return null;
	}
	if (typeof payload === 'string') {
		try {
			return JSON.parse(payload);
		} catch {
			return null;
		}
	}
	return payload;
}

/**
 * Logi WebSocket (Pusher + Reverb) — prefix spójny, żeby łatwo filtrować w Metro / adb logcat.
 * @param {'info'|'warn'|'error'} level
 * @param {string} scope np. "session" | "lobby"
 * @param {string} message
 * @param {unknown} [detail]
 */
export function logReverbWs(level, scope, message, detail) {
	const tag = `[WS/Reverb:${scope}]`;
	const line = `${tag} ${message}`;
	// Metro domyślnie często ukrywa console.log — warn/error zawsze widać w terminalu.
	if (detail !== undefined && detail !== null) {
		if (level === 'error') {
			console.error(line, detail);
		} else {
			console.warn(line, detail);
		}
	} else if (level === 'error') {
		console.error(line);
	} else {
		console.warn(line);
	}
}

/**
 * @param {*} pusher instancja Pusher
 * @param {{ scope: string; wsHost: string; wsPort: number; forceTLS?: boolean; authEndpoint: string }} meta
 * @returns {() => void} cleanup — odpina handlery (wywołaj przed disconnect)
 */
export function attachPusherReverbDebugLogging(pusher, meta) {
	const { scope, wsHost, wsPort, forceTLS, authEndpoint } = meta;
	const scheme = forceTLS ? 'wss' : 'ws';
	const approxUrl = `${scheme}://${wsHost}:${wsPort}/app/...`;

	logReverbWs('info', scope, `init (≈ ${approxUrl}, auth: ${authEndpoint})`);

	const onStateChange = (states) => {
		logReverbWs(
			'info',
			scope,
			`stan połączenia: ${states.previous} → ${states.current}`,
		);
	};

	const onConnecting = () => {
		logReverbWs('info', scope, 'łączenie…');
	};

	const onConnected = () => {
		logReverbWs('info', scope, 'połączono z Reverb');
	};

	const onDisconnected = () => {
		logReverbWs('warn', scope, 'rozłączono');
	};

	const onUnavailable = () => {
		logReverbWs(
			'warn',
			scope,
			'połączenie niedostępne (unavailable) — sprawdź czy `php artisan reverb:start` działa i port jest otwarty',
		);
	};

	const onFailed = () => {
		logReverbWs(
			'error',
			scope,
			'nie udało się zestawić połączenia (failed)',
		);
	};

	const onError = (err) => {
		const raw =
			err && typeof err === 'object'
				? err.error ?? err.data ?? err.message ?? err
				: err;
		logReverbWs(
			'error',
			scope,
			'błąd połączenia Pusher/Reverb (często „connection refused” = zły host/port albo Reverb nie działa)',
			raw,
		);
	};

	pusher.connection.bind('state_change', onStateChange);
	pusher.connection.bind('connecting', onConnecting);
	pusher.connection.bind('connected', onConnected);
	pusher.connection.bind('disconnected', onDisconnected);
	pusher.connection.bind('unavailable', onUnavailable);
	pusher.connection.bind('failed', onFailed);
	pusher.connection.bind('error', onError);

	return () => {
		pusher.connection.unbind('state_change', onStateChange);
		pusher.connection.unbind('connecting', onConnecting);
		pusher.connection.unbind('connected', onConnected);
		pusher.connection.unbind('disconnected', onDisconnected);
		pusher.connection.unbind('unavailable', onUnavailable);
		pusher.connection.unbind('failed', onFailed);
		pusher.connection.unbind('error', onError);
	};
}
