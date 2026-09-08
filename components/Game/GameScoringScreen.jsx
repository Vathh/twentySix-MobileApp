import React, { useMemo } from 'react';
import useAuth from '../../hooks/useAuth';
import { resolveGameContext } from '../../helpers/gameScoring';
import { normalizeMatchFormat } from '../../helpers/matchFormat/matchFormat';
import { isCricketGameType } from '../../helpers/cricket';
import { isBob27GameType } from '../../helpers/bob27';
import { isAtcGameType } from '../../helpers/atc';
import { isCatch40GameType } from '../../helpers/catch40';
import { isCricket56GameType } from '../../helpers/cricket56';
import CricketGameScoringScreen from './CricketGameScoringScreen';
import Bob27GameScoringScreen from './Bob27GameScoringScreen';
import AtcGameScoringScreen from './AtcGameScoringScreen';
import Catch40GameScoringScreen from './Catch40GameScoringScreen';
import Cricket56GameScoringScreen from './Cricket56GameScoringScreen';
import X01GameScoringScreen from './X01GameScoringScreen';

/**
 * Router trybu gry. Silnik X01: X01GameScoringScreen.jsx.
 */
function GameScoringScreenRouter({ route, navigation }) {
	const { auth } = useAuth();
	const gameCtx = useMemo(
		() => resolveGameContext(route.params, auth),
		[route.params, auth],
	);
	const format = normalizeMatchFormat(gameCtx.matchFormat);
	if (isCricketGameType(format.gameType)) {
		return <CricketGameScoringScreen route={route} navigation={navigation} />;
	}
	if (isBob27GameType(format.gameType)) {
		return <Bob27GameScoringScreen route={route} navigation={navigation} />;
	}
	if (isAtcGameType(format.gameType)) {
		return <AtcGameScoringScreen route={route} navigation={navigation} />;
	}
	if (isCatch40GameType(format.gameType)) {
		return <Catch40GameScoringScreen route={route} navigation={navigation} />;
	}
	if (isCricket56GameType(format.gameType)) {
		return <Cricket56GameScoringScreen route={route} navigation={navigation} />;
	}
	return <X01GameScoringScreen route={route} navigation={navigation} />;
}

export default GameScoringScreenRouter;
