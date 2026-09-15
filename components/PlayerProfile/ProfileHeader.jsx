import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { initialsFromName } from '../../helpers/initialsFromName';
import { cardToneStyle } from '../../helpers/profileTones';
import { colors } from '../../theme/colors';

const ProfileHeader = ({
	name,
	initials,
	registeredAt,
	description,
	isSelf,
	relationLabel,
	liveGames,
	onEditPress,
	children,
}) => {
	const mono = initials || initialsFromName(name);

	return (
		<View style={[styles.hero, cardToneStyle(colors.accent)]}>
			<View style={styles.topRow}>
				<View style={styles.mono}>
					<Text style={styles.monoText}>{mono}</Text>
				</View>
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
					<Ionicons name="open-outline" size={16} color={colors.accent} />
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
	mono: {
		width: 56,
		height: 56,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.accentMuted,
	},
	monoText: {
		fontSize: 18,
		fontWeight: '700',
		color: colors.accent,
		letterSpacing: 0.6,
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
