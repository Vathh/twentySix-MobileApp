import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';
import {
	loadCheckoutWheelXml,
	paintCheckoutWheelXml,
} from '../../helpers/checkoutWheelXml';
import { sanitizeSvgXml } from '../../helpers/headerLogo';
import { colors } from '../../theme/colors';

const LEVEL_LEGEND = [
	{ key: 'iron', label: '1–2', color: '#e4e4e7' },
	{ key: 'bronze', label: '3–4', color: '#fed7aa' },
	{ key: 'gold', label: '5–9', color: '#ffc400' },
	{ key: 'bright', label: '10–14', color: '#38bdf8' },
	{ key: 'apex', label: '15+', color: '#c4e4f2' },
];

const ProfileBadges = ({ checkoutItems }) => {
	const items = Array.isArray(checkoutItems) ? checkoutItems : [];
	const unlocked = items.filter((item) => (item.timesEarned ?? 0) > 0).length;
	const total = items.length;
	const { width: windowWidth } = useWindowDimensions();
	const wheelSize = Math.min(windowWidth - 48, 400);
	const [wheelXml, setWheelXml] = useState('');
	const [wheelError, setWheelError] = useState(false);

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
			</Text>

			{wheelError ? (
				<BadgeGrid items={items} />
			) : wheelXml ? (
				<View style={styles.wheelCard}>
					<SvgXml xml={wheelXml} width={wheelSize} height={wheelSize} />
					<View style={styles.legend}>
						{LEVEL_LEGEND.map((level) => (
							<View key={level.key} style={styles.legendItem}>
								<View style={[styles.legendDot, { backgroundColor: level.color }]} />
								<Text style={styles.legendText}>{level.label}</Text>
							</View>
						))}
					</View>
				</View>
			) : (
				<View style={styles.loading}>
					<ActivityIndicator color={colors.accent} />
				</View>
			)}
		</View>
	);
};

function BadgeGrid({ items }) {
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
					<View key={item.key} style={[styles.tile, on && styles.tileOn]}>
						<Text style={[styles.key, on && styles.keyOn]}>{item.key}</Text>
						<Text style={[styles.times, on && styles.timesOn]}>
							{on ? `×${times}` : '—'}
						</Text>
					</View>
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
	legend: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 10,
		paddingHorizontal: 12,
		paddingBottom: 12,
		paddingTop: 4,
	},
	legendItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
	},
	legendDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	legendText: {
		fontSize: 11,
		fontWeight: '600',
		color: colors.textMuted,
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
});

export default ProfileBadges;
