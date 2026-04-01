import "@testing-library/jest-dom";
import { beforeEach } from "vitest";

// Clear localStorage between tests so taste profile tests don't bleed into each other
beforeEach(() => {
  localStorage.clear();
});
