import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	ACCESS_TOKEN_EXP,
	CLIENT_ACCESS_ID,
	CLIENT_ACCESS_ROLE,
	CLIENT_ID,
	LOCAL_STORAGE_KEY,
	MOCK_AUTH_SERVER_URL,
	REALM,
	REALM_ACCESS_ROLE,
	TEST_DATE,
	TOKEN,
	TOKEN_PARSED,
	UNAUTHORIZED_ERROR
} from '../testutils/data';
import {
	AuthorizeWithKeycloak,
	InternalKeycloakAuthConfig
} from '../../src/core/types';
import { KeycloakError, KeycloakTokenParsed } from 'keycloak-js';
import { createKeycloakAuthorization } from '../../src/core';
import { MockKeycloak } from '../mocks/MockKeycloak';
import {
	ACCESS_DENIED_ERROR,
	ACCESS_DENIED_URL,
	AUTH_SERVER_URL,
	REFRESH_ERROR
} from '../../src/core/constants';

const advancePastRefresh = () =>
	vi.advanceTimersByTime((ACCESS_TOKEN_EXP - 30) * 1000 + 10);

type Result = {
	readonly token: string;
	readonly tokenParsed: KeycloakTokenParsed;
	readonly error: KeycloakError;
};

const navigateMock = vi.fn<[string], void>();
const newDate = () => TEST_DATE;

const promisify =
	(waitForResultCount: number) =>
	(
		authorize: AuthorizeWithKeycloak
	): Promise<ReadonlyArray<Partial<Result>>> =>
		new Promise((resolve) => {
			const results: Partial<Result>[] = [];
			authorize(
				(token, tokenParsed) => {
					results.push({
						token,
						tokenParsed
					});

					if (results.length >= waitForResultCount) {
						resolve(results);
					}
				},
				(error) => {
					results.push({
						error
					});

					if (results.length >= waitForResultCount) {
						resolve(results);
					}
				}
			);
		});

describe('authorization', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		localStorage.clear();
		navigateMock.mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
		localStorage.clear();
	});

	it('handles a successful authorization', async () => {
		MockKeycloak.setAuthResults(TOKEN_PARSED);
		const config: InternalKeycloakAuthConfig = {
			realm: REALM,
			authServerUrl: MOCK_AUTH_SERVER_URL,
			clientId: CLIENT_ID,
			navigate: navigateMock,
			newDate
		};
		const [authorize, logout] = createKeycloakAuthorization(config);
		expect(logout).toBeInstanceOf(Function);
		const results = await promisify(1)(authorize);
		expect(results).toEqual([
			{
				token: TOKEN,
				tokenParsed: TOKEN_PARSED
			}
		]);

		expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBeNull();
	});

	it('handles a successful authorization and stores the token in localStorage', async () => {
		MockKeycloak.setAuthResults(TOKEN_PARSED);
		const config: InternalKeycloakAuthConfig = {
			realm: REALM,
			authServerUrl: MOCK_AUTH_SERVER_URL,
			clientId: CLIENT_ID,
			localStorageKey: LOCAL_STORAGE_KEY,
			navigate: navigateMock,
			newDate
		};
		const [authorize, logout] = createKeycloakAuthorization(config);
		expect(logout).toBeInstanceOf(Function);
		const results = await promisify(1)(authorize);
		expect(results).toEqual([
			{
				token: TOKEN,
				tokenParsed: TOKEN_PARSED
			}
		]);

		expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toEqual(TOKEN);
	});

	it('handles a failed authorization', async () => {
		MockKeycloak.setAuthResults(null);
		const config: InternalKeycloakAuthConfig = {
			realm: REALM,
			authServerUrl: MOCK_AUTH_SERVER_URL,
			clientId: CLIENT_ID,
			navigate: navigateMock,
			newDate
		};
		const [authorize, logout] = createKeycloakAuthorization(config);
		expect(logout).toBeInstanceOf(Function);
		const results = await promisify(1)(authorize);
		expect(results).toEqual([
			{
				error: UNAUTHORIZED_ERROR
			}
		]);
		expect(navigateMock).not.toHaveBeenCalled();
		expect(MockKeycloak.loginCount).toEqual(0);
	});

	it('handles a failed authentication and clears the token from localStorage', async () => {
		localStorage.setItem(LOCAL_STORAGE_KEY, 'foobar');
		MockKeycloak.setAuthResults(null);
		const config: InternalKeycloakAuthConfig = {
			realm: REALM,
			authServerUrl: MOCK_AUTH_SERVER_URL,
			clientId: CLIENT_ID,
			localStorageKey: LOCAL_STORAGE_KEY,
			navigate: navigateMock,
			newDate
		};
		const [authorize, logout] = createKeycloakAuthorization(config);
		expect(logout).toBeInstanceOf(Function);
		const results = await promisify(1)(authorize);
		expect(results).toEqual([
			{
				error: UNAUTHORIZED_ERROR
			}
		]);

		expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBeNull();
		expect(MockKeycloak.loginCount).toEqual(0);
	});

	it('handles a successful authorization, and a successful refresh', async () => {
		MockKeycloak.setAuthResults(TOKEN_PARSED, TOKEN_PARSED);
		const config: InternalKeycloakAuthConfig = {
			realm: REALM,
			authServerUrl: MOCK_AUTH_SERVER_URL,
			clientId: CLIENT_ID,
			navigate: navigateMock,
			newDate
		};
		const [authorize, logout] = createKeycloakAuthorization(config);
		expect(logout).toBeInstanceOf(Function);
		const promise = promisify(2)(authorize);
		advancePastRefresh();
		const results = await promise;
		expect(results).toEqual([
			{
				token: TOKEN,
				tokenParsed: TOKEN_PARSED
			},
			{
				token: TOKEN,
				tokenParsed: TOKEN_PARSED
			}
		]);
	});

	it('handles a successful authorization, and a failed refresh', async () => {
		MockKeycloak.setAuthResults(TOKEN_PARSED, null);
		const config: InternalKeycloakAuthConfig = {
			realm: REALM,
			authServerUrl: MOCK_AUTH_SERVER_URL,
			clientId: CLIENT_ID,
			navigate: navigateMock,
			newDate
		};
		const [authorize, logout] = createKeycloakAuthorization(config);
		expect(logout).toBeInstanceOf(Function);
		const promise = promisify(2)(authorize);
		advancePastRefresh();
		const results = await promise;
		expect(results).toEqual([
			{
				token: TOKEN,
				tokenParsed: TOKEN_PARSED
			},
			{
				error: REFRESH_ERROR
			}
		]);
		expect(navigateMock).not.toHaveBeenCalled();
		expect(MockKeycloak.loginCount).toEqual(1);
	});

	it('handles a successful authorization, and a failed refresh, with login redirect disabled', async () => {
		MockKeycloak.setAuthResults(TOKEN_PARSED, null);
		const config: InternalKeycloakAuthConfig = {
			realm: REALM,
			authServerUrl: MOCK_AUTH_SERVER_URL,
			clientId: CLIENT_ID,
			doLoginRedirectOnRefreshFailed: false,
			navigate: navigateMock,
			newDate
		};
		const [authorize, logout] = createKeycloakAuthorization(config);
		expect(logout).toBeInstanceOf(Function);
		const promise = promisify(2)(authorize);
		advancePastRefresh();
		const results = await promise;
		expect(results).toEqual([
			{
				token: TOKEN,
				tokenParsed: TOKEN_PARSED
			},
			{
				error: REFRESH_ERROR
			}
		]);
		expect(navigateMock).not.toHaveBeenCalled();
		expect(MockKeycloak.loginCount).toEqual(0);
	});

	it('handles a successful authorization with the required realm roles', async () => {
		MockKeycloak.setAuthResults(TOKEN_PARSED);
		const config: InternalKeycloakAuthConfig = {
			realm: REALM,
			authServerUrl: MOCK_AUTH_SERVER_URL,
			clientId: CLIENT_ID,
			requiredRoles: {
				realm: [REALM_ACCESS_ROLE]
			},
			navigate: navigateMock,
			newDate
		};
		const [authorize, logout] = createKeycloakAuthorization(config);
		expect(logout).toBeInstanceOf(Function);
		const results = await promisify(1)(authorize);
		expect(results).toEqual([
			{
				token: TOKEN,
				tokenParsed: TOKEN_PARSED
			}
		]);
	});

	it('handles a successful authorization with the required client roles', async () => {
		MockKeycloak.setAuthResults(TOKEN_PARSED);
		const config: InternalKeycloakAuthConfig = {
			realm: REALM,
			authServerUrl: MOCK_AUTH_SERVER_URL,
			clientId: CLIENT_ID,
			requiredRoles: {
				client: {
					[CLIENT_ACCESS_ID]: [CLIENT_ACCESS_ROLE]
				}
			},
			navigate: navigateMock,
			newDate
		};
		const [authorize, logout] = createKeycloakAuthorization(config);
		expect(logout).toBeInstanceOf(Function);
		const results = await promisify(1)(authorize);
		expect(results).toEqual([
			{
				token: TOKEN,
				tokenParsed: TOKEN_PARSED
			}
		]);
	});

	it('handles a failed authorization because missing a required realm role, and clears localStorage', async () => {
		localStorage.setItem(LOCAL_STORAGE_KEY, 'abc');
		MockKeycloak.setAuthResults(TOKEN_PARSED);
		const config: InternalKeycloakAuthConfig = {
			realm: REALM,
			authServerUrl: MOCK_AUTH_SERVER_URL,
			clientId: CLIENT_ID,
			localStorageKey: LOCAL_STORAGE_KEY,
			requiredRoles: {
				realm: ['abc']
			},
			navigate: navigateMock,
			newDate
		};
		const [authorize, logout] = createKeycloakAuthorization(config);
		expect(logout).toBeInstanceOf(Function);
		const results = await promisify(1)(authorize);
		expect(results).toEqual([
			{
				error: ACCESS_DENIED_ERROR
			}
		]);

		expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBeNull();
	});

	it('handles a failed authorization because missing a required client role', async () => {
		localStorage.setItem(LOCAL_STORAGE_KEY, 'abc');
		MockKeycloak.setAuthResults(TOKEN_PARSED);
		const config: InternalKeycloakAuthConfig = {
			realm: REALM,
			authServerUrl: MOCK_AUTH_SERVER_URL,
			clientId: CLIENT_ID,
			requiredRoles: {
				client: {
					[CLIENT_ACCESS_ID]: ['abc']
				}
			},
			navigate: navigateMock,
			newDate
		};
		const [authorize, logout] = createKeycloakAuthorization(config);
		expect(logout).toBeInstanceOf(Function);
		const results = await promisify(1)(authorize);
		expect(results).toEqual([
			{
				error: ACCESS_DENIED_ERROR
			}
		]);

		expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toEqual('abc');
		expect(navigateMock).toHaveBeenCalledWith(ACCESS_DENIED_URL);
	});

	it('handles a failed authorization because missing a client role, but with redirect disabled', async () => {
		MockKeycloak.setAuthResults(TOKEN_PARSED);
		const config: InternalKeycloakAuthConfig = {
			realm: REALM,
			authServerUrl: MOCK_AUTH_SERVER_URL,
			clientId: CLIENT_ID,
			doAccessDeniedRedirect: false,
			requiredRoles: {
				client: {
					[CLIENT_ACCESS_ID]: ['abc']
				}
			},
			navigate: navigateMock,
			newDate
		};
		const [authorize, logout] = createKeycloakAuthorization(config);
		expect(logout).toBeInstanceOf(Function);
		const results = await promisify(1)(authorize);
		expect(results).toEqual([
			{
				error: ACCESS_DENIED_ERROR
			}
		]);

		expect(navigateMock).not.toHaveBeenCalled();
	});

	it('handles a failed authorization because missing a client role, but with custom redirect url', async () => {
		const accessDeniedUrl = 'https://foobar.com';
		MockKeycloak.setAuthResults(TOKEN_PARSED);
		const config: InternalKeycloakAuthConfig = {
			realm: REALM,
			authServerUrl: MOCK_AUTH_SERVER_URL,
			clientId: CLIENT_ID,
			accessDeniedUrl,
			requiredRoles: {
				client: {
					[CLIENT_ACCESS_ID]: ['abc']
				}
			},
			navigate: navigateMock,
			newDate
		};
		const [authorize, logout] = createKeycloakAuthorization(config);
		expect(logout).toBeInstanceOf(Function);
		const results = await promisify(1)(authorize);
		expect(results).toEqual([
			{
				error: ACCESS_DENIED_ERROR
			}
		]);

		expect(navigateMock).toHaveBeenCalledWith(accessDeniedUrl);
	});

	it('handles a successful authorization but a failed refresh because realm role removed', async () => {
		const newToken: KeycloakTokenParsed = {
			...TOKEN_PARSED,
			realm_access: {
				roles: ['abc']
			}
		};
		MockKeycloak.setAuthResults(TOKEN_PARSED, newToken);
		const config: InternalKeycloakAuthConfig = {
			realm: REALM,
			authServerUrl: MOCK_AUTH_SERVER_URL,
			clientId: CLIENT_ID,
			requiredRoles: {
				realm: [REALM_ACCESS_ROLE]
			},
			navigate: navigateMock,
			newDate
		};
		const [authorize, logout] = createKeycloakAuthorization(config);
		expect(logout).toBeInstanceOf(Function);
		const promise = promisify(2)(authorize);
		advancePastRefresh();
		const results = await promise;
		expect(results).toEqual([
			{
				token: TOKEN,
				tokenParsed: TOKEN_PARSED
			},
			{
				error: ACCESS_DENIED_ERROR
			}
		]);
		expect(navigateMock).toHaveBeenCalledWith(ACCESS_DENIED_URL);
		expect(MockKeycloak.loginCount).toEqual(0);
	});

	it('handles a successful authentication but a failed refresh because client role removed', async () => {
		const newToken: KeycloakTokenParsed = {
			...TOKEN_PARSED,
			resource_access: {
				[CLIENT_ID]: {
					roles: ['abc']
				}
			}
		};
		MockKeycloak.setAuthResults(TOKEN_PARSED, newToken);
		const config: InternalKeycloakAuthConfig = {
			realm: REALM,
			authServerUrl: MOCK_AUTH_SERVER_URL,
			clientId: CLIENT_ID,
			requiredRoles: {
				client: {
					[CLIENT_ACCESS_ID]: [CLIENT_ACCESS_ROLE]
				}
			},
			navigate: navigateMock,
			newDate
		};
		const [authorize, logout] = createKeycloakAuthorization(config);
		expect(logout).toBeInstanceOf(Function);
		const promise = promisify(1)(authorize);
		advancePastRefresh();
		const results = await promise;
		expect(results).toEqual([
			{
				token: TOKEN,
				tokenParsed: TOKEN_PARSED
			},
			{
				error: ACCESS_DENIED_ERROR
			}
		]);
		expect(navigateMock).toHaveBeenCalledWith(ACCESS_DENIED_URL);
		expect(MockKeycloak.loginCount).toEqual(0);
	});

	it('uses the default auth server host if none is provided', () => {
		const config: InternalKeycloakAuthConfig = {
			realm: REALM,
			clientId: CLIENT_ID,
			navigate: navigateMock,
			newDate
		};
		createKeycloakAuthorization(config);
		expect(MockKeycloak.lastConfig).toEqual({
			realm: REALM,
			clientId: CLIENT_ID,
			url: AUTH_SERVER_URL
		});
	});
});
