import { APPEND_DART_LABEL, COMPLETE_CURRENT_VISIT, LEG_LOSE, LEG_WIN, POP_DART_LABEL, REOPEN_LAST_VISIT, RESET_VISIT_DART_LABELS, SYNC_FROM_SERVER, UNDO, UNDO_COMMITTED_VISIT_DART, UNDO_LAST_VISIT, UNDO_SINGLE_DART, UPDATE_SINGLE_DART, UPDATE_STATS } from "./playerResultActions";

export const playerResultReducer = (state, action) => {
  switch (action.type) {
    case SYNC_FROM_SERVER: {
      const legClosed = action.legsWon > state.legsWon;
      const legsAverages =
        action.legsAverages != null
          ? action.legsAverages
          : legClosed && state.currentLegAverage
            ? [...state.legsAverages, state.currentLegAverage]
            : state.legsAverages;
      const dartsPerLeg =
        action.dartsPerLeg != null
          ? action.dartsPerLeg
          : legClosed && state.dartsThrown
            ? [...state.dartsPerLeg, state.dartsThrown]
            : state.dartsPerLeg;

      return {
        ...state,
        score: action.score,
        legsWon: action.legsWon,
        matchAverage:
          action.matchAverage != null ? action.matchAverage : state.matchAverage,
        currentLegAverage:
          action.currentLegAverage != null
            ? action.currentLegAverage
            : legClosed
              ? 0
              : state.currentLegAverage,
        currentLegScores: legClosed
          ? (action.currentLegScores ?? [])
          : (action.currentLegScores ?? state.currentLegScores),
        dartsThrown: legClosed
          ? (action.dartsThrown ?? 0)
          : (action.dartsThrown ?? state.dartsThrown),
        totalPointsEarned:
          action.totalPointsEarned != null
            ? action.totalPointsEarned
            : state.totalPointsEarned,
        totalDartsThrown:
          action.totalDartsThrown != null
            ? action.totalDartsThrown
            : state.totalDartsThrown,
        legByLegScores: action.legByLegScores ?? state.legByLegScores,
        legsAverages,
        dartsPerLeg,
        currentVisitDartLabels: legClosed ? [] : (state.currentVisitDartLabels ?? []),
      };
    }
    case RESET_VISIT_DART_LABELS: {
      return {
        ...state,
        currentVisitDartLabels: [],
      };
    }
    case APPEND_DART_LABEL: {
      return {
        ...state,
        currentVisitDartLabels: [
          ...(state.currentVisitDartLabels ?? []),
          action.label,
        ],
      };
    }
    case POP_DART_LABEL: {
      const labels = [...(state.currentVisitDartLabels ?? [])];
      if (labels.length === 0) {
        return state;
      }
      labels.pop();
      return {
        ...state,
        currentVisitDartLabels: labels,
      };
    }
    case COMPLETE_CURRENT_VISIT: {
      const labels = state.currentVisitDartLabels ?? [];
      return {
        ...state,
        lastVisitDartLabels: labels.length > 0 ? [...labels] : state.lastVisitDartLabels,
        currentVisitDartLabels: [],
      };
    }
    case REOPEN_LAST_VISIT: {
      const labels = state.lastVisitDartLabels ?? [];
      if (labels.length === 0) {
        return state;
      }
      return {
        ...state,
        currentVisitDartLabels: [...labels],
        lastVisitDartLabels: [],
      };
    }
    case UPDATE_SINGLE_DART: {
      const points = action.points;
      const score = state.score - points;
      const totalDartsThrown = state.totalDartsThrown + 1;
      const totalPointsEarned = state.totalPointsEarned + points;
      const matchAverage = totalDartsThrown > 0 ? ((totalPointsEarned / totalDartsThrown) * 3).toFixed(2) : 0;
      const dartsThrown = state.dartsThrown + 1;
      const currentLegScores = [...state.currentLegScores, points];
      const currentLegAverage = dartsThrown > 0 ? (((501 - score) / dartsThrown) * 3).toFixed(2) : 0;
      const nextLabels = action.label
        ? [...(state.currentVisitDartLabels ?? []), action.label]
        : (state.currentVisitDartLabels ?? []);
      return {
        ...state,
        score,
        totalDartsThrown,
        totalPointsEarned,
        matchAverage,
        dartsThrown,
        currentLegScores,
        currentLegAverage,
        currentVisitDartLabels: nextLabels,
      };
    }
    case UNDO_SINGLE_DART: {
      const scores = [...state.currentLegScores];
      if (scores.length === 0) return state;
      const lastScore = scores.pop();
      const score = state.score + lastScore;
      const totalPointsEarned = state.totalPointsEarned - lastScore;
      const dartsThrown = state.dartsThrown - 1;
      const totalDartsThrown = state.totalDartsThrown - 1;
      const matchAverage = totalDartsThrown > 0 ? (totalPointsEarned / totalDartsThrown * 3).toFixed(2) : 0;
      const currentLegAverage = dartsThrown > 0 ? ((501 - score) / dartsThrown * 3).toFixed(2) : 0;
      const visitLabels = [...(state.currentVisitDartLabels ?? [])];
      visitLabels.pop();
      return {
        ...state,
        score,
        totalPointsEarned,
        totalDartsThrown,
        matchAverage,
        dartsThrown,
        currentLegScores: scores,
        currentLegAverage,
        currentVisitDartLabels: visitLabels,
      };
    }
    case UPDATE_STATS: {
      const score = state.score - action.points;
      const totalDartsThrown = state.totalDartsThrown + 3;
      const totalPointsEarned = state.totalPointsEarned + action.points;
      const matchAverage = ((totalPointsEarned/totalDartsThrown) * 3).toFixed(2);

      const dartsThrown = state.dartsThrown + 3;
      const currentLegScores = [...state.currentLegScores, action.points];
      const currentLegAverage = (((501 - score)/dartsThrown) * 3).toFixed(2);

      return {
        ...state,
        score,
        totalDartsThrown,
        totalPointsEarned,
        matchAverage,
        dartsThrown,
        currentLegScores,
        currentLegAverage
      };
    };
    case LEG_WIN: {

      const totalDartsThrown = state.totalDartsThrown + action.throws;
      const totalPointsEarned = state.totalPointsEarned + state.score;
      const matchAverage = ((totalPointsEarned/totalDartsThrown) * 3).toFixed(2);

      const dartsThrown = state.dartsThrown + action.throws;
      const currentLegScores = [...state.currentLegScores, state.score];
      const currentLegAverage = ((501/dartsThrown)*3).toFixed(2);

      return {
        score: 501,
        legsWon: state.legsWon + 1,
        totalDartsThrown,
        totalPointsEarned,
        matchAverage,
        dartsThrown: 0,
        currentLegScores: [],
        currentLegAverage: 0,
        dartsPerLeg: [...state.dartsPerLeg, dartsThrown],
        legsAverages: [...state.legsAverages, currentLegAverage],
        legByLegScores: [...state.legByLegScores,currentLegScores],
        currentVisitDartLabels: [],
        lastVisitDartLabels: state.currentVisitDartLabels?.length
          ? [...state.currentVisitDartLabels]
          : state.lastVisitDartLabels,
      };
    };
    case LEG_LOSE: {
      const currentLegScores = state.currentLegScores;
      const currentLegAverage = state.currentLegAverage;

      return {
        ...state,
        score: 501,
        dartsThrown: 0,
        currentLegScores: [],
        currentLegAverage: 0,
        legsAverages: [...state.legsAverages, currentLegAverage],
        legByLegScores: [...state.legByLegScores, currentLegScores],
        currentVisitDartLabels: [],
      };
    };
    case UNDO_COMMITTED_VISIT_DART: {
      const points = action.points;
      const scores = [...state.currentLegScores];
      if (scores.length > 0) {
        const lastVisitTotal = scores[scores.length - 1];
        const newTotal = lastVisitTotal - points;
        if (newTotal > 0) {
          scores[scores.length - 1] = newTotal;
        } else {
          scores.pop();
        }
      }
      const score = state.score + points;
      const dartsThrown = Math.max(0, state.dartsThrown - 1);
      const totalDartsThrown = Math.max(0, state.totalDartsThrown - 1);
      const totalPointsEarned = state.totalPointsEarned - points;
      const matchAverage = totalDartsThrown > 0
        ? ((totalPointsEarned / totalDartsThrown) * 3).toFixed(2)
        : 0;
      const currentLegAverage = dartsThrown > 0
        ? (((501 - score) / dartsThrown) * 3).toFixed(2)
        : 0;
      return {
        ...state,
        score,
        totalPointsEarned,
        totalDartsThrown,
        matchAverage,
        dartsThrown,
        currentLegScores: scores,
        currentLegAverage,
      };
    }
    case UNDO:
    case UNDO_LAST_VISIT: {
      const scores = [...state.currentLegScores];
      const lastScore =
        action.type === UNDO_LAST_VISIT
          ? action.visitScore
          : scores.pop();
      if (action.type === UNDO && lastScore == null) {
        return state;
      }
      if (action.type === UNDO_LAST_VISIT && scores.length > 0) {
        scores.pop();
      }
      const score = state.score + lastScore;
      const totalPointsEarned = state.totalPointsEarned - lastScore;
      const dartsThrown = Math.max(0, state.dartsThrown - 3);
      const totalDartsThrown = Math.max(0, state.totalDartsThrown - 3);
      const matchAverage = totalDartsThrown > 0
        ? ((totalPointsEarned / totalDartsThrown) * 3).toFixed(2)
        : 0;
      const currentLegAverage = dartsThrown > 0
        ? (((501 - score) / dartsThrown) * 3).toFixed(2)
        : 0;

      return {
        ...state,
        score,
        totalPointsEarned,
        totalDartsThrown,
        matchAverage,
        dartsThrown,
        currentLegScores: scores,
        currentLegAverage,
      };
    }
    default:
      return state;
  }
}