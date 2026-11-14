import { useState } from "react";
import type { FormEvent } from "react";

export default function Freelancer() {
  const [draft, setDraft] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

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
    <p className="eyebrow">For freelancers</p>
    <h1>Request a reference for your work</h1>
    <p className="role-lede">Ask your agency to confirm one contribution you can share with a recruiter.</p>
    <section className="role-section">
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
    </section>
  </main>;
}
