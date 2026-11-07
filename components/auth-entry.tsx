"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { languageNames, locales } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";

const copy = {
  en: {
    community: "Community access",
    communityTitle: "Stay informed. Sign in when you need more.",
    communityBody:
      "Everyone can browse construction summaries. Create a local account to read full notices, report an issue and save alerts.",
    team: "Construction team access",
    teamTitle: "A separate workspace for verified updates.",
    teamBody:
      "Authorised team members publish notices and respond to community reports using a local team account.",
    email: "Email",
    password: "Password",
    name: "Name",
    login: "Sign in",
    register: "Create resident account",
    showRegister: "New resident? Create an account",
    showLogin: "Already registered? Sign in",
    teamRegister: "Create construction team account",
    teamShowRegister: "New team member? Create an account",
    teamShowLogin: "Already have a team account? Sign in",
    teamCode: "Today's team registration code",
    continue: "Continue",
    logout: "Sign out",
    back: "Back to project overview",
    steps: ["Browse public summaries", "Sign in for full details", "Report and follow issues"],
    teamSteps: ["Verify information", "Publish a notice", "Respond to reports"],
    authority: "Authority collaboration access",
    authorityTitle: "Follow every issue through to a visible outcome.",
    authorityBody:
      "Authorised transport and local-authority writers use their own accounts to post staged responses and publish notices.",
    authorityRegister: "Create authority writer account",
    authorityShowRegister: "New authority writer? Create an account",
    authorityShowLogin: "Already registered? Sign in",
    authorityDepartment: "Authority organisation",
    authorityDepartmentPlaceholder: "Choose your organisation",
    transportationBureau: "Transportation Bureau",
    localAuthority: "Government / Local Authorities",
    authorityRegistrationKey: "Authority registration code",
    authoritySteps: [
      "Review resident feedback",
      "Record each response stage",
      "Link a published notice",
    ],
    working: "Please wait…",
  },
  zh: {
    community: "社区用户登录",
    communityTitle: "先了解动态，需要详情时再登录。",
    communityBody: "所有人都能浏览施工概览。创建本地账号后可查看完整公告、提交问题和保存提醒。",
    team: "施工团队入口",
    teamTitle: "核实并发布信息的独立工作台。",
    teamBody: "获授权的施工人员使用本地团队账号发布公告并处理社区报告。",
    email: "邮箱",
    password: "密码",
    name: "姓名",
    login: "登录",
    register: "创建居民账号",
    showRegister: "第一次使用？创建居民账号",
    showLogin: "已有账号？返回登录",
    teamRegister: "创建施工团队账号",
    teamShowRegister: "首次使用？创建团队账号",
    teamShowLogin: "已有团队账号？返回登录",
    teamCode: "今日团队注册码",
    continue: "继续进入",
    logout: "退出登录",
    back: "返回项目首页",
    steps: ["浏览公开概览", "登录查看完整详情", "提交并追踪问题"],
    teamSteps: ["核实信息", "发布公告", "处理报告"],
    authority: "主管部门协作端",
    authorityTitle: "让每个问题的处理过程清晰可见。",
    authorityBody:
      "交通局和政府／地方主管部门的获授权写作人员使用自己的账号逐步回执居民反馈并发布公告。",
    authorityRegister: "创建主管部门写作账号",
    authorityShowRegister: "首次使用？创建主管部门账号",
    authorityShowLogin: "已有主管部门账号？返回登录",
    authorityDepartment: "所属主管机构",
    authorityDepartmentPlaceholder: "请选择所属机构",
    transportationBureau: "交通局",
    localAuthority: "政府／地方主管部门",
    authorityRegistrationKey: "主管部门注册代码",
    authoritySteps: ["查看居民反馈", "逐阶段记录处理", "关联已发布公告"],
    working: "处理中…",
  },
  ms: {
    community: "Akses komuniti",
    communityTitle: "Lihat perkembangan dahulu. Log masuk apabila perlu.",
    communityBody:
      "Semua orang boleh melihat ringkasan. Cipta akaun tempatan untuk butiran penuh, laporan isu dan pilihan makluman.",
    team: "Akses pasukan pembinaan",
    teamTitle: "Ruang kerja berasingan untuk maklumat yang disahkan.",
    teamBody:
      "Ahli pasukan yang diberi kuasa menggunakan akaun tempatan untuk menerbitkan makluman dan menjawab laporan.",
    email: "E-mel",
    password: "Kata laluan",
    name: "Nama",
    login: "Log masuk",
    register: "Cipta akaun komuniti",
    showRegister: "Pengguna baharu? Cipta akaun",
    showLogin: "Sudah berdaftar? Log masuk",
    teamRegister: "Cipta akaun pasukan pembinaan",
    teamShowRegister: "Ahli baharu? Cipta akaun",
    teamShowLogin: "Sudah ada akaun? Log masuk",
    teamCode: "Kod pendaftaran pasukan hari ini",
    continue: "Teruskan",
    logout: "Log keluar",
    back: "Kembali ke laman projek",
    steps: ["Lihat ringkasan umum", "Log masuk untuk butiran", "Lapor dan ikuti isu"],
    teamSteps: ["Sahkan maklumat", "Terbitkan makluman", "Jawab laporan"],
    authority: "Akses kerjasama pihak berkuasa",
    authorityTitle: "Setiap isu diikuti sehingga ada hasil yang jelas.",
    authorityBody:
      "Penulis yang diberi kuasa daripada biro pengangkutan dan pihak berkuasa tempatan menggunakan akaun sendiri untuk memberi respons dan menerbitkan makluman.",
    authorityRegister: "Cipta akaun penulis pihak berkuasa",
    authorityShowRegister: "Penulis baharu? Cipta akaun",
    authorityShowLogin: "Sudah berdaftar? Log masuk",
    authorityDepartment: "Organisasi pihak berkuasa",
    authorityDepartmentPlaceholder: "Pilih organisasi anda",
    transportationBureau: "Biro Pengangkutan",
    localAuthority: "Kerajaan / Pihak Berkuasa Tempatan",
    authorityRegistrationKey: "Kod pendaftaran pihak berkuasa",
    authoritySteps: ["Semak maklum balas", "Catat perkembangan", "Pautkan makluman terbitan"],
    working: "Sila tunggu…",
  },
};

export default function AuthEntry({
  audience,
  signedIn,
  continueHref,
  initialMode = "login",
}: {
  audience: "community" | "team" | "authority";
  signedIn: boolean;
  continueHref: string;
  initialMode?: "login" | "register";
}) {
  const { locale, setLocale } = useLocale();
  const c = copy[locale];
  const team = audience === "team";
  const authority = audience === "authority";
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = {
      action:
        mode === "register" && authority
          ? "register-authority"
          : mode === "register" && team
            ? "register-team"
            : mode,
      email: form.get("email"),
      password: form.get("password"),
      name: form.get("name"),
      department: form.get("department"),
      registrationKey: form.get("registrationKey"),
      teamCode: form.get("teamCode"),
      role: audience === "community" ? "resident" : audience,
    };
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed");
      window.location.href = continueHref;
    } catch (value) {
      setError(value instanceof Error ? value.message : String(value));
      setBusy(false);
    }
  }
  return (
    <main className={`auth-page ${team || authority ? "auth-team" : "auth-community"}`}>
      <div className="auth-top">
        <Link href="/" className="auth-brand">
          <span className="brand-mark">M</span>
          <span>
            Mutiara Line
            <br />
            Community Desk
          </span>
        </Link>
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
      </div>
      <div className="auth-layout">
        <section className="auth-story">
          <p className="auth-audience">{team ? c.team : authority ? c.authority : c.community}</p>
          <h1>{team ? c.teamTitle : authority ? c.authorityTitle : c.communityTitle}</h1>
          <p>{team ? c.teamBody : authority ? c.authorityBody : c.communityBody}</p>
          <ol className="auth-line">
            {(team ? c.teamSteps : authority ? c.authoritySteps : c.steps).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
        <section className="auth-action">
          <div className="auth-action-inner">
            <span className="auth-mini-mark">M</span>
            <h2>
              {mode === "register" && authority
                ? c.authorityRegister
                : mode === "register" && team
                  ? c.teamRegister
                  : team
                    ? c.team
                    : authority
                      ? c.authority
                      : c.community}
            </h2>
            {signedIn ? (
              <>
                <a className="button button-primary" href={continueHref}>
                  {c.continue}
                </a>
                <a className="auth-secondary auth-button-link" href="/logout">
                  {c.logout}
                </a>
              </>
            ) : (
              <form className="local-login-form" onSubmit={submit}>
                {mode !== "login" && (
                  <label>
                    {c.name}
                    <input name="name" required minLength={2} />
                  </label>
                )}
                {mode === "register" && authority && (
                  <label>
                    {c.authorityDepartment}
                    <select name="department" required defaultValue="">
                      <option value="" disabled>
                        {c.authorityDepartmentPlaceholder}
                      </option>
                      <option value="transport">{c.transportationBureau}</option>
                      <option value="local">{c.localAuthority}</option>
                    </select>
                  </label>
                )}
                <label>
                  {c.email}
                  <input name="email" type="email" required autoComplete="email" />
                </label>
                <label>
                  {c.password}
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={mode === "register" && authority ? 12 : 8}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                </label>
                {mode === "register" && authority && (
                  <label>
                    {c.authorityRegistrationKey}
                    <input
                      name="registrationKey"
                      type="password"
                      required
                      autoComplete="one-time-code"
                    />
                  </label>
                )}
                {mode === "register" && team && (
                  <label>
                    {c.teamCode}
                    <input
                      name="teamCode"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                    />
                  </label>
                )}
                <button className="button button-primary" disabled={busy}>
                  {busy
                    ? c.working
                    : mode === "register"
                      ? authority
                        ? c.authorityRegister
                        : team
                          ? c.teamRegister
                          : c.register
                      : c.login}
                </button>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
              </form>
            )}
            {!signedIn && (
              <button
                className="auth-secondary auth-button-link"
                onClick={() => {
                  setError("");
                  setMode(mode === "login" ? "register" : "login");
                }}
              >
                {mode === "login"
                  ? authority
                    ? c.authorityShowRegister
                    : team
                      ? c.teamShowRegister
                      : c.showRegister
                  : authority
                    ? c.authorityShowLogin
                    : team
                      ? c.teamShowLogin
                      : c.showLogin}
              </button>
            )}
            <Link className="auth-back" href="/">
              ← {c.back}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
