import { KeycloakError } from 'keycloak-js';

export const AUTH_SERVER_URL = 'https://auth-craigmiller160.ddns.net/';
export const ACCESS_DENIED_URL =
	'https://apps-craigmiller160.ddns.net/access-denied/';

export const ACCESS_DENIED_ERROR: KeycloakError = {
	error: 'Access Denied',
	error_description: 'Your access to this app is denied'
};

export const REFRESH_ERROR: KeycloakError = {
	error: 'Refresh Error',
	error_description: 'Failed to refresh token'
};
