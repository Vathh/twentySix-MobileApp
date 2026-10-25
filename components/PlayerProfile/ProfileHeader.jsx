import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { initialsFromName } from '../../helpers/initialsFromName';
import { badgeArtworkStyle, highVisitImage } from '../../helpers/highVisitBadges';
import { finishImage } from '../../helpers/finishBadges';
import { careerImage } from '../../helpers/careerBadges';
import { qfImage } from '../../helpers/qfBadges';
import { cardToneStyle } from '../../helpers/profileTones';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';
import PlayerAvatar from '../Common/PlayerAvatar';

const formatFastestQf = (darts) => (darts != null ? `${darts} lotek` : '–');
const formatHighestHf = (score) => (score != null ? String(score) : '–');

function earnedShowcaseBadges(highVisitItems) {
	return (Array.isArray(highVisitItems) ? highVisitItems : [])
		.filter((item) => item.levelName && item.levelName !== 'locked')
		.map((item) => ({
			key: `visit-${item.key}`,
			source: highVisitImage(item.key, item.levelName),
			artwork: item.artwork,
			title: [item.label, item.levelLabel].filter(Boolean).join(' — '),
			sort: Number(item.key) || 0,
		}))
		.filter((item) => item.source)
		.sort((a, b) => b.sort - a.sort);
}

function earnedFinishBadges(finishItems) {
	return (Array.isArray(finishItems) ? finishItems : [])
		.filter((item) => item.levelName && item.levelName !== 'locked')
		.map((item) => ({
			key: `finish-${item.key}`,
			source: finishImage(item.key, item.levelName),
			artwork: item.artwork,
			title: [item.label, item.levelLabel].filter(Boolean).join(' — '),
			sort: Number(item.key) || 0,
		}))
		.filter((item) => item.source)
		.sort((a, b) => a.sort - b.sort);
}

function earnedCareerBadges(careerItems) {
	const order = { podium: 0, win_streak: 1, appearances: 2, titles: 3 };
	return (Array.isArray(careerItems) ? careerItems : [])
		.filter((item) => item.levelName && item.levelName !== 'locked')
		.map((item) => ({
			key: `career-${item.key}`,
			source: careerImage(item.key, item.levelName),
			artwork: item.artwork,
			title: [item.label, item.levelLabel].filter(Boolean).join(' — '),
			sort: order[item.key] ?? 9,
		}))
		.filter((item) => item.source)
		.sort((a, b) => a.sort - b.sort);
}

function earnedQfBadges(qfItems) {
	return (Array.isArray(qfItems) ? qfItems : [])
		.filter((item) => (Number(item.timesEarned) || 0) > 0)
		.map((item) => ({
			key: `qf-${item.key}`,
			source: qfImage(item.key, item.levelName),
			artwork: item.artwork,
			title: [item.label, item.levelLabel].filter(Boolean).join(' — '),
			sort: Number(item.key) || 0,
		}))
		.filter((item) => item.source)
		.sort((a, b) => a.sort - b.sort);
}

const ProfileHeader = ({
	name,
	initials,
	registeredAt,
	description,
	isSelf,
	relationLabel,
	liveGames,
	fastestQf,
	highestHf,
	avatarUrl,
	highVisitItems,
	qfItems,
	finishItems,
	careerItems,
	onBadgesPress,
	onEditPress,
	children,
}) => {
	const mono = initials || initialsFromName(name);
	const showcaseBadges = [
		...earnedShowcaseBadges(highVisitItems),
		...earnedQfBadges(qfItems),
		...earnedFinishBadges(finishItems),
		...earnedCareerBadges(careerItems),
	];

	return (
		<View style={[styles.hero, cardToneStyle(colors.accent)]}>
			<View style={styles.topRow}>
				<PlayerAvatar
					name={name}
					initials={mono}
					avatarUrl={avatarUrl}
					size={56}
					rounded={12}
				/>
				<View style={styles.idBlock}>
					<Text style={styles.name}>{name || 'Gracz'}</Text>
					<View style={styles.metaRow}>
						{registeredAt ? (
							<Text style={styles.meta}>Konto · od {registeredAt}</Text>
						) : (
							<View style={styles.chip}>
								<Text style={styles.chipText}>Gość</Text>
							</View>
						)}
						{relationLabel ? (
							<View style={styles.chipAccent}>
								<Text style={styles.chipAccentText}>{relationLabel}</Text>
							</View>
						) : null}
					</View>
					<View style={styles.highlights}>
						<Text style={styles.highlight}>
							Najszybsza lotka{' '}
							<Text style={styles.highlightValue}>{formatFastestQf(fastestQf)}</Text>
						</Text>
						<Text style={styles.highlight}>
							Najwyższy finish{' '}
							<Text style={styles.highlightValue}>{formatHighestHf(highestHf)}</Text>
						</Text>
					</View>
				</View>
				{isSelf ? (
					<Pressable
						accessibilityRole="button"
						style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}
						onPress={onEditPress}
					>
						<Text style={styles.editBtnText}>Edytuj</Text>
					</Pressable>
				) : null}
			</View>

			<View style={styles.badges} accessibilityLabel="Odznaczenia">
				<Text style={styles.badgesLabel}>Odznaczenia</Text>
				{showcaseBadges.length === 0 ? (
					<Text style={styles.badgesEmpty}>Jeszcze brak odznaczeń.</Text>
				) : (
					<View style={styles.badgeRow}>
						{showcaseBadges.map((badge) => (
							<Pressable
								key={badge.key}
								accessibilityRole="button"
								accessibilityLabel={badge.title}
								onPress={() => onBadgesPress?.(badge.key)}
								style={({ pressed }) => [styles.badgeHit, pressed && styles.badgeHitPressed]}
							>
								<Image
									source={badge.source}
									style={badgeArtworkStyle(badge.artwork)}
									resizeMode="stretch"
								/>
							</Pressable>
						))}
					</View>
				)}
			</View>

			{children}

			{description ? (
				<Text style={styles.bio}>{description}</Text>
			) : isSelf ? (
				<Text style={styles.bioEmpty}>
					Nie masz jeszcze opisu. Dodaj go w edycji profilu.
				</Text>
			) : null}

			{(liveGames ?? []).map((game) => (
				<Pressable
					key={`${game.type}-${game.id}`}
					accessibilityRole="link"
					style={({ pressed }) => [styles.live, pressed && styles.livePressed]}
					onPress={() => {
						if (game.liveUrl) {
							void Linking.openURL(game.liveUrl);
						}
					}}
				>
					<View style={styles.liveBody}>
						<View style={styles.liveBadge}>
							<View style={styles.liveDot} />
							<Text style={styles.liveBadgeText}>Na żywo</Text>
						</View>
						<Text style={styles.liveStage}>{game.stageLabel}</Text>
						<Text style={styles.liveTitle}>
							Gra teraz vs {game.opponentName}
							{game.tournamentName ? ` · ${game.tournamentName}` : ''}
						</Text>
					</View>
					<Ionicons name="open-outline" size={scaleSize(16)} color={colors.accent} />
				</Pressable>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	hero: {
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 16,
		marginBottom: 16,
		gap: 14,
		overflow: 'hidden',
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
	},
	idBlock: {
		flex: 1,
		minWidth: 0,
	},
	name: {
		fontSize: 22,
		fontWeight: '700',
		color: colors.text,
	},
	metaRow: {
		marginTop: 6,
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'center',
		gap: 6,
	},
	meta: {
		fontSize: 13,
		color: colors.textSecondary,
	},
	highlights: {
		marginTop: 8,
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	highlight: {
		fontSize: 12,
		color: colors.textSecondary,
	},
	highlightValue: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.text,
	},
	chip: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		backgroundColor: colors.bgElevatedHover,
	},
	chipText: {
		fontSize: 11,
		fontWeight: '700',
		color: colors.textMuted,
	},
	chipAccent: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		backgroundColor: colors.accentMuted,
	},
	chipAccentText: {
		fontSize: 11,
		fontWeight: '700',
		color: colors.accent,
	},
	editBtn: {
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 8,
		backgroundColor: colors.accentMuted,
	},
	editBtnPressed: {
		backgroundColor: colors.accentSoft,
	},
	editBtnText: {
		color: colors.accent,
		fontWeight: '600',
		fontSize: 13,
	},
	badges: {
		gap: 8,
		paddingTop: 12,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.border,
	},
	badgesLabel: {
		fontSize: 10,
		fontWeight: '700',
		letterSpacing: 0.8,
		textTransform: 'uppercase',
		color: colors.textDim,
	},
	badgesEmpty: {
		fontSize: 12,
		color: colors.textMuted,
	},
	badgeRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	badgeHit: {
		width: 76,
		height: 76,
		overflow: 'hidden',
	},
	badgeHitPressed: {
		opacity: 0.8,
		transform: [{ translateY: -2 }],
	},
	bio: {
		fontSize: 14,
		lineHeight: 20,
		color: colors.textSecondary,
	},
	bioEmpty: {
		fontSize: 13,
		lineHeight: 19,
		color: colors.textMuted,
	},
	live: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 12,
		paddingHorizontal: 12,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.accentBorder,
		backgroundColor: colors.accentMuted,
	},
	livePressed: {
		backgroundColor: colors.accentSoft,
	},
	liveBody: {
		flex: 1,
		minWidth: 0,
	},
	liveBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginBottom: 4,
	},
	liveDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: colors.accent,
	},
	liveBadgeText: {
		fontSize: 11,
		fontWeight: '700',
		color: colors.accent,
	},
	liveStage: {
		fontSize: 12,
		color: colors.textMuted,
		marginBottom: 2,
	},
	liveTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
	},
});

export default ProfileHeader;
