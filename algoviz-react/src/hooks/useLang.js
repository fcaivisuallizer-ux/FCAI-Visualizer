import { useState, useEffect } from 'react';

const STORAGE_KEY = 'algoviz_lang';
const VALID_LANGS = ['js', 'python', 'cpp', 'java', 'csharp'];

/**
 * useLang — persists the user's preferred code language across refreshes.
 * Reads from localStorage on mount and writes back on every change.
 *
 * @param {string} defaultLang - fallback if nothing is stored yet
 * @returns {[string, Function]} [lang, setLang]
 */
export function useLang(defaultLang = 'js') {
  const [lang, setLangState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VALID_LANGS.includes(stored)) return stored;
    } catch (_) { /* localStorage blocked in some envs */ }
    return defaultLang;
  });

  const setLang = (newLang) => {
    if (!VALID_LANGS.includes(newLang)) return;
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch (_) { /* ignore */ }
  };

  return [lang, setLang];
}
