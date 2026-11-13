import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getProfile } from "./api.ts";
import { sources } from "./Verify.tsx";
import { testnetExamples } from "./testnetExamples.ts";

export default function Project() {
  const [profile, setProfile] = useState<{ network: string; canIssue: boolean }>();
  const [subject, setSubject] = useState("");
  const [claim, setClaim] = useState("");
  const [copyState, setCopyState] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void getProfile(controller.signal).then(value => setProfile({ network: sources[value.network], canIssue: value.canIssue }), () => {});
    return () => controller.abort();
  }, []);

  async function copyRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = requestText;
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopyState("Request copied. Send it through your existing agency contact channel.");
    } catch {
      setCopyState("Clipboard access is unavailable. Select and copy the request text below.");
    }
  }

  const requestText = subject.trim() && claim.trim()
    ? `EVA reference request\n\nProfessional name or alias: ${subject.trim()}\nContribution to approve: ${claim.trim()}\n\nPlease confirm this wording is approved for sharing, then issue an EVA reference. No client name or project files are needed.`
    : "";

  return <>
    <header><a href="/">EVA</a><nav aria-label="Main navigation"><a href="/">Home</a><a href="/project" aria-current="page">Project</a><a href="/demo">Sample demo</a><a href="/verify">Verify a link</a></nav><span>{profile?.network ?? "Work references"}</span></header>
    <main className="home">
      <section className="hero">
        <p className="eyebrow">A work reference for confidential projects</p>
        <h1>Verify the work.<br />Keep the client confidential.</h1>
        <p className="lede">One agency approved contribution. A link a recruiter can check. No client name or project files.</p>
        <div className="hero-actions"><a className="button primary" href="/verify">Verify a reference</a>
          {profile?.canIssue && <a className="button" href="/issue">Issue in Local NEAR Sandbox</a>}
          <a className="text-link" href="/demo">Explore sample data</a></div>
      </section>

      <section className="path-grid" aria-label="How to use EVA">
        <article id="request" className="path-card">
          <p className="eyebrow">For freelancers</p>
          <h2>Ask your agency to approve a reference</h2>
          <p>Prepare a name or alias and one contribution sentence. Copy the request into the communication channel you already use with the agency.</p>
          <form className="request-form" onSubmit={copyRequest}>
            <label htmlFor="request-subject">Professional name or alias</label>
            <input id="request-subject" value={subject} onChange={event => { setSubject(event.target.value); setCopyState(""); }} maxLength={80} />
            <label htmlFor="request-claim">Contribution to approve</label>
            <input id="request-claim" value={claim} onChange={event => { setClaim(event.target.value); setCopyState(""); }} maxLength={240}
              placeholder="Describe your contribution in one sentence" />
            <div className="preview"><strong>Request draft</strong><p>{requestText || "Your name and approved contribution will appear here."}</p></div>
            <button type="submit" disabled={!subject.trim() || !claim.trim()}>Copy request for your agency</button>
            <p className="copy-status" role="status" aria-live="polite">{copyState}</p>
          </form>
          <p className="fine-print">EVA does not send or track this request. Leave out client names and project details.</p>
        </article>

        <article id="agency" className="path-card">
          <p className="eyebrow">For agencies</p>
          <h2>Issue from your operator device</h2>
          <p>The configured issuer runs the CLI on its own operator device. Prepare a request file with the approved name, claim, and confirmation, then issue, resume, or revoke by reference ID:</p>
          <details className="cli-disclosure"><summary>Show issue, recovery, and revoke commands</summary>
            <pre className="cli-steps"><code>{'pnpm --filter @eva/backend run reference issue "$REQUEST_FILE" "$OUTPUT_FILE"\npnpm --filter @eva/backend run reference resume "$OUTPUT_FILE.pending" "$OUTPUT_FILE"\npnpm --filter @eva/backend run reference revoke "$REFERENCE_ID"'}</code></pre>
          </details>
          <p className="fine-print">Keep request, result, and key files private on the operator device. The public verifier has no issuer keys or inbox. For judge walkthroughs, the separate Sandbox issuer is available only in local mode.</p>
        </article>
      </section>

      <section className="evidence" aria-labelledby="examples-title">
        <div className="section-heading"><div><p className="eyebrow">Live registry</p><h2 id="examples-title">Check real Testnet examples</h2></div><span className="source-tag">NEAR Testnet</span></div>
        <p>These synthetic references are recorded on the configured public contract. Open either link to check the final registry status.</p>
        <div className="actions testnet-links">{testnetExamples.map(example =>
          <a className="button" key={example.label} href={example.url} target="_blank" rel="noreferrer">{example.label}</a>)}</div>
        <p className="fine-print">Contract: <span className="identifier">eva-reference-261113.testnet</span> · <a href="https://evalabs.my.id">Public verifier</a></p>
      </section>

      <footer className="site-footer"><span>Agency approved · Link holder can read · Registry status is public</span><a href="/demo">Explore sample data</a></footer>
    </main>
  </>;
}
