import { useEffect, useRef } from 'react';
import { useConfirm } from '../context/ConfirmProvider';
import { leaveQuickGameLobby } from '../helpers/quickGameLobbyApi';

function findTabNavigator(navigation) {
	let nav = navigation?.getParent?.('UserMainTabs') ?? navigation?.getParent?.();
	while (nav) {
		const type = nav.getState?.()?.type;
		if (type === 'tab') return nav;
		nav = nav.getParent?.();
	}
	return null;
}

/**
 * Gdy użytkownik jest w aktywnym lobby quick game (waiting) i klika dolny tab
 * albo wychodzi wstecz — zapytaj o potwierdzenie, wywołaj leave API.
 */
export function useLeaveLobbyOnTabPress({
	navigation,
	lobbyId,
	accessToken,
	onLeftLobby,
	/** false podczas startu meczu / po świadomym leave */
	enabled = true,
}) {
	const skipNextRemoveRef = useRef(false);
	const confirm = useConfirm();

	useEffect(() => {
		if (!lobbyId || !enabled) return undefined;

		const tabNav = findTabNavigator(navigation);
		if (!tabNav?.addListener) return undefined;

		const unsubscribe = tabNav.addListener('tabPress', (e) => {
			const state = tabNav.getState?.();
			const targetRoute = state?.routes?.find((r) => r.key === e.target);
			const targetName = targetRoute?.name;
			if (!targetName) return;

			e.preventDefault();

			void (async () => {
				const ok = await confirm({
					title: 'Opuścić lobby?',
					message:
						'Przejście do innej sekcji opuści lobby. Czy na pewno chcesz wyjść?',
					confirmLabel: 'Opuść lobby',
				});
				if (!ok) return;
				try {
					if (accessToken) {
						await leaveQuickGameLobby(lobbyId, accessToken);
					}
				} catch (err) {
					console.warn('leave lobby on tabPress', err);
				}
				skipNextRemoveRef.current = true;
				onLeftLobby?.();
				tabNav.navigate(targetName);
			})();
		});

		return unsubscribe;
	}, [navigation, lobbyId, accessToken, onLeftLobby, enabled, confirm]);

	useEffect(() => {
		if (!lobbyId || !enabled) return undefined;

		const unsubscribe = navigation.addListener('beforeRemove', (e) => {
			if (skipNextRemoveRef.current) {
				skipNextRemoveRef.current = false;
				return;
			}

			e.preventDefault();

			void (async () => {
				const ok = await confirm({
					title: 'Opuścić lobby?',
					message: 'Wyjście z ekranu opuści lobby. Czy na pewno chcesz wyjść?',
					confirmLabel: 'Opuść lobby',
				});
				if (!ok) return;
				try {
					if (accessToken) {
						await leaveQuickGameLobby(lobbyId, accessToken);
					}
				} catch (err) {
					console.warn('leave lobby on beforeRemove', err);
				}
				skipNextRemoveRef.current = true;
				onLeftLobby?.();
				navigation.dispatch(e.data.action);
			})();
		});

		return unsubscribe;
	}, [navigation, lobbyId, accessToken, onLeftLobby, enabled, confirm]);
}
