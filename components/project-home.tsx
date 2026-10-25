"use client";

import Link from "next/link";
import { languageNames, locales } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";

const content = {
  en: {
    language: "Language",
    project: "Penang LRT Mutiara Line",
    title: "A clearer picture of construction, street by street.",
    description:
      "This local community platform brings construction plans, road changes, business access, bus stop moves and safety notices together. Residents can report an issue and follow each response through to a published update.",
    explore: "Browse community updates without signing in",
    topics: ["Construction plan", "Road closures", "Business access", "Bus stop changes", "Safety"],
    choose: "Choose how you use the project",
    chooseBody: "Select your workspace. Public notice summaries stay available without an account.",
    resident: "Residents, commuters & businesses",
    residentBody:
      "Read full notices, report a local issue, track its response and save the updates that matter to you.",
    authority: "Authority collaborators",
    authorityBody:
      "Review feedback, record progress, link a published response and share verified updates.",
    team: "Construction team",
    teamBody: "Publish plans and notices, mark affected places and respond to community reports.",
    signIn: "Sign in",
    register: "Create account",
    staffAccount: "Get account access",
    teamAccount: "Team account setup",
    note: "Student-built project. This site is not an official Penang LRT or government service.",
  },
  zh: {
    language: "语言",
    project: "槟城轻快铁珍珠线",
    title: "从每条街道出发，看清施工带来的变化。",
    description:
      "这个本地社区平台汇集施工计划、道路调整、商铺通行、巴士站迁移和安全公告。居民可以提交问题，追踪每一步回执，直到看到相关公告。",
    explore: "无需登录，先浏览社区施工动态",
    topics: ["施工计划", "道路封闭", "商铺进出", "巴士站变更", "安全问题"],
    choose: "选择你的使用入口",
    chooseBody: "根据身份进入相应页面。公开公告概览无需账号即可浏览。",
    resident: "居民、通行者与商户",
    residentBody: "查看完整公告、提交身边的问题、追踪处理进度，并保存关心的动态。",
    authority: "主管部门协作人员",
    authorityBody: "查看反馈、逐阶段回执、关联已发布公告，并分享核实后的信息。",
    team: "施工团队",
    teamBody: "发布施工计划与公告、标注影响地点，并回复社区报告。",
    signIn: "登录",
    register: "注册居民账号",
    staffAccount: "获取协作账号",
    teamAccount: "设置团队账号",
    note: "本网站为学生开发的项目，并非槟城轻快铁或政府官方服务。",
  },
  ms: {
    language: "Bahasa",
    project: "LRT Pulau Pinang Laluan Mutiara",
    title: "Lihat perubahan pembinaan di setiap jalan dengan lebih jelas.",
    description:
      "Platform komuniti tempatan ini mengumpulkan pelan pembinaan, perubahan jalan, akses perniagaan, perpindahan hentian bas dan makluman keselamatan. Penduduk boleh melaporkan isu dan mengikuti setiap tindakan sehingga makluman diterbitkan.",
    explore: "Lihat perkembangan komuniti tanpa log masuk",
    topics: [
      "Pelan pembinaan",
      "Penutupan jalan",
      "Akses perniagaan",
      "Perubahan hentian bas",
      "Keselamatan",
    ],
    choose: "Pilih cara anda menggunakan projek ini",
    chooseBody: "Pilih ruang kerja anda. Ringkasan makluman awam boleh dilihat tanpa akaun.",
    resident: "Penduduk, pengguna jalan & peniaga",
    residentBody:
      "Baca makluman penuh, laporkan isu setempat, ikuti respons dan simpan perkembangan penting.",
    authority: "Rakan kerjasama pihak berkuasa",
    authorityBody:
      "Semak maklum balas, catat kemajuan, pautkan respons terbitan dan kongsi maklumat yang disahkan.",
    team: "Pasukan pembinaan",
    teamBody: "Terbitkan pelan dan makluman, tandakan lokasi terjejas dan jawab laporan komuniti.",
    signIn: "Log masuk",
    register: "Cipta akaun",
    staffAccount: "Dapatkan akses akaun",
    teamAccount: "Persediaan akaun pasukan",
    note: "Projek dibina oleh pelajar. Ini bukan perkhidmatan rasmi LRT Pulau Pinang atau kerajaan.",
  },
};

export default function ProjectHome() {
  const { locale, setLocale } = useLocale();
  const c = content[locale];
  const portals = [
    {
      title: c.resident,
      body: c.residentBody,
      login: "/login",
      register: "/login?mode=register",
      registerLabel: c.register,
    },
    {
      title: c.authority,
      body: c.authorityBody,
      login: "/authority/login",
      register: "/authority/register",
      registerLabel: c.staffAccount,
    },
    {
      title: c.team,
      body: c.teamBody,
      login: "/team/login",
      register: "/team/register",
      registerLabel: c.teamAccount,
    },
  ];

  return (
    <div className="project-home">
      <header className="project-home-header">
        <Link href="/" className="project-home-brand" aria-label="Mutiara Line Community Desk">
          <span className="brand-mark">M</span>
          <span>
            Mutiara Line
            <br />
            Community Desk
          </span>
        </Link>
        <label className="language">
          <span className="sr-only">{c.language}</span>
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

      <main>
        <section className="project-home-hero" aria-labelledby="project-home-title">
          <div className="project-home-intro">
            <p className="project-home-project">{c.project}</p>
            <h1 id="project-home-title">{c.title}</h1>
            <p className="project-home-description">{c.description}</p>
            <Link className="project-home-explore" href="/community">
              {c.explore}
              <span aria-hidden="true"> ↗</span>
            </Link>
          </div>
          <div className="project-home-line" aria-label={c.topics.join(", ")}>
            {c.topics.map((topic, index) => (
              <div className="project-home-stop" key={topic}>
                <span className="project-home-stop-dot" aria-hidden="true" />
                <span className="project-home-stop-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{topic}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="project-home-portals" aria-labelledby="project-home-choose">
          <div className="project-home-section-heading">
            <h2 id="project-home-choose">{c.choose}</h2>
            <p>{c.chooseBody}</p>
          </div>
          <div className="project-home-portal-list">
            {portals.map((portal, index) => (
              <article className="project-home-portal" key={portal.login}>
                <div className="project-home-portal-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="project-home-portal-copy">
                  <h3>{portal.title}</h3>
                  <p>{portal.body}</p>
                </div>
                <div className="project-home-portal-actions">
                  <Link className="project-home-signin" href={portal.login}>
                    {c.signIn}
                  </Link>
                  <Link className="project-home-register" href={portal.register}>
                    {portal.registerLabel}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="project-home-footer">{c.note}</footer>
    </div>
  );
}
