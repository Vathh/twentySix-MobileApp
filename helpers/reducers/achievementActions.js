export const ADD_ACHIEVEMENT = 'ADD_ACHIEVEMENT';

export const addAchievement = (value) => ({
  type: ADD_ACHIEVEMENT,
  payload: value
});

export const initialAchievementsState = {
  achievements: []
}