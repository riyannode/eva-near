import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { normalizeTextInput, randomReferenceId } from "@eva/backend/reference";
import { getProfile, request } from "./api.ts";

type IssueRequest = { referenceId: string; subject: string; claim: string; approved: true };
type Step = "idle" | "issuing" | "issue-pending" | "active" | "revoking" | "revoke-pending" | "revoked";
const sampleSubject = "Alex Morgan";
const sampleClaim = "Designed the checkout flow for an e-commerce project.";
const messages = {
  idle: "", issuing: "Issuing the reference…", "issue-pending": "Waiting for NEAR to confirm this reference",
  active: "Reference issued", revoking: "Revoking the reference…",
  "revoke-pending": "Waiting for NEAR to confirm revocation", revoked: "Reference revoked",
};
const errors: Record<string, string> = {
  INVALID_INPUT: "Enter a single-line name and claim within the stated limits, then confirm approval.",
  UNAVAILABLE: "The local service is unavailable right now. Try again.",
  FORBIDDEN: "Open the local issue page at its configured loopback address.",
  CAP_REACHED: "This Sandbox has reached its reference limit.",
  REFERENCE_REVOKED: "This reference was already revoked.",
  REFERENCE_CONFLICT: "This reference ID is already assigned to different content.",
  REFERENCE_NOT_FOUND: "This Sandbox no longer has the reference.",
};

export default function Issue() {
  const [available, setAvailable] = useState<boolean>();
  const [subject, setSubject] = useState(sampleSubject);
  const [claim, setClaim] = useState(sampleClaim);
  const [approved, setApproved] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [copy, setCopy] = useState("");
  const intent = useRef<IssueRequest | undefined>(undefined);
  const busy = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const revokeButton = useRef<HTMLButtonElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const linkField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const cancel = new AbortController();
    void getProfile(cancel.signal).then(value => setAvailable(value.canIssue), () => {
      if (!cancel.signal.aborted) setAvailable(false);
    });
    return () => cancel.abort();
  }, []);
  useEffect(() => { if (step === "revoked") status.current?.focus(); }, [step]);

  async function issue(checkOnly = false) {
    const body = intent.current;
    if (busy.current || !body) return;
    busy.current = true;
    setStep("issuing");
    setError("");
    try {
      const response = await request(checkOnly ? "/api/demo/references/" + body.referenceId : "/api/demo/references", checkOnly
        ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const value: unknown = await response.json();
      if (response.ok && response.status !== 202 && value && typeof value === "object"
        && "referenceId" in value && value.referenceId === body.referenceId
        && "link" in value && typeof value.link === "string") {
        const parsed = new URL(value.link);
        if (parsed.origin !== location.origin || parsed.pathname !== "/verify" || !parsed.hash.startsWith("#r=")) throw new Error("UNAVAILABLE");
        setLink(parsed.href);
        setStep("active");
        return;
      }
      if (value && typeof value === "object" && "code" in value && typeof value.code === "string") {
        setError(errors[value.code] ?? "");
        if (!checkOnly && (response.status === 400 || response.status === 403 || response.status === 409)) {
          intent.current = undefined;
          setStep("idle");
          return;
        }
      }
      setStep("issue-pending");
    } catch {
      setStep("issue-pending");
    } finally {
      busy.current = false;
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current || intent.current) return;
    try {
      if (!approved) throw new Error("INVALID_INPUT");
      intent.current = {
        referenceId: randomReferenceId(), subject: normalizeTextInput(subject, 80),
        claim: normalizeTextInput(claim, 240), approved: true,
      };
      void issue();
    } catch {
      setError(errors.INVALID_INPUT);
    }
  }

  async function revoke(checkOnly = false) {
    const body = intent.current;
    if (!body || busy.current) return;
    busy.current = true;
    setError("");
    setStep("revoking");
    try {
      const path = checkOnly ? "/api/references/" : "/api/demo/references/";
      const response = await request(path + body.referenceId + (checkOnly ? "" : "/revoke"), checkOnly
        ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const value: unknown = await response.json();
      if (response.status === 200 && value && typeof value === "object" && "revoked" in value && value.revoked === true) {
        setStep("revoked");
        return;
      }
      if (value && typeof value === "object" && "code" in value && typeof value.code === "string") setError(errors[value.code] ?? "");
      setStep("revoke-pending");
    } catch {
      setStep("revoke-pending");
    } finally {
      busy.current = false;
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopy("Link copied");
    } catch {
      linkField.current?.select();
      setCopy("Select and copy the reference link.");
    }
  }

  return <>
    <header><a href="/">EVA</a><span>Local NEAR Sandbox</span></header>
    <main>
      <h1>Issue a reference</h1>
      <p className="privacy">References in this local session expire when the Sandbox restarts.</p>
      {available === undefined && <p role="status">Checking local mode…</p>}
      {available === false && <p role="status">The local issuer is unavailable. <a href="/">Return to the demo</a>.</p>}
      {available && <section className="reference">
        {(step === "idle" || step === "issuing" || step === "issue-pending") && <form onSubmit={submit}>
          <fieldset disabled={step !== "idle"}>
            <label htmlFor="subject">Subject</label>
            <input id="subject" value={subject} onChange={e => setSubject(e.target.value)} required aria-describedby="subject-limit" />
            <small id="subject-limit">Professional name or alias, up to 80 UTF-8 bytes.</small>
            <label htmlFor="claim">Claim</label>
            <input id="claim" value={claim} onChange={e => setClaim(e.target.value)} required aria-describedby="claim-limit" />
            <small id="claim-limit">One approved sentence, up to 240 UTF-8 bytes.</small>
            <div className="preview">
              <strong>Text included in the link</strong>
              <p>{claim.normalize("NFC").trim()}</p><span>{subject.normalize("NFC").trim()}</span>
            </div>
            <label className="approval"><input type="checkbox" checked={approved}
              onChange={e => setApproved(e.target.checked)} required /> I confirm this text can be shared.</label>
            <button className="primary" type="submit">Issue reference</button>
          </fieldset>
        </form>}
        <p ref={status} tabIndex={-1} role="status" aria-live="polite">{messages[step]} {error}</p>
        {step === "issue-pending" && <div className="actions">
          <button type="button" onClick={() => void issue(true)}>Check status</button>
          <button type="button" onClick={() => void issue()}>Retry same reference</button>
        </div>}
        {link && <>
          <label htmlFor="reference-link">Reference link</label>
          <input id="reference-link" value={link} ref={linkField} readOnly onFocus={e => e.target.select()} />
          <div className="actions">
            <button type="button" onClick={() => void copyLink()}>Copy link</button>
            <a className="button" target="_blank" rel="noopener noreferrer" href={link}>Open reference</a>
            {step === "active" && <button type="button" ref={revokeButton} onClick={() => dialog.current?.showModal()}>Revoke</button>}
            {step === "revoke-pending" && <>
              <button type="button" onClick={() => void revoke(true)}>Check status</button>
              <button type="button" onClick={() => dialog.current?.showModal()}>Retry revocation</button>
            </>}
          </div>
          <p className="copy-status" aria-live="polite">{copy}</p>
          {step === "revoked" && <a className="button" href="/issue">Issue another reference</a>}
        </>}
      </section>}
      <dialog ref={dialog} aria-labelledby="revoke-title" onClose={() => revokeButton.current?.focus()}>
        <h2 id="revoke-title">Revoke this reference?</h2>
        <p>This permanently changes the link’s status to REVOKED. Anyone who has the link can still read its payload.</p>
        <p className="identifier">{intent.current?.referenceId}</p>
        <form method="dialog" className="actions">
          <button autoFocus>Cancel</button>
          <button className="primary" onClick={() => void revoke()}>Confirm revoke</button>
        </form>
      </dialog>
    </main>
  </>;
}
