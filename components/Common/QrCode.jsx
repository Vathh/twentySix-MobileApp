import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import QRCode from 'qrcode';

/** Czarny kod na białym tle — skaner tabletu potrzebuje tego kontrastu. */
export default function QrCode({ value, size = 180 }) {
	const cells = useMemo(() => {
		if (!value) {
			return null;
		}
		const code = QRCode.create(String(value), { errorCorrectionLevel: 'M' });
		return code.modules;
	}, [value]);

	if (!cells) {
		return null;
	}

	const scale = size / cells.size;
	const marks = [];
	for (let row = 0; row < cells.size; row += 1) {
		for (let col = 0; col < cells.size; col += 1) {
			if (cells.get(row, col)) {
				marks.push(
					<Rect
						key={`${row}-${col}`}
						x={col * scale}
						y={row * scale}
						width={scale}
						height={scale}
						fill="#111111"
					/>,
				);
			}
		}
	}

	return (
		<View style={{ backgroundColor: '#ffffff', padding: 10, alignSelf: 'flex-start' }}>
			<Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
				{marks}
			</Svg>
		</View>
	);
}
