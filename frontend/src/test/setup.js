import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import i18n from '../i18n/index.js';

// Tests read English by default; individual tests switch language when that is what they check.
beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
