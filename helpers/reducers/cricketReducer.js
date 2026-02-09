export const CRICKET_HIT = 'CRICKET_HIT';
export const CRICKET_MISS = 'CRICKET_MISS';
export const CRICKET_UNDO = 'CRICKET_UNDO';
export const CRICKET_LEG_WIN = 'CRICKET_LEG_WIN';
export const CRICKET_LEG_LOSE = 'CRICKET_LEG_LOSE';
export const CRICKET_LEG_RESET = 'CRICKET_LEG_RESET';

const SEGMENTS = [20, 19, 18, 17, 16, 15, 'bull'];

export const initialCricketState = () => ({
  hits: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, bull: 0 },
  points: 0,
  lastHit: null,
  legsWon: 0,
});

export const isSegmentClosed = (hits, seg) => (hits[seg] ?? 0) >= 3;

export const allClosed = (hits) =>
  SEGMENTS.every((s) => (hits[s] ?? 0) >= 3);

export const cricketReducer = (state, action) => {
  switch (action.type) {
    case CRICKET_HIT: {
      const { segment, multiplier, pointsToAdd = 0 } = action;
      const hits = { ...state.hits };
      const prev = hits[segment] ?? 0;
      hits[segment] = prev + multiplier;
      return {
        ...state,
        hits,
        points: state.points + pointsToAdd,
        lastHit: { segment, multiplier, pointsScored: pointsToAdd },
      };
    }
    case CRICKET_MISS: {
      return { ...state, lastHit: null };
    }
    case CRICKET_UNDO: {
      const last = state.lastHit;
      if (!last) return state;
      const { segment, multiplier, pointsScored = 0 } = last;
      const hits = { ...state.hits };
      const prev = hits[segment] ?? 0;
      hits[segment] = Math.max(0, prev - multiplier);
      return {
        ...state,
        hits,
        points: Math.max(0, state.points - pointsScored),
        lastHit: null,
      };
    }
    case CRICKET_LEG_WIN:
      return { ...state, legsWon: state.legsWon + 1 };
    case CRICKET_LEG_LOSE:
      return state;
    case CRICKET_LEG_RESET:
      return {
        hits: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, bull: 0 },
        points: 0,
        lastHit: null,
        legsWon: state.legsWon,
      };
    default:
      return state;
  }
};
