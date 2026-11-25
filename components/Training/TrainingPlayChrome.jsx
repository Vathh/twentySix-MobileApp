import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import TrainingAbortSheet from './TrainingAbortSheet';

/**
 * Wspólny shell play: scalony header (tytuł + opcjonalny timer), body, abort sheet.
 * Wyjście z ćwiczenia — przez menu ⋯ (bez X w chrome).
 */
export default function TrainingPlayChrome({
	title,
	subtitle,
	hideHeader = false,
	timer = null,
	children,
	contentStyle,
	abortVisible = false,
	abortText,
	onAbortCancel,
	onAbortConfirm,
	abortConfirmLabel,
}) {
	const showHeader = !hideHeader && (title || timer);

	return (
		<View style={styles.screen}>
			{showHeader ? (
				<View
					style={styles.header}
					accessibilityRole="header"
					accessibilityLabel={
						title
							? (subtitle ? `${title}, ${subtitle}` : title)
							: undefined
					}
				>
					<View style={styles.headerCopy}>
						{title ? (
							<Text style={styles.title} numberOfLines={2}>{title}</Text>
						) : null}
						{subtitle ? (
							<Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
						) : null}
					</View>
					{timer ? <View style={styles.timerSlot}>{timer}</View> : null}
				</View>
			) : null}
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={[styles.content, contentStyle]}
				keyboardShouldPersistTaps="handled"
			>
				{children}
			</ScrollView>
			<TrainingAbortSheet
				visible={abortVisible}
				text={abortText}
				confirmLabel={abortConfirmLabel}
				onCancel={onAbortCancel}
				onConfirm={onAbortConfirm}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: colors.bg,
		overflow: 'hidden',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingHorizontal: 20,
		paddingTop: 10,
		paddingBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		backgroundColor: colors.bgDeep,
	},
	headerCopy: {
		flex: 1,
		minWidth: 0,
	},
	title: {
		color: colors.text,
		fontSize: 17,
		lineHeight: 22,
		fontWeight: '800',
		letterSpacing: -0.2,
	},
	subtitle: {
		marginTop: 2,
		color: colors.textSecondary,
		fontSize: 13,
		lineHeight: 16,
		fontWeight: '600',
	},
	timerSlot: {
		flexShrink: 0,
	},
	scroll: {
		flex: 1,
	},
	content: {
		flexGrow: 1,
		justifyContent: 'center',
		paddingHorizontal: 24,
		paddingVertical: 24,
		width: '100%',
		maxWidth: 480,
		alignSelf: 'center',
	},
});
