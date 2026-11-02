import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

/**
 * Widok gracza na zaplanowanym turnieju — ten sam układ co strona turnieju na webie.
 */
export default function TournamentPublicRoster({ roster, join, busy, onApply }) {
	const count = roster?.participantCount ?? 0;
	const minPlayers = roster?.minPlayers ?? 4;
	const ready = count >= minPlayers;
	const participants = roster?.participants ?? [];

	return (
		<View>
			<View style={styles.card}>
				<View style={styles.header}>
					<Text style={styles.title}>Uczestnicy turnieju</Text>
					<Text style={[styles.badge, ready ? styles.badgeReady : styles.badgeShort]}>
						{count} / min. {minPlayers}
					</Text>
				</View>
				<Text style={styles.hint}>
					W turnieju grają wszyscy z tej listy — zaakceptowane zaproszenia oraz goście dodani do turnieju.
				</Text>
				{participants.length === 0 ? (
					<Text style={styles.empty}>Jeszcze nikt nie jest w składzie.</Text>
				) : (
					<View style={styles.chips}>
						{participants.map((person) => (
							<View key={`${person.kind}-${person.name}`} style={styles.chip}>
								<Text style={styles.chipText}>
									{person.name}
									{person.kind === 'guest' ? '  gość' : ''}
								</Text>
							</View>
						))}
					</View>
				)}
			</View>

			{join ? (
				<View style={styles.card}>
					{join.alreadyParticipant ? (
						<Text style={styles.hint}>Jesteś w składzie tego turnieju.</Text>
					) : join.alreadyPending ? (
						<Text style={styles.hint}>Zgłoszenie wysłane. Czekasz na decyzję organizatora.</Text>
					) : join.canApply ? (
						<Pressable style={styles.button} onPress={onApply} disabled={busy}>
							<Text style={styles.buttonText}>{busy ? 'Wysyłanie…' : 'Zgłoś się'}</Text>
						</Pressable>
					) : join.reason ? (
						<Text style={styles.hint}>{join.reason}</Text>
					) : null}
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		marginTop: 16,
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	title: {
		flex: 1,
		color: colors.text,
		fontSize: 16,
		fontWeight: '700',
	},
	badge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999,
		overflow: 'hidden',
		fontSize: 12,
		fontWeight: '700',
	},
	badgeReady: {
		backgroundColor: colors.successMuted,
		color: colors.successBright,
	},
	badgeShort: {
		backgroundColor: colors.accentSoft,
		color: colors.accent,
	},
	hint: {
		marginTop: 8,
		color: colors.textSecondary,
		fontSize: 14,
		lineHeight: 20,
	},
	empty: {
		marginTop: 8,
		color: colors.textMuted,
		fontStyle: 'italic',
		fontSize: 14,
	},
	chips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 12,
	},
	chip: {
		backgroundColor: colors.bg,
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 6,
	},
	chipText: {
		color: colors.textSecondary,
		fontSize: 14,
	},
	button: {
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
	},
	buttonText: {
		color: colors.onAccent,
		fontWeight: '700',
		fontSize: 15,
	},
});
