import {
	CONNECTION_ERROR_MESSAGE,
	SERVER_ERROR_MESSAGE,
	TOO_MANY_REQUESTS_MESSAGE,
	isNetworkError,
	userFacingErrorMessage,
} from '../userFacingError.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

export function runUserFacingErrorTests() {
	assert(
		userFacingErrorMessage({
			error: new TypeError('Network request failed'),
			fallback: 'Nieprawidłowy kod turnieju',
		}) === CONNECTION_ERROR_MESSAGE,
		'fetch failure is not a wrong-code message',
	);
	assert(
		userFacingErrorMessage({
			error: new Error('Failed to fetch'),
			fallback: 'Nieprawidłowy email lub hasło',
		}) === CONNECTION_ERROR_MESSAGE,
		'browser fetch failure is not a credentials message',
	);
	assert(
		userFacingErrorMessage({ status: 0, fallback: 'Nieprawidłowy kod turnieju' })
			=== CONNECTION_ERROR_MESSAGE,
		'status 0 is connection error',
	);
	assert(
		isNetworkError(new TypeError('Network request failed')),
		'RN TypeError is a network error',
	);
	assert(
		!isNetworkError(new Error('Nieprawidłowy kod logowania')),
		'API auth error is not a network error',
	);
	assert(
		userFacingErrorMessage({
			status: 401,
			data: { message: 'Nieprawidłowy kod logowania' },
			fallback: 'Nieprawidłowy kod turnieju',
		}) === 'Nieprawidłowy kod logowania',
		'keeps API auth message',
	);
	assert(
		userFacingErrorMessage({
			status: 401,
			data: {},
			fallback: 'Nieprawidłowy kod turnieju',
		}) === 'Nieprawidłowy kod turnieju',
		'auth without API message uses caller fallback',
	);
	assert(
		userFacingErrorMessage({
			status: 500,
			data: {},
			fallback: 'Nieprawidłowy kod turnieju',
		}) === SERVER_ERROR_MESSAGE,
		'5xx is not a wrong-code message',
	);
	assert(
		userFacingErrorMessage({
			status: 429,
			data: {},
			fallback: 'Nieprawidłowy kod turnieju',
		}) === TOO_MANY_REQUESTS_MESSAGE,
		'429 is rate-limit message',
	);
	assert(
		userFacingErrorMessage({
			status: 422,
			data: { errors: { email: ['Email jest zajęty'] } },
			fallback: 'Nie udało się utworzyć konta',
		}) === 'Email jest zajęty',
		'uses first Laravel validation error',
	);
	assert(
		userFacingErrorMessage({ error: null, fallback: 'fallback' }) === 'fallback',
		'null uses fallback',
	);
	assert(
		userFacingErrorMessage({ error: { message: '  Teraz rzuca inny gracz.  ' } })
			=== 'Teraz rzuca inny gracz.',
		'trims error.message',
	);
}
