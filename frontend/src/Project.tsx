export default function Project() {
  return <main id="main" tabIndex={-1} className="role-main">
      <p className="eyebrow">Choose your path</p><h1>What would you like to do?</h1>
      <section className="role-section" id="request"><h2>Freelancer</h2><p>Ask an agency to confirm your contribution.</p><a className="button" href="/freelancer">Request a reference</a></section>
      <section className="role-section" id="agency"><h2>Agency</h2><p>Issue and manage approved references with a NEAR wallet.</p><a className="button" href="/agency">Issue and manage references</a></section>
      <section className="role-section"><h2>Recruiter</h2><p>Check a reference shared by a candidate.</p><a className="button" href="/recruiter">Verify a reference</a></section>
    </main>;
}
