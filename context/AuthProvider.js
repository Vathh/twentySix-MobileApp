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
	beginTabletReferee: () => {},
	suspendedAccount: null,
});

export const AuthProvider = ({ children }) => {
	const [auth, setAuth] = useState({});
	const [authLoading, setAuthLoading] = useState(true);
	const [rememberMePreferred, setRememberMePreferred] = useState(true);
	const [suspendedAccount, setSuspendedAccount] = useState(null);
	const authRef = useRef(auth);
	const suspendedAccountRef = useRef(null);
	authRef.current = auth;
	const refreshInFlightRef = useRef(null);

	const refreshRememberedSession = useCallback(async (token) => {
		if (!token) {
			return null;
		}
		if (refreshInFlightRef.current) {
			return refreshInFlightRef.current;
		}

		const job = (async () => {
			const result = await refreshAuthSession(token);
			return { token, ...result };
		})();
		refreshInFlightRef.current = job;
		try {
			return await job;
		} finally {
			if (refreshInFlightRef.current === job) {
				refreshInFlightRef.current = null;
			}
		}
	}, []);

	const applyRememberedRefresh = useCallback(async (token, shouldApply = () => true) => {
		const result = await refreshRememberedSession(token);
		if (!result || !shouldApply()) {
			return result;
		}
		if ((authRef.current?.accessToken ?? null) !== result.token) {
			return result;
		}
		if (result.ok) {
			const next = mapLoginResponseToAuth(result.data);
			setCurrentAccessToken(next.accessToken);
			setAuth(next);
			await saveStoredSession(buildStoredSession(next, true));
		} else if (result.status === 401 || result.status === 403) {
			await clearStoredSession();
			setCurrentAccessToken(null);
			setAuth({});
		}
		return result;
	}, [refreshRememberedSession]);

	const beginTabletReferee = useCallback((tabletAuth) => {
		const current = authRef.current;
		if (current?.accessToken && !isTabletRefereeSession(current)) {
			suspendedAccountRef.current = current;
			setSuspendedAccount(current);
		}
		setCurrentAccessToken(tabletAuth?.accessToken ?? null);
		setAuth({
			accessToken: tabletAuth?.accessToken ?? null,
			tournamentId: tabletAuth?.tournamentId ?? null,
		});
	}, []);

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
			const suspended = suspendedAccountRef.current;
			suspendedAccountRef.current = null;
			setSuspendedAccount(null);
			if (suspended?.accessToken) {
				setCurrentAccessToken(suspended.accessToken);
				setAuth(suspended);
				return;
			}
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

			await applyRememberedRefresh(stored.accessToken, () => !cancelled);
			if (cancelled) {
				return;
			}

			setAuthLoading(false);
		})();

		return () => {
			cancelled = true;
		};
	}, [applyRememberedRefresh]);

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

				await applyRememberedRefresh(token);
			})();
		});

		return () => subscription.remove();
	}, [applyRememberedRefresh]);

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
				beginTabletReferee,
				suspendedAccount,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export default AuthContext;
