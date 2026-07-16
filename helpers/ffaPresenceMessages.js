/**
 * Komunikaty banera obecności FFA (tylko przeciwnicy, nie ja).
 * W trybie „na 1 urządzeniu” nie pokazujemy nic — reszta telefonów nie jest używana.
 *
 * @param {Array<{ playerId: number, name: string, status: string }>|null|undefined} presence
 * @param {number|null|undefined} myPlayerId
 * @param {{ scoringMode?: string|null }} [options]
 * @returns {string[]}
 */
export function buildFfaPresenceBannerMessages(presence, myPlayerId, options = {}) {
	if (options.scoringMode === 'one_device') {
		return [];
	}

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
