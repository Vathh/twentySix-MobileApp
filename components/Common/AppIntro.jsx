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
import IntroLogotypMark from './IntroLogotypMark';
import { useIntroOverlay } from '../../context/IntroOverlayContext';
import { getIntroLogotypXml } from '../../helpers/svgAssets';
import {
	HEADER_LOGO_HEIGHT,
	HEADER_LOGOTYP_WIDTH,
	INTRO_CONTENT_HEIGHT_RATIO,
	INTRO_CONTENT_WIDTH_RATIO,
	INTRO_LOGOTYP_CONTENT_X,
	INTRO_LOGOTYP_CONTENT_Y,
	INTRO_LOGOTYP_SRC_HEIGHT,
	INTRO_LOGOTYP_SRC_WIDTH,
	introLogotypMaxWidth,
	introLogotypSizeForWidth,
	settledIntroLogotypXml,
} from '../../helpers/headerLogo';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

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
	const logoHeight = scaleSize(HEADER_LOGO_HEIGHT);
	return {
		x: scaleSize(16),
		y: insets.top,
		width: scaleSize(HEADER_LOGOTYP_WIDTH),
		height: logoHeight,
	};
}

function contentRectForIntro(introBox, windowWidth, windowHeight) {
	const width = introBox.width * INTRO_CONTENT_WIDTH_RATIO;
	const height = introBox.height * INTRO_CONTENT_HEIGHT_RATIO;
	const originX = (windowWidth - introBox.width) / 2;
	const originY = (windowHeight - introBox.height) / 2;
	return {
		x: originX + introBox.width * (INTRO_LOGOTYP_CONTENT_X / INTRO_LOGOTYP_SRC_WIDTH),
		y: originY + introBox.height * (INTRO_LOGOTYP_CONTENT_Y / INTRO_LOGOTYP_SRC_HEIGHT),
		width,
		height,
	};
}

/**
 * Intro: stroke-reveal 26, potem wlot tego samego marku co w headerze
 * (IntroLogotypMark) z prostokąta treści na ekranie w zmierzony slot.
 * Cel = współrzędne względem wspólnego hosta, bez nudge’y.
 */
const AppIntro = ({ onDrawComplete, onFlyComplete }) => {
	const { headerTarget, requestHeaderLogoMeasure } = useIntroOverlay();
	const insets = useSafeAreaInsets();
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();

	const introBox = useMemo(() => {
		const width = introLogotypMaxWidth(windowWidth, scaleSize(300));
		return introLogotypSizeForWidth(width);
	}, [windowWidth]);

	const startContent = useMemo(
		() => contentRectForIntro(introBox, windowWidth, windowHeight),
		[introBox, windowHeight, windowWidth],
	);

	const [phase, setPhase] = useState('drawing');
	const flyStartedRef = useRef(false);
	const drawNotifiedRef = useRef(false);
	const flyFinishedRef = useRef(false);
	const headerTargetRef = useRef(headerTarget);

	const progress = useSharedValue(0);
	const bgOpacity = useSharedValue(1);
	const fromX = useSharedValue(startContent.x);
	const fromY = useSharedValue(startContent.y);
	const fromW = useSharedValue(startContent.width);
	const fromH = useSharedValue(startContent.height);
	const toX = useSharedValue(startContent.x);
	const toY = useSharedValue(startContent.y);
	const slotW = useSharedValue(scaleSize(HEADER_LOGOTYP_WIDTH));
	const slotH = useSharedValue(scaleSize(HEADER_LOGO_HEIGHT));

	useEffect(() => {
		headerTargetRef.current = headerTarget;
	}, [headerTarget]);

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

	const applyTargetRect = useCallback(
		(logotypRect) => {
			toX.value = logotypRect.x;
			toY.value = logotypRect.y;
			slotW.value = logotypRect.width;
			slotH.value = logotypRect.height;
		},
		[slotH, slotW, toX, toY],
	);

	useEffect(() => {
		if (headerTarget) {
			applyTargetRect(headerTarget);
		}
	}, [applyTargetRect, headerTarget]);

	const startFly = useCallback(
		(logotypRect) => {
			if (flyStartedRef.current) {
				return;
			}
			flyStartedRef.current = true;
			fromX.value = startContent.x;
			fromY.value = startContent.y;
			fromW.value = startContent.width;
			fromH.value = startContent.height;
			applyTargetRect(logotypRect);
			progress.value = 0;
			setPhase('flying');
		},
		[
			applyTargetRect,
			fromH,
			fromW,
			fromX,
			fromY,
			progress,
			startContent.height,
			startContent.width,
			startContent.x,
			startContent.y,
		],
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

		const launch = (rect) => {
			if (flyStartedRef.current) {
				return;
			}
			startFly(rect);
		};

		requestHeaderLogoMeasure?.();

		let settleTimer = null;
		const waitMs = headerTarget || headerTargetRef.current ? 120 : HEADER_WAIT_MS;
		const timer = setTimeout(() => {
			requestHeaderLogoMeasure?.();
			// measureInWindow/measureLayout są async — daj im domknąć publish.
			settleTimer = setTimeout(() => {
				launch(
					headerTargetRef.current ||
						fallbackLogotypRect({ top: insets.top }),
				);
			}, 64);
		}, waitMs);
		return () => {
			clearTimeout(timer);
			if (settleTimer) {
				clearTimeout(settleTimer);
			}
		};
	}, [
		headerTarget,
		insets.top,
		phase,
		requestHeaderLogoMeasure,
		startFly,
	]);

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

	/**
	 * Mark ma zawsze rozmiar slotu; animujemy top-left prostokąta treści
	 * → slot + skalę wokół środka (bez transformOrigin / crop SVG).
	 */
	const flyStyle = useAnimatedStyle(() => {
		const p = progress.value;
		const startScaleX = fromW.value / Math.max(slotW.value, 1);
		const startScaleY = fromH.value / Math.max(slotH.value, 1);
		const startScale = Math.max(startScaleX, startScaleY);
		const scale = startScale + (1 - startScale) * p;
		const desiredX = fromX.value + (toX.value - fromX.value) * p;
		const desiredY = fromY.value + (toY.value - fromY.value) * p;
		return {
			left: desiredX - (slotW.value * (1 - scale)) / 2,
			top: desiredY - (slotH.value * (1 - scale)) / 2,
			width: slotW.value,
			height: slotH.value,
			transform: [{ scale }],
		};
	});

	const markWidth = headerTarget?.width || scaleSize(HEADER_LOGOTYP_WIDTH);
	const markHeight = headerTarget?.height || scaleSize(HEADER_LOGO_HEIGHT);

	return (
		<View collapsable={false} style={styles.root} pointerEvents="auto">
			<Animated.View style={[styles.bg, bgStyle]} pointerEvents="none" />
			{phase !== 'flying' && flyXml ? (
				<View style={styles.hiddenParse} pointerEvents="none">
					<SvgXml xml={flyXml} width={introBox.width} height={introBox.height} />
				</View>
			) : null}
			{phase !== 'flying' && !html && flyXml ? (
				<View style={styles.centerLogo} pointerEvents="none">
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
					androidLayerType="none"
					setSupportMultipleWindows={false}
					javaScriptEnabled={false}
					domStorageEnabled={false}
				/>
			) : null}
			{phase === 'flying' ? (
				<Animated.View
					pointerEvents="none"
					collapsable={false}
					needsOffscreenAlphaCompositing={true}
					style={[styles.flyLogo, flyStyle]}
				>
					<IntroLogotypMark width={markWidth} height={markHeight} />
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
		borderRadius: 0.1,
		zIndex: 2,
	},
	hiddenParse: {
		position: 'absolute',
		opacity: 0,
		left: 0,
		top: 0,
	},
	centerLogo: {
		...StyleSheet.absoluteFillObject,
		alignItems: 'center',
		justifyContent: 'center',
	},
});

export default AppIntro;
