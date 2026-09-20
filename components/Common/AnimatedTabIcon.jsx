import React, { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { scaleSize } from '../../theme/uiScale';
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from 'react-native-reanimated';

const POP_EASING = Easing.bezier(0.22, 1, 0.36, 1);

/** Krótki pop skali przy aktywacji ikony na dolnym pasku. */
const AnimatedTabIcon = ({ name, color, size, focused }) => {
	const scale = useSharedValue(1);

	useEffect(() => {
		if (focused) {
			scale.value = withSequence(
				withTiming(1.14, { duration: 140, easing: POP_EASING }),
				withTiming(1, { duration: 160, easing: POP_EASING }),
			);
		} else {
			scale.value = withTiming(1, { duration: 120, easing: POP_EASING });
		}
	}, [focused, scale]);

	const style = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	return (
		<Animated.View style={style}>
			<Ionicons name={name} size={scaleSize(size)} color={color} />
		</Animated.View>
	);
};

export default AnimatedTabIcon;
