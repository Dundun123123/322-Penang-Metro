export type Locale = "en" | "zh" | "ms";
export const locales: Locale[] = ["en", "zh", "ms"];
export const languageNames: Record<Locale, string> = { en: "English", zh: "中文", ms: "Bahasa Melayu" };
export const kinds = ["closure", "schedule", "transport", "safety", "business"] as const;
export const issueKinds = ["safety", "access", "closure", "transport", "noise", "business", "other"] as const;

export const words: Record<Locale, Record<string, string>> = {
  en: {
    brand: "Mutiara Line Community Desk", navHome: "Home", navNotices: "Updates", navReport: "Report an issue", navTrack: "Track a report", navAlerts: "My alerts", navAdmin: "Project team",
    unofficial: "Student-built community platform. Notices are published by site administrators and are not official government advice.",
    heroKicker: "PENANG LRT MUTIARA LINE", heroTitle: "The information you need while the line takes shape.", heroBody: "Find construction changes near you, report a safety or access problem, and follow the response in one place.",
    browseUpdates: "Browse updates", makeReport: "Report an issue", latestUpdate: "Latest published update", noLatest: "No notices have been published yet.", noLatestBody: "Check back when the project team has verified an update.",
    updatesTitle: "Construction updates", updatesBody: "Search by place or topic. Each notice shows the period and affected area supplied by the project team.", search: "Search location or title", all: "All", noNotices: "No updates match your search.",
    closure: "Road closure", schedule: "Works schedule", transport: "Transport access", safety: "Safety", business: "Business access", access: "Pedestrian access", noise: "Noise", other: "Other",
    location: "Location", when: "When", diversion: "Diversion or access guidance", map: "Open location on map", published: "Published", draft: "Draft", archived: "Archived", dateUnknown: "Dates to be confirmed",
    reportTitle: "Tell us what needs attention", reportBody: "Send a clear location and description. A project team member can review it and publish a response.", urgent: "For immediate danger, call local emergency services. This form is not monitored as an emergency channel.",
    issueType: "Issue type", chooseType: "Choose an issue type", describe: "What happened?", describeHint: "Describe what you saw, when it happened, and how people are affected.", email: "Contact email (optional)", photo: "Photo (optional, maximum 5 MB)", sendReport: "Send report", sending: "Sending…",
    receiptTitle: "Report received", receiptBody: "Save both numbers. Your access code is shown only now; signed-in reporters can also track their own report by reference.", reference: "Reference", accessCode: "Access code", copy: "Copy details", copied: "Copied",
    trackTitle: "Follow the response", trackBody: "Enter your reference. If you submitted this report while signed in, the access code is optional.", trackButton: "Check status", status: "Status", timeline: "Response timeline", viewPhoto: "View attached photo",
    alertsTitle: "Choose the updates you follow", alertsBody: "Your choices are saved to your signed-in account. Matching published notices appear below.", savePreferences: "Save preferences", preferencesSaved: "Preferences saved", matchedUpdates: "Updates for you", noMatches: "No matching notices yet.",
    received: "Received", reviewing: "Under review", assigned: "Assigned", resolved: "Resolved", closed: "Closed", loading: "Loading…", requestFailed: "The request could not be completed. Please try again.", signIn: "Sign in to continue",
    footer: "Mutiara Line Community Desk", privacy: "Reports are visible to the reporter and authorised project team members.",
  },
  zh: {
    brand: "珍珠线社区信息站", navHome: "首页", navNotices: "施工公告", navReport: "提交问题", navTrack: "追踪报告", navAlerts: "我的提醒", navAdmin: "项目组",
    unofficial: "本网站为学生开发的社区平台。公告由网站管理员发布，不构成政府官方通知。",
    heroKicker: "槟城轻快铁珍珠线", heroTitle: "施工期间，及时了解身边的变化。", heroBody: "查询附近施工变化、报告安全或通行问题，并追踪处理进度。",
    browseUpdates: "查看公告", makeReport: "提交问题", latestUpdate: "最新公告", noLatest: "目前没有已发布的公告。", noLatestBody: "项目组核实并发布信息后会在这里显示。",
    updatesTitle: "施工动态", updatesBody: "按地点或主题搜索。每条公告都会显示项目组提供的时间和影响范围。", search: "搜索地点或标题", all: "全部", noNotices: "没有符合条件的公告。",
    closure: "道路封闭", schedule: "施工计划", transport: "公共交通", safety: "安全问题", business: "商家通行", access: "行人通行", noise: "噪音", other: "其他",
    location: "地点", when: "时间", diversion: "绕行或通行说明", map: "在地图中查看地点", published: "已发布", draft: "草稿", archived: "已归档", dateUnknown: "时间待确认",
    reportTitle: "告诉我们需要处理的问题", reportBody: "提供准确地点和情况说明，项目组可据此调查并更新处理结果。", urgent: "如遇紧急危险，请联系当地紧急服务。本表单不是紧急求助渠道。",
    issueType: "问题类型", chooseType: "选择问题类型", describe: "发生了什么？", describeHint: "说明你看到的情况、发生时间以及对行人或居民的影响。", email: "联系邮箱（选填）", photo: "照片（选填，最大 5 MB）", sendReport: "提交报告", sending: "提交中…",
    receiptTitle: "报告已收到", receiptBody: "请保存编号和访问码。访问码只显示这一次；登录后提交的报告也可用编号追踪。", reference: "报告编号", accessCode: "访问码", copy: "复制信息", copied: "已复制",
    trackTitle: "追踪处理进度", trackBody: "输入报告编号。如果你是登录后提交的，访问码可以留空。", trackButton: "查询状态", status: "状态", timeline: "处理记录", viewPhoto: "查看所附照片",
    alertsTitle: "选择关注的公告", alertsBody: "选择会保存到你的账户，符合类别的已发布公告会显示在下方。", savePreferences: "保存偏好", preferencesSaved: "偏好已保存", matchedUpdates: "与你相关的公告", noMatches: "暂时没有符合条件的公告。",
    received: "已收到", reviewing: "审核中", assigned: "已分派", resolved: "已解决", closed: "已关闭", loading: "加载中…", requestFailed: "操作未完成，请重试。", signIn: "请先登录",
    footer: "珍珠线社区信息站", privacy: "报告仅对提交者及获授权的项目组成员可见。",
  },
  ms: {
    brand: "Meja Komuniti Laluan Mutiara", navHome: "Utama", navNotices: "Makluman", navReport: "Lapor isu", navTrack: "Jejak laporan", navAlerts: "Makluman saya", navAdmin: "Pasukan projek",
    unofficial: "Platform komuniti yang dibina oleh pelajar. Makluman diterbitkan oleh pentadbir laman dan bukan nasihat rasmi kerajaan.",
    heroKicker: "LRT LALUAN MUTIARA PULAU PINANG", heroTitle: "Ketahui perubahan semasa pembinaan laluan.", heroBody: "Semak perubahan berhampiran anda, laporkan isu keselamatan atau akses dan ikuti tindakan susulan.",
    browseUpdates: "Lihat makluman", makeReport: "Lapor isu", latestUpdate: "Makluman terkini", noLatest: "Belum ada makluman diterbitkan.", noLatestBody: "Semak semula selepas pasukan projek mengesahkan maklumat.",
    updatesTitle: "Makluman pembinaan", updatesBody: "Cari mengikut lokasi atau topik. Setiap makluman menunjukkan tempoh dan kawasan terjejas.", search: "Cari lokasi atau tajuk", all: "Semua", noNotices: "Tiada makluman yang sepadan.",
    closure: "Penutupan jalan", schedule: "Jadual kerja", transport: "Akses pengangkutan", safety: "Keselamatan", business: "Akses perniagaan", access: "Akses pejalan kaki", noise: "Bunyi bising", other: "Lain-lain",
    location: "Lokasi", when: "Bila", diversion: "Lencongan atau panduan akses", map: "Buka lokasi di peta", published: "Diterbitkan", draft: "Draf", archived: "Diarkibkan", dateUnknown: "Tarikh belum disahkan",
    reportTitle: "Maklumkan perkara yang perlu ditangani", reportBody: "Berikan lokasi dan penerangan yang jelas supaya pasukan projek boleh menyemak dan memberi respons.", urgent: "Untuk bahaya segera, hubungi perkhidmatan kecemasan tempatan. Borang ini bukan saluran kecemasan.",
    issueType: "Jenis isu", chooseType: "Pilih jenis isu", describe: "Apa yang berlaku?", describeHint: "Terangkan apa yang anda lihat, bila ia berlaku dan kesannya kepada orang ramai.", email: "E-mel untuk dihubungi (pilihan)", photo: "Foto (pilihan, maksimum 5 MB)", sendReport: "Hantar laporan", sending: "Menghantar…",
    receiptTitle: "Laporan diterima", receiptBody: "Simpan kedua-dua nombor. Kod akses hanya dipaparkan sekarang; pelapor yang log masuk juga boleh menjejak dengan nombor rujukan.", reference: "Nombor rujukan", accessCode: "Kod akses", copy: "Salin maklumat", copied: "Disalin",
    trackTitle: "Ikuti tindakan susulan", trackBody: "Masukkan nombor rujukan. Jika anda menghantar laporan ketika log masuk, kod akses adalah pilihan.", trackButton: "Semak status", status: "Status", timeline: "Garis masa respons", viewPhoto: "Lihat foto yang dilampirkan",
    alertsTitle: "Pilih makluman yang diikuti", alertsBody: "Pilihan disimpan pada akaun anda. Makluman terbitan yang sepadan dipaparkan di bawah.", savePreferences: "Simpan pilihan", preferencesSaved: "Pilihan disimpan", matchedUpdates: "Makluman untuk anda", noMatches: "Tiada makluman yang sepadan buat masa ini.",
    received: "Diterima", reviewing: "Dalam semakan", assigned: "Ditugaskan", resolved: "Selesai", closed: "Ditutup", loading: "Memuatkan…", requestFailed: "Permintaan tidak berjaya. Sila cuba lagi.", signIn: "Log masuk untuk meneruskan",
    footer: "Meja Komuniti Laluan Mutiara", privacy: "Laporan hanya boleh dilihat oleh pelapor dan ahli pasukan projek yang dibenarkan.",
  },
};

export function localText(row: { titleEn?: string; titleZh?: string | null; titleMs?: string | null; bodyEn?: string; bodyZh?: string | null; bodyMs?: string | null }, field: "title" | "body", locale: Locale) {
  const suffix = locale === "en" ? "En" : locale === "zh" ? "Zh" : "Ms";
  return (row as Record<string, string | null | undefined>)[field + suffix] || (row as Record<string, string | null | undefined>)[field + "En"] || "";
}
