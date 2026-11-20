import React, { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';

const MIN_MS = 160;
const MAX_MS = 380;
const MS_PER_POINT = 2.2;

function durationForDelta(absDelta) {
	return Math.min(MAX_MS, Math.max(MIN_MS, absDelta * MS_PER_POINT));
}

function easeOutCubic(t) {
	return 1 - (1 - t) ** 3;
}

/**
 * Pozostały wynik x01: przy spadku odlicza w dół i hamuje na celu.
 * Wzrost (undo / nowy leg) — bez odliczania w górę, chyba że animateUp.
 */
export default function TickingScore({ value, style, animateUp = false, ...textProps }) {
	const target = Number.isFinite(Number(value)) ? Number(value) : 0;
	const [shown, setShown] = useState(target);
	const shownRef = useRef(target);
	const rafRef = useRef(null);

	useEffect(() => {
		const from = shownRef.current;
		const to = target;
		if (from === to) {
			return undefined;
		}

		if (rafRef.current != null) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		}

		if (to > from && !animateUp) {
			shownRef.current = to;
			setShown(to);
			return undefined;
		}

		const startedAt = performance.now();
		const duration = durationForDelta(Math.abs(from - to));

		const frame = (now) => {
			const t = Math.min(1, (now - startedAt) / duration);
			const next = Math.round(from + (to - from) * easeOutCubic(t));
			shownRef.current = next;
			setShown(next);
			if (t < 1) {
				rafRef.current = requestAnimationFrame(frame);
			} else {
				rafRef.current = null;
			}
		};

		rafRef.current = requestAnimationFrame(frame);
		return () => {
			if (rafRef.current != null) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
		};
	}, [target, animateUp]);

	return (
		<Text style={[{ fontVariant: ['tabular-nums'] }, style]} {...textProps}>
			{shown}
		</Text>
	);
}
