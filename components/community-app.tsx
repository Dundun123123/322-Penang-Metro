"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { kinds, issueKinds, languageNames, locales, localText } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";

type Notice = {
  id: string; kind: string; status: string; titleEn: string; titleZh?: string | null; titleMs?: string | null;
  bodyEn?: string; bodyZh?: string | null; bodyMs?: string | null; location: string;
  startAt?: string | null; endAt?: string | null; diversion?: string | null;
  latitude?: string | null; longitude?: string | null; createdAt: string;
};
type Report = { reference: string; kind: string; location: string; description: string; status: string; createdAt: string; hasPhoto: boolean };
type Event = { id: string; status: string; noteEn: string; noteZh?: string | null; noteMs?: string | null; createdAt: string };

async function api<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...options });
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}
const dateLocale = { en: "en-MY", zh: "zh-CN", ms: "ms-MY" };

export default function CommunityApp({ signedIn }: { signedIn: boolean }) {
  const { locale, setLocale, t } = useLocale();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [subscribed, setSubscribed] = useState<string[]>([]);
  const [alertMessage, setAlertMessage] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [receipt, setReceipt] = useState<{ reference: string; accessCode: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [trackReference, setTrackReference] = useState("");
  const [trackCode, setTrackCode] = useState("");
  const [trackData, setTrackData] = useState<{ report: Report; events: Event[] } | null>(null);
  const [trackError, setTrackError] = useState("");
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    api<{ notices: Notice[] }>("/api/notices").then((data) => setNotices(data.notices)).catch((error) => setLoadError(error.message));
    api<{ categories: string[] }>("/api/subscriptions").then((data) => setSubscribed(data.categories)).catch(() => {});
  }, []);

  const visible = useMemo(() => notices.filter((notice) => {
    const matchesKind = filter === "all" || notice.kind === filter;
    const text = [notice.location, notice.titleEn, notice.titleZh, notice.titleMs].join(" ").toLowerCase();
    return matchesKind && text.includes(search.toLowerCase());
  }), [notices, filter, search]);
  const matchingAlerts = notices.filter((notice) => subscribed.includes(notice.kind));
  const latest = notices[0];

  function formatDate(value?: string | null) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(dateLocale[locale], { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" }).format(date);
  }
  async function sendReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setReportMessage(""); setReceipt(null); setSending(true);
    const form = event.currentTarget;
    try {
      const data = await api<{ reference: string; accessCode: string }>("/api/reports", { method: "POST", body: new FormData(form) });
      setReceipt({ reference: data.reference, accessCode: data.accessCode });
      setTrackReference(data.reference); setTrackCode(data.accessCode);
      form.reset();
    } catch (error) { setReportMessage(error instanceof Error ? error.message : t("requestFailed")); }
    finally { setSending(false); }
  }
  async function track(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setTracking(true); setTrackData(null); setTrackError("");
    try {
      const data = await api<{ report: Report; events: Event[] }>("/api/reports/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference: trackReference, accessCode: trackCode }) });
      setTrackData(data);
    } catch (error) { setTrackError(error instanceof Error ? error.message : t("requestFailed")); }
    finally { setTracking(false); }
  }
  async function saveAlerts() {
    setAlertMessage("");
    try {
      await api("/api/subscriptions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categories: subscribed }) });
      setAlertMessage(t("preferencesSaved"));
    } catch (error) { setAlertMessage(error instanceof Error ? error.message : t("requestFailed")); }
  }
  function noticeCard(notice: Notice) {
    const detailHref = `/updates/${notice.id}`;
    return <article className="notice-card" key={notice.id}>
      <div className="card-top"><span className={`pill kind-${notice.kind}`}>{t(notice.kind)}</span><span className="card-date">{formatDate(notice.createdAt)}</span></div>
      <h3>{localText(notice, "title", locale)}</h3>
      <p>{signedIn && notice.bodyEn ? localText(notice, "body", locale).slice(0, 160) + (localText(notice, "body", locale).length > 160 ? "…" : "") : t("publicSummary")}</p>
      <dl className="notice-meta"><div><dt>{t("location")}</dt><dd>{notice.location}</dd></div><div><dt>{t("when")}</dt><dd>{notice.startAt ? `${formatDate(notice.startAt)}${notice.endAt ? " – " + formatDate(notice.endAt) : ""}` : t("dateUnknown")}</dd></div></dl>
      <a className="notice-detail-link" href={detailHref}>{signedIn ? t("readDetails") : t("signInForDetails")} <span aria-hidden="true">↗</span></a>
    </article>;
  }

  return <div className="site-shell">
    <header className="site-header" id="home">
      <a href="#home" className="brand"><span className="brand-mark">M</span><span>{t("brand")}</span></a>
      <nav aria-label="Main navigation"><a href="#updates">{t("navNotices")}</a><a href="#report">{t("navReport")}</a><a href="#track">{t("navTrack")}</a><a href="#alerts">{t("navAlerts")}</a></nav>
      <div className="header-end"><label className="language"><span className="sr-only">Language</span><select value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)}>{locales.map((item) => <option key={item} value={item}>{languageNames[item]}</option>)}</select></label><a className="account-link" href={signedIn ? "/logout" : "/login"}>{signedIn ? t("signOut") : t("residentSignIn")}</a></div>
    </header>
    <main>
      <div className="disclaimer">{t("unofficial")}</div>
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow">{t("heroKicker")}</p><h1>{t("heroTitle")}</h1><p className="hero-body">{t("heroBody")}</p><div className="hero-actions"><a className="button button-primary" href="#updates">{t("browseUpdates")}</a><a className="button button-outline" href="#report">{t("makeReport")}</a></div></div>
        <div className="hero-panel"><p className="panel-label"><span className="live-dot" />{t("latestUpdate")}</p>{latest ? <><span className="pill">{t(latest.kind)}</span><h2>{localText(latest, "title", locale)}</h2><p>{latest.location}</p><p>{latest.startAt ? formatDate(latest.startAt) : ""}</p><a href={`/updates/${latest.id}`}>{signedIn ? t("readDetails") : t("signInForDetails")} ↗</a></> : <><h2>{t("noLatest")}</h2><p>{t("noLatestBody")}</p></>}</div>
      </section>
      <section className="section updates-section" id="updates"><div className="section-intro"><p className="eyebrow">{t("navNotices")}</p><h2>{t("updatesTitle")}</h2><p>{t("updatesBody")}</p></div><div className="updates-toolbar"><input aria-label={t("search")} placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} /><div className="filter-list">{["all", ...kinds].map((kind) => <button key={kind} type="button" className={filter === kind ? "chip selected" : "chip"} onClick={() => setFilter(kind)}>{t(kind)}</button>)}</div></div>{loadError && <p className="error">{loadError}</p>}<div className="notice-grid">{visible.length ? visible.map(noticeCard) : <div className="empty-state">{t("noNotices")}</div>}</div></section>
      <section className="section report-section" id="report"><div className="section-intro"><p className="eyebrow">{t("navReport")}</p><h2>{t("reportTitle")}</h2><p>{t("reportBody")}</p><p className="urgent">{t("urgent")}</p></div><div className="form-surface">{signedIn ? <><form onSubmit={sendReport}><label>{t("issueType")}<select name="kind" required defaultValue=""><option value="" disabled>{t("chooseType")}</option>{issueKinds.map((kind) => <option key={kind} value={kind}>{t(kind)}</option>)}</select></label><label>{t("location")}<input name="location" required minLength={4} maxLength={200} /></label><label>{t("describe")}<textarea name="description" required minLength={15} maxLength={3000} placeholder={t("describeHint")} /></label><div className="form-row"><label>{t("email")}<input name="contactEmail" type="email" /></label><label>{t("photo")}<input name="photo" type="file" accept="image/*" /></label></div><button className="button button-primary" disabled={sending}>{sending ? t("sending") : t("sendReport")}</button>{reportMessage && <p className="error" role="alert">{reportMessage}</p>}</form>{receipt && <div className="receipt" role="status"><h3>{t("receiptTitle")}</h3><p>{t("receiptBody")}</p><dl><div><dt>{t("reference")}</dt><dd>{receipt.reference}</dd></div><div><dt>{t("accessCode")}</dt><dd>{receipt.accessCode}</dd></div></dl><button className="text-action" onClick={async (e) => { await navigator.clipboard.writeText(`${receipt.reference} / ${receipt.accessCode}`); e.currentTarget.textContent = t("copied"); }}>{t("copy")}</button></div>}</> : <div className="gate-card"><span className="gate-symbol">M</span><h3>{t("reportSignInTitle")}</h3><p>{t("reportSignInBody")}</p><a className="button button-primary" href="/login?next=%2F%23report">{t("residentSignIn")}</a></div>}</div></section>
      <section className="section track-section" id="track"><div className="section-intro"><p className="eyebrow">{t("navTrack")}</p><h2>{t("trackTitle")}</h2><p>{t("trackBody")}</p></div><div className="form-surface"><form onSubmit={track}><div className="form-row"><label>{t("reference")}<input required value={trackReference} onChange={(e) => setTrackReference(e.target.value)} /></label><label>{t("accessCode")}<input value={trackCode} onChange={(e) => setTrackCode(e.target.value)} /></label></div><button className="button button-primary" disabled={tracking}>{tracking ? t("loading") : t("trackButton")}</button>{trackError && <p className="error" role="alert">{trackError}</p>}</form>{trackData && <div className="tracking-result"><div className="tracking-heading"><div><span className="eyebrow">{trackData.report.reference}</span><h3>{t(trackData.report.kind)} · {trackData.report.location}</h3></div><span className="pill">{t(trackData.report.status)}</span></div><p>{trackData.report.description}</p><h4>{t("timeline")}</h4><ol className="timeline">{trackData.events.map((item) => <li key={item.id}><b>{t(item.status)} · {formatDate(item.createdAt)}</b><span>{locale === "zh" ? item.noteZh || item.noteEn : locale === "ms" ? item.noteMs || item.noteEn : item.noteEn}</span></li>)}</ol>{trackData.report.hasPhoto && <a className="map-link" href={`/api/reports/photo?reference=${encodeURIComponent(trackData.report.reference)}`} target="_blank" rel="noopener noreferrer">{t("viewPhoto")} ↗</a>}</div>}</div></section>
      <section className="section alerts-section" id="alerts"><div className="section-intro"><p className="eyebrow">{t("navAlerts")}</p><h2>{t("alertsTitle")}</h2><p>{t("alertsBody")}</p></div>{signedIn ? <div className="alerts-body"><div className="choice-list">{kinds.map((kind) => <label key={kind}><input type="checkbox" checked={subscribed.includes(kind)} onChange={(e) => setSubscribed((current) => e.target.checked ? [...current, kind] : current.filter((x) => x !== kind))} />{t(kind)}</label>)}<button className="button button-primary" onClick={saveAlerts}>{t("savePreferences")}</button>{alertMessage && <p role="status">{alertMessage}</p>}</div><div className="alert-results"><h3>{t("matchedUpdates")}</h3>{matchingAlerts.length ? matchingAlerts.slice(0, 4).map((notice) => <a key={notice.id} href={`/updates/${notice.id}`}><span>{t(notice.kind)}</span><b>{localText(notice, "title", locale)}</b><small>{notice.location}</small></a>) : <p>{t("noMatches")}</p>}</div></div> : <div className="alerts-gate"><p>{t("alertsSignInBody")}</p><a className="button button-primary" href="/login?next=%2F%23alerts">{t("residentSignIn")}</a></div>}</section>
    </main><footer><span>{t("footer")}</span><span>{t("privacy")}</span><a href="/team/login">{t("teamPortal")}</a></footer>
  </div>;
}
