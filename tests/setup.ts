import "@testing-library/jest-dom";

// Clear localStorage between tests so taste profile tests don't bleed into each other
beforeEach(() => {
  localStorage.clear();
});
