import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
	logoutAuthSession,
	mapLoginResponseToAuth,
	refreshAuthSession,
} from '../helpers/authApi';
import {
	buildStoredSession,
	clearStoredSession,
	loadStoredSession,
	saveStoredSession,
	storedSessionToAuth,
} from '../helpers/authSessionStorage';
import { isTabletRefereeSession } from '../helpers/authSessionKind';
import { unregisterCurrentDevicePushToken } from '../helpers/pushNotifications/unregisterPushToken';
import { setCurrentAccessToken } from '../helpers/authTokenHolder';
import { setOnUnauthorized } from '../helpers/sessionExpired';

const AuthContext = createContext({
	auth: {},
	setAuth: () => {},
	authLoading: true,
	rememberMePreferred: true,
	setRememberMePreferred: () => {},
	persistSession: async () => {},
	logout: async () => {},
	applyAuthFromApi: () => ({}),
});

export const AuthProvider = ({ children }) => {
	const [auth, setAuth] = useState({});
	const [authLoading, setAuthLoading] = useState(true);
	const [rememberMePreferred, setRememberMePreferred] = useState(true);
	const authRef = useRef(auth);
	authRef.current = auth;

	const applyAuthFromApi = useCallback((data) => {
		const next = mapLoginResponseToAuth(data);
		setCurrentAccessToken(next.accessToken);
		setAuth(next);
		return next;
	}, []);

	const persistSession = useCallback(async (nextAuth, rememberMe) => {
		if (isTabletRefereeSession(nextAuth)) {
			return;
		}
		if (rememberMe && nextAuth?.accessToken) {
			await saveStoredSession(buildStoredSession(nextAuth, true));
		} else {
			await clearStoredSession();
		}
	}, []);

	const logout = useCallback(async () => {
		const current = authRef.current;
		const token = current?.accessToken;

		if (isTabletRefereeSession(current)) {
			setCurrentAccessToken(null);
			setAuth({});
			const stored = await loadStoredSession();
			if (stored?.accessToken) {
				const restored = storedSessionToAuth(stored);
				setCurrentAccessToken(restored.accessToken);
				setAuth(restored);
			}
			return;
		}

		if (token) {
			try {
				await unregisterCurrentDevicePushToken(token);
			} catch {
				// opcjonalne
			}
			try {
				await logoutAuthSession(token);
			} catch {
				// sieć opcjonalna — lokalnie i tak czyścimy sesję
			}
		}
		await clearStoredSession();
		setCurrentAccessToken(null);
		setAuth({});
	}, []);

	useEffect(() => {
		setCurrentAccessToken(auth?.accessToken ?? null);
	}, [auth?.accessToken]);

	useEffect(() => {
		setOnUnauthorized(() => logout());
		return () => setOnUnauthorized(null);
	}, [logout]);

	useEffect(() => {
		let cancelled = false;

		(async () => {
			const stored = await loadStoredSession();
			if (cancelled) {
				return;
			}

			if (!stored) {
				setAuthLoading(false);
				return;
			}

			setRememberMePreferred(true);
			const restored = storedSessionToAuth(stored);
			setCurrentAccessToken(restored.accessToken);
			setAuth(restored);

			const { ok, data, status } = await refreshAuthSession(stored.accessToken);
			if (cancelled) {
				return;
			}

			if (ok) {
				const next = mapLoginResponseToAuth(data);
				setCurrentAccessToken(next.accessToken);
				setAuth(next);
				await saveStoredSession(buildStoredSession(next, true));
			} else if (status === 401 || status === 403) {
				await clearStoredSession();
				setCurrentAccessToken(null);
				setAuth({});
			}

			setAuthLoading(false);
		})();

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		const subscription = AppState.addEventListener('change', (nextState) => {
			if (nextState !== 'active') {
				return;
			}

			void (async () => {
				const current = authRef.current;
				if (isTabletRefereeSession(current)) {
					return;
				}
				const token = current?.accessToken;
				if (!token) {
					return;
				}

				const stored = await loadStoredSession();
				if (!stored?.rememberMe) {
					return;
				}

				const { ok, data, status } = await refreshAuthSession(token);
				if (ok) {
					const next = mapLoginResponseToAuth(data);
					setCurrentAccessToken(next.accessToken);
					setAuth(next);
					await saveStoredSession(buildStoredSession(next, true));
				} else if (status === 401 || status === 403) {
					await clearStoredSession();
					setCurrentAccessToken(null);
					setAuth({});
				}
			})();
		});

		return () => subscription.remove();
	}, []);

	return (
		<AuthContext.Provider
			value={{
				auth,
				setAuth,
				authLoading,
				rememberMePreferred,
				setRememberMePreferred,
				persistSession,
				logout,
				applyAuthFromApi,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export default AuthContext;
