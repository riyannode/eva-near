import { createRoot } from "react-dom/client";
import Demo from "./Demo.tsx";
import Issue from "./Issue.tsx";
import Home from "./Home.tsx";
import Project from "./Project.tsx";
import Roles from "./Roles.tsx";
import Verify from "./Verify.tsx";
import { SiteShell } from "./SiteShell.tsx";
import AgencyWallet from "./AgencyWallet.tsx";
import "./style.css";
import "./landing.css";

const screens = { "/": <Home />, "/project": <Project />, "/freelancer": <Roles role="freelancer" />, "/agency": <Roles role="agency" />, "/agency/wallet": <AgencyWallet />, "/recruiter": <Verify />, "/demo": <Demo />, "/verify": <Verify />, "/issue": <Issue /> };
const screen = Object.entries(screens).find(([path]) => path === location.pathname)?.[1];
createRoot(document.getElementById("root")!).render(<SiteShell path={location.pathname}>{screen ?? <main id="main" tabIndex={-1} className="workspace"><h1>Page not found</h1><a href="/">Return to EVA</a></main>}</SiteShell>);
