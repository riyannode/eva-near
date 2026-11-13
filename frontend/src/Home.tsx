import { useRef } from "react";

export default function Home() {
  const dialog = useRef<HTMLDialogElement>(null);
  return <main id="main" tabIndex={-1} className="landing landing-main">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-intro">
          <h1 id="landing-title">Show what you did on a confidential project</h1>
          <p>Ask the agency you worked with to confirm one contribution. Share the reference with a recruiter while keeping the client’s name and project files private.</p>
          <button className="button primary landing-cta" type="button" onClick={() => dialog.current?.showModal()}>Open EVA <span aria-hidden="true">→</span></button>
          <dialog ref={dialog} aria-labelledby="role-dialog-title">
            <h2 id="role-dialog-title">How will you use EVA?</h2>
            <div className="landing-paths">
              <a href="/freelancer"><span><strong>Freelancer</strong><small>Request a reference</small></span></a>
              <a href="/agency"><span><strong>Agency (NEAR wallet)</strong><small>Issue and manage references</small></span></a>
              <a href="/recruiter"><span><strong>Recruiter</strong><small>Verify a reference</small></span></a>
            </div>
            <button type="button" onClick={() => dialog.current?.close()}>Close</button>
          </dialog>
        </div>

        <figure className="landing-example">
          <figcaption>Sample reference</figcaption>
          <div className="landing-paper">
            <div className="paper-top">
              <p>Alex Morgan</p>
              <span className="paper-status"><span aria-hidden="true">✓</span> VALID</span>
            </div>
            <dl className="paper-details">
              <div><dt>Contribution</dt><dd>Designed the checkout flow for an online store.</dd></div>
              <div><dt>Approved by</dt><dd>Studio A</dd></div>
            </dl>
            <p className="paper-privacy">Client name and project files stay private.</p>
          </div>
        </figure>
      </section>

      <section className="landing-roles" aria-labelledby="roles-title">
        <div>
          <h2 id="roles-title">A reference you can put on your CV</h2>
          <p>When an NDA limits what you can show, a short reference gives recruiters something they can check.</p>
        </div>
        <div className="landing-paths">
          <a href="/freelancer"><span><strong>Freelancer: request a reference</strong><small>Request a reference from your agency.</small></span><span aria-hidden="true">↗</span></a>
          <a href="/agency"><span><strong>Agency: issue a reference</strong><small>Issue and manage approved references.</small></span><span aria-hidden="true">↗</span></a>
        <a href="/recruiter"><span><strong>Recruiter: verify a reference</strong><small>Check the claim and registry status.</small></span><span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="landing-how" aria-labelledby="how-title">
        <h2 id="how-title">How it works</h2>
        <ol>
          <li><h3>Write your request</h3><p>Describe one thing you did and send the draft to the agency.</p></li>
          <li><h3>Get your reference</h3><p>The agency approves the wording and gives you a link for your CV.</p></li>
          <li><h3>Share the link</h3><p>A recruiter opens it to see who approved the work and whether the reference is still valid.</p></li>
        </ol>
        <a href="/demo">Try an example <span aria-hidden="true">→</span></a>
      </section>
    </main>;
}
