"use client";

import ConstructionMap from "@/components/construction-map";
import Link from "next/link";
import { languageNames, locales } from "@/lib/i18n";
import type { ConstructionRoutes } from "@/lib/route-path";
import { useLocale } from "@/lib/use-locale";

export default function FullConstructionMap({
  id,
  title,
  location,
  routes,
}: {
  id: string;
  title: string;
  location: string;
  routes: ConstructionRoutes;
}) {
  const { locale, setLocale, t } = useLocale();
  return (
    <div className="full-route-page">
      <header className="detail-top">
        <Link className="auth-brand" href="/">
          <span className="brand-mark">M</span>
          <span>{t("brand")}</span>
        </Link>
        <label className="language">
          <span className="sr-only">Language</span>
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value as typeof locale)}
          >
            {locales.map((item) => (
              <option key={item} value={item}>
                {languageNames[item]}
              </option>
            ))}
          </select>
        </label>
      </header>
      <main className="full-route-main">
        <a className="detail-back" href={`/updates/${id}`}>
          ← {t("backToNotice")}
        </a>
        <div className="full-route-heading">
          <div>
            <h1>{t("constructionMap")}</h1>
            <p>
              {title} · {location}
            </p>
          </div>
          <span className="pill">
            {routes.length} {t("routeBranch")}
          </span>
        </div>
        <ConstructionMap
          routes={routes}
          labels={{
            help: "",
            undo: "",
            clear: "",
            branch: t("routeBranch"),
            start: t("routeStart"),
            end: t("routeEnd"),
          }}
        />
      </main>
    </div>
  );
}
