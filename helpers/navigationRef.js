import { createRef } from 'react';

/** @type {import('react').RefObject<import('@react-navigation/native').NavigationContainerRef>} */
export const navigationRef = createRef();

export function navigate(name, params) {
	if (navigationRef.current?.isReady()) {
		navigationRef.current.navigate(name, params);
	}
}
