import i18n, {
  changeLanguage,
  hasChosenLanguage,
  LANGUAGE_STORAGE_KEY,
  resources,
} from './index.js';

function flattenKeys(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) =>
    typeof value === 'object'
      ? flattenKeys(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, value]],
  );
}

const placeholders = (text) => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

describe('translation files', () => {
  const namespaces = Object.keys(resources.en);

  it.each(['te', 'hi'])(
    '%s has exactly the same keys as English in every namespace',
    (language) => {
      for (const namespace of namespaces) {
        const englishKeys = flattenKeys(resources.en[namespace])
          .map(([key]) => key)
          .sort();
        const otherKeys = flattenKeys(resources[language][namespace])
          .map(([key]) => key)
          .sort();
        expect({ namespace, keys: otherKeys }).toEqual({ namespace, keys: englishKeys });
      }
    },
  );

  it.each(['en', 'te', 'hi'])('%s has no empty strings', (language) => {
    for (const namespace of namespaces) {
      for (const [key, value] of flattenKeys(resources[language][namespace])) {
        expect({ key, empty: value.trim() === '' }).toEqual({ key, empty: false });
      }
    }
  });

  it.each(['te', 'hi'])('%s keeps the same {{placeholders}} as English', (language) => {
    for (const namespace of namespaces) {
      const english = Object.fromEntries(flattenKeys(resources.en[namespace]));
      for (const [key, value] of flattenKeys(resources[language][namespace])) {
        expect({ key, vars: placeholders(value) }).toEqual({
          key,
          vars: placeholders(english[key]),
        });
      }
    }
  });

  it('writes Telugu in Telugu script', () => {
    expect(resources.te.common.actions.back).toMatch(/[ఀ-౿]/);
  });
});

describe('language choice', () => {
  it('persists an explicit choice and updates <html lang>', async () => {
    expect(hasChosenLanguage()).toBe(false);

    await changeLanguage('te');

    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('te');
    expect(hasChosenLanguage()).toBe(true);
    expect(document.documentElement.lang).toBe('te');
    expect(i18n.t('actions.back')).toBe('వెనుకకు');
  });

  it('ignores unsupported languages', async () => {
    await changeLanguage('fr');

    expect(i18n.language).toBe('en');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });
});
