import React, {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from 'react';

const IntroOverlayContext = createContext({
	introActive: false,
	revealRest: false,
	headerTarget: null,
	coordinateHostRef: { current: null },
	reportHeaderLogoLayout: () => {},
	requestHeaderLogoMeasure: () => {},
	registerHeaderLogoMeasure: () => () => {},
	reportRevealComplete: () => {},
});

export function IntroOverlayProvider({
	children,
	introActive,
	revealRest,
	onRevealComplete,
}) {
	const [headerTarget, setHeaderTarget] = useState(null);
	const coordinateHostRef = useRef(null);
	const measureHeaderLogoRef = useRef(null);

	const reportHeaderLogoLayout = useCallback((rect) => {
		if (
			!rect ||
			typeof rect.x !== 'number' ||
			typeof rect.y !== 'number' ||
			!(rect.width > 0) ||
			!(rect.height > 0)
		) {
			return;
		}
		setHeaderTarget((prev) => {
			if (
				prev &&
				prev.x === rect.x &&
				prev.y === rect.y &&
				prev.width === rect.width &&
				prev.height === rect.height
			) {
				return prev;
			}
			return rect;
		});
	}, []);

	const registerHeaderLogoMeasure = useCallback((measureFn) => {
		measureHeaderLogoRef.current = typeof measureFn === 'function' ? measureFn : null;
		return () => {
			if (measureHeaderLogoRef.current === measureFn) {
				measureHeaderLogoRef.current = null;
			}
		};
	}, []);

	const requestHeaderLogoMeasure = useCallback(() => {
		measureHeaderLogoRef.current?.();
	}, []);

	const reportRevealComplete = useCallback(() => {
		onRevealComplete?.();
	}, [onRevealComplete]);

	const value = useMemo(
		() => ({
			introActive: !!introActive,
			revealRest: !!revealRest,
			headerTarget,
			coordinateHostRef,
			reportHeaderLogoLayout,
			requestHeaderLogoMeasure,
			registerHeaderLogoMeasure,
			reportRevealComplete,
		}),
		[
			introActive,
			revealRest,
			headerTarget,
			reportHeaderLogoLayout,
			requestHeaderLogoMeasure,
			registerHeaderLogoMeasure,
			reportRevealComplete,
		],
	);

	return (
		<IntroOverlayContext.Provider value={value}>
			{children}
		</IntroOverlayContext.Provider>
	);
}

export function useIntroOverlay() {
	return useContext(IntroOverlayContext);
}
