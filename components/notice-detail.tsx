"use client";

import Link from "next/link";
import { languageNames, locales, localText } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";
import ConstructionMap from "@/components/construction-map";
import { decodeRoutePath } from "@/lib/route-path";
import {
  decodeNoticePoints,
  getTransportStops,
  hasCoordinates,
  remainingDays,
} from "@/lib/notice-features";

type Notice = {
  id: string;
  kind: string;
  titleEn: string;
  titleZh?: string | null;
  titleMs?: string | null;
  bodyEn: string;
  bodyZh?: string | null;
  bodyMs?: string | null;
  location: string;
  startAt?: string | null;
  endAt?: string | null;
  diversion?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  routePath?: string | null;
  progressPercent?: number | null;
  pointData?: string | null;
  createdAt: string;
  images?: { id: string }[];
};

export default function NoticeDetail({ notice }: { notice: Notice }) {
  const { locale, setLocale, t } = useLocale();
  const dateLocale = { en: "en-MY", zh: "zh-CN", ms: "ms-MY" }[locale];
  const format = (value?: string | null) =>
    value
      ? new Intl.DateTimeFormat(dateLocale, {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Kuala_Lumpur",
        }).format(new Date(value))
      : t("dateUnknown");
  const routes = (decodeRoutePath(notice.routePath) || []).filter((branch) => branch.length > 0);
  const points = decodeNoticePoints(notice.pointData) || {};
  const stopChanges = getTransportStops(points);
  const mappedPoint = (
    notice.kind === "transport"
      ? stopChanges.flatMap((pair) => [pair.original, pair.replacement])
      : notice.kind === "business"
        ? [points.original, points.replacement]
        : notice.kind === "safety"
          ? [points.hazard]
          : []
  ).find(hasCoordinates);
  const hasMappedPoints = Boolean(mappedPoint);
  const daysLeft = remainingDays(notice.endAt);
  const hasManualCoordinates = Boolean(notice.latitude && notice.longitude);
  const firstPoint = routes.flat()[0];
  const mapQuery = firstPoint
    ? `${firstPoint[0]},${firstPoint[1]}`
    : mappedPoint
      ? `${mappedPoint.lat},${mappedPoint.lng}`
      : hasManualCoordinates
        ? `${notice.latitude},${notice.longitude}`
        : `${notice.location}, Penang, Malaysia`;
  const encodedMapQuery = encodeURIComponent(mapQuery);
  const mapUrl = `https://www.google.com/maps?q=${encodedMapQuery}&z=17&output=embed`;
  const fullMapUrl =
    routes.length || hasMappedPoints
      ? `/updates/${notice.id}/map`
      : `https://www.google.com/maps/search/?api=1&query=${encodedMapQuery}`;
  return (
    <div className="detail-page">
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
      <main className="detail-main">
        <Link className="detail-back" href="/community#updates">
          ← {t("navNotices")}
        </Link>
        <div className="detail-paper">
          <div className="detail-stamp">
            <span className={`pill kind-${notice.kind}`}>{t(notice.kind)}</span>
            <span>{format(notice.createdAt)}</span>
          </div>
          <h1>{localText(notice, "title", locale)}</h1>
          <div className="detail-facts">
            <div>
              <b>{t("location")}</b>
              <span>{notice.location}</span>
            </div>
            <div>
              <b>{t("when")}</b>
              <span>
                {notice.startAt
                  ? `${format(notice.startAt)}${notice.endAt ? ` – ${format(notice.endAt)}` : ""}`
                  : notice.endAt
                    ? format(notice.endAt)
                    : t("dateUnknown")}
              </span>
            </div>
          </div>
          <div className="detail-body">{localText(notice, "body", locale)}</div>
          {notice.images && notice.images.length > 0 && (
            <section
              className="notice-photo-gallery"
              aria-label={
                locale === "zh" ? "公告图片" : locale === "ms" ? "Foto makluman" : "Notice photos"
              }
            >
              {notice.images.map((image, index) => (
                <a
                  key={image.id}
                  href={`/api/notices/images?id=${encodeURIComponent(image.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/notices/images?id=${encodeURIComponent(image.id)}`}
                    alt={`${localText(notice, "title", locale)} ${index + 1}`}
                  />
                </a>
              ))}
            </section>
          )}
          {notice.kind === "schedule" && (
            <section className="detail-progress" aria-label={t("constructionProgress")}>
              <div className="detail-progress-heading">
                <h2>{t("constructionProgress")}</h2>
                <strong>
                  {notice.progressPercent === null || notice.progressPercent === undefined
                    ? t("progressPending")
                    : `${notice.progressPercent}%`}
                </strong>
              </div>
              {notice.progressPercent !== null && notice.progressPercent !== undefined && (
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-label={t("constructionProgress")}
                  aria-valuenow={notice.progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: `${notice.progressPercent}%` }} />
                </div>
              )}
              <p>
                {notice.progressPercent === 100
                  ? t("workCompleted")
                  : daysLeft === null
                    ? t("completionPending")
                    : daysLeft < 0
                      ? t("completionOverdue")
                      : `${t("daysRemaining")}: ${daysLeft}`}
              </p>
            </section>
          )}
          {notice.kind === "business" && (points.original?.name || points.replacement?.name) && (
            <section className="access-flow business" aria-label={t("business")}>
              <div>
                <span className="map-dot original" aria-hidden="true" />
                <div>
                  <b>{t("originalEntrance")}</b>
                  <p>{points.original?.name || t("locationPending")}</p>
                </div>
              </div>
              <div>
                <span className="map-dot replacement" aria-hidden="true" />
                <div>
                  <b>{t("temporaryEntrance")}</b>
                  <p>{points.replacement?.name || t("locationPending")}</p>
                </div>
              </div>
            </section>
          )}
          {notice.kind === "transport" &&
            stopChanges.some((pair) => pair.original?.name || pair.replacement?.name) && (
              <section className="transport-changes" aria-label={t("transport")}>
                {stopChanges.map((pair, index) => (
                  <div className="transport-change" key={index}>
                    <h2>
                      {t("stopChange")} {index + 1}
                    </h2>
                    <div className="access-flow transport">
                      <div>
                        <span className="map-dot original" aria-hidden="true" />
                        <div>
                          <b>
                            {t("oldStop")} {index + 1}
                          </b>
                          <p>{pair.original?.name || t("locationPending")}</p>
                        </div>
                      </div>
                      <div>
                        <span className="map-dot replacement" aria-hidden="true" />
                        <div>
                          <b>
                            {t("newStop")} {index + 1}
                          </b>
                          <p>{pair.replacement?.name || t("locationPending")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            )}
          {notice.kind === "safety" && hasCoordinates(points.hazard) && (
            <section className="safety-location" aria-label={t("hazardLocation")}>
              <span className="map-dot hazard" aria-hidden="true" />
              <div>
                <b>{t("hazardLocation")}</b>
                <p>{points.hazard.name || notice.location}</p>
              </div>
            </section>
          )}
          {notice.diversion && (
            <section className="detail-guidance">
              <h2>{t(notice.kind === "safety" ? "safetyAdvice" : "diversion")}</h2>
              <p>{notice.diversion}</p>
            </section>
          )}
          <section className="detail-map" aria-labelledby="construction-map-title">
            <div className="detail-map-heading">
              <div>
                <h2 id="construction-map-title">
                  {t(notice.kind === "safety" ? "safetyMapTitle" : "constructionMap")}
                </h2>
                <p>
                  {notice.kind === "business" && hasMappedPoints
                    ? t("businessMapHint")
                    : notice.kind === "transport" && hasMappedPoints
                      ? t("transportMapHint")
                      : notice.kind === "safety" && hasMappedPoints
                        ? t("safetyMapHint")
                        : routes.length
                          ? t("mapHighlightedRoute")
                          : hasManualCoordinates
                            ? t("mapExactCoordinates")
                            : t("mapFromLocation")}
                </p>
              </div>
              <a className="map-link" href={fullMapUrl} target="_blank" rel="noopener noreferrer">
                {t("map")} ↗
              </a>
            </div>
            {routes.length || hasMappedPoints ? (
              <ConstructionMap
                routes={routes}
                points={points}
                markerMode={
                  notice.kind === "business"
                    ? "business"
                    : notice.kind === "transport"
                      ? "transport"
                      : notice.kind === "safety"
                        ? "safety"
                        : "none"
                }
                labels={{
                  help: "",
                  undo: "",
                  clear: "",
                  start: t("routeStart"),
                  end: t("routeEnd"),
                  branch: t("routeBranch"),
                  original: t(notice.kind === "transport" ? "oldStop" : "originalEntrance"),
                  replacement: t(notice.kind === "transport" ? "newStop" : "temporaryEntrance"),
                  hazard: t("hazardLocation"),
                  stopChange: t("stopChange"),
                }}
              />
            ) : (
              <iframe
                title={`${t(notice.kind === "safety" ? "safetyMapTitle" : "constructionMap")}: ${notice.location}`}
                src={mapUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            )}
          </section>
        </div>
        <p className="detail-note">{t("unofficial")}</p>
      </main>
    </div>
  );
}
