import { useCallback, useRef } from 'react';

/** Stabilna tożsamość funkcji, zawsze woła najświeższą implementację. */
export function useLatestCallback(fn) {
	const ref = useRef(fn);
	ref.current = fn;
	return useCallback((...args) => ref.current(...args), []);
}
