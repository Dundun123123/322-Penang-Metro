"use client";

import { languageNames, locales } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";

const copy = {
  en: {
    community: "Community access", communityTitle: "Stay informed. Sign in when you need more.",
    communityBody: "Everyone can browse construction updates. Sign in to read the full notice, report an issue, or save your alert choices.",
    team: "Project team access", teamTitle: "A separate workspace for verified updates.",
    teamBody: "Authorised construction staff can publish notices and respond to community reports. Signing in alone does not grant staff access.",
    signIn: "Sign in with ChatGPT", continue: "Continue to the site", switch: "Use another account",
    back: "Back to community homepage", steps: ["Browse public updates", "Sign in for details", "Follow or report an issue"],
    teamSteps: ["Verify information", "Publish a notice", "Respond to reports"],
  },
  zh: {
    community: "社区用户登录", communityTitle: "先了解动态，需要详情时再登录。",
    communityBody: "所有人都可以浏览施工公告概览。登录后可查看完整详情、提交问题并保存提醒偏好。",
    team: "施工团队入口", teamTitle: "核实并发布信息的独立工作台。",
    teamBody: "获授权的施工人员可以发布公告、回应社区报告。仅登录账号不会自动获得团队权限。",
    signIn: "使用 ChatGPT 登录", continue: "继续进入网站", switch: "切换账号",
    back: "返回社区首页", steps: ["浏览公开概览", "登录查看详情", "关注或报告问题"],
    teamSteps: ["核实信息", "发布公告", "处理报告"],
  },
  ms: {
    community: "Akses komuniti", communityTitle: "Lihat perkembangan dahulu. Log masuk apabila perlu.",
    communityBody: "Semua orang boleh melihat ringkasan pembinaan. Log masuk untuk membaca butiran penuh, melapor isu atau menyimpan pilihan makluman.",
    team: "Akses pasukan projek", teamTitle: "Ruang kerja berasingan untuk maklumat yang disahkan.",
    teamBody: "Kakitangan pembinaan yang diberi kuasa boleh menerbitkan makluman dan menjawab laporan. Log masuk sahaja tidak memberikan akses pasukan.",
    signIn: "Log masuk dengan ChatGPT", continue: "Teruskan ke laman", switch: "Gunakan akaun lain",
    back: "Kembali ke laman komuniti", steps: ["Lihat ringkasan umum", "Log masuk untuk butiran", "Ikuti atau lapor isu"],
    teamSteps: ["Sahkan maklumat", "Terbitkan makluman", "Jawab laporan"],
  },
};

export default function AuthEntry({ audience, signedIn, signInHref, continueHref }: {
  audience: "community" | "team"; signedIn: boolean; signInHref: string; continueHref: string;
}) {
  const { locale, setLocale } = useLocale();
  const c = copy[locale];
  const team = audience === "team";
  return <main className={`auth-page ${team ? "auth-team" : "auth-community"}`}>
    <div className="auth-top"><a href="/" className="auth-brand"><span className="brand-mark">M</span><span>Mutiara Line<br />Community Desk</span></a><label className="language"><span className="sr-only">Language</span><select value={locale} onChange={(event) => setLocale(event.target.value as typeof locale)}>{locales.map((item) => <option key={item} value={item}>{languageNames[item]}</option>)}</select></label></div>
    <div className="auth-layout">
      <section className="auth-story"><p className="auth-audience">{team ? c.team : c.community}</p><h1>{team ? c.teamTitle : c.communityTitle}</h1><p>{team ? c.teamBody : c.communityBody}</p><ol className="auth-line">{(team ? c.teamSteps : c.steps).map((item) => <li key={item}>{item}</li>)}</ol></section>
      <section className="auth-action"><div className="auth-action-inner"><span className="auth-mini-mark">M</span><h2>{team ? c.team : c.community}</h2><p>{team ? c.teamBody : c.communityBody}</p>{signedIn ? <><a className="button button-primary" href={continueHref}>{c.continue}</a><a className="auth-secondary" href={`/signout-with-chatgpt?return_to=${encodeURIComponent(team ? "/team/login" : "/")}`} target="_top">{c.switch}</a></> : <a className="button button-primary" href={signInHref} target="_top">{c.signIn}</a>}<a className="auth-back" href="/">← {c.back}</a></div></section>
    </div>
  </main>;
}
