/**
 * Przebieg planu: indeks, przerwy, wyniki slotów, suma punktowanych, cele.
 */

export function planItemCount(plan) {
	return Array.isArray(plan?.items) ? plan.items.length : 0;
}

export function planItemAt(plan, index) {
	const items = Array.isArray(plan?.items) ? plan.items : [];
	return items[index] ?? null;
}

export function planProgressLabel(index, total) {
	const n = Math.max(0, Number(index) || 0) + 1;
	const m = Math.max(0, Number(total) || 0);
	return `${n}/${m}`;
}

export function slotVariant(item) {
	if (!item || item.kind !== 'exercise') {
		return null;
	}
	if (item.exerciseKey === 'scoring_under_pressure') {
		return item.variant || '20';
	}
	if (item.exerciseKey === 'nine_darts') {
		const darts = Number(item.dartCount);
		return Number.isInteger(darts) && darts >= 72 ? '18' : '9';
	}
	return item.variant ?? null;
}

export function slotToExerciseDefinition(plan, item) {
	if (!item || item.kind !== 'exercise' || !item.exerciseKey) {
		return null;
	}
	return {
		id: item.exerciseKey,
		kind: 'exercise',
		status: 'active',
		inactive: false,
		name: item.name || item.exerciseKey,
		description: item.description ?? null,
		exerciseKey: item.exerciseKey,
		durationSeconds: item.durationSeconds ?? null,
		dartCount: item.dartCount ?? null,
		variant: slotVariant(item),
		favorite: false,
		planId: plan?.id ?? null,
		planName: plan?.name ?? null,
	};
}

export function emptyPlanHang(plan, clientSessionId, inputMode) {
	const total = planItemCount(plan);
	return {
		clientSessionId,
		definitionId: plan.id,
		plan,
		index: 0,
		total,
		paused: false,
		inputMode: inputMode ?? null,
		results: [],
		break: null,
		exerciseSession: null,
		phase: total > 0 ? 'running' : 'summary',
		completedAt: null,
		summary: null,
	};
}

export function startBreakState(item, now = Date.now()) {
	const seconds = Number(item?.breakSeconds);
	const durationMs = Number.isInteger(seconds) && seconds > 0 ? seconds * 1000 : 60000;
	return {
		durationMs,
		remainingMs: durationMs,
		endsAt: now + durationMs,
		paused: false,
	};
}

export function pauseBreak(breakState, now = Date.now()) {
	if (!breakState || breakState.paused) {
		return breakState;
	}
	const remainingMs = Math.max(0, (breakState.endsAt ?? now) - now);
	return {
		...breakState,
		remainingMs,
		endsAt: null,
		paused: true,
	};
}

export function resumeBreak(breakState, now = Date.now()) {
	if (!breakState || !breakState.paused) {
		return breakState;
	}
	const remainingMs = Math.max(0, breakState.remainingMs ?? 0);
	return {
		...breakState,
		remainingMs,
		endsAt: now + remainingMs,
		paused: false,
	};
}

export function extendBreak(breakState, extraMs = 60000, now = Date.now()) {
	if (!breakState) {
		return breakState;
	}
	if (breakState.paused) {
		return {
			...breakState,
			durationMs: (breakState.durationMs ?? 0) + extraMs,
			remainingMs: (breakState.remainingMs ?? 0) + extraMs,
		};
	}
	const remainingMs = Math.max(0, (breakState.endsAt ?? now) - now) + extraMs;
	return {
		...breakState,
		durationMs: (breakState.durationMs ?? 0) + extraMs,
		remainingMs,
		endsAt: now + remainingMs,
	};
}

export function aimsFromCompletion(record) {
	const aims = record?.stats?.aims;
	if (!Array.isArray(aims)) {
		return [];
	}
	return aims
		.filter((row) => row && typeof row.aim === 'string')
		.map((row) => ({
			aim: row.aim,
			attempts: Number(row.attempts) || 0,
			hits: Number(row.hits) || 0,
		}));
}

export function mergeAims(lists) {
	const map = new Map();
	for (const list of lists) {
		for (const row of list || []) {
			if (!row?.aim) {
				continue;
			}
			const prev = map.get(row.aim) || { aim: row.aim, attempts: 0, hits: 0 };
			prev.attempts += Number(row.attempts) || 0;
			prev.hits += Number(row.hits) || 0;
			map.set(row.aim, prev);
		}
	}
	return [...map.values()]
		.filter((row) => row.attempts > 0)
		.map((row) => ({
			...row,
			percent: row.attempts > 0 ? Math.round((1000 * row.hits) / row.attempts) / 10 : 0,
		}))
		.sort((a, b) => a.aim.localeCompare(b.aim, 'pl'));
}

export function recordExerciseResult(hang, item, completion, status = 'completed') {
	const scored = item?.scored !== false;
	const score = status === 'skipped' ? 0 : (completion?.score ?? 0);
	const aims = status === 'skipped' ? [] : aimsFromCompletion(completion);
	const row = {
		position: item.position ?? hang.index + 1,
		kind: 'exercise',
		exerciseKey: item.exerciseKey,
		name: item.name || item.exerciseKey,
		status,
		scored,
		score: status === 'skipped' ? null : (completion?.score ?? null),
		contribution: scored && status === 'completed' ? (Number.isFinite(score) ? score : 0) : 0,
		stats: status === 'skipped' ? null : (completion?.stats ?? null),
		aims,
	};
	return {
		...hang,
		results: [...(hang.results || []), row],
		exerciseSession: null,
		break: null,
	};
}

export function recordBreakResult(hang, item, status = 'completed') {
	const row = {
		position: item.position ?? hang.index + 1,
		kind: 'break',
		exerciseKey: null,
		name: 'Przerwa',
		status,
		scored: false,
		score: null,
		contribution: 0,
		stats: null,
		aims: [],
	};
	return {
		...hang,
		results: [...(hang.results || []), row],
		break: null,
		exerciseSession: null,
	};
}

export function advanceHang(hang) {
	const nextIndex = hang.index + 1;
	if (nextIndex >= hang.total) {
		return finalizeHang({ ...hang, index: nextIndex });
	}
	const nextItem = planItemAt(hang.plan, nextIndex);
	const next = {
		...hang,
		index: nextIndex,
		exerciseSession: null,
		break: nextItem?.kind === 'break' ? startBreakState(nextItem) : null,
		phase: 'running',
	};
	return next;
}

export function finalizeHang(hang, completedAt = new Date().toISOString()) {
	const results = hang.results || [];
	const score = results.reduce((sum, row) => sum + (Number(row.contribution) || 0), 0);
	const aims = mergeAims(results.map((row) => row.aims));
	const items = results.map((row) => {
		const item = {
			position: row.position,
			kind: row.kind,
			exerciseKey: row.exerciseKey,
			status: row.status,
			score: row.score,
			scored: Boolean(row.scored),
			aims: row.aims || [],
		};
		if (row.kind === 'exercise' && row.status === 'completed' && row.stats && typeof row.stats === 'object') {
			item.stats = row.stats;
		}
		return item;
	});
	return {
		...hang,
		phase: 'summary',
		paused: false,
		break: null,
		exerciseSession: null,
		completedAt,
		summary: {
			clientSessionId: hang.clientSessionId,
			definitionId: hang.definitionId,
			name: hang.plan?.name,
			completedAt,
			score,
			stats: { aims },
			items,
			results,
			inactive: Boolean(hang.plan?.inactive),
			sync: 'pending',
		},
	};
}

export function currentTitle(hang) {
	const item = planItemAt(hang?.plan, hang?.index);
	if (!item) {
		return hang?.plan?.name || 'Plan';
	}
	if (item.kind === 'break') {
		return 'Przerwa';
	}
	return item.name || item.exerciseKey || 'Ćwiczenie';
}
