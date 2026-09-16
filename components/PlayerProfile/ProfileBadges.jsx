import React, { useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	View,
	useWindowDimensions,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { checkoutAtPoint } from '../../helpers/checkoutWheelHit';
import {
	loadCheckoutWheelXml,
	paintCheckoutWheelXml,
} from '../../helpers/checkoutWheelXml';
import { sanitizeSvgXml } from '../../helpers/headerLogo';
import { gameTypeLabel } from '../../helpers/profileMetrics';
import { colors } from '../../theme/colors';

const ProfileBadges = ({ checkoutItems }) => {
	const items = Array.isArray(checkoutItems) ? checkoutItems : [];
	const unlocked = items.filter((item) => (item.timesEarned ?? 0) > 0).length;
	const total = items.length;
	const { width: windowWidth } = useWindowDimensions();
	const wheelSize = Math.min(windowWidth - 48, 400);
	const [wheelXml, setWheelXml] = useState('');
	const [wheelError, setWheelError] = useState(false);
	const [selected, setSelected] = useState(null);

	const byKey = useMemo(() => {
		const map = {};
		items.forEach((item) => {
			map[String(item.key)] = item;
		});
		return map;
	}, [items]);

	const hitsKey = useMemo(
		() => items.map((item) => `${item.key}:${item.timesEarned ?? 0}`).join(','),
		[items],
	);

	useEffect(() => {
		let cancelled = false;
		setWheelError(false);
		(async () => {
			try {
				const xml = await loadCheckoutWheelXml();
				if (cancelled) return;
				setWheelXml(sanitizeSvgXml(paintCheckoutWheelXml(xml, items)));
			} catch (error) {
				console.warn('checkout wheel load', error);
				if (!cancelled) setWheelError(true);
			}
		})();
		return () => {
			cancelled = true;
		};
		// hitsKey covers item values; items is listed for the paint call in this render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hitsKey]);

	const openKey = (key) => {
		if (!key) return;
		setSelected(byKey[String(key)] ?? { key: String(key), timesEarned: 0 });
	};

	return (
		<View style={styles.wrap}>
			<View style={styles.head}>
				<Text style={styles.sectionLabel}>Checkouty 100+</Text>
				<Text style={styles.count}>
					{unlocked} / {total} odblokowanych
				</Text>
			</View>
			<Text style={styles.hint}>
				Finish 100–170 w meczach 501 (liga i turniej). Im więcej trafień, tym jaśniejszy klin.
				Dotknij klina, żeby zobaczyć liczbę i ostatni mecz.
			</Text>

			{wheelError ? (
				<BadgeGrid items={items} onSelect={openKey} />
			) : wheelXml ? (
				<View style={styles.wheelCard}>
					<Pressable
						onPress={(event) => {
							openKey(checkoutAtPoint(
								event.nativeEvent.locationX,
								event.nativeEvent.locationY,
								wheelSize,
							));
						}}
					>
						<SvgXml xml={wheelXml} width={wheelSize} height={wheelSize} pointerEvents="none" />
					</Pressable>
				</View>
			) : (
				<View style={styles.loading}>
					<ActivityIndicator color={colors.accent} />
				</View>
			)}

			<CheckoutDetailSheet item={selected} onClose={() => setSelected(null)} />
		</View>
	);
};

function timesLabel(n) {
	return n === 1 ? '1 raz' : `${n} razy`;
}

function CheckoutDetailSheet({ item, onClose }) {
	if (!item) return null;
	const times = Number(item.timesEarned) || 0;
	const game = item.lastGame;
	const lastDate = game?.dateFormatted
		|| (item.lastEarnedAt ? new Date(item.lastEarnedAt).toLocaleDateString('pl-PL') : null);

	return (
		<Modal
			visible
			transparent
			animationType="fade"
			presentationStyle="overFullScreen"
			statusBarTranslucent
			onRequestClose={onClose}
		>
			<View style={styles.backdrop}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
				<View style={styles.sheet} accessibilityRole="alert">
					<Text style={styles.sheetTitle}>Checkout {item.key}</Text>
					<Text style={styles.sheetCount}>
						{times > 0 ? timesLabel(times) : 'Jeszcze nie rzucony'}
					</Text>
					{times > 0 && game ? (
						<>
							<Text style={styles.sheetMeta}>
								Ostatnio: {[gameTypeLabel(game.type), game.opponents, lastDate].filter(Boolean).join(' · ')}
							</Text>
							{game.tournamentName ? (
								<Text style={styles.sheetEvent}>{game.tournamentName}</Text>
							) : null}
						</>
					) : times > 0 && lastDate ? (
						<Text style={styles.sheetMeta}>Ostatnio: {lastDate}</Text>
					) : null}
					<Pressable style={styles.sheetBtn} onPress={onClose}>
						<Text style={styles.sheetBtnText}>Zamknij</Text>
					</Pressable>
				</View>
			</View>
		</Modal>
	);
}

function BadgeGrid({ items, onSelect }) {
	if (items.length === 0) {
		return (
			<View style={styles.empty}>
				<Text style={styles.emptyText}>Brak odznaczeń checkout.</Text>
			</View>
		);
	}

	return (
		<View style={styles.grid}>
			{items.map((item) => {
				const times = Number(item.timesEarned) || 0;
				const on = times > 0;
				return (
					<Pressable
						key={item.key}
						onPress={() => onSelect?.(item.key)}
						style={[styles.tile, on && styles.tileOn]}
					>
						<Text style={[styles.key, on && styles.keyOn]}>{item.key}</Text>
						<Text style={[styles.times, on && styles.timesOn]}>
							{on ? `×${times}` : '—'}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		paddingBottom: 24,
	},
	head: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
		marginBottom: 8,
		gap: 8,
	},
	sectionLabel: {
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.8,
		textTransform: 'uppercase',
		color: colors.textDim,
	},
	count: {
		fontSize: 12,
		color: colors.textMuted,
		fontWeight: '600',
	},
	hint: {
		fontSize: 13,
		lineHeight: 18,
		color: colors.textMuted,
		marginBottom: 14,
	},
	wheelCard: {
		alignItems: 'center',
		backgroundColor: '#0C0C0F',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		paddingVertical: 8,
		overflow: 'hidden',
	},
	loading: {
		paddingVertical: 40,
		alignItems: 'center',
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	tile: {
		width: '22%',
		flexGrow: 1,
		minWidth: 64,
		alignItems: 'center',
		paddingVertical: 10,
		borderRadius: 10,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
	},
	tileOn: {
		backgroundColor: colors.accentMuted,
		borderColor: colors.accentBorder,
	},
	key: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.textDim,
	},
	keyOn: {
		color: colors.accent,
	},
	times: {
		marginTop: 2,
		fontSize: 10,
		color: colors.textVeryDim,
	},
	timesOn: {
		color: colors.textSecondary,
		fontWeight: '600',
	},
	empty: {
		paddingVertical: 28,
		alignItems: 'center',
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
	},
	emptyText: {
		color: colors.textMuted,
		fontSize: 13,
	},
	backdrop: {
		flex: 1,
		backgroundColor: colors.overlay,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	sheet: {
		width: '100%',
		maxWidth: 420,
		zIndex: 1,
		backgroundColor: colors.bgElevated,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.border,
		paddingVertical: 24,
		paddingHorizontal: 20,
	},
	sheetTitle: {
		color: colors.text,
		fontSize: 22,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 6,
	},
	sheetCount: {
		color: colors.textSecondary,
		fontSize: 16,
		textAlign: 'center',
		marginBottom: 10,
	},
	sheetMeta: {
		color: colors.textMuted,
		fontSize: 13,
		lineHeight: 18,
		textAlign: 'center',
	},
	sheetEvent: {
		color: colors.textMuted,
		fontSize: 12,
		textAlign: 'center',
		marginTop: 4,
	},
	sheetBtn: {
		marginTop: 18,
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
		backgroundColor: colors.bgElevatedHover,
		borderWidth: 1,
		borderColor: colors.border,
	},
	sheetBtnText: {
		color: colors.textSecondary,
		fontSize: 16,
		fontWeight: '600',
	},
});

export default ProfileBadges;
