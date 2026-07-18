/**
 * Start Expo z wybranym API target (local|staging).
 * Działa na Windows bez cross-env.
 *
 * Usage: node scripts/start-api-target.mjs local
 *        node scripts/start-api-target.mjs staging
 */
import { spawn } from 'node:child_process';

const target = (process.argv[2] || 'local').toLowerCase();
if (target !== 'local' && target !== 'staging') {
	console.error('Użycie: node scripts/start-api-target.mjs <local|staging>');
	process.exit(1);
}

process.env.EXPO_PUBLIC_API_TARGET = target;
console.log(`[start] EXPO_PUBLIC_API_TARGET=${target}`);

const child = spawn('npx', ['expo', 'start', ...process.argv.slice(3)], {
	stdio: 'inherit',
	env: process.env,
	shell: true,
});

child.on('exit', (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}
	process.exit(code ?? 0);
});
