"use client";
import { FormEvent, useEffect, useState } from "react";
import { kinds, languageNames, locales } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";

type NoticeForm = {
  id?: string; kind: string; status: string; titleEn: string; titleZh: string; titleMs: string;
  bodyEn: string; bodyZh: string; bodyMs: string; location: string; startAt: string; endAt: string;
  diversion: string; latitude: string; longitude: string;
};
type Report = { id: string; reference: string; kind: string; location: string; description: string; contactEmail?: string | null; status: string; createdAt: string; hasPhoto: boolean };
type ReportEvent = { id: string; reportId: string; status: string; noteEn: string; noteZh?: string | null; noteMs?: string | null; createdAt: string };
const emptyNotice = (): NoticeForm => ({ kind: "closure", status: "draft", titleEn: "", titleZh: "", titleMs: "", bodyEn: "", bodyZh: "", bodyMs: "", location: "", startAt: "", endAt: "", diversion: "", latitude: "", longitude: "" });
const adminWords = {
  en: { title: "Project team workspace", subtitle: "Publish verified notices and respond to community reports.", notices: "Notices", reports: "Reports", back: "Community site", setup: "Set up the first administrator", setupHelp: "Enter the private setup key supplied with the site. This can be used only once.", setupKey: "Setup key", claim: "Activate administration", newNotice: "New notice", editNotice: "Edit notice", saveNotice: "Save notice", cancelEdit: "New notice instead", titleEn: "Title in English", titleZh: "Title in Chinese", titleMs: "Title in Malay", bodyEn: "Details in English", bodyZh: "Details in Chinese", bodyMs: "Details in Malay", location: "Location", kind: "Category", status: "Publication status", start: "Start time (Malaysia)", end: "End time (Malaysia)", diversion: "Diversion or access guidance", latitude: "Latitude (optional)", longitude: "Longitude (optional)", note: "Response note in English", noteZh: "Response note in Chinese", noteMs: "Response note in Malay", update: "Update report", noReports: "No reports yet.", noNotices: "No notices yet.", evidence: "View photo", sent: "Saved successfully.", forbidden: "You do not have project team access.", loading: "Loading…", contact: "Contact", history: "Response history", reportStatus: "New status", responseHelp: "Response notes are visible to the reporter.", draft: "Draft", published: "Published", archived: "Archived", received: "Received", reviewing: "Under review", assigned: "Assigned", resolved: "Resolved", closed: "Closed" },
  zh: { title: "项目组工作台", subtitle: "发布已核实的公告并处理社区报告。", notices: "公告管理", reports: "问题报告", back: "返回社区网站", setup: "设置首位管理员", setupHelp: "请输入网站提供的私人设置密钥。此密钥只能用于首次设置。", setupKey: "设置密钥", claim: "启用管理权限", newNotice: "新建公告", editNotice: "编辑公告", saveNotice: "保存公告", cancelEdit: "改为新建公告", titleEn: "英文标题", titleZh: "中文标题", titleMs: "马来文标题", bodyEn: "英文详情", bodyZh: "中文详情", bodyMs: "马来文详情", location: "地点", kind: "类别", status: "发布状态", start: "开始时间（马来西亚）", end: "结束时间（马来西亚）", diversion: "绕行或通行说明", latitude: "纬度（选填）", longitude: "经度（选填）", note: "英文处理说明", noteZh: "中文处理说明", noteMs: "马来文处理说明", update: "更新报告", noReports: "目前没有报告。", noNotices: "目前没有公告。", evidence: "查看照片", sent: "保存成功。", forbidden: "你的账户没有项目组权限。", loading: "加载中…", contact: "联系方式", history: "处理记录", reportStatus: "新状态", responseHelp: "处理说明会显示给报告提交者。", draft: "草稿", published: "已发布", archived: "已归档", received: "已收到", reviewing: "审核中", assigned: "已分派", resolved: "已解决", closed: "已关闭" },
  ms: { title: "Ruang kerja pasukan projek", subtitle: "Terbitkan makluman yang disahkan dan respons laporan komuniti.", notices: "Makluman", reports: "Laporan", back: "Laman komuniti", setup: "Sediakan pentadbir pertama", setupHelp: "Masukkan kunci persediaan peribadi yang dibekalkan bersama laman. Kunci ini hanya boleh digunakan sekali.", setupKey: "Kunci persediaan", claim: "Aktifkan pentadbiran", newNotice: "Makluman baharu", editNotice: "Sunting makluman", saveNotice: "Simpan makluman", cancelEdit: "Buat makluman baharu", titleEn: "Tajuk dalam bahasa Inggeris", titleZh: "Tajuk dalam bahasa Cina", titleMs: "Tajuk dalam bahasa Melayu", bodyEn: "Butiran dalam bahasa Inggeris", bodyZh: "Butiran dalam bahasa Cina", bodyMs: "Butiran dalam bahasa Melayu", location: "Lokasi", kind: "Kategori", status: "Status penerbitan", start: "Masa mula (Malaysia)", end: "Masa tamat (Malaysia)", diversion: "Lencongan atau panduan akses", latitude: "Latitud (pilihan)", longitude: "Longitud (pilihan)", note: "Nota respons dalam bahasa Inggeris", noteZh: "Nota respons dalam bahasa Cina", noteMs: "Nota respons dalam bahasa Melayu", update: "Kemas kini laporan", noReports: "Belum ada laporan.", noNotices: "Belum ada makluman.", evidence: "Lihat foto", sent: "Berjaya disimpan.", forbidden: "Anda tiada akses pasukan projek.", loading: "Memuatkan…", contact: "Hubungan", history: "Sejarah respons", reportStatus: "Status baharu", responseHelp: "Nota respons dapat dilihat oleh pelapor.", draft: "Draf", published: "Diterbitkan", archived: "Diarkibkan", received: "Diterima", reviewing: "Dalam semakan", assigned: "Ditugaskan", resolved: "Selesai", closed: "Ditutup" },
};
async function api(path: string, options?: RequestInit) {
  const response = await fetch(path, { cache: "no-store", ...options });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}
function localInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16);
}
function toIso(value: string) { return value ? new Date(value + ":00+08:00").toISOString() : ""; }

export default function AdminApp() {
  const { locale, setLocale, t } = useLocale();
  const a = adminWords[locale];
  const [auth, setAuth] = useState<{ signedIn: boolean; isAdmin: boolean; needsSetup: boolean } | null>(null);
  const [setupKey, setSetupKey] = useState("");
  const [tab, setTab] = useState<"notices" | "reports">("notices");
  const [notices, setNotices] = useState<NoticeForm[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [events, setEvents] = useState<ReportEvent[]>([]);
  const [notice, setNotice] = useState<NoticeForm>(emptyNotice());
  const [selectedReport, setSelectedReport] = useState("");
  const [newStatus, setNewStatus] = useState("reviewing");
  const [noteEn, setNoteEn] = useState("");
  const [noteZh, setNoteZh] = useState("");
  const [noteMs, setNoteMs] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const account = await api("/api/admin");
    setAuth(account);
    if (account.isAdmin) {
      const [n, r] = await Promise.all([api("/api/notices?all=1"), api("/api/admin/reports")]);
      setNotices(n.notices); setReports(r.reports); setEvents(r.events);
    }
  }
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, []);
  async function setup(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await api("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ setupKey }) }); setSetupKey(""); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } finally { setBusy(false); }
  }
  async function saveNotice(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const payload = { ...notice, startAt: toIso(notice.startAt), endAt: toIso(notice.endAt) };
      await api("/api/notices", { method: notice.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setMessage(a.sent); setNotice(emptyNotice()); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } finally { setBusy(false); }
  }
  async function updateReport(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      await api("/api/admin/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference: selectedReport, status: newStatus, noteEn, noteZh, noteMs }) });
      setMessage(a.sent); setNoteEn(""); setNoteZh(""); setNoteMs(""); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } finally { setBusy(false); }
  }
  function field(key: keyof NoticeForm, label: string, type: "text" | "textarea" | "datetime-local" = "text", required = false) {
    const value = notice[key] || "";
    return <label key={key}>{label}{type === "textarea" ? <textarea required={required} value={value} onChange={(e) => setNotice({ ...notice, [key]: e.target.value })} /> : <input type={type} required={required} value={value} onChange={(e) => setNotice({ ...notice, [key]: e.target.value })} />}</label>;
  }
  const activeReport = reports.find((item) => item.reference === selectedReport);
  return <div className="admin-page"><header className="admin-top"><a href="/">← {a.back}</a><div className="header-end"><label className="language"><span className="sr-only">Language</span><select value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)}>{locales.map((item) => <option key={item} value={item}>{languageNames[item]}</option>)}</select></label><a className="admin-link" href="/signout-with-chatgpt?return_to=%2Fteam%2Flogin" target="_top">{t("signOut")}</a></div></header><main className="admin-main"><p className="eyebrow">{t("teamPortal")}</p><h1>{a.title}</h1><p className="admin-intro">{a.subtitle}</p>{message && <p role="status" className={message === a.sent ? "" : "error"}>{message}</p>}
    {!auth && <p>{a.loading}</p>}
    {auth && !auth.signedIn && <p>{t("signIn")}</p>}
    {auth?.needsSetup && !auth.isAdmin && <form className="setup-card" onSubmit={setup}><h2>{a.setup}</h2><p>{a.setupHelp}</p><label>{a.setupKey}<input type="password" required value={setupKey} onChange={(e) => setSetupKey(e.target.value)} /></label><button className="button button-primary" disabled={busy}>{a.claim}</button></form>}
    {auth && auth.signedIn && !auth.isAdmin && !auth.needsSetup && <p>{a.forbidden}</p>}
    {auth?.isAdmin && <><div className="admin-tabs"><button type="button" className={tab === "notices" ? "active" : ""} onClick={() => setTab("notices")}>{a.notices} ({notices.length})</button><button type="button" className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>{a.reports} ({reports.length})</button></div>
      {tab === "notices" ? <div className="admin-grid"><section className="admin-surface"><h2>{notice.id ? a.editNotice : a.newNotice}</h2><form className="admin-form" onSubmit={saveNotice}><div className="form-row"><label>{a.kind}<select value={notice.kind} onChange={(e) => setNotice({ ...notice, kind: e.target.value })}>{kinds.map((kind) => <option key={kind} value={kind}>{t(kind)}</option>)}</select></label><label>{a.status}<select value={notice.status} onChange={(e) => setNotice({ ...notice, status: e.target.value })}>{["draft", "published", "archived"].filter((s) => notice.id || s !== "archived").map((s) => <option key={s} value={s}>{a[s as "draft" | "published" | "archived"]}</option>)}</select></label></div>{field("titleEn", a.titleEn, "text", true)}<div className="form-row">{field("titleZh", a.titleZh)}{field("titleMs", a.titleMs)}</div>{field("bodyEn", a.bodyEn, "textarea", true)}<div className="form-row">{field("bodyZh", a.bodyZh, "textarea")}{field("bodyMs", a.bodyMs, "textarea")}</div>{field("location", a.location, "text", true)}<div className="form-row">{field("startAt", a.start, "datetime-local")}{field("endAt", a.end, "datetime-local")}</div>{field("diversion", a.diversion, "textarea")}<div className="form-row">{field("latitude", a.latitude)}{field("longitude", a.longitude)}</div><div className="admin-actions"><button className="button button-primary" disabled={busy}>{a.saveNotice}</button>{notice.id && <button className="button button-outline" type="button" onClick={() => setNotice(emptyNotice())}>{a.cancelEdit}</button>}</div></form></section><aside className="admin-surface"><h2>{a.notices}</h2><div className="admin-list">{notices.length ? notices.map((item) => <button key={item.id} type="button" className={notice.id === item.id ? "active" : ""} onClick={() => setNotice({ ...item, titleZh: item.titleZh || "", titleMs: item.titleMs || "", bodyZh: item.bodyZh || "", bodyMs: item.bodyMs || "", startAt: localInput(item.startAt), endAt: localInput(item.endAt), diversion: item.diversion || "", latitude: item.latitude || "", longitude: item.longitude || "" })}><span className="pill">{a[item.status as "draft" | "published" | "archived"]}</span><b>{item.titleEn}</b><small>{item.location}</small></button>) : <p>{a.noNotices}</p>}</div></aside></div>
      : <div className="admin-grid"><section className="admin-surface"><h2>{a.reports}</h2><div className="admin-list">{reports.length ? reports.map((item) => <button key={item.id} type="button" className={selectedReport === item.reference ? "active" : ""} onClick={() => { setSelectedReport(item.reference); setNewStatus(item.status); }}><span className="pill">{a[item.status as "received" | "reviewing" | "assigned" | "resolved" | "closed"]}</span><b>{item.reference} · {t(item.kind)}</b><small>{item.location}</small></button>) : <p>{a.noReports}</p>}</div></section>{activeReport && <section className="admin-surface"><h2>{activeReport.reference}</h2><p><b>{a.location}:</b> {activeReport.location}</p><p><b>{a.contact}:</b> {activeReport.contactEmail || "—"}</p><p style={{ whiteSpace: "pre-wrap" }}>{activeReport.description}</p>{activeReport.hasPhoto && <a className="map-link" href={`/api/reports/photo?reference=${encodeURIComponent(activeReport.reference)}`} target="_blank" rel="noopener noreferrer">{a.evidence} ↗</a>}<h3>{a.history}</h3><ol className="timeline">{events.filter((item) => item.reportId === activeReport.id).slice().reverse().map((item) => <li key={item.id}><b>{a[item.status as "received" | "reviewing" | "assigned" | "resolved" | "closed"]} · {new Date(item.createdAt).toLocaleString()}</b><span>{locale === "zh" ? item.noteZh || item.noteEn : locale === "ms" ? item.noteMs || item.noteEn : item.noteEn}</span></li>)}</ol><form className="admin-form" onSubmit={updateReport}><label>{a.reportStatus}<select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>{["received", "reviewing", "assigned", "resolved", "closed"].map((s) => <option key={s} value={s}>{a[s as "received" | "reviewing" | "assigned" | "resolved" | "closed"]}</option>)}</select></label><p className="admin-intro">{a.responseHelp}</p><label>{a.note}<textarea required minLength={5} value={noteEn} onChange={(e) => setNoteEn(e.target.value)} /></label><label>{a.noteZh}<textarea value={noteZh} onChange={(e) => setNoteZh(e.target.value)} /></label><label>{a.noteMs}<textarea value={noteMs} onChange={(e) => setNoteMs(e.target.value)} /></label><button className="button button-primary" disabled={busy}>{a.update}</button></form></section>}</div>}
    </>}
  </main></div>;
}
