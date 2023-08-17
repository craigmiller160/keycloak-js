import { KeycloakError, KeycloakTokenParsed } from 'keycloak-js';

export type RequiredRoles = {
	readonly realm?: ReadonlyArray<string>;
	readonly client?: Record<string, ReadonlyArray<string>>;
};

export type KeycloakAuthConfig = {
	readonly realm: string;
	readonly authServerUrl?: string;
	readonly clientId: string;
	readonly localStorageKey?: string;
	readonly requiredRoles?: RequiredRoles;
	readonly doAccessDeniedRedirect?: boolean;
	readonly doLoginRedirectOnRefreshFailed?: boolean;
	readonly accessDeniedUrl?: string;
};

export type InternalKeycloakOverrides = Readonly<{
	newDate?: () => Date;
	navigate?: (url: string) => void;
}>;

export type InternalKeycloakAuthConfig = KeycloakAuthConfig &
	Partial<InternalKeycloakOverrides>;

export const isInternalConfig = (
	config: KeycloakAuthConfig
): config is InternalKeycloakAuthConfig =>
	Object.hasOwn(config, 'newDate') || Object.hasOwn(config, 'navigate');

export type KeycloakAuthSuccessHandler = (
	token: string,
	tokenParsed: KeycloakTokenParsed
) => void;
export type KeycloakAuthFailedHandler = (error: KeycloakError) => void;

export type AuthorizeWithKeycloak = (
	onSuccess: KeycloakAuthSuccessHandler,
	onFailure: KeycloakAuthFailedHandler
) => void;

export type Logout = () => void;

export type CreateKeycloakAuthorization = (
	config: KeycloakAuthConfig
) => [AuthorizeWithKeycloak, Logout];
