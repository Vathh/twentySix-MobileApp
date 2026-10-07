import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { initialsFromName } from '../../helpers/initialsFromName';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

/**
 * Zdjęcie gracza albo inicjały, gdy pliku nie ma lub się nie wczyta.
 */
const PlayerAvatar = ({
	name,
	initials,
	avatarUrl,
	size = 36,
	rounded = 18,
}) => {
	const [failed, setFailed] = useState(false);
	const label = initials || initialsFromName(name);
	const showImage = Boolean(avatarUrl) && !failed;
	const box = scaleSize(size);

	return (
		<View
			style={[
				styles.box,
				{
					width: box,
					height: box,
					borderRadius: scaleSize(rounded),
				},
			]}
		>
			{showImage ? (
				<Image
					source={{ uri: avatarUrl }}
					style={styles.image}
					onError={() => setFailed(true)}
					accessibilityIgnoresInvertColors
				/>
			) : (
				<Text style={[styles.text, { fontSize: scaleSize(Math.max(11, Math.round(size * 0.34))) }]}>
					{label}
				</Text>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	box: {
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		backgroundColor: colors.accentMuted,
	},
	image: {
		width: '100%',
		height: '100%',
	},
	text: {
		fontWeight: '700',
		color: colors.accent,
		letterSpacing: 0.4,
	},
});

export default PlayerAvatar;
