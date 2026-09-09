import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
	Easing,
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import IntroLogotypMark from './IntroLogotypMark';
import { getLogoXml } from '../../helpers/svgAssets';
import { useIntroOverlay } from '../../context/IntroOverlayContext';
import {
	HEADER_LOGO_HEIGHT,
	HEADER_LOGO_REST_WIDTH,
	HEADER_LOGO_WIDTH,
	HEADER_LOGOTYP_WIDTH,
	sanitizeSvgXml,
} from '../../helpers/headerLogo';
import { navigate, navigationRef } from '../../helpers/navigationRef';

const REVEAL_MS = 560;
const REVEAL_EASING = Easing.out(Easing.cubic);

function rootHasRoute(state, name) {
	if (!state?.routes) {
		return false;
	}
	return state.routes.some(
		(route) => route.name === name || rootHasRoute(route.state, name),
	);
}

function goToHome() {
	if (!navigationRef.current?.isReady()) {
		return;
	}
	const root = navigationRef.current.getRootState();
	if (rootHasRoute(root, 'MainTabs')) {
		navigate('MainTabs', { screen: 'Home' });
		return;
	}
	if (rootHasRoute(root, 'Home')) {
		navigate('Home');
		return;
	}
	if (rootHasRoute(root, 'GameList')) {
		navigate('GameList');
	}
}

/**
 * Logo w headerze: 26 zawsze z intro-logotyp (ten sam kadr co wlot),
 * kreska i napis z logo.svg. Overlay intro zdejmowany po kurtynie
 * nie podmienia już 26 na inną grafikę — bez skoku.
 */
const HeaderTitle = () => {
	const {
		introActive,
		revealRest,
		reportHeaderLogoLayout,
		reportRevealComplete,
	} = useIntroOverlay();
	const logotypRef = useRef(null);
	const reveal = useSharedValue(introActive ? 0 : 1);
	const finishedRef = useRef(false);
	const safeLogoXml = useMemo(() => sanitizeSvgXml(getLogoXml()), []);

	const measureLogotyp = useCallback(() => {
		logotypRef.current?.measureInWindow((x, y, width, height) => {
			reportHeaderLogoLayout({ x, y, width, height });
		});
	}, [reportHeaderLogoLayout]);

	useEffect(() => {
		if (!introActive) {
			return undefined;
		}
		const frame = requestAnimationFrame(measureLogotyp);
		const timer = setTimeout(measureLogotyp, 80);
		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(timer);
		};
	}, [introActive, measureLogotyp]);

	const completeReveal = useCallback(() => {
		if (finishedRef.current) {
			return;
		}
		finishedRef.current = true;
		reportRevealComplete();
	}, [reportRevealComplete]);

	useEffect(() => {
		if (!revealRest || finishedRef.current) {
			return undefined;
		}
		reveal.value = 0;
		reveal.value = withTiming(
			1,
			{ duration: REVEAL_MS, easing: REVEAL_EASING },
			(finished) => {
				if (finished) {
					runOnJS(completeReveal)();
				}
			},
		);
		const timer = setTimeout(completeReveal, REVEAL_MS + 200);
		return () => clearTimeout(timer);
	}, [completeReveal, reveal, revealRest]);

	useEffect(() => {
		if (!introActive) {
			reveal.value = 1;
		}
	}, [introActive, reveal]);

	const restClipStyle = useAnimatedStyle(() => ({
		width: HEADER_LOGO_REST_WIDTH * reveal.value,
	}));

	return (
		<Pressable
			onPress={goToHome}
			hitSlop={8}
			accessibilityRole="button"
			accessibilityLabel="twentysix — strona główna"
			style={styles.wrap}
		>
			<View style={styles.stage} collapsable={false}>
				<View
					ref={logotypRef}
					collapsable={false}
					onLayout={measureLogotyp}
					pointerEvents="none"
					style={[styles.logotypSlot, introActive ? styles.hidden : null]}
				>
					<IntroLogotypMark width={HEADER_LOGOTYP_WIDTH} height={HEADER_LOGO_HEIGHT} />
				</View>
				<Animated.View style={[styles.restClip, restClipStyle]}>
					<View style={styles.restInner}>
						{safeLogoXml ? (
							<SvgXml xml={safeLogoXml} width={HEADER_LOGO_WIDTH} height={HEADER_LOGO_HEIGHT} />
						) : null}
					</View>
				</Animated.View>
			</View>
		</Pressable>
	);
};

const styles = StyleSheet.create({
	wrap: {
		justifyContent: 'center',
		alignItems: 'flex-start',
		paddingVertical: 2,
		width: HEADER_LOGO_WIDTH,
	},
	stage: {
		width: HEADER_LOGO_WIDTH,
		height: HEADER_LOGO_HEIGHT,
		flexDirection: 'row',
		alignItems: 'center',
	},
	logotypSlot: {
		width: HEADER_LOGOTYP_WIDTH,
		height: HEADER_LOGO_HEIGHT,
		overflow: 'hidden',
	},
	hidden: {
		opacity: 0,
	},
	restClip: {
		height: HEADER_LOGO_HEIGHT,
		overflow: 'hidden',
	},
	restInner: {
		width: HEADER_LOGO_WIDTH,
		height: HEADER_LOGO_HEIGHT,
		marginLeft: -HEADER_LOGOTYP_WIDTH,
	},
});

export default HeaderTitle;
