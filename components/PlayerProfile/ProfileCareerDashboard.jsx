import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import ProfileStatsTable from './ProfileStatsTable';
import { fetchPlayerCareer } from '../../helpers/playerProfileApi';
import { formatAverage } from '../../helpers/formatAverage';
import {
	CAREER_SOURCES,
	CAREER_WINDOWS,
	formatDelta,
} from '../../helpers/profileMetrics';
import { cardToneStyle } from '../../helpers/profileTones';
import { colors } from '../../theme/colors';

function Sparkline({ points }) {
	const values = (points ?? []).map((p) => p?.value).filter((v) => v != null);
	const [size, setSize] = useState({ width: 0, height: 72 });
	if (values.length < 2) return null;
	const shown = values.slice(-20);
	const min = Math.min(...shown);
	const max = Math.max(...shown);
	const span = max - min || 1;
	const padX = 6;
	const padY = 8;
	const { width: w, height: h } = size;
	const innerW = Math.max(1, w - padX * 2);
	const innerH = Math.max(1, h - padY * 2);
	const dots = shown.map((value, index) => ({
		x: padX + (index / (shown.length - 1)) * innerW,
		y: padY + innerH - ((Number(value) - min) / span) * innerH,
	}));
	const polyline = dots.map((dot) => `${dot.x},${dot.y}`).join(' ');

	return (
		<View
			style={styles.spark}
			onLayout={(event) => {
				const { width, height } = event.nativeEvent.layout;
				if (width !== size.width || height !== size.height) {
					setSize({ width, height });
				}
			}}
		>
			{w > 0 ? (
				<Svg width={w} height={h}>
					<Polyline
						points={polyline}
						fill="none"
						stroke={colors.accent}
						strokeWidth={2}
						strokeLinejoin="round"
						strokeLinecap="round"
					/>
					{dots.map((dot, index) => (
						<Circle
							key={`${index}-${shown[index]}`}
							cx={dot.x}
							cy={dot.y}
							r={2.5}
							fill={colors.accent}
						/>
					))}
				</Svg>
			) : null}
		</View>
	);
}

function FilterBar({ options, value, onChange, disabled }) {
	return (
		<View style={styles.seg}>
			{options.map((option) => {
				const on = option.key === value;
				return (
					<Pressable
						key={option.key}
						onPress={() => onChange(option.key)}
						disabled={disabled}
						style={[styles.segBtn, on && styles.segBtnOn]}
					>
						<Text style={[styles.segText, on && styles.segTextOn]}>{option.label}</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

const ProfileCareerDashboard = ({
	playerId,
	accessToken,
	initialCareer,
}) => {
	const isSelf = !!initialCareer?.isSelf;
	const [career, setCareer] = useState(initialCareer ?? null);
	const [windowKey, setWindowKey] = useState(initialCareer?.window || '90d');
	const [source, setSource] = useState(initialCareer?.source || 'all');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const sources = useMemo(() => {
		const list = [...CAREER_SOURCES];
		if (isSelf) {
			list.push({ key: 'training', label: 'Treningi' });
		}
		return list;
	}, [isSelf]);

	const apply = async (nextWindow, nextSource) => {
		if (!playerId || !accessToken || loading) return;
		setLoading(true);
		setError('');
		const result = await fetchPlayerCareer(playerId, accessToken, nextWindow, nextSource);
		if (!result.ok) {
			setError(result.message || 'Nie udało się wczytać kariery.');
			setLoading(false);
			return;
		}
		setCareer(result.data);
		setWindowKey(result.data?.window || nextWindow);
		setSource(result.data?.source || nextSource);
		setLoading(false);
	};

	const hero = career?.hero ?? {};
	const table = career?.table ?? {};
	const avgDelta = formatDelta(hero.x01AverageDelta);
	const doubleDelta = formatDelta(hero.doublePctDelta);
	const sparkPoints = career?.series?.x01_average;
	const hasSpark = (sparkPoints ?? []).filter((point) => point?.value != null).length >= 2;

	return (
		<View style={styles.wrap}>
			<View style={styles.sectionHead}>
				<Text style={styles.sectionLabel}>Kariera</Text>
				{loading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
			</View>

			<FilterBar
				options={sources}
				value={source}
				disabled={loading}
				onChange={(key) => apply(windowKey, key)}
			/>
			<FilterBar
				options={CAREER_WINDOWS}
				value={windowKey}
				disabled={loading}
				onChange={(key) => apply(key, source)}
			/>

			{error ? <Text style={styles.error}>{error}</Text> : null}

			<View style={styles.heroRow}>
				<View style={[styles.heroCard, cardToneStyle(colors.accent)]}>
					<Text style={styles.kicker}>Mecze</Text>
					<Text style={styles.heroValue}>{hero.games ?? 0}</Text>
					<Text style={styles.heroHint}>w wybranym oknie</Text>
				</View>
				<View style={[styles.heroCard, cardToneStyle(colors.info)]}>
					<Text style={styles.kicker}>Średnia 3 lotki</Text>
					<Text style={styles.heroValue}>
						{hero.hasX01 ? formatAverage(hero.x01Average).replace('-', '–') : '–'}
					</Text>
					<Text style={styles.heroHint}>X01</Text>
					{avgDelta ? (
						<Text style={[styles.delta, hero.x01AverageDelta > 0 && styles.deltaUp]}>
							{avgDelta}
						</Text>
					) : null}
				</View>
			</View>
			<View style={[styles.heroCard, cardToneStyle(colors.success)]}>
				<Text style={styles.kicker}>Double %</Text>
				<Text style={styles.heroValue}>
					{hero.hasDoubles && hero.doublePct != null ? `${hero.doublePct}%` : '–'}
				</Text>
				<Text style={styles.heroHint}>{hero.doubleLabel || 'śledzone duble'}</Text>
				{doubleDelta ? (
					<Text style={[styles.delta, hero.doublePctDelta > 0 && styles.deltaUp]}>
						{doubleDelta}
					</Text>
				) : null}
			</View>

			{hasSpark ? (
				<View style={[styles.chartCard, cardToneStyle(colors.accent)]}>
					<Text style={styles.kicker}>Trend średniej X01</Text>
					<Sparkline points={sparkPoints} />
				</View>
			) : null}

			<Text style={styles.sectionLabel}>Szczegóły</Text>
			<View style={styles.details}>
				<ProfileStatsTable stats={table} />
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	wrap: {
		paddingBottom: 24,
		gap: 10,
	},
	sectionHead: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	sectionLabel: {
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.8,
		textTransform: 'uppercase',
		color: colors.textDim,
	},
	seg: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 3,
		gap: 2,
	},
	segBtn: {
		paddingVertical: 7,
		paddingHorizontal: 8,
		borderRadius: 8,
	},
	segBtnOn: {
		backgroundColor: colors.accentMuted,
	},
	segText: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.textMuted,
	},
	segTextOn: {
		color: colors.accent,
	},
	error: {
		color: colors.dangerText,
		fontSize: 13,
	},
	heroRow: {
		flexDirection: 'row',
		gap: 10,
	},
	heroCard: {
		flex: 1,
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 14,
		overflow: 'hidden',
	},
	kicker: {
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
		color: colors.textDim,
		marginBottom: 6,
	},
	heroValue: {
		fontSize: 24,
		fontWeight: '700',
		color: colors.text,
	},
	heroHint: {
		marginTop: 2,
		fontSize: 12,
		color: colors.textMuted,
	},
	delta: {
		marginTop: 6,
		fontSize: 11,
		color: colors.textDim,
	},
	deltaUp: {
		color: colors.successBright,
	},
	spark: {
		height: 72,
		marginTop: 4,
	},
	chartCard: {
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 14,
		overflow: 'hidden',
	},
	details: {
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 12,
	},
});

export default ProfileCareerDashboard;
