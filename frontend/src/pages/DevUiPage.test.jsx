import { screen } from '@testing-library/react';
import axe from 'axe-core';
import i18n from '../i18n/index.js';
import { renderApp } from '../test/helpers.jsx';

// jsdom cannot compute colours, so contrast is checked separately (Lighthouse and the token
// table in docs/learn/phase-04-frontend-foundation.md). Every other axe rule runs here.
async function axeViolations(container) {
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  return results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s) - ${v.help}`);
}

describe('/dev/ui component gallery', () => {
  it.each([
    ['en', 'Component gallery', 'Big buttons'],
    ['te', 'కాంపోనెంట్ గ్యాలరీ', 'పెద్ద బటన్లు'],
  ])(
    'renders every section in %s with no accessibility violations',
    async (language, title, section) => {
      await i18n.changeLanguage(language);
      const { container } = renderApp('/dev/ui');

      expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: section })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(10);
      expect(await axeViolations(container)).toEqual([]);
    },
  );
});
