import {
	AuthorizeWithKeycloak,
	CreateKeycloakAuthorization,
	KeycloakAuthConfig,
	KeycloakAuthFailedHandler,
	KeycloakAuthSuccessHandler,
	RequiredRoles
} from './types';
import Keycloak, { KeycloakError } from 'keycloak-js';
import { newDate } from '../utils/newDate';
import {
	ACCESS_DENIED_ERROR,
	ACCESS_DENIED_URL,
	AUTH_SERVER_URL,
	REFRESH_ERROR
} from './constants';
import { navigate } from '../utils/navigate';

const hasRequiredRoles = (
	keycloak: Keycloak,
	requiredRoles?: RequiredRoles
): boolean => {
	const hasRequiredRealmRoles =
		(requiredRoles?.realm ?? []).filter(
			(role) => !keycloak.hasRealmRole(role)
		).length === 0;

	const hasRequiredClientRoles =
		Object.entries(requiredRoles?.client ?? {})
			.flatMap(([clientId, roles]) =>
				roles.map((role) => [clientId, role])
			)
			.filter(
				([clientId, role]) => !keycloak.hasResourceRole(role, clientId)
			).length === 0;
	return hasRequiredRealmRoles && hasRequiredClientRoles;
};

const createHandleOnSuccess =
	(keycloak: Keycloak, config: KeycloakAuthConfig) =>
	(
		onSuccess: KeycloakAuthSuccessHandler,
		onFailure: KeycloakAuthFailedHandler
	) =>
	() => {
		if (!hasRequiredRoles(keycloak, config.requiredRoles)) {
			onFailure(ACCESS_DENIED_ERROR);
			return;
		}

		if (config.localStorageKey) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			localStorage.setItem(config.localStorageKey, keycloak.token!);
		}

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		onSuccess(keycloak.token!, keycloak.tokenParsed!);

		const current = newDate().getTime();
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const exp = keycloak.tokenParsed!.exp! * 1000;

		const timeout = exp - current - 30_000;
		if (timeout > 0) {
			setTimeout(() => keycloak.updateToken(40), exp - current - 30_000);
		}
	};

const createHandleOnFailure =
	(keycloak: Keycloak, config: KeycloakAuthConfig) =>
	(onFailure: KeycloakAuthFailedHandler) =>
	(error: KeycloakError) => {
		if (config.localStorageKey) {
			localStorage.removeItem(config.localStorageKey);
		}

		const doAccessDeniedRedirect = config.doAccessDeniedRedirect ?? true;
		const doLoginRedirectOnRefreshFailed =
			config.doLoginRedirectOnRefreshFailed ?? true;
		const accessDeniedUrl = config.accessDeniedUrl ?? ACCESS_DENIED_URL;

		if (
			error.error === ACCESS_DENIED_ERROR.error &&
			doAccessDeniedRedirect
		) {
			navigate(accessDeniedUrl);
		}

		if (
			error.error === REFRESH_ERROR.error &&
			doLoginRedirectOnRefreshFailed
		) {
			keycloak.login();
		}

		onFailure(error);
	};

export const createKeycloakAuthorization: CreateKeycloakAuthorization = (
	config: KeycloakAuthConfig
) => {
	const keycloak = new Keycloak({
		url: config.authServerUrl ?? AUTH_SERVER_URL,
		realm: config.realm,
		clientId: config.clientId
	});
	const handleOnFailure = createHandleOnFailure(keycloak, config);
	const handleOnSuccess = createHandleOnSuccess(keycloak, config);
	const authorize: AuthorizeWithKeycloak = (onSuccess, onFailure) => {
		keycloak.onAuthSuccess = handleOnSuccess(
			onSuccess,
			handleOnFailure(onFailure)
		);
		keycloak.onAuthRefreshSuccess = handleOnSuccess(
			onSuccess,
			handleOnFailure(onFailure)
		);
		keycloak.onAuthError = handleOnFailure(onFailure);
		keycloak.onAuthRefreshError = () =>
			handleOnFailure(onFailure)(REFRESH_ERROR);

		keycloak.init({ onLoad: 'login-required' });
	};

	return [authorize, keycloak.logout];
};
