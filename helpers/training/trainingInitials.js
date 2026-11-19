/** Inicjały jak na serwerze: pierwsze litery pierwszego i ostatniego słowa, albo dwie litery jednego słowa. */
export function trainingInitials(name) {
	const parts = String(name ?? '')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (parts.length === 0) {
		return '?';
	}
	const letter = (word) => word.charAt(0).toLocaleUpperCase('pl-PL');
	if (parts.length === 1) {
		return parts[0].slice(0, 2).toLocaleUpperCase('pl-PL');
	}
	return letter(parts[0]) + letter(parts[parts.length - 1]);
}
