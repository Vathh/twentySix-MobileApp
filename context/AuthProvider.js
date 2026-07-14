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
		setAuth(next);
		return next;
	}, []);

	const persistSession = useCallback(async (nextAuth, rememberMe) => {
		if (rememberMe && nextAuth?.accessToken) {
			await saveStoredSession(buildStoredSession(nextAuth, true));
		} else {
			await clearStoredSession();
		}
	}, []);

	const logout = useCallback(async () => {
		const token = authRef.current?.accessToken;
		if (token) {
			try {
				await logoutAuthSession(token);
			} catch {
				// sieć opcjonalna — lokalnie i tak czyścimy sesję
			}
		}
		await clearStoredSession();
		setAuth({});
	}, []);

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
			setAuth(storedSessionToAuth(stored));

			const { ok, data, status } = await refreshAuthSession(stored.accessToken);
			if (cancelled) {
				return;
			}

			if (ok) {
				const next = mapLoginResponseToAuth(data);
				setAuth(next);
				await saveStoredSession(buildStoredSession(next, true));
			} else if (status === 401 || status === 403) {
				await clearStoredSession();
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
				const token = authRef.current?.accessToken;
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
					setAuth(next);
					await saveStoredSession(buildStoredSession(next, true));
				} else if (status === 401 || status === 403) {
					await clearStoredSession();
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
