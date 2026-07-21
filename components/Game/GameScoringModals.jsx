import React from 'react';
import {
	ActivityIndicator,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { colors } from '../../theme/colors';

export default function GameScoringModals({
	isOpenerModalVisible,
	players,
	playerCount,
	onSelectOpener,
	checkoutModalPlayer,
	isCheckoutModalVisible,
	onCheckoutDart,
	scoringBusy,
	scoringBusyLabel,
}) {
	return (
		<>
			<Modal visible={isOpenerModalVisible}>
				<View style={styles.modalContainer}>
					<Text style={styles.modalText}>Kto zaczyna mecz?</Text>
					<View
						style={[
							styles.modalBtnsContainer,
							playerCount > 2 && styles.modalBtnsWrap,
						]}
					>
						{players.slice(0, playerCount).map((p, i) => (
							<Pressable
								key={i}
								style={styles.modalBtn}
								onPress={() => onSelectOpener(p)}
							>
								<Text style={styles.modalBtnText} numberOfLines={1}>
									{p?.name ?? 'Gracz'}
								</Text>
							</Pressable>
						))}
					</View>
				</View>
			</Modal>

			{checkoutModalPlayer && (
				<Modal visible={isCheckoutModalVisible}>
					<View style={styles.modalContainer}>
						<Text style={styles.modalText}>
							Którą lotką {checkoutModalPlayer.name} skończył lega?
						</Text>
						<View
							style={[styles.modalBtnsContainer, styles.qfModalBtnsContainer]}
						>
							{[1, 2, 3].map((dartNumber) => (
								<Pressable
									key={dartNumber}
									style={[styles.modalBtn, styles.qfModalBtn]}
									onPress={() => onCheckoutDart(dartNumber)}
								>
									<Text style={styles.modalBtnText}>{dartNumber}</Text>
								</Pressable>
							))}
						</View>
					</View>
				</Modal>
			)}

			{scoringBusy && !isCheckoutModalVisible && (
				<View style={styles.scoringBusyOverlay} pointerEvents="none">
					<ActivityIndicator size="large" color={colors.accent} />
					<Text style={styles.scoringBusyText}>{scoringBusyLabel}</Text>
				</View>
			)}
		</>
	);
}

const styles = StyleSheet.create({
	modalContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.bg,
	},
	modalText: {
		color: colors.textMuted,
		marginRight: 50,
		marginLeft: 50,
		marginBottom: 30,
		fontSize: 20,
		textAlign: 'center',
	},
	modalBtnsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'center',
		width: '100%',
		paddingRight: 50,
		paddingLeft: 50,
	},
	modalBtnsWrap: {
		flexWrap: 'wrap',
		gap: 12,
	},
	qfModalBtnsContainer: {
		flexDirection: 'column',
	},
	modalBtn: {
		width: 120,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: colors.borderMuted,
		justifyContent: 'center',
		alignItems: 'center',
	},
	qfModalBtn: {
		marginTop: 30,
	},
	modalBtnText: {
		color: colors.textMuted,
		paddingTop: 10,
		paddingBottom: 10,
		paddingLeft: 15,
		paddingRight: 15,
		fontSize: 18,
	},
	scoringBusyOverlay: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		bottom: 56,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.overlayPurple,
		zIndex: 10,
	},
	scoringBusyText: {
		color: colors.text,
		fontSize: 18,
		marginTop: 14,
		textAlign: 'center',
	},
});
