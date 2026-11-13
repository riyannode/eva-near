export default function Home() {
  return <div className="landing">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="landing-nav">
      <a className="landing-brand" href="/" aria-label="EVA home">EVA<span aria-hidden="true">.</span></a>
      <nav aria-label="Main navigation">
        <a href="/" aria-current="page">Home</a>
        <a href="/project">Project</a>
        <a href="/demo">Demo</a>
      </nav>
      <a className="landing-verify" href="/verify">Check a reference <span aria-hidden="true">↗</span></a>
    </header>

    <main id="main" className="landing-main">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-intro">
          <h1 id="landing-title">Show what you did on a confidential project</h1>
          <p>Ask the agency you worked with to confirm one contribution. Share the reference with a recruiter while keeping the client’s name and project files private.</p>
          <a className="button primary landing-cta" href="/project">Open EVA <span aria-hidden="true">→</span></a>
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
          <a href="/project#request"><span><strong>Ask for a reference</strong><small>Write a short request to send to your agency.</small></span><span aria-hidden="true">↗</span></a>
          <a href="/project#agency"><span><strong>Give a reference</strong><small>See how an agency can issue or withdraw a reference.</small></span><span aria-hidden="true">↗</span></a>
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
    </main>

    <footer className="landing-footer">
      <a className="landing-brand" href="/" aria-label="EVA home">EVA<span aria-hidden="true">.</span></a>
      <nav aria-label="Footer navigation">
        <a href="/project">Project</a>
        <a href="/demo">Demo</a>
        <a href="https://github.com/riyannode/eva-near">Source code</a>
      </nav>
    </footer>
  </div>;
}
