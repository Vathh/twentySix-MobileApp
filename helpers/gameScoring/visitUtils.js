export const isVisitComplete = (visit) =>
	visit?.bust ||
	visit?.closedLeg ||
	(visit?.dartsInVisit != null && visit.dartsInVisit >= 3);
