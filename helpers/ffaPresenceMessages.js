/**
 * Komunikaty banera obecności FFA (tylko przeciwnicy, nie ja).
 *
 * @param {Array<{ playerId: number, name: string, status: string }>|null|undefined} presence
 * @param {number|null|undefined} myPlayerId
 * @returns {string[]}
 */
export function buildFfaPresenceBannerMessages(presence, myPlayerId) {
	if (!Array.isArray(presence) || presence.length === 0) {
		return [];
	}

	const messages = [];
	for (const row of presence) {
		if (myPlayerId != null && row.playerId === myPlayerId) {
			continue;
		}
		const name = row.name || 'Gracz';
		if (row.status === 'left') {
			messages.push(`${name} opuścił mecz`);
		} else if (row.status === 'disconnected') {
			messages.push(`${name} utracił połączenie`);
		}
	}

	return messages;
}
