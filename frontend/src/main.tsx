import { createRoot } from "react-dom/client";
import Demo from "./Demo.tsx";
import Issue from "./Issue.tsx";
import Verify from "./Verify.tsx";
import "./style.css";

const screens = { "/": <Demo />, "/verify": <Verify />, "/issue": <Issue /> };
const screen = Object.entries(screens).find(([path]) => path === location.pathname)?.[1];
createRoot(document.getElementById("root")!).render(screen ?? <main><h1>Page not found</h1><a href="/">Return to the demo</a></main>);
