import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

/**
 * Customowy select (nie systemowy Picker) — trigger + modal z listą.
 *
 * @param {{ value: string, label: string, description?: string }}[] options
 */
export default function SelectMenu({
	label,
	value,
	options = [],
	onChange,
	disabled = false,
}) {
	const [open, setOpen] = useState(false);
	const selected = options.find((o) => o.value === value) ?? options[0];

	const close = () => setOpen(false);

	return (
		<View style={styles.wrap}>
			{label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
			<Pressable
				style={[
					styles.trigger,
					open && styles.triggerOpen,
					disabled && styles.triggerDisabled,
				]}
				onPress={() => {
					if (!disabled) setOpen(true);
				}}
				disabled={disabled}
			>
				<Text style={styles.triggerValue} numberOfLines={1}>
					{selected?.label ?? '—'}
				</Text>
				<Ionicons
					name={open ? 'chevron-up' : 'chevron-down'}
					size={scaleSize(20)}
					color={disabled ? colors.textDisabled : colors.accent}
				/>
			</Pressable>

			<Modal
				visible={open}
				transparent
				animationType="fade"
				onRequestClose={close}
			>
				<View style={styles.overlay}>
					<Pressable style={StyleSheet.absoluteFill} onPress={close} />
					<View style={styles.sheet}>
						{label ? <Text style={styles.sheetTitle}>{label}</Text> : null}
						{options.map((opt) => {
							const active = opt.value === selected?.value;
							return (
								<Pressable
									key={String(opt.value)}
									style={[styles.option, active && styles.optionActive]}
									onPress={() => {
										onChange?.(opt.value);
										close();
									}}
								>
									<View style={styles.optionText}>
										<Text
											style={[
												styles.optionLabel,
												active && styles.optionLabelActive,
											]}
										>
											{opt.label}
										</Text>
										{opt.description ? (
											<Text style={styles.optionDesc}>{opt.description}</Text>
										) : null}
									</View>
									{active ? (
										<Ionicons name="checkmark" size={scaleSize(22)} color={colors.accent} />
									) : null}
								</Pressable>
							);
						})}
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		marginBottom: 12,
	},
	fieldLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: colors.text,
		marginBottom: 8,
		textAlign: 'center',
	},
	trigger: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderRadius: 10,
		borderWidth: 1.5,
		borderColor: colors.accentBorder,
		backgroundColor: colors.bgElevated,
		gap: 12,
	},
	triggerOpen: {
		borderColor: colors.accent,
		backgroundColor: colors.accentMuted,
	},
	triggerDisabled: {
		opacity: 0.45,
	},
	triggerValue: {
		flex: 1,
		fontSize: 17,
		fontWeight: '700',
		color: colors.accent,
	},
	overlay: {
		flex: 1,
		backgroundColor: colors.overlay,
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	sheet: {
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.accentBorder,
		backgroundColor: colors.bgElevated,
		paddingVertical: 8,
		overflow: 'hidden',
	},
	sheetTitle: {
		fontSize: 13,
		fontWeight: '700',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
		color: colors.textMuted,
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 10,
	},
	option: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		gap: 12,
	},
	optionActive: {
		backgroundColor: colors.accentSoft,
	},
	optionText: {
		flex: 1,
	},
	optionLabel: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.text,
	},
	optionLabelActive: {
		color: colors.accent,
	},
	optionDesc: {
		fontSize: 13,
		color: colors.textMuted,
		marginTop: 2,
		lineHeight: 18,
	},
});
