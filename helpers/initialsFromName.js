/**
 * Inicjały z imienia i nazwiska — ten sam pomysł co Player::initials() na webie.
 */
export function initialsFromName(name) {
	const trimmed = String(name || '').trim();
	if (!trimmed) return '?';
	const parts = trimmed.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
	}
	return trimmed.slice(0, 2).toUpperCase();
}
