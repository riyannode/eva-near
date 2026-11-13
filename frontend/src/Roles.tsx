import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { request } from "./api.ts";

type Role = "freelancer" | "agency";
type Request = { id: number; subject: string; claim: string; status: "requested" | "approved" | "declined" };

export default function Roles({ role }: { role: Role }) {
  const [code, setCode] = useState("");
  const [requests, setRequests] = useState<Request[] | null>(null);
  const [subject, setSubject] = useState("");
  const [claim, setClaim] = useState("");
  const [message, setMessage] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    void request("/api/config").then(response => response.json()).then((config: { pilotEnabled?: boolean }) => setEnabled(config.pilotEnabled === true)).catch(() => {});
  }, []);

  async function call(path: string, options: RequestInit = {}) {
    let response: Response;
    try {
      response = await request(path, {
        ...options,
        headers: { Authorization: `Bearer ${code}`, ...(options.body ? { "Content-Type": "application/json" } : {}) },
      });
    } catch {
      throw new Error(options.method ? "Connection lost. The action may have completed; reopen the inbox before trying again." : "Inbox unavailable. Try opening it again.");
    }
    if (response.ok) return response.json();
    if (response.status === 409) throw new Error("This request already has a different decision. Reopen the inbox to see its current status.");
    if (response.status === 404) throw new Error("The pilot inbox is not enabled here.");
    if (response.status === 400) throw new Error("Check the name and contribution; they must fit the reference format.");
    throw new Error("Could not access the inbox. Check your role-specific code and try again.");
  }

  async function load() {
    setLoading(true);
    setMessage("Loading inbox…");
    try {
      const data: { requests: Request[] } = await call(`/api/pilot/requests?role=${role}`);
      setRequests(data.requests);
      setMessage("");
      return true;
    } catch (error) {
      setRequests(null);
      setMessage(error instanceof Error ? error.message : "Inbox unavailable.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await call("/api/pilot/requests", { method: "POST", body: JSON.stringify({ subject, claim }) });
      setSubject("");
      setClaim("");
      const refreshed = await load();
      setMessage(refreshed ? "Request submitted to your pilot agency." : "Request submitted, but the inbox could not be refreshed. Open it again to check.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed. Reopen the inbox before retrying.");
    } finally {
      setBusy(false);
    }
  }

  async function review(id: number, status: "approved" | "declined") {
    if (busy) return;
    setBusy(true);
    try {
      await call(`/api/pilot/requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed. Reopen the inbox to check the decision.");
    } finally {
      setBusy(false);
    }
  }

  function clearDraft() {
    setDraft("");
    setCopyMessage("");
  }

  function prepareDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("subject") ?? "").trim();
    const contribution = String(data.get("claim") ?? "").trim();
    if (!name || !contribution) {
      setCopyMessage("Enter a name and describe one contribution.");
      return;
    }
    setDraft(`EVA reference request\n\nProfessional name or alias: ${name}\nContribution to approve: ${contribution}\n\nPlease confirm this wording is approved for sharing, then issue an EVA reference.`);
    setCopyMessage("");
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopyMessage("Request copied. Send it to your agency.");
    } catch {
      setCopyMessage("Select and copy the draft above.");
    }
  }

  return <main id="main" tabIndex={-1} className="role-main">
        <p className="eyebrow">For {role === "agency" ? "agencies" : "freelancers"}</p>
        <h1>{role === "agency" ? "Review reference requests" : "Request a reference for your work"}</h1>
        <p className="role-lede">{role === "agency" ? "Review a request, agree on wording that may be shared, and issue the reference from your operator device." : "Ask your agency to confirm one contribution you can share with a recruiter."}</p>
        {role === "agency" ? <section className="role-section"><h2>Issue an approved reference</h2><p>After confirming permission outside EVA, the configured issuer uses the CLI on its own device. Share the resulting link privately with the freelancer.</p><pre className="cli-steps"><code>{'pnpm --filter @eva/backend run reference issue "$REQUEST_FILE" "$OUTPUT_FILE"\npnpm --filter @eva/backend run reference resume "$OUTPUT_FILE.pending" "$OUTPUT_FILE"\npnpm --filter @eva/backend run reference revoke "$REFERENCE_ID"'}</code></pre></section> : <section className="role-section">
          <h2>Prepare your request</h2>
          <p>Send this draft through your existing agency contact channel. No client name or project files are needed.</p>
          <form className="request-form" onSubmit={prepareDraft}>
            <label htmlFor="draft-subject">Professional name or alias</label>
            <input id="draft-subject" name="subject" required maxLength={80} onChange={clearDraft} />
            <label htmlFor="draft-claim">Contribution to approve</label>
            <input id="draft-claim" name="claim" required maxLength={240} onChange={clearDraft} />
            <button className="primary" type="submit">Prepare draft</button>
            {draft && <>
              <label htmlFor="draft-output">Copy this request to your agency</label>
              <textarea id="draft-output" readOnly value={draft} rows={6} />
              <button type="button" onClick={() => void copyDraft()}>Copy request</button>
            </>}
            <p role="status">{copyMessage}</p>
          </form>
        </section>}
        {role === "agency" && <aside className="workspace-aside">
          <p className="eyebrow">NEAR Testnet</p>
          <h2>Manage an issued reference</h2>
          <p>Review an issued reference and revoke it using the registered issuer’s Testnet wallet extension.</p>
          <a className="button primary" href="/agency/wallet">Connect NEAR Wallet</a>
        </aside>}
        {enabled ? <section className="role-section"><h2>Private pilot inbox</h2><p>This optional inbox is available only when an operator provisions a single freelancer and agency. Your access code stays in this tab and is cleared on refresh. Do not include client names or project files.</p>
          <><label htmlFor="pilot-code">{role === "agency" ? "Agency" : "Freelancer"} access code</label><input id="pilot-code" type="password" autoComplete="off" disabled={loading || busy} value={code} onChange={event => { setCode(event.target.value); setRequests(null); setSubject(""); setClaim(""); setMessage(""); }} />
          <button onClick={() => void load()} disabled={!code || loading || busy}>{loading ? "Opening inbox…" : "Open inbox"}</button><p role="status" aria-live="polite">{message}</p>
          {requests && <div className="pilot-content">{role === "freelancer" && <form className="request-form" onSubmit={event => void submit(event)}><h3>New request</h3><label htmlFor="subject">Professional name or alias</label><input id="subject" required maxLength={80} value={subject} onChange={event => setSubject(event.target.value)} /><label htmlFor="claim">Contribution to approve</label><input id="claim" required maxLength={240} value={claim} onChange={event => setClaim(event.target.value)} /><button className="primary" type="submit" disabled={busy || loading}>{busy ? "Saving…" : "Send request"}</button></form>}
            <h3>Requests</h3>{requests.length === 0 ? <p>No requests yet.</p> : requests.map(item => <article className="pilot-request" key={item.id}><strong>{item.subject}</strong><p>{item.claim}</p><p>Request status: {{ requested: "Submitted", approved: "Approved", declined: "Declined" }[item.status]}</p>{role === "agency" && item.status === "requested" && <div className="actions"><button disabled={busy || loading} onClick={() => void review(item.id, "approved")}>Approve wording</button><button disabled={busy || loading} onClick={() => void review(item.id, "declined")}>Decline</button></div>}</article>)}<p className="fine-print">Request status is an inbox workflow only. It does not mean a reference was issued or verified.</p></div>}</>
        </section> : null}

    </main>;
}
