"use client";

import ConstructionMap from "@/components/construction-map";
import Link from "next/link";
import { languageNames, locales } from "@/lib/i18n";
import type { ConstructionRoutes } from "@/lib/route-path";
import { getTransportStops, type NoticePoints } from "@/lib/notice-features";
import { useLocale } from "@/lib/use-locale";

export default function FullConstructionMap({
  id,
  title,
  location,
  routes,
  points,
  kind,
}: {
  id: string;
  title: string;
  location: string;
  routes: ConstructionRoutes;
  points: NoticePoints;
  kind: string;
}) {
  const { locale, setLocale, t } = useLocale();
  const stopChanges = getTransportStops(points);
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
            <h1>{t(kind === "safety" ? "safetyMapTitle" : "constructionMap")}</h1>
            <p>
              {title} · {location}
            </p>
          </div>
          <span className="pill">
            {routes.length
              ? `${routes.length} ${t("routeBranch")}`
              : kind === "transport"
                ? t("transport")
                : kind === "safety"
                  ? t("safety")
                  : t("business")}
          </span>
        </div>
        <ConstructionMap
          routes={routes}
          points={points}
          markerMode={
            kind === "business"
              ? "business"
              : kind === "transport"
                ? "transport"
                : kind === "safety"
                  ? "safety"
                  : "none"
          }
          labels={{
            help: "",
            undo: "",
            clear: "",
            branch: t("routeBranch"),
            start: t("routeStart"),
            end: t("routeEnd"),
            original: t(kind === "transport" ? "oldStop" : "originalEntrance"),
            replacement: t(kind === "transport" ? "newStop" : "temporaryEntrance"),
            hazard: t("hazardLocation"),
            stopChange: t("stopChange"),
          }}
        />
        {kind === "business" && (
          <div className="access-flow business">
            {(["original", "replacement"] as const).map((key) => (
              <div key={key}>
                <span className={`map-dot ${key}`} aria-hidden="true" />
                <div>
                  <b>{t(key === "original" ? "originalEntrance" : "temporaryEntrance")}</b>
                  <p>{points[key]?.name || t("locationPending")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {kind === "transport" && (
          <div className="transport-changes">
            {stopChanges.map((pair, index) => (
              <div className="transport-change" key={index}>
                <h2>
                  {t("stopChange")} {index + 1}
                </h2>
                <div className="access-flow transport">
                  {(["original", "replacement"] as const).map((side) => (
                    <div key={side}>
                      <span className={`map-dot ${side}`} aria-hidden="true" />
                      <div>
                        <b>
                          {t(side === "original" ? "oldStop" : "newStop")} {index + 1}
                        </b>
                        <p>{pair[side]?.name || t("locationPending")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {kind === "safety" && (
          <div className="safety-location">
            <span className="map-dot hazard" aria-hidden="true" />
            <div>
              <b>{t("hazardLocation")}</b>
              <p>{points.hazard?.name || location}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
