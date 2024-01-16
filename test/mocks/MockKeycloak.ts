import type {
	KeycloakConfig,
	KeycloakError,
	KeycloakInitOptions,
	KeycloakTokenParsed
} from 'keycloak-js';
import { TOKEN, TOKEN_PARSED, UNAUTHORIZED_ERROR } from '../testutils/data';

export class MockKeycloak {
	static lastConfig?: KeycloakConfig = undefined;
	static lastInit?: KeycloakInitOptions = undefined;
	private static authResults: ReadonlyArray<KeycloakTokenParsed | null> = [];
	static loginCount = 0;

	static setAuthResults(
		...authResults: ReadonlyArray<KeycloakTokenParsed | null>
	) {
		MockKeycloak.authResults = authResults;
	}

	static reset() {
		MockKeycloak.lastConfig = undefined;
		MockKeycloak.lastInit = undefined;
		MockKeycloak.authResults = [];
		MockKeycloak.loginCount = 0;
	}

	token?: string;
	tokenParsed?: KeycloakTokenParsed;
	private currentAuthResult = -1;
	constructor(config: KeycloakConfig) {
		MockKeycloak.lastConfig = config;
	}

	init(options: KeycloakInitOptions): Promise<boolean> {
		MockKeycloak.lastInit = options;
		this.currentAuthResult++;
		if (MockKeycloak.authResults[this.currentAuthResult] === undefined) {
			throw new Error('Must initialize the static auth results');
		}

		const authSuccess =
			MockKeycloak.authResults[this.currentAuthResult] != null;
		if (authSuccess) {
			this.token = TOKEN;
			this.tokenParsed = TOKEN_PARSED;
		} else {
			this.token = undefined;
			this.tokenParsed = undefined;
		}

		if (authSuccess && this.onAuthSuccess) {
			this.onAuthSuccess();
		}

		if (!authSuccess && this.onAuthError) {
			this.onAuthError(UNAUTHORIZED_ERROR);
		}

		return new Promise((resolve) => resolve(authSuccess));
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	updateToken(minValidity: number): Promise<boolean> {
		this.currentAuthResult++;
		if (MockKeycloak.authResults[this.currentAuthResult] === undefined) {
			throw new Error(
				'Must initialize enough static auth results for all refreshes'
			);
		}

		const authSuccess =
			MockKeycloak.authResults[this.currentAuthResult] != null;
		if (authSuccess) {
			this.token = TOKEN;
			this.tokenParsed = TOKEN_PARSED;
		} else {
			this.token = undefined;
			this.tokenParsed = undefined;
		}

		if (authSuccess && this.onAuthRefreshSuccess) {
			this.onAuthRefreshSuccess();
		}

		if (!authSuccess && this.onAuthRefreshError) {
			this.onAuthRefreshError(UNAUTHORIZED_ERROR);
		}

		return new Promise((resolve) => resolve(authSuccess));
	}

	logout() {}

	login() {
		MockKeycloak.loginCount++;
	}

	onAuthSuccess?: () => void;

	onAuthError?: (error: KeycloakError) => void;

	onAuthRefreshSuccess?: () => void;

	onAuthRefreshError?: (error: KeycloakError) => void;

	hasRealmRole(role: string): boolean {
		if (MockKeycloak.authResults[this.currentAuthResult] != null) {
			return (
				MockKeycloak.authResults[
					this.currentAuthResult
				]?.realm_access?.roles?.includes(role) ?? false
			);
		}
		return false;
	}

	hasResourceRole(role: string, client: string): boolean {
		if (MockKeycloak.authResults[this.currentAuthResult] != null) {
			return (
				MockKeycloak.authResults[
					this.currentAuthResult
				]?.resource_access?.[client]?.roles?.includes(role) ?? false
			);
		}
		return false;
	}
}
