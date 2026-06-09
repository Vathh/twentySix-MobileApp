/**
 * Mapuje graczy turniejowych ({ id, name }) na format wymagany przez scoring API.
 */
export function normalizeTournamentPlayers(player1, player2) {
	const mapOne = (p) => {
		if (!p) return null;
		const id = p.id != null ? Number(p.id) : null;
		return {
			id,
			name: p.name ?? 'Gracz',
			playerId: p.playerId != null ? Number(p.playerId) : id,
		};
	};
	return [mapOne(player1), mapOne(player2)].filter(Boolean);
}
