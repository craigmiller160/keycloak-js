import { afterEach, vi } from "vitest";
import { MockKeycloak } from "./mocks/MockKeycloak";

afterEach(() => {
  MockKeycloak.reset();
});

vi.mock("../src/utils/newDate", () => {
  const date = new Date();
  return {
    newDate: () => date,
  };
});

vi.mock("../src/utils/navigate", () => ({
  navigate: vi.fn(),
}));

vi.mock("keycloak-js", async () => {
  const mock = await vi.importActual<{ MockKeycloak: MockKeycloak }>(
    "./mocks/MockKeycloak"
  );
  return {
    default: mock.MockKeycloak,
  };
});
