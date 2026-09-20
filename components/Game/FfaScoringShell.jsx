import React from 'react';
import { Text, View } from 'react-native';
import GameFinishedModal from './GameFinishedModal';
import GameScoringModals from './GameScoringModals';
import { gameScoringScreenStyles as styles } from './GameScoringScreen.styles';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

/**
 * Ramka ekranu FFA: modal openera, koniec meczu, pasek trybu, komunikat widza.
 */
export default function FfaScoringShell({
	insets,
	isModalVisible,
	players,
	playerCount,
	onSelectOpener,
	busy,
	busyLabel = 'Zapisywanie rzutu…',
	finishedModalProps,
	title,
	gameClosed,
	syncEnabled,
	lobbyScoringMode,
	isSpectator,
	children,
}) {
	return (
		<View style={[styles.container, { paddingBottom: Math.max(insets.bottom, scaleSize(8)) }]}>
			<GameScoringModals
				isOpenerModalVisible={isModalVisible}
				players={players}
				playerCount={playerCount}
				onSelectOpener={onSelectOpener}
				checkoutModalPlayer={null}
				isCheckoutModalVisible={false}
				onCheckoutDart={() => {}}
				scoringBusy={busy}
				scoringBusyLabel={busyLabel}
			/>

			<GameFinishedModal {...finishedModalProps} />

			{!isModalVisible && title ? (
				<View style={{ paddingHorizontal: scaleSize(12), paddingVertical: scaleSize(8) }}>
					<Text style={{ color: colors.textDim, textAlign: 'center', fontSize: scaleSize(13) }}>
						{title}
						{syncEnabled
							? ` · ${lobbyScoringMode === 'each_own' ? 'online' : '1 urządzenie'}`
							: ''}
						{gameClosed ? ' · koniec' : ''}
					</Text>
				</View>
			) : null}

			{isSpectator ? (
				<View style={{ padding: scaleSize(16) }}>
					<Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: scaleSize(15) }}>
						Tryb jednego urządzenia — wynik wpisuje host. Widzisz stan na żywo.
					</Text>
				</View>
			) : null}

			{!isModalVisible ? children : null}
		</View>
	);
}
