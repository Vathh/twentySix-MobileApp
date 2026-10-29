import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FeedEngagement from './FeedEngagement';
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

const FeedPost = ({ item, accessToken }) => {
	const navigation = useNavigation();
	const header = item?.header ?? item?.actor ?? {};
	const kind = item?.kind?.label || 'Historia';
	const playerId = header.playerId;
	const organizationId = header.organizationId;

	const openHeader = () => {
		if (organizationId) {
			navigation.push('OrganizationDetail', { id: organizationId });
			return;
		}
		if (playerId) {
			navigation.push('PlayerProfile', { playerId, name: header.name });
		}
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
			</View>
			<Sentence item={item} navigation={navigation} />
			<FeedEngagement item={item} accessToken={accessToken} />
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
});

export default FeedPost;
