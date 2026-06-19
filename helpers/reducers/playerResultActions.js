export const SYNC_FROM_SERVER = 'SYNC_FROM_SERVER';
export const UPDATE_STATS = 'UPDATE_STATS';
export const UPDATE_SINGLE_DART = 'UPDATE_SINGLE_DART';
export const APPEND_DART_LABEL = 'APPEND_DART_LABEL';
export const RESET_VISIT_DART_LABELS = 'RESET_VISIT_DART_LABELS';
export const COMPLETE_CURRENT_VISIT = 'COMPLETE_CURRENT_VISIT';
export const REOPEN_LAST_VISIT = 'REOPEN_LAST_VISIT';
export const UNDO_SINGLE_DART = 'UNDO_SINGLE_DART';
export const LEG_WIN = 'LEG_WIN';
export const LEG_LOSE = 'LEG_LOSE';
export const UNDO = 'UNDO';

export const syncFromServer = ({
  score,
  legsWon,
  matchAverage,
  currentLegAverage,
  currentLegScores,
  dartsThrown,
  totalPointsEarned,
  totalDartsThrown,
  legByLegScores,
  legsAverages,
  dartsPerLeg,
}) => ({
  type: SYNC_FROM_SERVER,
  score,
  legsWon,
  matchAverage,
  currentLegAverage,
  currentLegScores,
  dartsThrown,
  totalPointsEarned,
  totalDartsThrown,
  legByLegScores,
  legsAverages,
  dartsPerLeg,
});

export const updateStats = (points) => ({
  type: UPDATE_STATS,
  points: points
});

export const updateSingleDart = (points, label = null) => ({
  type: UPDATE_SINGLE_DART,
  points,
  label,
});

export const appendDartLabel = (label) => ({
  type: APPEND_DART_LABEL,
  label,
});

export const resetVisitDartLabels = () => ({
  type: RESET_VISIT_DART_LABELS,
});

export const completeCurrentVisit = () => ({
  type: COMPLETE_CURRENT_VISIT,
});

export const reopenLastVisit = () => ({
  type: REOPEN_LAST_VISIT,
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
  legByLegScores: [],
  currentVisitDartLabels: [],
  lastVisitDartLabels: [],
};