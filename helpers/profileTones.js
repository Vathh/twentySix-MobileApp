import { colors } from '../theme/colors';
import { gameTypeTone } from './profileMetrics';

/** Kolory typów jak na webie (history-type / overview-source). */
export const GAME_TONES = {
	tournament: {
		color: colors.accent,
		muted: colors.accentMuted,
	},
	league: {
		color: colors.success,
		muted: colors.successMuted,
	},
	quick: {
		color: colors.info,
		muted: colors.infoMuted,
	},
	training: {
		color: colors.warning,
		muted: colors.warningMuted,
	},
	muted: {
		color: colors.textMuted,
		muted: colors.bgElevatedHover,
	},
};

export function toneForGameType(type) {
	return GAME_TONES[gameTypeTone(type)] ?? GAME_TONES.muted;
}

export function cardToneStyle(color) {
	return {
		borderLeftWidth: 3,
		borderLeftColor: color,
		overflow: 'hidden',
	};
}

export function typePillStyle(type) {
	const tone = toneForGameType(type);
	return {
		color: tone.color,
		backgroundColor: tone.muted,
	};
}
