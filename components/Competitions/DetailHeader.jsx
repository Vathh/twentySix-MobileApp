import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import PlayerAvatar from '../Common/PlayerAvatar';

export const STATUS_STYLES = {
	planned: {
		bg: colors.warningMuted,
		text: colors.warning,
	},
	live: {
		bg: colors.successMuted,
		text: colors.successSoftText,
	},
	finished: {
		bg: colors.bgElevatedHover,
		text: colors.textMuted,
	},
};

/**
 * @param {{
 *   title: string,
 *   statusLabel?: string|null,
 *   statusVariant?: string|null,
 *   eyebrow?: string|null,
 *   breadcrumb?: Array<{ label: string, onPress?: () => void }>,
 *   meta?: Array<{ label: string, value: string }>,
 *   avatar?: { name?: string, initials?: string|null, logoUrl?: string|null }|null,
 * }} props
 */
const DetailHeader = ({
	title,
	statusLabel,
	statusVariant,
	eyebrow,
	breadcrumb = [],
	meta = [],
	avatar = null,
}) => {
	const statusStyle = statusVariant
		? STATUS_STYLES[statusVariant] ?? STATUS_STYLES.finished
		: null;

	return (
		<View style={styles.wrap}>
			{breadcrumb.length > 0 ? (
				<View style={styles.breadcrumb}>
					{breadcrumb.map((crumb, index) => (
						<View key={`${crumb.label}-${index}`} style={styles.breadcrumbItem}>
							{index > 0 ? <Text style={styles.sep}>/</Text> : null}
							{crumb.onPress ? (
								<Pressable onPress={crumb.onPress}>
									<Text style={styles.crumbLink}>{crumb.label}</Text>
								</Pressable>
							) : (
								<Text style={styles.crumbPlain}>{crumb.label}</Text>
							)}
						</View>
					))}
				</View>
			) : null}

			{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}

			<View style={styles.titleRow}>
				{avatar ? (
					<PlayerAvatar
						name={avatar.name || title}
						initials={avatar.initials}
						avatarUrl={avatar.logoUrl}
						size={44}
						rounded={10}
					/>
				) : null}
				<Text style={styles.title}>{title}</Text>
				{statusLabel && statusStyle ? (
					<View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
						<Text style={[styles.badgeText, { color: statusStyle.text }]}>{statusLabel}</Text>
					</View>
				) : null}
			</View>

			{meta.length > 0 ? (
				<View style={styles.meta}>
					{meta.map((item) => (
						<View key={item.label} style={styles.metaItem}>
							<Text style={styles.metaLabel}>{item.label}</Text>
							<Text style={styles.metaValue}>{item.value}</Text>
						</View>
					))}
				</View>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	wrap: {
		marginBottom: 20,
	},
	breadcrumb: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'center',
		marginBottom: 8,
	},
	breadcrumbItem: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	sep: {
		marginHorizontal: 6,
		color: colors.textDim,
		fontSize: 13,
	},
	crumbLink: {
		color: colors.accent,
		fontSize: 13,
		fontWeight: '600',
	},
	crumbPlain: {
		color: colors.textMuted,
		fontSize: 13,
	},
	eyebrow: {
		color: colors.textMuted,
		fontSize: 13,
		marginBottom: 6,
		textTransform: 'uppercase',
		letterSpacing: 0.4,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: 10,
	},
	title: {
		flex: 1,
		fontSize: 24,
		fontWeight: '700',
		color: colors.text,
	},
	badge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	badgeText: {
		fontSize: 11,
		fontWeight: '700',
	},
	meta: {
		marginTop: 14,
		gap: 10,
	},
	metaItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
	},
	metaLabel: {
		color: colors.textMuted,
		fontSize: 13,
	},
	metaValue: {
		color: colors.textSecondary,
		fontSize: 13,
		fontWeight: '600',
		flexShrink: 1,
		textAlign: 'right',
	},
});

export default DetailHeader;
