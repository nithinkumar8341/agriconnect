import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { storage } from '../lib/storage.js';
import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enDevui from './locales/en/devui.json';
import enOnboarding from './locales/en/onboarding.json';
import hiAuth from './locales/hi/auth.json';
import hiCommon from './locales/hi/common.json';
import hiDevui from './locales/hi/devui.json';
import hiOnboarding from './locales/hi/onboarding.json';
import teAuth from './locales/te/auth.json';
import teCommon from './locales/te/common.json';
import teDevui from './locales/te/devui.json';
import teOnboarding from './locales/te/onboarding.json';

// Native names, so people can find their language without reading the current one.
export const LANGUAGES = [
  { code: 'te', nativeName: 'తెలుగు' },
  { code: 'en', nativeName: 'English' },
  { code: 'hi', nativeName: 'हिंदी' },
];
export const DEFAULT_LANGUAGE = 'te';
export const LANGUAGE_STORAGE_KEY = 'agc.language';

export const resources = {
  en: { common: enCommon, devui: enDevui, auth: enAuth, onboarding: enOnboarding },
  te: { common: teCommon, devui: teDevui, auth: teAuth, onboarding: teOnboarding },
  hi: { common: hiCommon, devui: hiDevui, auth: hiAuth, onboarding: hiOnboarding },
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
  ns: ['common', 'devui', 'auth', 'onboarding'],
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
