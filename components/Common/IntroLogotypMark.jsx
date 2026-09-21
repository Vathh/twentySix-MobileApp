import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { getIntroLogotypXml } from '../../helpers/svgAssets';
import {
	HEADER_LOGO_HEIGHT,
	HEADER_LOGOTYP_WIDTH,
	introLogotypMaxWidth,
	introLogotypSizeForWidth,
	introLogotypSlotLayout,
	settledIntroLogotypXml,
} from '../../helpers/headerLogo';
import { scaleSize } from '../../theme/uiScale';

/**
 * Przekreślone 26 z intro-logotyp.svg, wcięte w slot headera tak samo jak wlot.
 */
const IntroLogotypMark = ({
	width = HEADER_LOGOTYP_WIDTH,
	height = HEADER_LOGO_HEIGHT,
}) => {
	const { width: windowWidth } = useWindowDimensions();
	const xml = useMemo(() => {
		const raw = getIntroLogotypXml();
		return raw ? settledIntroLogotypXml(raw) : '';
	}, []);
	const introBox = useMemo(
		() => introLogotypSizeForWidth(introLogotypMaxWidth(windowWidth, scaleSize(300))),
		[windowWidth],
	);
	const layout = useMemo(
		() => introLogotypSlotLayout(windowWidth, width, height, introBox),
		[height, introBox, width, windowWidth],
	);

	return (
		<View style={[styles.clip, { width, height }]}>
			<View
				style={[
					styles.inner,
					{
						width: layout.introBox.width,
						height: layout.introBox.height,
						left: layout.left,
						top: layout.top,
						transform: [{ scale: layout.scale }],
						transformOrigin: '50% 50%',
					},
				]}
			>
				{xml ? (
					<SvgXml xml={xml} width={layout.introBox.width} height={layout.introBox.height} />
				) : null}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	clip: {
		overflow: 'hidden',
		borderRadius: 0.1,
	},
	inner: {
		position: 'absolute',
	},
});

export default IntroLogotypMark;
