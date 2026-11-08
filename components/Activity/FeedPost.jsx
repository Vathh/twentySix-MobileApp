import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useConfirm } from '../../context/ConfirmProvider';
import useAuth from '../../hooks/useAuth';
import { blockFeedUser, reportContent } from '../../helpers/feedApi';
import FeedEngagement from './FeedEngagement';
import ReportModal from './ReportModal';
import PlayerAvatar from '../Common/PlayerAvatar';
import { colors } from '../../theme/colors';

function feedAgo(iso) {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	const minutes = Math.round((Date.now() - date.getTime()) / 60000);
	if (minutes < 1) return 'przed chwilą';
	if (minutes < 60) return `${minutes} min temu`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours} godz. temu`;
	const days = Math.round(hours / 24);
	if (days === 1) return 'wczoraj';
	if (days < 30) return `${days} dni temu`;
	return date.toLocaleDateString('pl-PL');
}

function Sentence({ item, navigation }) {
	const parts = Array.isArray(item?.sentenceParts) && item.sentenceParts.length > 0
		? item.sentenceParts
		: [{ text: item?.sentence || '' }];

	return (
		<Text style={styles.body}>
			{parts.map((part, index) => (
				part?.playerId ? (
					<Text
						key={index}
						style={styles.mention}
						onPress={() => navigation.push('PlayerProfile', { playerId: part.playerId, name: part.text })}
					>
						{part.text}
					</Text>
				) : (
					<Text key={index}>{part?.text || ''}</Text>
				)
			))}
		</Text>
	);
}

const FeedPost = ({ item, accessToken, onAuthorBlocked }) => {
	const navigation = useNavigation();
	const confirm = useConfirm();
	const { auth } = useAuth();
	const header = item?.header ?? item?.actor ?? {};
	const kind = item?.kind?.label || 'Historia';
	const playerId = header.playerId;
	const organizationId = header.organizationId;
	const authorUserId = item?.actor?.userId ?? header.userId ?? null;
	const canModerate = Boolean(authorUserId && auth?.userId && authorUserId !== auth.userId);
	const [error, setError] = useState('');
	const [reportOpen, setReportOpen] = useState(false);

	const openHeader = () => {
		if (organizationId) {
			navigation.push('OrganizationDetail', { id: organizationId });
			return;
		}
		if (playerId) {
			navigation.push('PlayerProfile', { playerId, name: header.name });
		}
	};

	const blockAuthor = async () => {
		const ok = await confirm({
			title: 'Zablokować gracza?',
			message: 'Nie zobaczysz jego wpisów ani komentarzy. On nadal widzi Twoje.',
			confirmLabel: 'Zablokuj',
		});
		if (!ok) return;
		const result = await blockFeedUser(accessToken, authorUserId);
		if (!result.ok) {
			setError(result.data?.message || 'Nie udało się zablokować.');
			return;
		}
		onAuthorBlocked?.(authorUserId);
	};

	return (
		<View style={styles.card}>
			<View style={styles.head}>
				<Pressable onPress={openHeader} disabled={!playerId && !organizationId} accessibilityRole="button">
					<PlayerAvatar
						name={header.name}
						initials={header.initials}
						avatarUrl={header.avatarUrl}
						size={44}
						rounded={22}
					/>
				</Pressable>
				<View style={styles.identity}>
					<Pressable onPress={openHeader} disabled={!playerId && !organizationId}>
						<Text style={styles.name} numberOfLines={1}>
							{header.name}
						</Text>
					</Pressable>
					<Text style={styles.meta} numberOfLines={1}>
						{item?.occurredAt ? `${feedAgo(item.occurredAt)} · ${kind}` : kind}
					</Text>
				</View>
				{canModerate ? (
					<View style={styles.tools}>
						<Pressable onPress={blockAuthor} style={styles.toolButton}>
							<Ionicons name="ban-outline" size={14} color={colors.danger} />
							<Text style={styles.toolBlock}>Zablokuj</Text>
						</Pressable>
						<Pressable onPress={() => setReportOpen(true)} style={styles.toolButton}>
							<Ionicons name="flag-outline" size={14} color={colors.accent} />
							<Text style={styles.toolReport}>Zgłoś</Text>
						</Pressable>
					</View>
				) : null}
			</View>
			{error ? <Text style={styles.feedback}>{error}</Text> : null}
			<ReportModal
				visible={reportOpen}
				title="Zgłoś wpis"
				onClose={() => setReportOpen(false)}
				onSubmit={async ({ reason, details }) => {
					const result = await reportContent(accessToken, 'post', item.id, reason, details);
					return result.ok
						? { ok: true }
						: { ok: false, message: result.data?.message };
				}}
			/>
			<Sentence item={item} navigation={navigation} />
			<FeedEngagement item={item} accessToken={accessToken} onAuthorBlocked={onAuthorBlocked} />
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 14,
		backgroundColor: colors.bgElevated,
	},
	head: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	identity: {
		flex: 1,
		minWidth: 0,
	},
	name: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
	},
	meta: {
		marginTop: 2,
		color: colors.textMuted,
		fontSize: 12,
	},
	body: {
		marginTop: 12,
		color: colors.text,
		fontSize: 15,
		lineHeight: 22,
	},
	mention: {
		color: colors.accent,
		fontWeight: '700',
	},
	tools: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	toolButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	toolBlock: {
		color: colors.danger,
		fontSize: 12,
		fontWeight: '600',
	},
	toolReport: {
		color: colors.accent,
		fontSize: 12,
		fontWeight: '600',
	},
	feedback: {
		marginTop: 6,
		color: colors.textMuted,
		fontSize: 12,
	},
});

export default FeedPost;
