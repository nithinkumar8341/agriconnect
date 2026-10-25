import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { storage } from '../lib/storage.js';
import enCommon from './locales/en/common.json';
import enDevui from './locales/en/devui.json';
import hiCommon from './locales/hi/common.json';
import hiDevui from './locales/hi/devui.json';
import teCommon from './locales/te/common.json';
import teDevui from './locales/te/devui.json';

// Native names, so people can find their language without reading the current one.
export const LANGUAGES = [
  { code: 'te', nativeName: 'తెలుగు' },
  { code: 'en', nativeName: 'English' },
  { code: 'hi', nativeName: 'हिंदी' },
];
export const DEFAULT_LANGUAGE = 'te';
export const LANGUAGE_STORAGE_KEY = 'agc.language';

export const resources = {
  en: { common: enCommon, devui: enDevui },
  te: { common: teCommon, devui: teDevui },
  hi: { common: hiCommon, devui: hiDevui },
};

const isSupported = (code) => LANGUAGES.some((language) => language.code === code);

// True once the person has picked a language, so the first screen (Prompt 5) can ask only once.
export function hasChosenLanguage() {
  return isSupported(storage.get(LANGUAGE_STORAGE_KEY));
}

function initialLanguage() {
  const saved = storage.get(LANGUAGE_STORAGE_KEY);
  return isSupported(saved) ? saved : DEFAULT_LANGUAGE;
}

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  // A missing te/hi key shows English rather than a raw key.
  fallbackLng: 'en',
  ns: ['common', 'devui'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

document.documentElement.lang = i18n.language;
i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language;
});

// Only an explicit choice is saved, so the default never masquerades as the person's choice.
export async function changeLanguage(code) {
  if (!isSupported(code)) return;
  storage.set(LANGUAGE_STORAGE_KEY, code);
  await i18n.changeLanguage(code);
}

export default i18n;
