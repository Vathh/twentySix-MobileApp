import { StyleSheet } from 'react-native';

export const gameScoringScreenStyles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'column',
		backgroundColor: '#363062',
	},
	presenceBanner: {
		backgroundColor: '#5c1d1d',
		paddingVertical: 8,
		paddingHorizontal: 16,
	},
	presenceBannerText: {
		color: '#ffd4d4',
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
		borderColor: 'rgba(0,0,0,.3)',
		paddingTop: 5,
		paddingBottom: 5,
	},
	selectedNavigationBtn: {
		backgroundColor: 'rgba(0,0,0,.3)',
	},
	navigationBtnText: {
		fontSize: 18,
		color: '#c5c5c5',
	},
});
