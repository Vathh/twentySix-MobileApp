export const SYNC_FROM_SERVER = 'SYNC_FROM_SERVER';
export const UPDATE_STATS = 'UPDATE_STATS';
export const UPDATE_SINGLE_DART = 'UPDATE_SINGLE_DART';
export const APPEND_DART_LABEL = 'APPEND_DART_LABEL';
export const POP_DART_LABEL = 'POP_DART_LABEL';
export const RESET_VISIT_DART_LABELS = 'RESET_VISIT_DART_LABELS';
export const COMPLETE_CURRENT_VISIT = 'COMPLETE_CURRENT_VISIT';
export const REOPEN_LAST_VISIT = 'REOPEN_LAST_VISIT';
export const UNDO_SINGLE_DART = 'UNDO_SINGLE_DART';
export const UNDO_COMMITTED_VISIT_DART = 'UNDO_COMMITTED_VISIT_DART';
export const LEG_WIN = 'LEG_WIN';
export const LEG_LOSE = 'LEG_LOSE';
export const RESET_LEGS_IN_SET = 'RESET_LEGS_IN_SET';
export const UNDO = 'UNDO';
export const UNDO_LAST_VISIT = 'UNDO_LAST_VISIT';

export const syncFromServer = ({
  score,
  legsWon,
  legsWonInSet,
  setsWon,
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
  legsWonInSet,
  setsWon,
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

export const popDartLabel = () => ({
  type: POP_DART_LABEL,
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

export const undoCommittedVisitDart = (points) => ({
  type: UNDO_COMMITTED_VISIT_DART,
  points,
});

export const legWin = (throws, matchFormat = null) => ({
  type: LEG_WIN,
  throws,
  matchFormat,
});

export const legLose = () => ({
  type: LEG_LOSE
});

export const resetLegsInSet = () => ({
  type: RESET_LEGS_IN_SET,
});

export const undo = () => ({
  type: UNDO
});

export const undoLastVisit = (visitScore) => ({
  type: UNDO_LAST_VISIT,
  visitScore,
});

export function createInitialPlayerResultState(startingScore = 501) {
  return {
    startingScore,
    score: startingScore,
    legsWon: 0,
    legsWonInSet: 0,
    setsWon: 0,
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
}

/** @deprecated prefer createInitialPlayerResultState */
export const initialPlayerResultState = createInitialPlayerResultState();