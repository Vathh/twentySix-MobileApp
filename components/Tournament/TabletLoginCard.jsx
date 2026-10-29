import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import useAuth from '../../hooks/useAuth';
import { loginWithTournamentCode } from '../../helpers/authApi';
import { regenerateTournamentTabletCode } from '../../helpers/tournamentManageApi';
import { userFacingErrorMessage } from '../../helpers/userFacingError';
import QrCode from '../Common/QrCode';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

export default function TabletLoginCard({ login, accessToken, tournamentId, onCodeChange }) {
	const { beginTabletReferee } = useAuth();
	const [busy, setBusy] = useState('');
	const [error, setError] = useState('');

	if (!login?.code || !login?.url) {
		return null;
	}

	const regenerate = async () => {
		setBusy('code');
		setError('');
		const result = await regenerateTournamentTabletCode(accessToken, tournamentId);
		setBusy('');
		if (!result.ok) {
			setError(result.message);
			return;
		}
		onCodeChange?.({ code: result.data.code, url: result.data.url });
	};

	const refereeHere = async () => {
		setBusy('referee');
		setError('');
		try {
			const { ok, data, status, error: requestError } = await loginWithTournamentCode(login.code);
			if (!ok) {
				setError(userFacingErrorMessage({
					error: requestError,
					status,
					data,
					fallback: 'Nie udało się otworzyć sędziowania',
				}));
				return;
			}
			beginTabletReferee({
				accessToken: data?.token,
				tournamentId: data?.tournamentId,
			});
		} catch (requestError) {
			setError(userFacingErrorMessage({
				error: requestError,
				fallback: 'Nie udało się otworzyć sędziowania',
			}));
		} finally {
			setBusy('');
		}
	};

	return (
		<View style={styles.card}>
			<Text style={styles.title}>Kod logowania na tablety</Text>
			<Text style={styles.hint}>
				Jeden kod dla tabletów i sędziowania w przeglądarce. Zeskanuj QR albo wpisz kod.
			</Text>
			<QrCode value={login.url} size={scaleSize(180)} />
			<Text style={styles.code}>{login.code}</Text>
			<Text style={styles.url}>{login.url}</Text>
			{error ? <Text style={styles.error}>{error}</Text> : null}
			<Pressable style={styles.button} onPress={refereeHere} disabled={busy !== ''}>
				{busy === 'referee' ? (
					<ActivityIndicator color={colors.onAccent} />
				) : (
					<Text style={styles.buttonText}>Sędziuj na tym urządzeniu</Text>
				)}
			</Pressable>
			<Pressable style={styles.secondary} onPress={regenerate} disabled={busy !== ''}>
				<Text style={styles.secondaryText}>
					{busy === 'code' ? 'Generowanie…' : 'Nowy kod'}
				</Text>
			</Pressable>
			<Text style={styles.note}>
				Nowy kod unieważnia poprzedni i sesje zalogowanych tabletów.
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		marginTop: 16,
		marginBottom: 8,
		padding: 16,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
	},
	title: { color: colors.accent, fontSize: 16, fontWeight: '700', marginBottom: 6 },
	hint: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 12 },
	code: {
		marginTop: 12,
		color: colors.accent,
		fontSize: 28,
		fontWeight: '700',
		letterSpacing: 4,
	},
	url: { marginTop: 6, color: colors.textMuted, fontSize: 12 },
	error: { marginTop: 10, color: colors.dangerText, fontSize: 13 },
	button: {
		marginTop: 14,
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
	},
	buttonText: { color: colors.onAccent, fontWeight: '700', fontSize: 15 },
	secondary: {
		marginTop: 8,
		borderWidth: 1,
		borderColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 10,
		alignItems: 'center',
	},
	secondaryText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
	note: { marginTop: 8, color: colors.textMuted, fontSize: 12, lineHeight: 16 },
});
