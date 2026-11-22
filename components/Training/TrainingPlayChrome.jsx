import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';
import TrainingAbortSheet from './TrainingAbortSheet';

/**
 * Wspólny shell play: context header, timer, body, abort sheet.
 */
export default function TrainingPlayChrome({
	title,
	subtitle,
	hideHeader = false,
	onAbort,
	abortDisabled = false,
	timer = null,
	children,
	contentStyle,
	abortVisible = false,
	abortText,
	onAbortCancel,
	onAbortConfirm,
	abortConfirmLabel,
}) {
	return (
		<View style={styles.screen}>
			{!hideHeader && title ? (
				<View
					style={styles.header}
					accessibilityRole="header"
					accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
				>
					<View style={styles.headerCopy}>
						<Text style={styles.title} numberOfLines={2}>{title}</Text>
						{subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
					</View>
					{onAbort ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Przerwij"
							disabled={abortDisabled}
							onPress={onAbort}
							hitSlop={8}
							style={({ pressed }) => [
								styles.abort,
								pressed && !abortDisabled && styles.abortPressed,
								abortDisabled && styles.abortDisabled,
							]}
						>
							<Ionicons name="close" size={scaleSize(20)} color={colors.textMuted} />
						</Pressable>
					) : null}
				</View>
			) : null}
			{timer}
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
		paddingTop: 12,
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
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '800',
		letterSpacing: -0.2,
	},
	subtitle: {
		marginTop: 2,
		color: colors.textSecondary,
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '600',
	},
	abort: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
	},
	abortPressed: {
		backgroundColor: colors.bgElevatedHover,
	},
	abortDisabled: {
		opacity: 0.4,
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
