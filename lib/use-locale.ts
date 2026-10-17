"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Locale, locales, words } from "./i18n";

const localeEvent = "mutiara-locale-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(localeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(localeEvent, onChange);
  };
}

function getLocale(): Locale {
  const saved = window.localStorage.getItem("mutiara-locale") as Locale | null;
  return saved && locales.includes(saved) ? saved : "en";
}

export function useLocale() {
  const locale = useSyncExternalStore<Locale>(subscribe, getLocale, () => "en");
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  function setLocale(next: Locale) {
    window.localStorage.setItem("mutiara-locale", next);
    window.dispatchEvent(new Event(localeEvent));
  }
  return { locale, setLocale, t: (key: string) => words[locale][key] || words.en[key] || key };
}
