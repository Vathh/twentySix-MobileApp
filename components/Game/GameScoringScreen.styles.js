import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export const gameScoringScreenStyles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'column',
		backgroundColor: colors.bg,
	},
	presenceBanner: {
		backgroundColor: colors.errorBannerBg,
		paddingVertical: 8,
		paddingHorizontal: 16,
	},
	presenceBannerText: {
		color: colors.errorBannerText,
		fontSize: 14,
		textAlign: 'center',
		marginVertical: 2,
	},
	navigationContainer: {
		flexDirection: 'row',
	},
	navigationBtn: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: colors.scrimMild,
		paddingTop: 5,
		paddingBottom: 5,
	},
	selectedNavigationBtn: {
		backgroundColor: colors.scrimMild,
	},
	navigationBtnText: {
		fontSize: 18,
		color: colors.textMuted,
	},
});
