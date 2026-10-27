import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useConfirm } from '../../context/ConfirmProvider';
import {
	addActivityComment,
	deleteActivityComment,
	fetchActivityComments,
	setActivityReaction,
	setCommentReaction,
} from '../../helpers/feedApi';
import { colors } from '../../theme/colors';

function likesOf(reactions) {
	return Number(reactions?.counts?.like ?? 0);
}

const FeedEngagement = ({ item, accessToken }) => {
	const navigation = useNavigation();
	const confirm = useConfirm();
	const [commentCount, setCommentCount] = useState(item?.commentCount ?? 0);
	const [reactions, setReactions] = useState(item?.reactions ?? { counts: {}, mine: null });
	const [open, setOpen] = useState(false);
	const [comments, setComments] = useState([]);
	const [loaded, setLoaded] = useState(false);
	const [loading, setLoading] = useState(false);
	const [sending, setSending] = useState(false);
	const [body, setBody] = useState('');
	const [replyTo, setReplyTo] = useState(null);
	const [error, setError] = useState('');

	useEffect(() => {
		setCommentCount(item?.commentCount ?? 0);
		setReactions(item?.reactions ?? { counts: {}, mine: null });
		setOpen(false);
		setComments([]);
		setLoaded(false);
		setReplyTo(null);
		setBody('');
		setError('');
	}, [item?.id, item?.commentCount, item?.reactions]);

	const canEngage = Boolean(item?.canEngage && accessToken);
	const liked = reactions?.mine === 'like';

	const fail = (result) => {
		setError(result?.data?.message || result?.message || 'Nie udało się zapisać.');
	};

	const toggleLike = async () => {
		if (!canEngage || sending) return;
		setSending(true);
		setError('');
		const result = await setActivityReaction(accessToken, item.id, liked ? null : 'like');
		setSending(false);
		if (!result.ok) {
			fail(result);
			return;
		}
		setReactions(result.data.reactions);
	};

	const loadComments = async () => {
		setLoading(true);
		setError('');
		const result = await fetchActivityComments(accessToken, item.id);
		setLoading(false);
		if (!result.ok) {
			fail(result);
			setOpen(false);
			return;
		}
		setComments(Array.isArray(result.data?.comments) ? result.data.comments : []);
		setLoaded(true);
	};

	const toggleComments = async () => {
		if (!canEngage) return;
		const next = !open;
		setOpen(next);
		if (next && !loaded) await loadComments();
	};

	const send = async () => {
		const text = body.trim();
		if (!canEngage || sending || text === '') return;
		setSending(true);
		setError('');
		const result = await addActivityComment(accessToken, item.id, text, replyTo?.id ?? null);
		setSending(false);
		if (!result.ok) {
			fail(result);
			return;
		}
		const comment = result.data.comment;
		if (comment?.parentId) {
			setComments((current) =>
				current.map((row) =>
					row.id === comment.parentId
						? { ...row, replies: [...(row.replies ?? []), { ...comment, replies: [] }] }
						: row,
				),
			);
		} else {
			setComments((current) => [...current, { ...comment, replies: comment.replies ?? [] }]);
		}
		setCommentCount(result.data.commentCount ?? commentCount + 1);
		setBody('');
		setReplyTo(null);
		setOpen(true);
		setLoaded(true);
	};

	const remove = async (comment) => {
		const accepted = await confirm({
			title: 'Usunąć komentarz?',
			message: 'Ten komentarz zniknie z wpisu.',
			confirmLabel: 'Usuń',
		});
		if (!accepted) return;
		setSending(true);
		setError('');
		const result = await deleteActivityComment(accessToken, comment.id);
		setSending(false);
		if (!result.ok) {
			fail(result);
			return;
		}
		setComments((current) =>
			current
				.filter((row) => row.id !== comment.id)
				.map((row) => ({
					...row,
					replies: (row.replies ?? []).filter((reply) => reply.id !== comment.id),
				})),
		);
		setCommentCount(result.data.commentCount ?? 0);
	};

	const likeComment = async (comment) => {
		if (!canEngage || sending) return;
		setSending(true);
		setError('');
		const result = await setCommentReaction(
			accessToken,
			comment.id,
			comment.reactions?.mine === 'like' ? null : 'like',
		);
		setSending(false);
		if (!result.ok) {
			fail(result);
			return;
		}
		const next = result.data.reactions;
		const touch = (row) => (row.id === comment.id ? { ...row, reactions: next } : row);
		setComments((current) =>
			current.map((row) => ({
				...touch(row),
				replies: (row.replies ?? []).map(touch),
			})),
		);
	};

	const openAuthor = (author) => {
		if (!author?.playerId) return;
		navigation.push('PlayerProfile', { playerId: author.playerId, name: author.name });
	};

	return (
		<View>
			<View style={styles.bar}>
				<Pressable
					style={styles.action}
					onPress={toggleLike}
					disabled={!canEngage || sending}
					accessibilityRole="button"
					accessibilityLabel="Lubię to"
				>
					<Ionicons
						name={liked ? 'heart' : 'heart-outline'}
						size={16}
						color={liked ? colors.accent : colors.textMuted}
					/>
					<Text style={[styles.actionText, liked && styles.actionOn]}>{likesOf(reactions)}</Text>
				</Pressable>
				<Pressable
					style={styles.action}
					onPress={toggleComments}
					disabled={!canEngage}
					accessibilityRole="button"
				>
					<Text style={[styles.actionText, open && styles.actionOn]}>
						Komentarze {commentCount}
					</Text>
				</Pressable>
			</View>
			{error ? <Text style={styles.error}>{error}</Text> : null}
			{open ? (
				<View style={styles.thread}>
					{loading ? <ActivityIndicator color={colors.accent} /> : null}
					{comments.map((comment) => (
						<CommentRow
							key={String(comment.id)}
							comment={comment}
							onAuthor={openAuthor}
							onLike={likeComment}
							onReply={setReplyTo}
							onDelete={remove}
						/>
					))}
					{replyTo ? (
						<View style={styles.replying}>
							<Text style={styles.note}>Odpowiedź dla {replyTo.name}</Text>
							<Pressable onPress={() => setReplyTo(null)}>
								<Text style={styles.actionOn}>Anuluj</Text>
							</Pressable>
						</View>
					) : null}
					<TextInput
						style={styles.input}
						value={body}
						onChangeText={setBody}
						placeholder="Napisz komentarz…"
						placeholderTextColor={colors.textMuted}
						maxLength={500}
						multiline
					/>
					<Pressable
						style={[styles.send, (sending || body.trim() === '') && styles.disabled]}
						onPress={send}
						disabled={sending || body.trim() === ''}
					>
						<Text style={styles.sendText}>Wyślij</Text>
					</Pressable>
				</View>
			) : null}
		</View>
	);
};

function CommentRow({ comment, reply = false, onAuthor, onLike, onReply, onDelete }) {
	const liked = comment.reactions?.mine === 'like';
	return (
		<View style={[styles.comment, reply && styles.reply]}>
			<Pressable onPress={() => onAuthor(comment.author)}>
				<Text style={styles.author}>{comment.author?.name}</Text>
			</Pressable>
			<Text style={styles.commentBody}>{comment.body}</Text>
			<View style={styles.bar}>
				<Pressable style={styles.action} onPress={() => onLike(comment)}>
					<Ionicons
						name={liked ? 'heart' : 'heart-outline'}
						size={14}
						color={liked ? colors.accent : colors.textMuted}
					/>
					<Text style={[styles.actionText, liked && styles.actionOn]}>{likesOf(comment.reactions)}</Text>
				</Pressable>
				{reply ? null : (
					<Pressable onPress={() => onReply({ id: comment.id, name: comment.author?.name || 'Gracz' })}>
						<Text style={styles.actionText}>Odpowiedz</Text>
					</Pressable>
				)}
				{comment.canDelete ? (
					<Pressable onPress={() => onDelete(comment)}>
						<Text style={styles.actionText}>Usuń</Text>
					</Pressable>
				) : null}
			</View>
			{(comment.replies ?? []).map((replyRow) => (
				<CommentRow
					key={String(replyRow.id)}
					comment={replyRow}
					reply
					onAuthor={onAuthor}
					onLike={onLike}
					onReply={onReply}
					onDelete={onDelete}
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	bar: {
		marginTop: 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
	},
	action: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	actionText: {
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '600',
	},
	actionOn: {
		color: colors.accent,
	},
	error: {
		marginTop: 8,
		color: colors.dangerText,
		fontSize: 12,
	},
	thread: {
		marginTop: 12,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		paddingTop: 12,
		gap: 10,
	},
	comment: {
		gap: 4,
	},
	reply: {
		marginLeft: 16,
		marginTop: 8,
	},
	author: {
		color: colors.text,
		fontSize: 14,
		fontWeight: '700',
	},
	commentBody: {
		color: colors.text,
		fontSize: 14,
		lineHeight: 20,
	},
	replying: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	note: {
		color: colors.textMuted,
		fontSize: 12,
	},
	input: {
		minHeight: 44,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 8,
		color: colors.text,
		fontSize: 14,
		backgroundColor: colors.bg,
	},
	send: {
		alignSelf: 'flex-end',
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
	},
	sendText: {
		color: colors.text,
		fontWeight: '700',
	},
	disabled: {
		opacity: 0.5,
	},
});

export default FeedEngagement;
