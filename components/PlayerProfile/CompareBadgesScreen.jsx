import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Image,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
	useWindowDimensions,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import useAuth from '../../hooks/useAuth';
import { fetchBadgeComparison } from '../../helpers/playerProfileApi';
import { badgeArtworkStyle, highVisitImage } from '../../helpers/highVisitBadges';
import { qfImage } from '../../helpers/qfBadges';
import { finishImage } from '../../helpers/finishBadges';
import { careerImage } from '../../helpers/careerBadges';
import { loadCheckoutWheelXml, paintCheckoutWheelXml } from '../../helpers/checkoutWheelXml';
import { sanitizeSvgXml } from '../../helpers/headerLogo';
import { colors } from '../../theme/colors';
import ScreenLoading from '../Common/ScreenLoading';

const IMAGE_FOR = {
	high_visit: highVisitImage,
	qf: qfImage,
	finish: finishImage,
	career: careerImage,
};

function rowCaption(sectionKey, label) {
	return sectionKey === 'qf' ? `QF ${label}` : label;
}

function CompareBadgeCard({ item, imageFor }) {
	const locked = item.levelName === 'locked' || !item.levelName;
	const source = imageFor(item.key, item.levelName);
	const percent = Math.max(0, Math.min(100, Number(item.progressPercent) || 0));

	return (
		<View style={styles.card}>
			<View style={styles.frame}>
				{source ? (
					<Image
						source={source}
						style={[badgeArtworkStyle(item.artwork), locked && styles.locked]}
						resizeMode="stretch"
						accessibilityLabel={locked ? 'zablokowane' : item.levelLabel || item.label}
					/>
				) : null}
			</View>
			<View style={styles.levelRow}>
				<Text style={styles.levelTitle}>Poziom {item.levelNumber ?? 0}</Text>
				<Text style={styles.progressLabel}>{item.progressLabel}</Text>
			</View>
			<View
				style={styles.progressTrack}
				accessibilityRole="progressbar"
				accessibilityValue={{ min: 0, max: 100, now: percent }}
			>
				<View style={[styles.progressFill, { width: `${percent}%` }]} />
			</View>
		</View>
	);
}

function CompareWheel({ items, size }) {
	const list = Array.isArray(items) ? items : [];
	const [xml, setXml] = useState('');
	const [failed, setFailed] = useState(false);
	const hitsKey = useMemo(
		() => list.map((item) => `${item.key}:${item.timesEarned ?? 0}`).join(','),
		[list],
	);

	useEffect(() => {
		let cancelled = false;
		setFailed(false);
		(async () => {
			try {
				const source = await loadCheckoutWheelXml();
				if (cancelled) return;
				setXml(sanitizeSvgXml(paintCheckoutWheelXml(source, list)));
			} catch (error) {
				console.warn('compare checkout wheel', error);
				if (!cancelled) setFailed(true);
			}
		})();
		return () => {
			cancelled = true;
		};
		// hitsKey covers the painted values.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hitsKey]);

	if (failed) {
		return <Text style={styles.wheelError}>Nie udało się narysować koła.</Text>;
	}
	if (!xml) {
		return (
			<View style={[styles.wheelLoading, { width: size, height: size }]}>
				<ActivityIndicator color={colors.accent} />
			</View>
		);
	}
	return <SvgXml xml={xml} width={size} height={size} />;
}

function unlockedCount(items) {
	return (Array.isArray(items) ? items : []).filter((item) => (item.timesEarned ?? 0) > 0).length;
}

const CompareBadgesScreen = ({ route }) => {
	const { auth } = useAuth();
	const playerId = route?.params?.playerId;
	const { width: windowWidth } = useWindowDimensions();
	const wheelSize = Math.max(120, Math.floor((Math.min(windowWidth, 480) - 40) / 2));
	const [comparison, setComparison] = useState(null);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(true);
	const requestId = useRef(0);

	const load = useCallback(() => {
		const id = requestId.current + 1;
		requestId.current = id;
		setLoading(true);
		(async () => {
			const result = await fetchBadgeComparison(playerId, auth?.accessToken);
			if (id !== requestId.current) return;
			if (!result.ok) {
				setComparison(null);
				setError(result.message);
			} else {
				setError('');
				setComparison(result.data);
			}
			setLoading(false);
		})();
	}, [playerId, auth?.accessToken]);

	useEffect(() => {
		load();
		return () => {
			requestId.current += 1;
		};
	}, [load]);

	if (loading && !comparison) {
		return <ScreenLoading />;
	}

	if (error || !comparison) {
		return (
			<View style={styles.centered}>
				<Text style={styles.error}>{error || 'Nie udało się wczytać porównania.'}</Text>
				<Pressable onPress={load} style={styles.retry} accessibilityRole="button">
					<Text style={styles.retryText}>Spróbuj ponownie</Text>
				</Pressable>
			</View>
		);
	}

	const sections = Array.isArray(comparison.sections) ? comparison.sections : [];
	const mineCheckout = comparison.checkout?.mine?.items;
	const theirsCheckout = comparison.checkout?.theirs?.items;

	return (
		<ScrollView style={styles.screen} contentContainerStyle={styles.content}>
			<Text style={styles.title}>Porównanie odznaczeń</Text>
			<Text style={styles.note}>Liczą się mecze 501 w lidze i turnieju.</Text>
			<View style={styles.names}>
				<Text style={styles.name}>{comparison.viewer?.name}</Text>
				<Text style={[styles.name, styles.nameRight]}>{comparison.player?.name}</Text>
			</View>

			{sections.length === 0 ? (
				<Text style={styles.note}>Żadne z was nie odblokowało jeszcze odznaki.</Text>
			) : null}

			{sections.map((section) => {
				const imageFor = IMAGE_FOR[section.key];
				if (!imageFor) return null;
				return (
					<View key={section.key} style={styles.section}>
						<Text style={styles.sectionTitle}>{section.title}</Text>
						{(section.rows || []).map((row) => (
							<View key={row.key} style={styles.row}>
								<Text style={styles.caption}>{rowCaption(section.key, row.label)}</Text>
								<View style={styles.pair}>
									<CompareBadgeCard item={row.mine} imageFor={imageFor} />
									<CompareBadgeCard item={row.theirs} imageFor={imageFor} />
								</View>
							</View>
						))}
					</View>
				);
			})}

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Checkouty 100+</Text>
				<View style={styles.pair}>
					<View style={styles.wheelCol}>
						<Text style={styles.caption}>{comparison.viewer?.name}</Text>
						<Text style={styles.count}>
							{unlockedCount(mineCheckout)} / {(mineCheckout || []).length} odblokowanych
						</Text>
						<CompareWheel items={mineCheckout} size={wheelSize} />
					</View>
					<View style={styles.wheelCol}>
						<Text style={styles.caption}>{comparison.player?.name}</Text>
						<Text style={styles.count}>
							{unlockedCount(theirsCheckout)} / {(theirsCheckout || []).length} odblokowanych
						</Text>
						<CompareWheel items={theirsCheckout} size={wheelSize} />
					</View>
				</View>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	content: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 40,
	},
	centered: {
		flex: 1,
		backgroundColor: colors.bg,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		color: colors.text,
		marginBottom: 8,
	},
	note: {
		fontSize: 13,
		lineHeight: 18,
		color: colors.textMuted,
		marginBottom: 16,
	},
	names: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 8,
		marginBottom: 20,
	},
	name: {
		flex: 1,
		fontSize: 14,
		fontWeight: '700',
		color: colors.text,
	},
	nameRight: {
		textAlign: 'right',
	},
	section: {
		marginBottom: 28,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.accent,
		marginBottom: 12,
	},
	row: {
		marginBottom: 16,
	},
	caption: {
		textAlign: 'center',
		fontSize: 13,
		fontWeight: '700',
		color: colors.textSecondary,
		marginBottom: 8,
	},
	pair: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 8,
	},
	card: {
		flex: 1,
		alignItems: 'center',
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		paddingHorizontal: 6,
		paddingVertical: 10,
	},
	frame: {
		width: '100%',
		aspectRatio: 1,
		overflow: 'hidden',
	},
	locked: {
		opacity: 0.4,
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
		fontSize: 11,
		fontWeight: '600',
		color: colors.textSecondary,
	},
	progressLabel: {
		flexShrink: 0,
		fontSize: 11,
		fontWeight: '700',
		color: colors.textMuted,
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
	wheelCol: {
		flex: 1,
		alignItems: 'center',
	},
	count: {
		fontSize: 11,
		color: colors.textMuted,
		marginBottom: 8,
		textAlign: 'center',
	},
	wheelLoading: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	wheelError: {
		fontSize: 12,
		color: colors.textMuted,
		textAlign: 'center',
	},
	error: {
		color: colors.textSecondary,
		fontSize: 15,
		textAlign: 'center',
		marginBottom: 16,
	},
	retry: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
	},
	retryText: {
		color: colors.text,
		fontSize: 13,
		fontWeight: '600',
	},
});

export default CompareBadgesScreen;
