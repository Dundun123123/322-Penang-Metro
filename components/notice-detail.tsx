"use client";

import { languageNames, locales, localText } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";
import ConstructionMap from "@/components/construction-map";
import { decodeRoutePath } from "@/lib/route-path";

type Notice = {
  id: string; kind: string; titleEn: string; titleZh?: string | null; titleMs?: string | null;
  bodyEn: string; bodyZh?: string | null; bodyMs?: string | null; location: string;
  startAt?: string | null; endAt?: string | null; diversion?: string | null;
  latitude?: string | null; longitude?: string | null; routePath?: string | null; createdAt: string;
};

export default function NoticeDetail({ notice }: { notice: Notice }) {
  const { locale, setLocale, t } = useLocale();
  const dateLocale = { en: "en-MY", zh: "zh-CN", ms: "ms-MY" }[locale];
  const format = (value?: string | null) => value ? new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(value)) : t("dateUnknown");
  const routes = (decodeRoutePath(notice.routePath) || []).filter((branch) => branch.length > 0);
  const hasCoordinates = Boolean(notice.latitude && notice.longitude);
  const firstPoint = routes.flat()[0];
  const mapQuery = firstPoint ? `${firstPoint[0]},${firstPoint[1]}` : hasCoordinates ? `${notice.latitude},${notice.longitude}` : `${notice.location}, Penang, Malaysia`;
  const encodedMapQuery = encodeURIComponent(mapQuery);
  const mapUrl = `https://www.google.com/maps?q=${encodedMapQuery}&z=17&output=embed`;
  const fullMapUrl = routes.length ? `/updates/${notice.id}/map` : `https://www.google.com/maps/search/?api=1&query=${encodedMapQuery}`;
  return <div className="detail-page"><header className="detail-top"><a className="auth-brand" href="/"><span className="brand-mark">M</span><span>{t("brand")}</span></a><label className="language"><span className="sr-only">Language</span><select value={locale} onChange={(event) => setLocale(event.target.value as typeof locale)}>{locales.map((item) => <option key={item} value={item}>{languageNames[item]}</option>)}</select></label></header><main className="detail-main"><a className="detail-back" href="/#updates">← {t("navNotices")}</a><div className="detail-paper"><div className="detail-stamp"><span className={`pill kind-${notice.kind}`}>{t(notice.kind)}</span><span>{format(notice.createdAt)}</span></div><h1>{localText(notice, "title", locale)}</h1><div className="detail-facts"><div><b>{t("location")}</b><span>{notice.location}</span></div><div><b>{t("when")}</b><span>{notice.startAt ? `${format(notice.startAt)}${notice.endAt ? ` – ${format(notice.endAt)}` : ""}` : t("dateUnknown")}</span></div></div><div className="detail-body">{localText(notice, "body", locale)}</div>{notice.diversion && <section className="detail-guidance"><h2>{t("diversion")}</h2><p>{notice.diversion}</p></section>}<section className="detail-map" aria-labelledby="construction-map-title"><div className="detail-map-heading"><div><h2 id="construction-map-title">{t("constructionMap")}</h2><p>{routes.length ? t("mapHighlightedRoute") : hasCoordinates ? t("mapExactCoordinates") : t("mapFromLocation")}</p></div><a className="map-link" href={fullMapUrl} target="_blank" rel="noopener noreferrer">{t("map")} ↗</a></div>{routes.length ? <ConstructionMap routes={routes} labels={{ help: "", undo: "", clear: "", start: t("routeStart"), end: t("routeEnd"), branch: t("routeBranch") }} /> : <iframe title={`${t("constructionMap")}: ${notice.location}`} src={mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />}</section></div><p className="detail-note">{t("unofficial")}</p></main></div>;
}
