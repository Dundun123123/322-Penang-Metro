"use client";
import { useEffect, useState } from "react";
import { Locale, locales, words } from "./i18n";

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("en");
  useEffect(() => {
    const saved = window.localStorage.getItem("mutiara-locale") as Locale | null;
    if (saved && locales.includes(saved)) setLocaleState(saved);
  }, []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  function setLocale(next: Locale) { setLocaleState(next); window.localStorage.setItem("mutiara-locale", next); }
  return { locale, setLocale, t: (key: string) => words[locale][key] || words.en[key] || key };
}
