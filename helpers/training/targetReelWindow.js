/**
 * Okno karuzeli celów (3 widoczne). Jak w zegarze: windowStart + activeOffset.
 *
 * dartIndexReelWindow — 1 lotka = 1 cel (zegar, doubles 54).
 * targetIndexReelWindow — wiele lotek na ten sam cel (Bob’s, Shanghai, 9/18 lotek);
 *   znacznik rusza tylko gdy zmienia się targetIndex / aktywny cel.
 */

export const REEL_WINDOW = 3;

/**
 * Jedna lotka = jeden cel (zegar, doubles 54).
 */
export function dartIndexReelWindow(index, targetCount) {
	if (!Number.isInteger(index) || index < 0 || targetCount <= 0) {
		return null;
	}
	if (index >= targetCount) {
		return null;
	}
	const windowStart = Math.floor(index / REEL_WINDOW) * REEL_WINDOW;
	return {
		windowStart,
		activeOffset: index - windowStart,
	};
}

/**
 * Lista unikalnych celów — ramka na aktualnym, sąsiedzi w oknie.
 * Używaj gdy kilka lotek idzie w ten sam cel (Bob’s, Shanghai, 9/18).
 */
export function targetIndexReelWindow(targetIndex, targetCount) {
	if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetCount <= 0) {
		return null;
	}
	if (targetIndex >= targetCount) {
		return null;
	}
	const maxStart = Math.max(0, targetCount - REEL_WINDOW);
	const windowStart = Math.min(Math.max(0, targetIndex - 1), maxStart);
	return {
		windowStart,
		activeOffset: targetIndex - windowStart,
	};
}
