import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { parseLinkFragment, verifyReference } from "@eva/backend/reference";
import type { ReferencePayload, ReferenceProfile, Verification } from "@eva/backend/reference";
import { getProfile, getReference } from "./api.ts";

export const sources = { sample: "Sample data", sandbox: "Local NEAR Sandbox", testnet: "NEAR Testnet" } as const;
const messages = {
  VALID: "Reference verified",
  REVOKED: "The agency revoked this reference",
  INVALID: "This link could not be verified",
  UNAVAILABLE: "Verification is unavailable right now",
};
const explanations: Record<string, string> = {
  INVALID_LINK: "Open the original reference link. This link is incomplete or malformed.",
  PROFILE_MISMATCH: "Open the link on the site configured for this issuer.",
  REFERENCE_NOT_FOUND: "No record was found in the configured registry.",
  SIGNATURE_INVALID: "Ask the issuer for the original link.",
  COMMITMENT_MISMATCH: "Ask the issuer for the original link.",
  UNAVAILABLE: "Try again, or open the link in a browser with Ed25519 Web Crypto support.",
};

export function ReferenceCard({ payload, issuer, outcome, profile }: {
  payload?: ReferencePayload; issuer?: string; outcome?: Verification; profile?: ReferenceProfile;
}) {
  const valid = outcome?.status === "VALID";
  return <section className="reference" aria-label="Reference">
    {valid && payload && <blockquote>
      <p>{payload.claim}</p>
      <footer><strong>{payload.subject}</strong><span>Signed by {issuer}</span></footer>
    </blockquote>}
    <div className="verdict" role="status" aria-live="polite">
      {outcome ? <>
        <span className={"status " + outcome.status.toLowerCase()}>{outcome.status}</span>
        <span>{messages[outcome.status]}</span>
        {"code" in outcome && <small>{explanations[outcome.code]}</small>}
      </> : <span>Checking the reference…</span>}
    </div>
    {profile && outcome && <details>
      <summary>Verification details</summary>
      <dl>
        <dt>Source</dt><dd>{sources[profile.network]}</dd>
        <dt>Contract</dt><dd>{profile.contractId}</dd>
        <dt>Issuer</dt><dd>{profile.issuerId}</dd>
        {"record" in outcome && outcome.record.blockHeight !== undefined && <>
          <dt>Final block</dt><dd>{outcome.record.blockHeight}</dd>
          <dt>Block hash</dt><dd>{outcome.record.blockHash}</dd>
        </>}
      </dl>
    </details>}
  </section>;
}

export default function Verify() {
  const [fragment, setFragment] = useState(window.location.hash);
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState("");
  const [check, setCheck] = useState(0);
  const [result, setResult] = useState<{
    profile?: ReferenceProfile; issuer?: string; payload?: ReferencePayload; outcome: Verification;
  }>();
  useEffect(() => {
    const change = () => { setResult(undefined); setFragment(window.location.hash); };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    if (!fragment) { setResult(undefined); return; }
    const cancel = new AbortController();
    const signal = AbortSignal.any([cancel.signal, AbortSignal.timeout(8000)]);
    async function run() {
      let link;
      try {
        link = parseLinkFragment(fragment);
      } catch {
        if (!cancel.signal.aborted) setResult({ outcome: { status: "INVALID", code: "INVALID_LINK" } });
        return;
      }
      const profile = await getProfile(signal);
      const outcome = await verifyReference(link, profile, id => getReference(id, profile, signal));
      if (!cancel.signal.aborted) setResult({ profile, issuer: profile.issuerLabel, payload: link.payload, outcome });
    }
    void run().catch(() => {
      if (!cancel.signal.aborted) setResult({ outcome: { status: "UNAVAILABLE", code: "UNAVAILABLE" } });
    });
    return () => cancel.abort();
  }, [fragment, check]);
  function submitLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasteError("");
    try {
      const value = pasted.trim();
      const url = value.startsWith("#") ? undefined : new URL(value);
      if (url && (url.origin !== location.origin || url.pathname !== "/verify" || url.search || url.username || url.password)) throw new Error("INVALID_LINK");
      const next = url?.hash ?? value;
      parseLinkFragment(next);
      location.assign("/verify" + next);
    } catch {
      setPasteError("Paste a complete EVA /verify link from this site, or its #r= fragment.");
    }
  }
  return <>
    <header><a href="/">EVA</a><nav aria-label="Main navigation"><a href="/project">Project</a><a href="/demo">Sample demo</a><a href="/verify" aria-current="page">Verify a link</a></nav>{result?.profile && <span>{sources[result.profile.network]}</span>}</header>
    <main>
      <h1>Work reference</h1>
      {!fragment && <form className="verify-entry" onSubmit={submitLink}>
        <label htmlFor="verify-link">Paste an EVA reference link or #r= fragment</label>
        <div className="entry-row"><input id="verify-link" value={pasted} onChange={event => { setPasted(event.target.value); setPasteError(""); }}
          aria-describedby={pasteError ? "verify-link-help verify-link-error" : "verify-link-help"}
          aria-invalid={pasteError ? true : undefined} autoComplete="off" />
          <button className="primary" type="submit">Check reference</button></div>
        <small id="verify-link-help">Only a same-origin /verify link or its fragment is accepted. The fragment stays in your browser.</small>
        {pasteError && <small className="form-error" id="verify-link-error" role="alert">{pasteError}</small>}
      </form>}
      {fragment && <ReferenceCard {...result} />}
      {result && <>
        <div className="actions">
          <button className="primary" type="button" onClick={() => { setResult(undefined); setCheck(check + 1); }}>Check again</button>
          <a className="button" href="/verify">Check another reference</a>
        </div>
      </>}
    </main>
  </>;
}
