export const SYNC_FROM_SERVER = 'SYNC_FROM_SERVER';
export const UPDATE_STATS = 'UPDATE_STATS';
export const UPDATE_SINGLE_DART = 'UPDATE_SINGLE_DART';
export const UNDO_SINGLE_DART = 'UNDO_SINGLE_DART';
export const LEG_WIN = 'LEG_WIN';
export const LEG_LOSE = 'LEG_LOSE';
export const UNDO = 'UNDO';

export const syncFromServer = ({ score, legsWon }) => ({
  type: SYNC_FROM_SERVER,
  score,
  legsWon,
});

export const updateStats = (points) => ({
  type: UPDATE_STATS,
  points: points
});

export const updateSingleDart = (points) => ({
  type: UPDATE_SINGLE_DART,
  points
});

export const undoSingleDart = () => ({
  type: UNDO_SINGLE_DART
});

export const legWin = (throws) => ({
  type: LEG_WIN,
  throws: throws
});

export const legLose = () => ({
  type: LEG_LOSE
});

export const undo = () => ({
  type: UNDO
});

export const initialPlayerResultState = {
  score: 501,
  legsWon: 0,
  totalPointsEarned: 0,
  totalDartsThrown: 0,
  matchAverage: 0,
  dartsThrown: 0,
  currentLegScores: [],
  currentLegAverage: 0,
  dartsPerLeg: [],
  legsAverages: [],
  legByLegScores: []
};