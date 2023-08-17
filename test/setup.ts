import { afterEach, vi } from 'vitest';
import { MockKeycloak } from './mocks/MockKeycloak';

afterEach(() => {
	MockKeycloak.reset();
});

vi.mock('keycloak-js', async () => {
	const mock = await vi.importActual<{ MockKeycloak: MockKeycloak }>(
		'./mocks/MockKeycloak'
	);
	return {
		default: mock.MockKeycloak
	};
});
