import { createRoot } from "react-dom/client";
import Demo from "./Demo.tsx";
import Issue from "./Issue.tsx";
import Home from "./Home.tsx";
import Project from "./Project.tsx";
import Verify from "./Verify.tsx";
import "./style.css";
import "./landing.css";

const screens = { "/": <Home />, "/project": <Project />, "/demo": <Demo />, "/verify": <Verify />, "/issue": <Issue /> };
const screen = Object.entries(screens).find(([path]) => path === location.pathname)?.[1];
createRoot(document.getElementById("root")!).render(screen ?? <main><h1>Page not found</h1><a href="/">Return to EVA</a></main>);
