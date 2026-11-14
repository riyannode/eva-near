import type { ReactNode } from "react";

const navigation = [
  ["/", "Home"], ["/freelancer", "Freelancer"], ["/agency", "Agency"], ["/recruiter", "Recruiter"], ["/demo", "Demo"],
] as const;

export function SiteShell({ path, children }: { path: string; children: ReactNode }) {
  const current = path === "/verify" ? "/recruiter" : path === "/issue" ? "/demo" : path === "/agency/wallet" ? "/agency" : path;

  return <div className="site">
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById("main")?.focus(); }}>Skip to content</a>
    <header className="landing-nav">
      <a className="landing-brand" href="/" aria-label="EVA home">EVA<span aria-hidden="true">.</span></a>
      <nav aria-label="Main navigation">
        {navigation.map(([href, label]) => <a key={href} href={href} aria-current={current === href ? "page" : undefined}>{label}</a>)}
      </nav>
      <a className="landing-verify" href="/verify">Check a reference <span aria-hidden="true">↗</span></a>
    </header>
    {children}
    <footer className="landing-footer">
      <a className="landing-brand" href="/" aria-label="EVA home">EVA<span aria-hidden="true">.</span></a>
      <nav aria-label="Footer navigation">
        <a href="/project">Project</a>
        <a href="/demo">Demo</a>
        <a href="https://github.com/riyannode/eva-near">Source code</a>
      </nav>
    </footer>
  </div>;
}
