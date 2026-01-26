import { ADD_ACHIEVEMENT } from "./achievementActions";

export const achievementsReducer = (state, action) => {
  switch (action.type) {
    case ADD_ACHIEVEMENT:
      return {
        ...state,
        achievements: [...state.achievements, action.payload]
      };
    default:
      return state;
  }
}