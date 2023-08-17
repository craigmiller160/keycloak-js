import {
	isInternalConfig,
	KeycloakAuthConfig,
	NavigateFn,
	NewDateFn
} from '../core/types';

export const getNavigate = (config: KeycloakAuthConfig): NavigateFn => {
	if (isInternalConfig(config) && config.navigate) {
		return config.navigate;
	}
	return (url) => window.location.assign(url);
};

export const getNewDate = (config: KeycloakAuthConfig): NewDateFn => {
	if (isInternalConfig(config) && config.newDate) {
		return config.newDate;
	}
	return () => new Date();
};
