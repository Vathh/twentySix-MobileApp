export function isLegAlreadyOpenMessage(error) {
	return String(error?.message || '').toLowerCase().includes('otwarty');
}

/**
 * Czy odrzucona komenda jest już na serwerze (powtórka po zgubionej odpowiedzi).
 * Zwykła wizyta przy 422 nie jest tu uznawana — jej powtórka wraca jako 200.
 */
export function commandAlreadyApplied(entry, snapshot, { legAlreadyOpen = false } = {}) {
	if (!entry || !snapshot) {
		return false;
	}
	if (entry.op === 'startLeg' && legAlreadyOpen && snapshot.currentLeg?.id) {
		return true;
	}
	if (entry.op === 'closeLeg') {
		const legs = snapshot.legs ?? [];
		return legs.some((leg) => Number(leg.id) === Number(entry.legId));
	}
	return false;
}

export function rejectionNotice(droppedTail, op = null) {
	if (op === 'undoVisit') {
		return 'Nie udało się cofnąć wizyty. Tablica pokazuje zapisany stan meczu.';
	}
	if (droppedTail > 0) {
		return `Serwer odrzucił wizytę. Cofnięto tablicę do zapisanego stanu. Niezapisane kolejne wpisy: ${droppedTail}. Wpisz je ponownie.`;
	}
	return 'Serwer odrzucił wizytę. Tablica pokazuje zapisany stan meczu.';
}
