import { useEffect, useRef, useState } from "react";
import { parseLinkFragment, verifyReference } from "@eva/backend/reference";
import type { ReferenceProfile, ReferenceRecord, Verification } from "@eva/backend/reference";
import { getProfile } from "./api.ts";
import { ReferenceCard } from "./Verify.tsx";
import fixtures from "./demo.json";
import { testnetExamples } from "./testnetExamples.ts";

const examples = ["Valid", "Revoked", "Edited"] as const;
const profile: ReferenceProfile = { network: "sample", contractId: "reference.sample", issuerId: "studio.sample" };

export default function Demo() {
  const [example, setExample] = useState<(typeof examples)[number]>("Valid");
  const [result, setResult] = useState<Verification>();
  const [canIssue, setCanIssue] = useState(false);
  const [guidedStep, setGuidedStep] = useState<"ready" | "issued" | "opened" | "revoked">("ready");
  const firstOption = useRef<HTMLButtonElement>(null);
  const sampleCard = useRef<HTMLDivElement>(null);
  const fixture = fixtures[example];
  function showExample(name: (typeof examples)[number]) {
    if (name !== example) { setResult(undefined); setExample(name); }
    setGuidedStep("ready");
  }
  const link = parseLinkFragment(fixture.fragment);
  useEffect(() => {
    const controller = new AbortController();
    void getProfile(controller.signal).then(value => setCanIssue(value.canIssue), () => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    let current = true;
    const record: ReferenceRecord = {
      issuerId: profile.issuerId, issuerKey: fixtures.issuerKey,
      record: { commitment: fixture.commitment, revoked: example === "Valid" && guidedStep === "revoked" ? true : fixture.revoked },
    };
    void verifyReference(parseLinkFragment(fixture.fragment), profile, async () => record)
      .then(value => { if (current) setResult(value); });
    return () => { current = false; };
  }, [fixture, example, guidedStep]);

  return <main id="main" tabIndex={-1} className="workspace demo-main">
      <p className="eyebrow">Sample data</p>
      <h1>Try a work reference</h1>
      <div className="demo-grid"><section aria-label="Sample verifier"><div id="sample-reference" ref={sampleCard} tabIndex={-1}><ReferenceCard payload={link.payload} issuer="Studio A" profile={profile} outcome={result} /></div>
      <p className="privacy">Client name and project files are kept private.</p>
      <div className="actions">
        <button type="button" className="primary" onClick={() => firstOption.current?.focus()}>Try the demo</button>
        {canIssue && <a className="button" href="/issue">Issue a reference</a>}
      </div>
      <div className="actions options" role="group" aria-label="Sample references">
        {examples.map((name, index) => <button type="button" key={name}
          ref={index === 0 ? firstOption : undefined} aria-pressed={example === name}
          onClick={() => showExample(name)}>{name}</button>)}
      </div>
      <p className="fine-print">Use the buttons to switch between prebuilt sample outcomes. These examples do not write to a network.</p>
      </section><section className="sample-walkthrough" aria-labelledby="sample-flow-title">
        <div><p className="eyebrow">Guided walkthrough · Sample data</p><h2 id="sample-flow-title">Issue, open, then revoke</h2>
          <p aria-live="polite">{guidedStep === "ready" ? "Step 1: issue a sample reference." : guidedStep === "issued" ? "Step 2: open the same sample reference." : guidedStep === "opened" ? "Step 3: the same sample reference is open as VALID. Revoke it to continue." : "Step 4: checking the same sample's simulated revoked status."}</p></div>
        <div className="actions">
          <button type="button" onClick={() => { setResult(undefined); if (example !== "Valid") setExample("Valid"); setGuidedStep("issued"); }}>Simulate sample issue</button>
          <button type="button" disabled={guidedStep !== "issued"} onClick={() => { setResult(undefined); setGuidedStep("opened"); sampleCard.current?.focus(); }}>Open sample reference</button>
          <button type="button" disabled={guidedStep !== "opened"} onClick={() => { setResult(undefined); setGuidedStep("revoked"); }}>Simulate sample revoke</button>
          <button type="button" onClick={() => showExample("Valid")}>Reset walkthrough</button>
        </div>
        <small>No transaction is sent. Use Local NEAR Sandbox below for the real judge flow.</small>
      </section>
      </div><section className="evidence sandbox-guide" aria-labelledby="sandbox-guide-title">
        <div className="section-heading"><div><p className="eyebrow">Judge flow</p><h2 id="sandbox-guide-title">Local NEAR Sandbox</h2></div><span className="source-tag">Local NEAR Sandbox</span></div>
        <p>Run <code>docker compose up --build</code>, then open <code>http://127.0.0.1:8080</code>.</p>
        <ol><li>Use <strong>Issue a reference</strong> in local Sandbox mode and confirm the text.</li>
          <li>Open the generated link and verify it in a separate tab.</li>
          <li>Revoke from the issue page, then refresh the same link to see <code>REVOKED</code>.</li></ol>
        <p>Sandbox references belong to this local session and can disappear when it restarts.</p>
      </section>
      <section className="evidence" aria-labelledby="testnet-demo-title">
        <div className="section-heading"><div><p className="eyebrow">Live registry</p><h2 id="testnet-demo-title">Real NEAR Testnet references</h2></div><span className="source-tag">NEAR Testnet</span></div>
        <div className="actions testnet-links">{testnetExamples.map(item => <a className="button" key={item.label}
          href={item.url} target="_blank" rel="noreferrer">{item.label}</a>)}</div>
      </section>
    </main>;
}
