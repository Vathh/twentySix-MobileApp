import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
	Easing,
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { WebView } from 'react-native-webview';
import { useIntroOverlay } from '../../context/IntroOverlayContext';
import { getIntroLogotypXml } from '../../helpers/svgAssets';
import {
	HEADER_LOGO_HEIGHT,
	HEADER_LOGOTYP_WIDTH,
	introLogotypMaxWidth,
	introLogotypSizeForWidth,
	introLogotypSlotLayout,
	settledIntroLogotypXml,
} from '../../helpers/headerLogo';
import { colors } from '../../theme/colors';

/** Czas animacji SVG (~2.5s) + krótki zapas przed wlotem do headera. */
const INTRO_DURATION_MS = 2900;
const FLY_MS = 720;
const HEADER_WAIT_MS = 1200;
const BG_FADE_MS = 520;

const BG = colors.bg || '#141418';
const FLY_EASING = Easing.bezier(0.22, 1, 0.36, 1);

function settledIntroXml(svgXml) {
	return settledIntroLogotypXml(svgXml);
}

function buildIntroHtml(svgXml, introWidthPx) {
	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: ${BG};
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    svg {
      width: ${Math.round(introWidthPx)}px;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>${svgXml}</body>
</html>`;
}

function fallbackLogotypRect(insets) {
	const headerContent = Platform.OS === 'ios' ? 44 : 56;
	return {
		x: 16,
		y: insets.top + Math.max(0, (headerContent - HEADER_LOGO_HEIGHT) / 2),
		width: HEADER_LOGOTYP_WIDTH,
		height: HEADER_LOGO_HEIGHT,
	};
}

/**
 * Intro: stroke-reveal 26, wlot w slot logotypu w headerze, potem kurtyna
 * odsłania kreskę i napis. Wlot jest natywny (Reanimated) — przezroczyste
 * WebView na Androidzie jest niestabilne.
 */
const AppIntro = ({ onDrawComplete, onFlyComplete }) => {
	const { headerTarget } = useIntroOverlay();
	const insets = useSafeAreaInsets();
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();

	const introBox = useMemo(() => {
		const width = introLogotypMaxWidth(windowWidth);
		return introLogotypSizeForWidth(width);
	}, [windowWidth]);

	const headerSlotLayout = useMemo(
		() => introLogotypSlotLayout(windowWidth, HEADER_LOGOTYP_WIDTH, HEADER_LOGO_HEIGHT),
		[windowWidth],
	);

	const startX = (windowWidth - introBox.width) / 2;
	const startY = (windowHeight - introBox.height) / 2;

	const [phase, setPhase] = useState('drawing');
	const flyStartedRef = useRef(false);
	const drawNotifiedRef = useRef(false);
	const flyFinishedRef = useRef(false);

	const progress = useSharedValue(0);
	const bgOpacity = useSharedValue(1);
	const slotX = useSharedValue(startX);
	const slotY = useSharedValue(startY);
	const slotW = useSharedValue(introBox.width);
	const slotH = useSharedValue(introBox.height);

	const introSvgXml = getIntroLogotypXml();
	const html = useMemo(
		() => (introSvgXml ? buildIntroHtml(introSvgXml, introBox.width) : ''),
		[introBox.width, introSvgXml],
	);
	const flyXml = useMemo(
		() => (introSvgXml ? settledIntroXml(introSvgXml) : ''),
		[introSvgXml],
	);

	const finishFly = useCallback(() => {
		if (flyFinishedRef.current) {
			return;
		}
		flyFinishedRef.current = true;
		onFlyComplete?.();
	}, [onFlyComplete]);

	const startFly = useCallback(
		(logotypRect) => {
			if (flyStartedRef.current) {
				return;
			}
			flyStartedRef.current = true;
			slotX.value = logotypRect.x;
			slotY.value = logotypRect.y;
			slotW.value = logotypRect.width;
			slotH.value = logotypRect.height;
			progress.value = 0;
			setPhase('flying');
		},
		[progress, slotH, slotW, slotX, slotY],
	);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (drawNotifiedRef.current) {
				return;
			}
			drawNotifiedRef.current = true;
			setPhase('waiting');
			onDrawComplete?.();
		}, INTRO_DURATION_MS);
		return () => clearTimeout(timer);
	}, [onDrawComplete]);

	useEffect(() => {
		if (phase !== 'waiting' || flyStartedRef.current) {
			return undefined;
		}
		if (headerTarget) {
			startFly(headerTarget);
			return undefined;
		}
		const timer = setTimeout(() => {
			startFly(fallbackLogotypRect({ top: insets.top }));
		}, HEADER_WAIT_MS);
		return () => clearTimeout(timer);
	}, [headerTarget, insets.top, phase, startFly]);

	useEffect(() => {
		if (phase !== 'flying') {
			return undefined;
		}
		bgOpacity.value = withTiming(0, {
			duration: BG_FADE_MS,
			easing: Easing.out(Easing.cubic),
		});
		progress.value = withTiming(
			1,
			{ duration: FLY_MS, easing: FLY_EASING },
			(finished) => {
				if (finished) {
					runOnJS(finishFly)();
				}
			},
		);
		const timer = setTimeout(finishFly, FLY_MS + 180);
		return () => clearTimeout(timer);
	}, [bgOpacity, finishFly, phase, progress]);

	const bgStyle = useAnimatedStyle(() => ({
		opacity: bgOpacity.value,
	}));

	const wrapperStyle = useAnimatedStyle(() => {
		const p = progress.value;
		return {
			left: startX + (slotX.value - startX) * p,
			top: startY + (slotY.value - startY) * p,
			width: introBox.width + (slotW.value - introBox.width) * p,
			height: introBox.height + (slotH.value - introBox.height) * p,
		};
	});

	const flyEndScale = headerSlotLayout.scale;

	const innerStyle = useAnimatedStyle(() => {
		const p = progress.value;
		const wrapW = introBox.width + (slotW.value - introBox.width) * p;
		const wrapH = introBox.height + (slotH.value - introBox.height) * p;
		const scale = 1 + (flyEndScale - 1) * p;
		return {
			left: (wrapW - introBox.width) / 2,
			top: (wrapH - introBox.height) / 2,
			transform: [{ scale }],
		};
	});

	return (
		<View style={styles.root} pointerEvents="auto">
			<Animated.View style={[styles.bg, bgStyle]} pointerEvents="none" />
			{phase !== 'flying' && flyXml ? (
				<View style={styles.hiddenParse} pointerEvents="none">
					<SvgXml xml={flyXml} width={introBox.width} height={introBox.height} />
				</View>
			) : null}
			{phase !== 'flying' && html ? (
				<WebView
					originWhitelist={['*']}
					source={{
						html,
						baseUrl: Platform.OS === 'android' ? 'https://twentysix.local/' : undefined,
					}}
					style={styles.webview}
					containerStyle={styles.webview}
					scrollEnabled={false}
					bounces={false}
					showsVerticalScrollIndicator={false}
					showsHorizontalScrollIndicator={false}
					androidLayerType="hardware"
					setSupportMultipleWindows={false}
					javaScriptEnabled={false}
					domStorageEnabled={false}
				/>
			) : null}
			{phase === 'flying' && flyXml ? (
				<Animated.View
					pointerEvents="none"
					style={[
						styles.flyLogo,
						{
							width: introBox.width,
							height: introBox.height,
						},
						wrapperStyle,
					]}
				>
					<Animated.View
						style={[
							styles.flyInner,
							{ width: introBox.width, height: introBox.height },
							innerStyle,
						]}
					>
						<SvgXml xml={flyXml} width={introBox.width} height={introBox.height} />
					</Animated.View>
				</Animated.View>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: 'transparent',
	},
	bg: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: BG,
	},
	webview: {
		flex: 1,
		backgroundColor: BG,
	},
	flyLogo: {
		position: 'absolute',
		overflow: 'hidden',
		zIndex: 2,
	},
	flyInner: {
		position: 'absolute',
	},
	hiddenParse: {
		position: 'absolute',
		opacity: 0,
		left: 0,
		top: 0,
	},
});

export default AppIntro;
