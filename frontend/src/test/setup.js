import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import i18n from '../i18n/index.js';

// The default 1 s for findBy/waitFor was too tight when the whole suite runs in parallel.
configure({ asyncUtilTimeout: 3000 });

// Tests read English by default; individual tests switch language when that is what they check.
beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
