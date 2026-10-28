"use client";

import Link from "next/link";
import { languageNames, locales } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";

const copy = {
  en: {
    title: "Account access is managed by the project team",
    authority:
      "Authority collaboration accounts are created by an authorised construction team member. Ask your project contact to create your account and share the sign-in details privately. This local account does not verify an official government identity.",
    team: "The first team account is created with the local setup key. After that, team access cannot be self-registered on this site. Ask the project administrator for access.",
    login: "Go to sign in",
    home: "Back to project overview",
    language: "Language",
  },
  zh: {
    title: "工作账号由项目团队管理",
    authority:
      "主管部门协作账号由已授权的施工团队成员创建。请联系项目对接人创建账号，并通过私下渠道获取登录信息。此本地账号不代表政府官方身份认证。",
    team: "首个团队账号需要本地设置密钥创建。之后不能在网站上自行注册团队账号，请联系项目管理员获取权限。",
    login: "前往登录",
    home: "返回项目首页",
    language: "语言",
  },
  ms: {
    title: "Akses akaun diuruskan oleh pasukan projek",
    authority:
      "Akaun kerjasama pihak berkuasa dicipta oleh ahli pasukan pembinaan yang diberi kuasa. Hubungi wakil projek untuk mendapatkan akaun dan maklumat log masuk secara peribadi. Akaun tempatan ini bukan pengesahan identiti rasmi kerajaan.",
    team: "Akaun pasukan pertama dicipta menggunakan kunci persediaan tempatan. Selepas itu, pendaftaran sendiri tidak tersedia. Hubungi pentadbir projek untuk akses.",
    login: "Pergi ke log masuk",
    home: "Kembali ke laman projek",
    language: "Bahasa",
  },
};

export default function StaffRegistration({ audience }: { audience: "team" | "authority" }) {
  const { locale, setLocale } = useLocale();
  const c = copy[locale];
  return (
    <main className="staff-registration-page">
      <header className="project-home-header">
        <Link href="/" className="project-home-brand">
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
      <section className="staff-registration-message">
        <span className="staff-registration-symbol" aria-hidden="true">
          M
        </span>
        <h1>{c.title}</h1>
        <p>{audience === "authority" ? c.authority : c.team}</p>
        <div className="staff-registration-actions">
          <Link className="button button-primary" href={`/${audience}/login`}>
            {c.login}
          </Link>
          <Link href="/">{c.home}</Link>
        </div>
      </section>
    </main>
  );
}
