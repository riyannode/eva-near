import { useEffect, useRef, useState } from "react";
import { parseLinkFragment, verifyReference } from "@eva/backend/reference";
import type { ReferenceProfile, ReferenceRecord, Verification } from "@eva/backend/reference";
import { getProfile } from "./api.ts";
import { ReferenceCard } from "./Verify.tsx";
import fixtures from "./demo.json";

const examples = ["Valid", "Revoked", "Edited"] as const;
const profile: ReferenceProfile = { network: "sample", contractId: "reference.sample", issuerId: "studio.sample" };

export default function Demo() {
  const [example, setExample] = useState<(typeof examples)[number]>("Valid");
  const [result, setResult] = useState<Verification>();
  const [canIssue, setCanIssue] = useState(false);
  const firstOption = useRef<HTMLButtonElement>(null);
  const fixture = fixtures[example];
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
      record: { commitment: fixture.commitment, revoked: fixture.revoked },
    };
    void verifyReference(parseLinkFragment(fixture.fragment), profile, async () => record)
      .then(value => { if (current) setResult(value); });
    return () => { current = false; };
  }, [fixture]);

  return <>
    <header><a href="/">EVA</a><span>Sample data</span></header>
    <main>
      <h1>Verify the work.<br />Keep the client confidential.</h1>
      <ReferenceCard payload={link.payload} issuer="Studio A" profile={profile} outcome={result} />
      <p className="privacy">Client name and project files are kept private.</p>
      <div className="actions">
        <button type="button" className="primary" onClick={() => firstOption.current?.focus()}>Try the demo</button>
        {canIssue && <a className="button" href="/issue">Issue a reference</a>}
      </div>
      <div className="actions options" role="group" aria-label="Sample references">
        {examples.map((name, index) => <button type="button" key={name}
          ref={index === 0 ? firstOption : undefined} aria-pressed={example === name}
          onClick={() => { if (example !== name) { setResult(undefined); setExample(name); } }}>{name}</button>)}
      </div>
    </main>
  </>;
}
