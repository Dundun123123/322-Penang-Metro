"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { languageNames, locales } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";
import ConstructionMap from "@/components/construction-map";
import { decodeRoutePath, encodeRoutePath } from "@/lib/route-path";
import {
  decodeNoticePoints,
  getTransportStops,
  MAX_STOP_CHANGES,
  remainingDays,
  type NoticePoints,
} from "@/lib/notice-features";

type NoticeForm = {
  id?: string;
  images?: { id: string }[];
  kind: string;
  status: string;
  titleEn: string;
  titleZh: string;
  titleMs: string;
  bodyEn: string;
  bodyZh: string;
  bodyMs: string;
  location: string;
  startAt: string;
  endAt: string;
  diversion: string;
  latitude: string;
  longitude: string;
  routePath: string;
  progressPercent: number | null;
  pointData: string;
};
type Report = {
  id: string;
  reference: string;
  kind: string;
  location: string;
  description: string;
  contactEmail?: string | null;
  status: string;
  createdAt: string;
  hasPhoto: boolean;
};
type ReportEvent = {
  id: string;
  reportId: string;
  status: string;
  noteEn: string;
  noteZh?: string | null;
  noteMs?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  noticeId?: string | null;
  noticeTitle?: string | null;
  createdAt: string;
};
type AdminAccount = {
  signedIn: boolean;
  isAdmin: boolean;
  needsSetup: boolean;
  role?: string;
  department?: string | null;
};
type AuthorityAccount = { id: string; email: string; name: string; department: string };
const portalWords = {
  en: {
    title: "Authority collaboration workspace",
    subtitle:
      "Review community feedback, record each response, and connect outcomes to published notices.",
    eyebrow: "Transport & local authorities",
    accounts: "Authority accounts",
    create: "Create authority account",
    department: "Department",
    transport: "Transportation bureau",
    local: "Local authority",
    password: "Temporary password (12+ characters)",
    accountHelp:
      "Team-created local accounts only. Share credentials privately; this does not verify official affiliation.",
    image: "Notice photos (up to 4, JPEG/PNG/WebP, 5 MB each)",
    removeImage: "Remove image",
    relatedNotice: "Related published notice (after resolution)",
    noNotice: "No linked notice",
    noticeLink: "View related notice",
    progress: "Response progress",
    actor: "Response by",
    saveImages: "Save notice and photos",
    moreReports: "Load more reports",
    moreHistory: "Load earlier responses",
    retryDraft: "The notice remains a draft. Retry to continue uploading to the same notice.",
  },
  zh: {
    title: "主管部门协作工作台",
    subtitle: "查看居民反馈、逐阶段回执，并将处理结果关联到已发布公告。",
    eyebrow: "交通部门与地方主管部门",
    accounts: "主管部门账号",
    create: "创建主管部门账号",
    department: "所属部门",
    transport: "交通部门",
    local: "地方主管部门",
    password: "临时密码（至少 12 位）",
    accountHelp: "仅施工团队可创建本地协作账号。请私下交付密码；账号不代表官方身份已验证。",
    image: "公告图片（最多 4 张，JPEG/PNG/WebP，每张不超过 5 MB）",
    removeImage: "移除图片",
    relatedNotice: "关联已发布公告（解决后）",
    noNotice: "不关联公告",
    noticeLink: "查看相关公告",
    progress: "回执进度",
    actor: "回执人",
    saveImages: "保存公告和图片",
    moreReports: "加载更多反馈",
    moreHistory: "加载更早回执",
    retryDraft: "公告已保留为草稿。重试会继续上传到同一公告，不会重复创建。",
  },
  ms: {
    title: "Ruang kerjasama pihak berkuasa",
    subtitle:
      "Semak maklum balas, catat setiap respons dan pautkan hasil kepada makluman terbitan.",
    eyebrow: "Pengangkutan & pihak berkuasa tempatan",
    accounts: "Akaun pihak berkuasa",
    create: "Cipta akaun pihak berkuasa",
    department: "Jabatan",
    transport: "Biro pengangkutan",
    local: "Pihak berkuasa tempatan",
    password: "Kata laluan sementara (12+ aksara)",
    accountHelp:
      "Hanya pasukan boleh mencipta akaun tempatan. Kongsi kata laluan secara peribadi; akaun ini tidak mengesahkan status rasmi.",
    image: "Foto makluman (hingga 4, JPEG/PNG/WebP, 5 MB setiap satu)",
    removeImage: "Buang foto",
    relatedNotice: "Makluman terbitan berkaitan (selepas selesai)",
    noNotice: "Tiada makluman berkaitan",
    noticeLink: "Lihat makluman berkaitan",
    progress: "Kemajuan respons",
    actor: "Respons oleh",
    saveImages: "Simpan makluman dan foto",
    moreReports: "Muatkan lagi laporan",
    moreHistory: "Muatkan respons terdahulu",
    retryDraft:
      "Makluman kekal sebagai draf. Cuba lagi untuk meneruskan muat naik pada makluman yang sama.",
  },
};
const noticeSections = ["schedule", "closure", "business", "transport", "safety"] as const;
const emptyNotice = (kind = "schedule"): NoticeForm => ({
  kind,
  status: "draft",
  titleEn: "",
  titleZh: "",
  titleMs: "",
  bodyEn: "",
  bodyZh: "",
  bodyMs: "",
  location: "",
  startAt: "",
  endAt: "",
  diversion: "",
  latitude: "",
  longitude: "",
  routePath: "",
  progressPercent: kind === "schedule" ? 0 : null,
  pointData: kind === "transport" ? JSON.stringify({ stops: [{}] }) : "",
});

const sectionWords = {
  en: {
    schedule: "Construction plan",
    closure: "Road closure",
    business: "Business access",
    transport: "Public transport",
    safety: "Safety issue",
    progress: "Work completed",
    expectedEnd: "Estimated completion (Malaysia)",
    daysLeft: "Estimated days remaining",
    finished: "Complete",
    overdue: "Estimated date has passed; update the plan",
    chooseEnd: "Set the expected completion date to show days remaining",
    originalEntrance: "Original entrance",
    temporaryEntrance: "Temporary entrance",
    oldStop: "Current bus stop",
    newStop: "Replacement bus stop",
    stopChange: "Stop change",
    addStopChange: "Add another stop change",
    removeStopChange: "Remove stop change",
    markerHelp: "Choose what to place, then click the map or a search result.",
    blockedRoad: "Blocked road section",
    routeAndEntrances: "Blocked road and entrances",
    stopsMap: "Current and replacement bus stops",
    safetyMap: "Safety issue location",
    hazard: "Affected location",
    safetyGuidance: "Safety precautions or temporary access advice",
    safetyHelp:
      "Search for the affected place, then select the result or click the exact location on the map.",
    accessGuidance: "How customers and deliveries can enter",
    walkingGuidance: "How to reach the replacement stop",
    affectedRoad: "Draw the road section obstructing business access.",
    stopHelp: "For each numbered change, select its current and replacement stop on the map.",
    progressHelp:
      "Update this percentage as verified work advances; the remaining days come from the completion date.",
    newKind: "Create a new notice in this section",
    legacyKind: "Existing safety notice",
  },
  zh: {
    schedule: "施工计划",
    closure: "道路封闭",
    business: "商铺进出情况",
    transport: "公共交通",
    safety: "安全问题",
    progress: "已完成进度",
    expectedEnd: "预计完成时间（马来西亚）",
    daysLeft: "预计还需天数",
    finished: "已完成",
    overdue: "预计日期已过，请更新计划",
    chooseEnd: "填写预计完成时间后显示剩余天数",
    originalEntrance: "原入口",
    temporaryEntrance: "临时入口",
    oldStop: "原巴士站",
    newStop: "新巴士站",
    stopChange: "站点变更",
    addStopChange: "新增一组站点",
    removeStopChange: "删除这组站点",
    markerHelp: "先选择要标记的地点，再点击地图或搜索结果。",
    blockedRoad: "受阻路段",
    routeAndEntrances: "受阻路段与商铺入口",
    stopsMap: "原站点与新站点",
    safetyMap: "安全问题地点",
    hazard: "受影响地点",
    safetyGuidance: "安全提醒或临时通行指引",
    safetyHelp: "搜索受影响地点后选择结果，或直接在地图上点击准确位置。",
    accessGuidance: "顾客及送货如何进出",
    walkingGuidance: "如何步行前往新站点",
    affectedRoad: "沿道路绘制影响商铺进出的封闭路段。",
    stopHelp: "每组站点分别选择原巴士站和对应的新巴士站，地图会显示相同编号。",
    progressHelp: "根据核实的施工进展更新百分比；剩余天数由预计完成时间计算。",
    newKind: "在此部分新建公告",
    legacyKind: "已有安全公告",
  },
  ms: {
    schedule: "Pelan pembinaan",
    closure: "Penutupan jalan",
    business: "Akses perniagaan",
    transport: "Pengangkutan awam",
    safety: "Isu keselamatan",
    progress: "Kerja siap",
    expectedEnd: "Anggaran siap (Malaysia)",
    daysLeft: "Anggaran hari berbaki",
    finished: "Selesai",
    overdue: "Tarikh anggaran telah berlalu; kemas kini pelan",
    chooseEnd: "Tetapkan tarikh siap untuk melihat hari berbaki",
    originalEntrance: "Pintu masuk asal",
    temporaryEntrance: "Pintu masuk sementara",
    oldStop: "Hentian bas asal",
    newStop: "Hentian bas baharu",
    stopChange: "Perubahan hentian",
    addStopChange: "Tambah perubahan hentian",
    removeStopChange: "Buang perubahan hentian",
    markerHelp: "Pilih lokasi, kemudian klik peta atau hasil carian.",
    blockedRoad: "Jalan terhalang",
    routeAndEntrances: "Jalan terhalang dan pintu masuk",
    stopsMap: "Hentian asal dan baharu",
    safetyMap: "Lokasi isu keselamatan",
    hazard: "Lokasi terjejas",
    safetyGuidance: "Langkah keselamatan atau panduan akses sementara",
    safetyHelp:
      "Cari tempat terjejas, kemudian pilih hasil carian atau klik lokasi tepat pada peta.",
    accessGuidance: "Cara pelanggan dan penghantaran masuk",
    walkingGuidance: "Cara berjalan ke hentian baharu",
    affectedRoad: "Lukis bahagian jalan yang menghalang akses perniagaan.",
    stopHelp: "Pilih hentian asal dan gantian bagi setiap perubahan bernombor pada peta.",
    progressHelp:
      "Kemas kini peratus selepas kerja disahkan; hari berbaki dikira daripada tarikh siap.",
    newKind: "Cipta makluman baharu dalam bahagian ini",
    legacyKind: "Makluman keselamatan sedia ada",
  },
};

const adminWords = {
  en: {
    title: "Project team workspace",
    subtitle: "Publish verified notices and respond to community reports.",
    notices: "Notices",
    reports: "Reports",
    back: "Community site",
    setup: "Set up the first administrator",
    setupHelp: "Enter the private setup key supplied with the site. This can be used only once.",
    setupKey: "Setup key",
    claim: "Activate administration",
    newNotice: "New notice",
    editNotice: "Edit notice",
    saveNotice: "Save notice",
    cancelEdit: "New notice instead",
    titleEn: "Title in English",
    titleZh: "Title in Chinese",
    titleMs: "Title in Malay",
    bodyEn: "Details in English",
    bodyZh: "Details in Chinese",
    bodyMs: "Details in Malay",
    noticeTitle: "Notice title",
    noticeBody: "Notice details",
    singleLanguageHelp:
      "Publish the notice in one language. Residents will see the original text you enter here.",
    location: "Location",
    kind: "Category",
    status: "Publication status",
    start: "Start time (Malaysia)",
    end: "End time (Malaysia)",
    diversion: "Diversion or access guidance",
    latitude: "Latitude (optional)",
    longitude: "Longitude (optional)",
    note: "Response note (any language)",
    noteZh: "Response note in Chinese",
    noteMs: "Response note in Malay",
    update: "Update report",
    noReports: "No reports yet.",
    noNotices: "No notices yet.",
    evidence: "View photo",
    sent: "Saved successfully.",
    forbidden: "You do not have project team access.",
    loading: "Loading…",
    contact: "Contact",
    history: "Response history",
    reportStatus: "New status",
    responseHelp: "Response notes are visible to the reporter.",
    draft: "Draft",
    published: "Published",
    archived: "Archived",
    received: "Received",
    reviewing: "Under review",
    assigned: "Assigned",
    resolved: "Resolved",
    closed: "Closed",
  },
  zh: {
    title: "项目组工作台",
    subtitle: "发布已核实的公告并处理社区报告。",
    notices: "公告管理",
    reports: "问题报告",
    back: "返回社区网站",
    setup: "设置首位管理员",
    setupHelp: "请输入网站提供的私人设置密钥。此密钥只能用于首次设置。",
    setupKey: "设置密钥",
    claim: "启用管理权限",
    newNotice: "新建公告",
    editNotice: "编辑公告",
    saveNotice: "保存公告",
    cancelEdit: "改为新建公告",
    titleEn: "英文标题",
    titleZh: "中文标题",
    titleMs: "马来文标题",
    bodyEn: "英文详情",
    bodyZh: "中文详情",
    bodyMs: "马来文详情",
    noticeTitle: "公告标题",
    noticeBody: "公告详情",
    singleLanguageHelp: "使用一种语言发布即可，居民会看到你在这里填写的原文。",
    location: "地点",
    kind: "类别",
    status: "发布状态",
    start: "开始时间（马来西亚）",
    end: "结束时间（马来西亚）",
    diversion: "绕行或通行说明",
    latitude: "纬度（选填）",
    longitude: "经度（选填）",
    note: "回执内容（可使用任意语言）",
    noteZh: "中文处理说明",
    noteMs: "马来文处理说明",
    update: "更新报告",
    noReports: "目前没有报告。",
    noNotices: "目前没有公告。",
    evidence: "查看照片",
    sent: "保存成功。",
    forbidden: "你的账户没有项目组权限。",
    loading: "加载中…",
    contact: "联系方式",
    history: "处理记录",
    reportStatus: "新状态",
    responseHelp: "处理说明会显示给报告提交者。",
    draft: "草稿",
    published: "已发布",
    archived: "已归档",
    received: "已收到",
    reviewing: "审核中",
    assigned: "已分派",
    resolved: "已解决",
    closed: "已关闭",
  },
  ms: {
    title: "Ruang kerja pasukan projek",
    subtitle: "Terbitkan makluman yang disahkan dan respons laporan komuniti.",
    notices: "Makluman",
    reports: "Laporan",
    back: "Laman komuniti",
    setup: "Sediakan pentadbir pertama",
    setupHelp:
      "Masukkan kunci persediaan peribadi yang dibekalkan bersama laman. Kunci ini hanya boleh digunakan sekali.",
    setupKey: "Kunci persediaan",
    claim: "Aktifkan pentadbiran",
    newNotice: "Makluman baharu",
    editNotice: "Sunting makluman",
    saveNotice: "Simpan makluman",
    cancelEdit: "Buat makluman baharu",
    titleEn: "Tajuk dalam bahasa Inggeris",
    titleZh: "Tajuk dalam bahasa Cina",
    titleMs: "Tajuk dalam bahasa Melayu",
    bodyEn: "Butiran dalam bahasa Inggeris",
    bodyZh: "Butiran dalam bahasa Cina",
    bodyMs: "Butiran dalam bahasa Melayu",
    noticeTitle: "Tajuk makluman",
    noticeBody: "Butiran makluman",
    singleLanguageHelp:
      "Terbitkan dalam satu bahasa sahaja. Penduduk akan melihat teks asal yang dimasukkan di sini.",
    location: "Lokasi",
    kind: "Kategori",
    status: "Status penerbitan",
    start: "Masa mula (Malaysia)",
    end: "Masa tamat (Malaysia)",
    diversion: "Lencongan atau panduan akses",
    latitude: "Latitud (pilihan)",
    longitude: "Longitud (pilihan)",
    note: "Nota respons (mana-mana bahasa)",
    noteZh: "Nota respons dalam bahasa Cina",
    noteMs: "Nota respons dalam bahasa Melayu",
    update: "Kemas kini laporan",
    noReports: "Belum ada laporan.",
    noNotices: "Belum ada makluman.",
    evidence: "Lihat foto",
    sent: "Berjaya disimpan.",
    forbidden: "Anda tiada akses pasukan projek.",
    loading: "Memuatkan…",
    contact: "Hubungan",
    history: "Sejarah respons",
    reportStatus: "Status baharu",
    responseHelp: "Nota respons dapat dilihat oleh pelapor.",
    draft: "Draf",
    published: "Diterbitkan",
    archived: "Diarkibkan",
    received: "Diterima",
    reviewing: "Dalam semakan",
    assigned: "Ditugaskan",
    resolved: "Selesai",
    closed: "Ditutup",
  },
};
async function api<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...options });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}
function newUploadId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
async function fetchAdminData() {
  const account = await api<AdminAccount>("/api/admin");
  if (!account.isAdmin)
    return {
      account,
      notices: [] as NoticeForm[],
      reports: [] as Report[],
      reportNextPage: null as number | null,
    };
  const [noticeData, reportData] = await Promise.all([
    api<{ notices: NoticeForm[] }>("/api/notices?all=1"),
    api<{ reports: Report[]; nextPage: number | null }>("/api/admin/reports"),
  ]);
  return {
    account,
    notices: noticeData.notices,
    reports: reportData.reports,
    reportNextPage: reportData.nextPage,
  };
}
function localInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16);
}
function toIso(value: string) {
  return value ? new Date(value + ":00+08:00").toISOString() : "";
}

export default function AdminApp({ role = "team" }: { role?: "team" | "authority" }) {
  const { locale, setLocale, t } = useLocale();
  const a = adminWords[locale];
  const f = sectionWords[locale];
  const p = portalWords[locale];
  const [auth, setAuth] = useState<AdminAccount | null>(null);
  const [setupKey, setSetupKey] = useState("");
  const [tab, setTab] = useState<"notices" | "reports" | "accounts">(
    role === "authority" ? "reports" : "notices",
  );
  const [notices, setNotices] = useState<NoticeForm[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportNextPage, setReportNextPage] = useState<number | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [events, setEvents] = useState<ReportEvent[]>([]);
  const [eventNextPage, setEventNextPage] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [notice, setNotice] = useState<NoticeForm>(emptyNotice());
  const [isDraftOnServer, setIsDraftOnServer] = useState(true);
  const [selectedReport, setSelectedReport] = useState("");
  const selectedReferenceRef = useRef("");
  const [selectedReportItem, setSelectedReportItem] = useState<Report | null>(null);
  const [newStatus, setNewStatus] = useState("reviewing");
  const [noteEn, setNoteEn] = useState("");
  const [noteZh, setNoteZh] = useState("");
  const [noteMs, setNoteMs] = useState("");
  const [linkedNoticeId, setLinkedNoticeId] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const uploadIds = useRef(new WeakMap<File, string>());
  const noticeRequestId = useRef<string | null>(null);
  const [authorityAccounts, setAuthorityAccounts] = useState<AuthorityAccount[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  function applyAdminData(data: Awaited<ReturnType<typeof fetchAdminData>>) {
    setAuth(data.account);
    setNotices(data.notices);
    setReports(data.reports);
    setReportNextPage(data.reportNextPage);
  }
  async function load() {
    applyAdminData(await fetchAdminData());
    if (role === "team") {
      const data = await api<{ accounts: AuthorityAccount[] }>("/api/admin/authorities");
      setAuthorityAccounts(data.accounts);
    }
  }
  useEffect(() => {
    let active = true;
    fetchAdminData()
      .then((data) => {
        if (active) applyAdminData(data);
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      });
    if (role === "team")
      api<{ accounts: AuthorityAccount[] }>("/api/admin/authorities")
        .then((data) => {
          if (active) setAuthorityAccounts(data.accounts);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [role]);
  useEffect(() => {
    if (!selectedReport) return;
    selectedReferenceRef.current = selectedReport;
    let active = true;
    api<{ events: ReportEvent[]; nextPage: number | null }>(
      `/api/admin/reports?reference=${encodeURIComponent(selectedReport)}`,
    )
      .then((data) => {
        if (!active) return;
        setEvents(data.events);
        setEventNextPage(data.nextPage);
      })
      .catch((error) => {
        if (active) setMessage(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedReport]);
  async function loadMoreReports() {
    if (reportNextPage === null || reportsLoading) return;
    setReportsLoading(true);
    try {
      const data = await api<{ reports: Report[]; nextPage: number | null }>(
        `/api/admin/reports?page=${reportNextPage}`,
      );
      setReports((current) => {
        const existing = new Set(current.map((item) => item.id));
        return [...current, ...data.reports.filter((item) => !existing.has(item.id))];
      });
      setReportNextPage(data.nextPage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setReportsLoading(false);
    }
  }
  async function loadMoreHistory() {
    if (!selectedReport || eventNextPage === null || historyLoading) return;
    const reference = selectedReport;
    setHistoryLoading(true);
    try {
      const data = await api<{ events: ReportEvent[]; nextPage: number | null }>(
        `/api/admin/reports?reference=${encodeURIComponent(reference)}&page=${eventNextPage}`,
      );
      if (reference !== selectedReferenceRef.current) return;
      setEvents((current) => {
        const existing = new Set(current.map((item) => item.id));
        return [...current, ...data.events.filter((item) => !existing.has(item.id))];
      });
      setEventNextPage(data.nextPage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setHistoryLoading(false);
    }
  }
  async function setup(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await api("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupKey }),
      });
      setSetupKey("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  async function saveNotice(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    let draftPending = isDraftOnServer && Boolean(notice.id);
    try {
      const decodedPoints = decodeNoticePoints(notice.pointData) || {};
      const payload = {
        ...notice,
        titleZh: "",
        titleMs: "",
        bodyZh: "",
        bodyMs: "",
        routePath: encodeRoutePath(decodeRoutePath(notice.routePath) || []),
        pointData: JSON.stringify(
          notice.kind === "transport" ? { stops: getTransportStops(decodedPoints) } : decodedPoints,
        ),
        progressPercent: notice.kind === "schedule" ? notice.progressPercent : null,
        startAt: toIso(notice.startAt),
        endAt: toIso(notice.endAt),
      };
      if ((notice.images?.length || 0) + selectedImages.length > 4)
        throw new Error("Each notice supports up to four images");
      if (
        selectedImages.some(
          (file) =>
            !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
            !file.size ||
            file.size > 5 * 1024 * 1024,
        )
      )
        throw new Error("Select JPEG, PNG or WebP images of 5 MB or less");
      const requestedStatus = payload.status;
      const stageDraft =
        selectedImages.length > 0 && requestedStatus === "published" && isDraftOnServer;
      if (!notice.id && !noticeRequestId.current) noticeRequestId.current = newUploadId();
      const saved = await api<{ notice?: { id: string; reused?: boolean } }>("/api/notices", {
        method: notice.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          clientRequestId: notice.id ? undefined : noticeRequestId.current,
          status: stageDraft ? "draft" : requestedStatus,
        }),
      });
      const noticeId = notice.id || saved.notice?.id;
      if (!noticeId) throw new Error("Notice was not created");
      setNotice((current) => ({ ...current, id: noticeId }));
      if (saved.notice?.reused)
        await api("/api/notices", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            id: noticeId,
            status: stageDraft ? "draft" : requestedStatus,
          }),
        });
      draftPending = stageDraft || requestedStatus === "draft";
      setIsDraftOnServer(draftPending);
      for (const file of [...selectedImages]) {
        const form = new FormData();
        form.set("noticeId", noticeId);
        form.set("image", file);
        let uploadId = uploadIds.current.get(file);
        if (!uploadId) {
          uploadId = newUploadId();
          uploadIds.current.set(file, uploadId);
        }
        form.set("uploadId", uploadId);
        const result = await api<{ image: { id: string } }>("/api/notices/images", {
          method: "POST",
          body: form,
        });
        setNotice((current) => ({
          ...current,
          images: [...(current.images || []), result.image],
        }));
        setSelectedImages((current) => current.filter((pending) => pending !== file));
      }
      if (stageDraft) {
        await api("/api/notices", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: noticeId, status: "published" }),
        });
        draftPending = false;
        setIsDraftOnServer(false);
      }
      setMessage(a.sent);
      setNotice(emptyNotice(notice.kind));
      noticeRequestId.current = null;
      setIsDraftOnServer(true);
      setSelectedImages([]);
      await load().catch((error) => {
        setMessage(error instanceof Error ? error.message : String(error));
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      setMessage(draftPending ? `${reason} ${p.retryDraft}` : reason);
    } finally {
      setBusy(false);
    }
  }
  async function updateReport(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await api("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: selectedReport,
          status: newStatus,
          noteEn,
          noteZh,
          noteMs,
          noticeId: linkedNoticeId,
        }),
      });
      setReports((current) =>
        current.map((item) =>
          item.reference === selectedReport ? { ...item, status: newStatus } : item,
        ),
      );
      setSelectedReportItem((current) =>
        current?.reference === selectedReport ? { ...current, status: newStatus } : current,
      );
      setMessage(a.sent);
      setNoteEn("");
      setNoteZh("");
      setNoteMs("");
      setLinkedNoticeId("");
      try {
        const history = await api<{ events: ReportEvent[]; nextPage: number | null }>(
          `/api/admin/reports?reference=${encodeURIComponent(selectedReport)}`,
        );
        setEvents(history.events);
        setEventNextPage(history.nextPage);
      } catch (error) {
        setMessage(`${a.sent} ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  async function createAuthority(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetForm = event.currentTarget;
    setBusy(true);
    setMessage("");
    const form = new FormData(targetForm);
    try {
      await api("/api/admin/authorities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      targetForm.reset();
      setMessage(a.sent);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  async function removeImage(id: string) {
    if (!notice.id) return;
    setBusy(true);
    try {
      await api(`/api/notices/images?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setNotice((current) => ({
        ...current,
        images: current.images?.filter((image) => image.id !== id),
      }));
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  function setPointName(key: "original" | "replacement", name: string) {
    setNotice((current) => {
      const points = decodeNoticePoints(current.pointData) || {};
      return {
        ...current,
        pointData: JSON.stringify({ ...points, [key]: { ...points[key], name } }),
      };
    });
  }
  function setStopName(index: number, key: "original" | "replacement", name: string) {
    setNotice((current) => {
      const stops = getTransportStops(decodeNoticePoints(current.pointData) || {});
      const next = stops.length ? stops.map((pair) => ({ ...pair })) : [{}];
      next[index] = { ...next[index], [key]: { ...next[index]?.[key], name } };
      return { ...current, pointData: JSON.stringify({ stops: next }) };
    });
  }
  function addStopChange() {
    setNotice((current) => {
      const stops = getTransportStops(decodeNoticePoints(current.pointData) || {});
      const existing = stops.length ? stops : [{}];
      if (existing.length >= MAX_STOP_CHANGES) return current;
      return { ...current, pointData: JSON.stringify({ stops: [...existing, {}] }) };
    });
  }
  function removeStopChange(index: number) {
    setNotice((current) => {
      const stops = getTransportStops(decodeNoticePoints(current.pointData) || {});
      if (stops.length <= 1) return current;
      return {
        ...current,
        pointData: JSON.stringify({ stops: stops.filter((_, pairIndex) => pairIndex !== index) }),
      };
    });
  }
  function field(
    key: Exclude<keyof NoticeForm, "images">,
    label: string,
    type: "text" | "textarea" | "datetime-local" = "text",
    required = false,
  ) {
    const value = notice[key] || "";
    const locationHelp =
      locale === "zh"
        ? "请填写道路名、附近地标和地区。地图会自动定位；经纬度可用于精确标记施工点。"
        : locale === "ms"
          ? "Masukkan nama jalan, mercu tanda berdekatan dan kawasan. Peta akan mencari lokasi secara automatik; koordinat memberikan tanda yang tepat."
          : "Enter the road, nearby landmark and area. The map locates it automatically; coordinates provide an exact construction pin.";
    const routeLabels =
      locale === "zh"
        ? {
            title: "绘制施工路段",
            help: "选择当前路段，沿道路依次点击起点、转弯点和终点；有分支时新增路段继续绘制。",
            undo: "撤销上一点",
            clear: "删除当前路段",
            start: "施工起点",
            end: "施工终点",
            branch: "路段",
            branches: "施工路段",
            addBranch: "新增路段",
            empty: "尚未绘制路段，点击地图设置起点",
            search: "搜索",
            searchPlaceholder: "搜索槟城道路、地区或地标",
            searching: "搜索中…",
            noResults: "没有找到匹配地点，请尝试道路名称或附近地标。",
          }
        : locale === "ms"
          ? {
              title: "Lukis bahagian pembinaan",
              help: "Pilih bahagian semasa dan klik titik mula, selekoh serta tamat. Tambah bahagian untuk cabang lain.",
              undo: "Undur titik",
              clear: "Padam bahagian ini",
              start: "Pembinaan bermula",
              end: "Pembinaan berakhir",
              branch: "Bahagian",
              branches: "Bahagian pembinaan",
              addBranch: "Tambah bahagian",
              empty: "Belum ada bahagian; klik peta untuk titik mula",
              search: "Cari",
              searchPlaceholder: "Cari jalan, kawasan atau mercu tanda di Pulau Pinang",
              searching: "Mencari…",
              noResults: "Tiada lokasi sepadan. Cuba nama jalan atau mercu tanda berdekatan.",
            }
          : {
              title: "Draw construction sections",
              help: "Select a section and click its start, bends and end in order. Add another section for each branch.",
              undo: "Undo point",
              clear: "Remove this section",
              start: "Construction starts",
              end: "Construction ends",
              branch: "Section",
              branches: "Construction sections",
              addBranch: "Add section",
              empty: "No section yet; click the map to set a start",
              search: "Search",
              searchPlaceholder: "Search Penang road, area or landmark",
              searching: "Searching…",
              noResults: "No matching location. Try a road name or nearby landmark.",
            };
    const mapLabels = {
      ...routeLabels,
      title:
        notice.kind === "business"
          ? f.routeAndEntrances
          : notice.kind === "transport"
            ? f.stopsMap
            : notice.kind === "safety"
              ? f.safetyMap
              : routeLabels.title,
      help:
        notice.kind === "business"
          ? f.affectedRoad
          : notice.kind === "transport"
            ? f.stopHelp
            : notice.kind === "safety"
              ? f.safetyHelp
              : routeLabels.help,
      original: notice.kind === "business" ? f.originalEntrance : f.oldStop,
      replacement: notice.kind === "business" ? f.temporaryEntrance : f.newStop,
      stopChange: f.stopChange,
      hazard: f.hazard,
      blockedRoute: f.blockedRoad,
      placeMarker: f.markerHelp,
    };
    return (
      <div key={key} className={key === "diversion" ? "field-with-route" : undefined}>
        <label>
          {label}
          {type === "textarea" ? (
            <textarea
              required={required}
              value={value}
              onChange={(e) => setNotice({ ...notice, [key]: e.target.value })}
            />
          ) : (
            <input
              type={type}
              required={required}
              value={value}
              onChange={(e) => setNotice({ ...notice, [key]: e.target.value })}
            />
          )}
          {key === "location" && <small className="field-help">{locationHelp}</small>}
        </label>
        {key === "diversion" &&
          ["closure", "business", "transport", "safety"].includes(notice.kind) && (
            <section className="route-editor">
              <h3>{mapLabels.title}</h3>
              <ConstructionMap
                key={`${notice.id || "new"}-${notice.kind}`}
                editable
                searchable
                initialQuery={notice.location}
                routes={decodeRoutePath(notice.routePath) || []}
                points={decodeNoticePoints(notice.pointData) || {}}
                markerMode={
                  notice.kind === "business"
                    ? "business"
                    : notice.kind === "transport"
                      ? "transport"
                      : notice.kind === "safety"
                        ? "safety"
                        : "none"
                }
                latitude={notice.latitude}
                longitude={notice.longitude}
                onChange={(routes) =>
                  setNotice((current) => ({ ...current, routePath: JSON.stringify(routes) }))
                }
                onPointsChange={(points: NoticePoints) =>
                  setNotice((current) => ({ ...current, pointData: JSON.stringify(points) }))
                }
                labels={mapLabels}
              />
            </section>
          )}
      </div>
    );
  }
  const activeReport =
    reports.find((item) => item.reference === selectedReport) || selectedReportItem;
  const transportStops = getTransportStops(decodeNoticePoints(notice.pointData) || {});
  return (
    <div className="admin-page">
      <header className="admin-top">
        <Link href="/community">← {a.back}</Link>
        <div className="header-end">
          <label className="language">
            <span className="sr-only">Language</span>
            <select value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)}>
              {locales.map((item) => (
                <option key={item} value={item}>
                  {languageNames[item]}
                </option>
              ))}
            </select>
          </label>
          <a className="admin-link" href="/logout">
            {t("signOut")}
          </a>
        </div>
      </header>
      <main className="admin-main">
        <p className="eyebrow">{role === "authority" ? p.eyebrow : t("teamPortal")}</p>
        <h1>{role === "authority" ? p.title : a.title}</h1>
        <p className="admin-intro">{role === "authority" ? p.subtitle : a.subtitle}</p>
        {message && (
          <p role="status" className={message === a.sent ? "" : "error"}>
            {message}
          </p>
        )}
        {!auth && <p>{a.loading}</p>}
        {auth && !auth.signedIn && <p>{t("signIn")}</p>}
        {auth?.needsSetup && !auth.isAdmin && (
          <form className="setup-card" onSubmit={setup}>
            <h2>{a.setup}</h2>
            <p>{a.setupHelp}</p>
            <label>
              {a.setupKey}
              <input
                type="password"
                required
                value={setupKey}
                onChange={(e) => setSetupKey(e.target.value)}
              />
            </label>
            <button className="button button-primary" disabled={busy}>
              {a.claim}
            </button>
          </form>
        )}
        {auth && auth.signedIn && !auth.isAdmin && !auth.needsSetup && <p>{a.forbidden}</p>}
        {auth?.isAdmin && (
          <>
            <div className="admin-tabs">
              <button
                type="button"
                className={tab === "notices" ? "active" : ""}
                onClick={() => setTab("notices")}
              >
                {a.notices} ({notices.length})
              </button>
              <button
                type="button"
                className={tab === "reports" ? "active" : ""}
                onClick={() => setTab("reports")}
              >
                {a.reports} ({reports.length}
                {reportNextPage !== null ? "+" : ""})
              </button>
              {role === "team" && (
                <button
                  type="button"
                  className={tab === "accounts" ? "active" : ""}
                  onClick={() => setTab("accounts")}
                >
                  {p.accounts} ({authorityAccounts.length})
                </button>
              )}
            </div>
            {tab === "notices" ? (
              <div className="admin-grid">
                <section className="admin-surface">
                  <h2>{notice.id ? a.editNotice : a.newNotice}</h2>
                  <p className="admin-form-note">{a.singleLanguageHelp}</p>
                  <div className="notice-type-nav" role="group" aria-label={a.kind}>
                    {noticeSections.map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        aria-pressed={notice.kind === kind}
                        className={notice.kind === kind ? "active" : ""}
                        title={f.newKind}
                        onClick={() => {
                          setNotice(emptyNotice(kind));
                          noticeRequestId.current = null;
                          setIsDraftOnServer(true);
                          setSelectedImages([]);
                        }}
                      >
                        {f[kind]}
                      </button>
                    ))}
                  </div>
                  <form className="admin-form" onSubmit={saveNotice}>
                    <label>
                      {a.status}
                      <select
                        value={notice.status}
                        onChange={(e) => setNotice({ ...notice, status: e.target.value })}
                      >
                        {["draft", "published", "archived"]
                          .filter((s) => notice.id || s !== "archived")
                          .map((s) => (
                            <option key={s} value={s}>
                              {a[s as "draft" | "published" | "archived"]}
                            </option>
                          ))}
                      </select>
                    </label>
                    {field("titleEn", a.noticeTitle, "text", true)}
                    {field("bodyEn", a.noticeBody, "textarea", true)}
                    <label>
                      {p.image}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        disabled={busy}
                        onChange={(event) =>
                          setSelectedImages(Array.from(event.target.files || []))
                        }
                      />
                    </label>
                    {selectedImages.length > 0 && (
                      <p className="field-help">
                        {selectedImages.map((file) => file.name).join(" · ")}
                      </p>
                    )}
                    {(notice.images || []).length > 0 && (
                      <div className="notice-image-grid">
                        {notice.images?.map((image) => (
                          <div className="notice-image-item" key={image.id}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/api/notices/images?id=${encodeURIComponent(image.id)}`}
                              alt=""
                            />
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => removeImage(image.id)}
                            >
                              {p.removeImage}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {field("location", a.location, "text", true)}
                    <div className="form-row">
                      {field("startAt", a.start, "datetime-local")}
                      {field(
                        "endAt",
                        notice.kind === "schedule" ? f.expectedEnd : a.end,
                        "datetime-local",
                        notice.kind === "schedule" && notice.status === "published",
                      )}
                    </div>
                    {notice.kind === "schedule" && (
                      <div className="progress-editor">
                        <label htmlFor="notice-progress">{f.progress}</label>
                        <div className="progress-controls">
                          <input
                            id="notice-progress"
                            type="range"
                            min="0"
                            max="100"
                            value={notice.progressPercent ?? 0}
                            onChange={(event) =>
                              setNotice({ ...notice, progressPercent: Number(event.target.value) })
                            }
                          />
                          <input
                            aria-label={f.progress}
                            type="number"
                            min="0"
                            max="100"
                            value={notice.progressPercent ?? 0}
                            onChange={(event) =>
                              setNotice({
                                ...notice,
                                progressPercent: Math.max(
                                  0,
                                  Math.min(100, Number(event.target.value) || 0),
                                ),
                              })
                            }
                          />
                          <span>%</span>
                        </div>
                        <div
                          className="progress-track"
                          role="progressbar"
                          aria-valuenow={notice.progressPercent ?? 0}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={f.progress}
                        >
                          <span style={{ width: `${notice.progressPercent ?? 0}%` }} />
                        </div>
                        <p className="field-help">{f.progressHelp}</p>
                        <p className="progress-estimate">
                          {f.daysLeft}:{" "}
                          {notice.progressPercent === 100
                            ? f.finished
                            : notice.endAt
                              ? (() => {
                                  const days = remainingDays(toIso(notice.endAt));
                                  return days === null
                                    ? f.chooseEnd
                                    : days < 0
                                      ? f.overdue
                                      : `${days}`;
                                })()
                              : f.chooseEnd}
                        </p>
                      </div>
                    )}
                    {notice.kind === "business" && (
                      <div className="form-row">
                        <label>
                          {f.originalEntrance}
                          <input
                            value={
                              (decodeNoticePoints(notice.pointData) || {}).original?.name || ""
                            }
                            onChange={(event) => setPointName("original", event.target.value)}
                            required={notice.status === "published"}
                          />
                        </label>
                        <label>
                          {f.temporaryEntrance}
                          <input
                            value={
                              (decodeNoticePoints(notice.pointData) || {}).replacement?.name || ""
                            }
                            onChange={(event) => setPointName("replacement", event.target.value)}
                            required={notice.status === "published"}
                          />
                        </label>
                      </div>
                    )}
                    {notice.kind === "transport" && (
                      <div className="stop-change-list">
                        {(transportStops.length ? transportStops : [{}]).map((pair, index) => (
                          <section className="stop-change-editor" key={index}>
                            <div className="stop-change-heading">
                              <h3>
                                {f.stopChange} {index + 1}
                              </h3>
                              {transportStops.length > 1 && (
                                <button
                                  type="button"
                                  className="stop-change-remove"
                                  onClick={() => removeStopChange(index)}
                                >
                                  {f.removeStopChange}
                                </button>
                              )}
                            </div>
                            <div className="form-row">
                              <label>
                                {f.oldStop} {index + 1}
                                <input
                                  value={pair.original?.name || ""}
                                  onChange={(event) =>
                                    setStopName(index, "original", event.target.value)
                                  }
                                  required={notice.status === "published"}
                                />
                              </label>
                              <label>
                                {f.newStop} {index + 1}
                                <input
                                  value={pair.replacement?.name || ""}
                                  onChange={(event) =>
                                    setStopName(index, "replacement", event.target.value)
                                  }
                                  required={notice.status === "published"}
                                />
                              </label>
                            </div>
                          </section>
                        ))}
                        <button
                          type="button"
                          className="button button-outline"
                          onClick={addStopChange}
                          disabled={transportStops.length >= MAX_STOP_CHANGES}
                        >
                          + {f.addStopChange}
                        </button>
                      </div>
                    )}
                    {notice.kind !== "schedule" &&
                      field(
                        "diversion",
                        notice.kind === "business"
                          ? f.accessGuidance
                          : notice.kind === "transport"
                            ? f.walkingGuidance
                            : notice.kind === "safety"
                              ? f.safetyGuidance
                              : a.diversion,
                        "textarea",
                      )}
                    {notice.kind === "closure" && (
                      <div className="form-row">
                        {field("latitude", a.latitude)}
                        {field("longitude", a.longitude)}
                      </div>
                    )}
                    <div className="admin-actions">
                      <button className="button button-primary" disabled={busy}>
                        {selectedImages.length ? p.saveImages : a.saveNotice}
                      </button>
                      {notice.id && (
                        <button
                          className="button button-outline"
                          type="button"
                          onClick={() => {
                            setNotice(emptyNotice());
                            noticeRequestId.current = null;
                            setIsDraftOnServer(true);
                            setSelectedImages([]);
                            noticeRequestId.current = null;
                          }}
                        >
                          {a.cancelEdit}
                        </button>
                      )}
                    </div>
                  </form>
                </section>
                <aside className="admin-surface">
                  <h2>{a.notices}</h2>
                  <div className="admin-list">
                    {notices.length ? (
                      notices.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={notice.id === item.id ? "active" : ""}
                          onClick={() => {
                            setSelectedImages([]);
                            setIsDraftOnServer(item.status === "draft");
                            setNotice({
                              ...item,
                              titleZh: "",
                              titleMs: "",
                              bodyZh: "",
                              bodyMs: "",
                              startAt: localInput(item.startAt),
                              endAt: localInput(item.endAt),
                              diversion: item.diversion || "",
                              latitude: item.latitude || "",
                              longitude: item.longitude || "",
                              pointData: item.pointData || "",
                              progressPercent:
                                item.progressPercent ?? (item.kind === "schedule" ? 0 : null),
                            });
                          }}
                        >
                          <span className="pill">
                            {a[item.status as "draft" | "published" | "archived"]}
                          </span>
                          <b>{item.titleEn}</b>
                          <small>
                            {noticeSections.includes(item.kind as (typeof noticeSections)[number])
                              ? f[item.kind as (typeof noticeSections)[number]]
                              : f.legacyKind}{" "}
                            · {item.location}
                          </small>
                        </button>
                      ))
                    ) : (
                      <p>{a.noNotices}</p>
                    )}
                  </div>
                </aside>
              </div>
            ) : tab === "reports" ? (
              <div className="admin-grid">
                <section className="admin-surface">
                  <h2>{a.reports}</h2>
                  <div className="admin-list">
                    {reports.length ? (
                      reports.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={selectedReport === item.reference ? "active" : ""}
                          onClick={() => {
                            selectedReferenceRef.current = item.reference;
                            setHistoryLoading(true);
                            setEvents([]);
                            setEventNextPage(null);
                            setSelectedReport(item.reference);
                            setSelectedReportItem(item);
                            setNewStatus(item.status);
                            setLinkedNoticeId("");
                          }}
                        >
                          <span className="pill">
                            {
                              a[
                                item.status as
                                  "received" | "reviewing" | "assigned" | "resolved" | "closed"
                              ]
                            }
                          </span>
                          <b>
                            {item.reference} · {t(item.kind)}
                          </b>
                          <small>{item.location}</small>
                        </button>
                      ))
                    ) : (
                      <p>{a.noReports}</p>
                    )}
                  </div>
                  {reportNextPage !== null && (
                    <button
                      className="button button-outline admin-load-more"
                      type="button"
                      onClick={loadMoreReports}
                      disabled={reportsLoading}
                    >
                      {reportsLoading ? a.loading : p.moreReports}
                    </button>
                  )}
                </section>
                {activeReport && (
                  <section className="admin-surface">
                    <h2>{activeReport.reference}</h2>
                    <p>
                      <b>{a.location}:</b> {activeReport.location}
                    </p>
                    <p>
                      <b>{a.contact}:</b> {activeReport.contactEmail || "—"}
                    </p>
                    <p style={{ whiteSpace: "pre-wrap" }}>{activeReport.description}</p>
                    <div className="receipt-progress" aria-label={p.progress}>
                      {["received", "reviewing", "assigned", "resolved", "closed"].map(
                        (stage, index) => (
                          <span
                            key={stage}
                            className={
                              index <=
                              ["received", "reviewing", "assigned", "resolved", "closed"].indexOf(
                                activeReport.status,
                              )
                                ? "done"
                                : ""
                            }
                          >
                            {index + 1}.{" "}
                            {
                              a[
                                stage as
                                  "received" | "reviewing" | "assigned" | "resolved" | "closed"
                              ]
                            }
                          </span>
                        ),
                      )}
                    </div>
                    {activeReport.hasPhoto && (
                      <a
                        className="map-link"
                        href={`/api/reports/photo?reference=${encodeURIComponent(activeReport.reference)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {a.evidence} ↗
                      </a>
                    )}
                    <h3>{a.history}</h3>
                    <ol className="timeline">
                      {events
                        .filter((item) => item.reportId === activeReport.id)
                        .slice()
                        .reverse()
                        .map((item) => (
                          <li key={item.id}>
                            <b>
                              {
                                a[
                                  item.status as
                                    "received" | "reviewing" | "assigned" | "resolved" | "closed"
                                ]
                              }{" "}
                              · {new Date(item.createdAt).toLocaleString()}
                            </b>
                            <span>
                              {locale === "zh"
                                ? item.noteZh || item.noteEn
                                : locale === "ms"
                                  ? item.noteMs || item.noteEn
                                  : item.noteEn}
                            </span>
                            {item.actorName && (
                              <small>
                                {p.actor}: {item.actorName} (
                                {item.actorRole === "authority" ? p.eyebrow : a.title})
                              </small>
                            )}
                            {item.noticeId && item.noticeTitle && (
                              <Link href={`/updates/${item.noticeId}`} className="map-link">
                                {p.noticeLink}: {item.noticeTitle} ↗
                              </Link>
                            )}
                          </li>
                        ))}
                    </ol>
                    {historyLoading && <p role="status">{a.loading}</p>}
                    {eventNextPage !== null && (
                      <button
                        className="button button-outline admin-load-more"
                        type="button"
                        onClick={loadMoreHistory}
                        disabled={historyLoading}
                      >
                        {historyLoading ? a.loading : p.moreHistory}
                      </button>
                    )}
                    <form className="admin-form" onSubmit={updateReport}>
                      <label>
                        {a.reportStatus}
                        <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                          {["received", "reviewing", "assigned", "resolved", "closed"].map((s) => (
                            <option key={s} value={s}>
                              {
                                a[
                                  s as "received" | "reviewing" | "assigned" | "resolved" | "closed"
                                ]
                              }
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="admin-intro">{a.responseHelp}</p>
                      <label>
                        {a.note}
                        <textarea
                          required
                          minLength={5}
                          value={noteEn}
                          onChange={(e) => setNoteEn(e.target.value)}
                        />
                      </label>
                      <label>
                        {a.noteZh}
                        <textarea value={noteZh} onChange={(e) => setNoteZh(e.target.value)} />
                      </label>
                      <label>
                        {a.noteMs}
                        <textarea value={noteMs} onChange={(e) => setNoteMs(e.target.value)} />
                      </label>
                      {(newStatus === "resolved" || newStatus === "closed") && (
                        <label>
                          {p.relatedNotice}
                          <select
                            value={linkedNoticeId}
                            onChange={(event) => setLinkedNoticeId(event.target.value)}
                          >
                            <option value="">{p.noNotice}</option>
                            {notices
                              .filter((item) => item.status === "published")
                              .map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.titleEn}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                      <button className="button button-primary" disabled={busy}>
                        {a.update}
                      </button>
                    </form>
                  </section>
                )}
              </div>
            ) : (
              <div className="admin-grid">
                <section className="admin-surface">
                  <h2>{p.create}</h2>
                  <p className="admin-form-note">{p.accountHelp}</p>
                  <form className="admin-form" onSubmit={createAuthority}>
                    <label>
                      {locale === "zh" ? "姓名" : locale === "ms" ? "Nama" : "Name"}
                      <input name="name" required minLength={2} />
                    </label>
                    <label>
                      {locale === "zh" ? "邮箱" : locale === "ms" ? "E-mel" : "Email"}
                      <input name="email" type="email" required />
                    </label>
                    <label>
                      {p.department}
                      <select name="department">
                        <option value="transport">{p.transport}</option>
                        <option value="local">{p.local}</option>
                      </select>
                    </label>
                    <label>
                      {p.password}
                      <input
                        name="password"
                        type="password"
                        minLength={12}
                        required
                        autoComplete="new-password"
                      />
                    </label>
                    <button className="button button-primary" disabled={busy}>
                      {p.create}
                    </button>
                  </form>
                </section>
                <aside className="admin-surface">
                  <h2>{p.accounts}</h2>
                  <div className="authority-account-list">
                    {authorityAccounts.map((account) => (
                      <div key={account.id}>
                        <b>{account.name}</b>
                        <span>{account.department === "transport" ? p.transport : p.local}</span>
                        <small>{account.email}</small>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
