import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import useAuth from '../../hooks/useAuth';
import {
	applyTournamentJoin,
	fetchTournamentJoinPreview,
} from '../../helpers/tournamentJoinApi';
import { parseTournamentJoinCode } from '../../helpers/parseTournamentJoinCode';
import { userFacingErrorMessage } from '../../helpers/userFacingError';
import { colors } from '../../theme/colors';

/**
 * Zgłoszenie do turnieju kodem / deep linkiem / skanem QR.
 * route.params.code — opcjonalny kod ze skanu lub deep linku.
 */
export default function JoinTournamentScreen({ route, navigation }) {
	const { auth } = useAuth();
	const initialCode = String(route.params?.code ?? '').toUpperCase();
	const [code, setCode] = useState(initialCode);
	const [preview, setPreview] = useState(null);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [doneMessage, setDoneMessage] = useState(null);
	const [scanning, setScanning] = useState(false);
	const [permission, requestPermission] = useCameraPermissions();
	const scanLockRef = useRef(false);

	const loadPreview = useCallback(
		async (rawCode) => {
			const normalized = String(rawCode ?? '').trim().toUpperCase();
			if (!normalized || !auth?.accessToken) {
				setPreview(null);
				return;
			}
			setLoading(true);
			setDoneMessage(null);
			try {
				const data = await fetchTournamentJoinPreview(
					normalized,
					auth.accessToken,
				);
				setPreview(data);
			} catch (e) {
				setPreview(null);
				Alert.alert(
					'Błąd',
					userFacingErrorMessage({ error: e, fallback: 'Nie udało się pobrać turnieju' }),
				);
			} finally {
				setLoading(false);
			}
		},
		[auth?.accessToken],
	);

	useEffect(() => {
		if (initialCode) {
			loadPreview(initialCode);
		}
	}, [initialCode, loadPreview]);

	const applyScannedCode = useCallback(
		(raw) => {
			const parsed = parseTournamentJoinCode(raw);
			if (!parsed) {
				Alert.alert(
					'Nieznany QR',
					'To nie wygląda na kod turnieju twentySix. Spróbuj ponownie albo wpisz kod ręcznie.',
				);
				scanLockRef.current = false;
				return;
			}
			setCode(parsed);
			setScanning(false);
			scanLockRef.current = false;
			loadPreview(parsed);
		},
		[loadPreview],
	);

	const openScanner = async () => {
		if (!permission?.granted) {
			const result = await requestPermission();
			if (!result?.granted) {
				Alert.alert(
					'Brak dostępu do kamery',
					'Włącz uprawnienie kamery w ustawieniach telefonu, żeby skanować QR.',
				);
				return;
			}
		}
		scanLockRef.current = false;
		setScanning(true);
	};

	const handleBarcodeScanned = ({ data }) => {
		if (scanLockRef.current) return;
		scanLockRef.current = true;
		applyScannedCode(data);
	};

	const goBack = () => {
		if (navigation.canGoBack()) navigation.goBack();
	};

	const backButton = (
		<Pressable style={styles.backBtn} onPress={goBack}>
			<Text style={styles.backBtnText}>Wróć</Text>
		</Pressable>
	);

	const handleApply = async () => {
		const normalized = code.trim().toUpperCase();
		if (!normalized || !auth?.accessToken || submitting) return;
		setSubmitting(true);
		try {
			const result = await applyTournamentJoin(normalized, auth.accessToken);
			setDoneMessage(
				result?.message ??
					'Zgłoszenie wysłane — czekaj na akceptację organizatora.',
			);
			await loadPreview(normalized);
		} catch (e) {
			Alert.alert(
				'Błąd',
				userFacingErrorMessage({ error: e, fallback: 'Nie udało się zgłosić' }),
			);
		} finally {
			setSubmitting(false);
		}
	};

	if (!auth?.accessToken) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>Dołącz do turnieju</Text>
				<Text style={styles.hint}>
					Zaloguj się, aby zgłosić udział w turnieju kodem QR.
				</Text>
				<Pressable
					style={styles.btn}
					onPress={() => navigation.navigate('AccountLogin')}
				>
					<Text style={styles.btnText}>Zaloguj</Text>
				</Pressable>
				{backButton}
			</View>
		);
	}

	if (scanning) {
		return (
			<View style={styles.scannerRoot}>
				<CameraView
					style={StyleSheet.absoluteFillObject}
					facing="back"
					barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
					onBarcodeScanned={handleBarcodeScanned}
				/>
				<View style={styles.scannerOverlay} pointerEvents="box-none">
					<Text style={styles.scannerTitle}>Zeskanuj QR turnieju</Text>
					<View style={styles.scanFrame} />
					<Text style={styles.scannerHint}>
						Skieruj aparat na kod QR ze strony startu turnieju
					</Text>
					<Pressable
						style={[styles.btn, styles.scannerCancel]}
						onPress={() => {
							scanLockRef.current = false;
							setScanning(false);
						}}
					>
						<Text style={styles.btnText}>Anuluj</Text>
					</Pressable>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Dołącz do turnieju</Text>
			<Text style={styles.hint}>
				Zeskanuj QR organizatora albo wpisz kod — zgłoszenie zatwierdzi admin
				na stronie startu turnieju.
			</Text>

			<Pressable style={styles.btn} onPress={openScanner}>
				<Text style={styles.btnText}>Skanuj QR</Text>
			</Pressable>

			<Text style={styles.orLabel}>albo wpisz kod</Text>

			<TextInput
				style={styles.input}
				value={code}
				onChangeText={(v) => setCode(v.toUpperCase())}
				placeholder="Kod turnieju"
				placeholderTextColor={colors.placeholder}
				autoCapitalize="characters"
				autoCorrect={false}
				maxLength={16}
			/>

			<Pressable
				style={[styles.btn, styles.btnSecondary]}
				onPress={() => loadPreview(code)}
				disabled={loading || !code.trim()}
			>
				<Text style={styles.btnTextSecondary}>Sprawdź</Text>
			</Pressable>

			{loading && (
				<ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
			)}

			{preview && !loading && (
				<View style={styles.card}>
					<Text style={styles.tournamentName}>{preview.tournamentName}</Text>
					{preview.organizationName ? (
						<Text style={styles.organization}>{preview.organizationName}</Text>
					) : null}
					{preview.reason ? (
						<Text style={styles.reason}>{preview.reason}</Text>
					) : null}
					{preview.canApply ? (
						<Pressable
							style={[styles.btn, submitting && styles.btnDisabled]}
							onPress={handleApply}
							disabled={submitting}
						>
							<Text style={styles.btnText}>
								{submitting ? 'Wysyłanie…' : 'Zgłoś się'}
							</Text>
						</Pressable>
					) : null}
				</View>
			)}

			{doneMessage ? <Text style={styles.success}>{doneMessage}</Text> : null}

			{backButton}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.bg,
		padding: 20,
	},
	title: {
		fontSize: 22,
		color: colors.accent,
		fontWeight: '600',
		marginBottom: 8,
		textAlign: 'center',
	},
	hint: {
		fontSize: 14,
		color: colors.textMuted,
		textAlign: 'center',
		marginBottom: 20,
		lineHeight: 20,
	},
	orLabel: {
		marginTop: 20,
		marginBottom: 10,
		textAlign: 'center',
		color: colors.textDim,
		fontSize: 13,
		fontWeight: '500',
	},
	input: {
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 8,
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 20,
		letterSpacing: 3,
		color: colors.text,
		textAlign: 'center',
		marginBottom: 12,
		fontWeight: '600',
	},
	btn: {
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: 'center',
		marginTop: 8,
	},
	btnSecondary: {
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.borderStrong,
	},
	btnDisabled: { opacity: 0.6 },
	btnText: {
		color: colors.onAccent,
		fontSize: 16,
		fontWeight: '600',
	},
	btnTextSecondary: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '600',
	},
	card: {
		marginTop: 20,
		padding: 16,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.scrimMild,
	},
	tournamentName: {
		fontSize: 18,
		color: colors.text,
		fontWeight: '700',
		marginBottom: 4,
	},
	organization: {
		fontSize: 14,
		color: colors.textDim,
		marginBottom: 8,
	},
	reason: {
		fontSize: 14,
		color: colors.textMuted,
		marginBottom: 8,
	},
	success: {
		marginTop: 16,
		color: colors.success,
		textAlign: 'center',
		fontSize: 15,
		fontWeight: '500',
	},
	backBtn: {
		marginTop: 24,
		paddingVertical: 10,
		alignItems: 'center',
	},
	backBtnText: {
		color: colors.textMuted,
		fontSize: 15,
	},
	scannerRoot: {
		flex: 1,
		backgroundColor: '#000',
	},
	scannerOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
		backgroundColor: 'rgba(0,0,0,0.35)',
	},
	scannerTitle: {
		color: '#fff',
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 24,
		textAlign: 'center',
	},
	scanFrame: {
		width: 240,
		height: 240,
		borderWidth: 2,
		borderColor: colors.accent,
		borderRadius: 16,
		backgroundColor: 'transparent',
	},
	scannerHint: {
		color: '#fff',
		fontSize: 14,
		textAlign: 'center',
		marginTop: 24,
		opacity: 0.9,
		lineHeight: 20,
	},
	scannerCancel: {
		marginTop: 32,
		minWidth: 160,
	},
});
