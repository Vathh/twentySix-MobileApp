import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import TrainingGuideAccordion from './TrainingGuideAccordion';

/**
 * Modal z pełnym opisem ćwiczenia / wyzwania (treść z biblioteki).
 */
export default function TrainingHelpModal({
	visible,
	title = 'Pomoc',
	sections = [],
	fallbackText = null,
	onClose,
}) {
	const hasSections = Array.isArray(sections) && sections.length > 0;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			presentationStyle="overFullScreen"
			statusBarTranslucent
			onRequestClose={onClose}
		>
			<View style={styles.backdrop}>
				<View style={styles.sheet}>
					<Text style={styles.title}>{title}</Text>
					<ScrollView
						style={styles.scroll}
						contentContainerStyle={styles.scrollContent}
						keyboardShouldPersistTaps="handled"
					>
						{hasSections ? (
							<TrainingGuideAccordion sections={sections} />
						) : (
							<Text style={styles.fallback}>
								{fallbackText || 'Brak opisu dla tej treści.'}
							</Text>
						)}
					</ScrollView>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Zamknij pomoc"
						onPress={onClose}
						style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
					>
						<Text style={styles.closeText}>Zamknij</Text>
					</Pressable>
				</View>
			</View>
		</Modal>
	);
}

export function helpSectionsFromGuide(guide, noun = 'ćwiczenia') {
	if (!guide) {
		return [];
	}
	return [
		{ key: 'goal', title: `Cel ${noun}`, body: guide.goal },
		{ key: 'how', title: 'Jak wykonywać ćwiczenia?', lines: guide.how },
		{ key: 'scoring', title: 'Zasady punktacji', lines: guide.scoring },
		{ key: 'limit', title: 'Czas / liczba lotek', body: guide.limit },
	];
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.55)',
		justifyContent: 'center',
		paddingHorizontal: 20,
		paddingVertical: 40,
	},
	sheet: {
		maxHeight: '85%',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bg,
		overflow: 'hidden',
	},
	title: {
		paddingHorizontal: 18,
		paddingTop: 18,
		paddingBottom: 8,
		color: colors.text,
		fontSize: 18,
		fontWeight: '800',
	},
	scroll: {
		flexGrow: 0,
	},
	scrollContent: {
		paddingHorizontal: 18,
		paddingBottom: 8,
	},
	fallback: {
		marginTop: 8,
		color: colors.textSecondary,
		fontSize: 15,
		lineHeight: 22,
	},
	close: {
		margin: 16,
		minHeight: 46,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.accent,
	},
	closePressed: {
		opacity: 0.9,
	},
	closeText: {
		color: colors.onAccent,
		fontSize: 15,
		fontWeight: '700',
	},
});
