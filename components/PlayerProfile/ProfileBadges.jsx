import React, { useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Image,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	View,
	useWindowDimensions,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { badgeArtworkStyle, highVisitImage } from '../../helpers/highVisitBadges';
import { qfImage } from '../../helpers/qfBadges';
import { checkoutAtPoint } from '../../helpers/checkoutWheelHit';
import {
	loadCheckoutWheelXml,
	paintCheckoutWheelXml,
} from '../../helpers/checkoutWheelXml';
import { sanitizeSvgXml } from '../../helpers/headerLogo';
import { gameTypeLabel } from '../../helpers/profileMetrics';
import { colors } from '../../theme/colors';

const ProfileBadges = ({ checkoutItems, highVisitItems, qfItems }) => {
	const items = Array.isArray(checkoutItems) ? checkoutItems : [];
	const visits = Array.isArray(highVisitItems) ? highVisitItems : [];
	const qf = (Array.isArray(qfItems) ? qfItems : []).filter((item) => (Number(item.timesEarned) || 0) > 0);
	const unlocked = items.filter((item) => (item.timesEarned ?? 0) > 0).length;
	const total = items.length;
	const { width: windowWidth } = useWindowDimensions();
	const wheelSize = Math.min(windowWidth - 48, 400);
	const [wheelXml, setWheelXml] = useState('');
	const [wheelError, setWheelError] = useState(false);
	const [selected, setSelected] = useState(null);
	const [selectedVisit, setSelectedVisit] = useState(null);

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
			{visits.length > 0 ? (
				<HighVisitRow items={visits} onSelect={setSelectedVisit} />
			) : null}

			{qf.length > 0 ? (
				<QfRow items={qf} onSelect={setSelectedVisit} />
			) : null}

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
			<HighVisitDetailSheet item={selectedVisit} onClose={() => setSelectedVisit(null)} />
		</View>
	);
};

function HighVisitRow({ items, onSelect }) {
	return (
		<View style={styles.visitBlock}>
			<Text style={[styles.sectionLabel, styles.visitHeading]}>Mocny punkciarz</Text>
			<View style={styles.visitRow}>
				{items.map((item) => {
					const times = Number(item.timesEarned) || 0;
					const locked = times < 1;
					const source = highVisitImage(item.key, item.levelName);
					return (
						<Pressable
							key={item.key}
							onPress={() => onSelect(item)}
							style={styles.visitCard}
							accessibilityLabel={`${item.label}, ${locked ? 'zablokowane' : item.levelLabel}`}
						>
							<View style={styles.visitImageFrame}>
								{source ? (
									<Image
										source={source}
										style={[badgeArtworkStyle(item.artwork), locked && styles.visitImageLocked]}
										resizeMode="stretch"
									/>
								) : null}
							</View>
							<View style={styles.levelRow}>
								<Text style={styles.levelTitle} numberOfLines={1}>Poziom {item.levelNumber ?? 0}</Text>
								<Text style={styles.progressLabel} numberOfLines={1}>{item.progressLabel}</Text>
							</View>
							<View
								style={styles.progressTrack}
								accessibilityRole="progressbar"
								accessibilityValue={{ min: 0, max: 100, now: Number(item.progressPercent) || 0 }}
							>
								<View style={[styles.progressFill, { width: `${Number(item.progressPercent) || 0}%` }]} />
							</View>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

function QfRow({ items, onSelect }) {
	return (
		<View style={styles.visitBlock}>
			<Text style={[styles.sectionLabel, styles.visitHeading]}>Szybkie legi</Text>
			<View style={styles.qfRow}>
				{items.map((item) => {
					const source = qfImage(item.key, item.levelName);
					return (
						<Pressable
							key={item.key}
							onPress={() => onSelect({ ...item, imageSource: source })}
							style={styles.qfCard}
							accessibilityLabel={`${item.label}, ${item.levelLabel}`}
						>
							<View style={styles.visitImageFrame}>
								{source ? (
									<Image
										source={source}
										style={badgeArtworkStyle(item.artwork)}
										resizeMode="stretch"
									/>
								) : null}
							</View>
							<View style={styles.levelRow}>
								<Text style={styles.levelTitle} numberOfLines={1}>Poziom {item.levelNumber ?? 0}</Text>
								<Text style={styles.progressLabel} numberOfLines={1}>{item.progressLabel}</Text>
							</View>
							<View
								style={styles.progressTrack}
								accessibilityRole="progressbar"
								accessibilityValue={{ min: 0, max: 100, now: Number(item.progressPercent) || 0 }}
							>
								<View style={[styles.progressFill, { width: `${Number(item.progressPercent) || 0}%` }]} />
							</View>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

function HighVisitDetailSheet({ item, onClose }) {
	if (!item) return null;
	const times = Number(item.timesEarned) || 0;
	const game = item.lastGame;
	const source = item.imageSource || highVisitImage(item.key, item.levelName);
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
					{source ? (
						<View style={styles.sheetImageFrame}>
							<Image
								source={source}
								style={badgeArtworkStyle(item.artwork)}
								resizeMode="stretch"
							/>
						</View>
					) : null}
					<Text style={styles.sheetTitle}>{item.label}</Text>
					<Text style={styles.sheetCount}>
						{times > 0 ? `${item.levelLabel} · ${timesLabel(times)}` : 'Jeszcze nie rzucone'}
					</Text>
					<View style={styles.sheetProgress}>
						<View style={styles.levelRow}>
							<Text style={styles.levelTitle}>Poziom {item.levelNumber ?? 0}</Text>
							<Text style={styles.progressLabel}>{item.progressLabel}</Text>
						</View>
						<View style={styles.progressTrack}>
							<View style={[styles.progressFill, { width: `${Number(item.progressPercent) || 0}%` }]} />
						</View>
					</View>
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
	visitBlock: {
		marginBottom: 28,
	},
	visitRow: {
		flexDirection: 'row',
		gap: 8,
	},
	qfRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	qfCard: {
		width: '30%',
		alignItems: 'center',
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		paddingHorizontal: 4,
		paddingVertical: 10,
	},
	visitCard: {
		flex: 1,
		alignItems: 'center',
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		paddingHorizontal: 4,
		paddingVertical: 10,
	},
	visitImageFrame: {
		width: '100%',
		aspectRatio: 1,
		overflow: 'hidden',
	},
	visitImageLocked: {
		opacity: 0.4,
	},
	visitHeading: {
		marginBottom: 14,
	},
	levelRow: {
		alignSelf: 'stretch',
		marginTop: 8,
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
		gap: 4,
	},
	levelTitle: {
		flexShrink: 1,
		fontSize: 12,
		fontWeight: '600',
		color: colors.textSecondary,
	},
	progressTrack: {
		marginTop: 4,
		height: 6,
		width: '100%',
		borderRadius: 999,
		backgroundColor: colors.border,
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		borderRadius: 999,
		backgroundColor: colors.accent,
	},
	progressLabel: {
		flexShrink: 0,
		fontSize: 12,
		fontWeight: '700',
		color: colors.textMuted,
	},
	sheetProgress: {
		marginTop: 12,
		alignSelf: 'stretch',
	},
	sheetImageFrame: {
		width: 140,
		height: 140,
		alignSelf: 'center',
		marginBottom: 8,
		overflow: 'hidden',
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
