import { isAtcGameType } from '../atc/atcRules.js';
import { isBob27GameType } from '../bob27/bob27Rules.js';
import { isCatch40GameType } from '../catch40/catch40Rules.js';
import { isCricketGameType } from '../cricket/cricketRules.js';
import { isCricket56GameType } from '../cricket56/cricket56Rules.js';

/**
 * Który wariant transportu FFA dla quick game online, albo null (trening / brak lobby).
 */
export function resolveFfaTransportKind({
	isQuick,
	lobbyId,
	resolvedGameType,
	quickGameType,
}) {
	if (!isQuick || !lobbyId) {
		return null;
	}
	if (isCricketGameType(resolvedGameType)) {
		return 'cricket';
	}
	if (isBob27GameType(resolvedGameType)) {
		return 'bob27';
	}
	if (isAtcGameType(resolvedGameType)) {
		return 'atc';
	}
	if (isCatch40GameType(resolvedGameType)) {
		return 'catch40';
	}
	if (isCricket56GameType(resolvedGameType)) {
		return 'cricket56';
	}
	if (
		quickGameType === '501'
		|| quickGameType === 'x01'
		|| quickGameType === undefined
		|| resolvedGameType === 'x01'
	) {
		return 'x01';
	}
	return null;
}
