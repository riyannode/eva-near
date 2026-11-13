import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { NearConnector, NearWalletBase } from "@hot-labs/near-connect";
import { createPayload, createShareLink, encodePayload, parseLinkFragment, randomReferenceId, randomSalt, sha256Hex, verifyReference } from "@eva/backend/reference";
import type { ParsedLink } from "@eva/backend/reference";
import { getProfile, getReference } from "./api.ts";
import type { AppProfile } from "./api.ts";

let connector: NearConnector | undefined;
let injectedWallet: typeof import("@hot-labs/near-connect").InjectedWallet | undefined;
let sandboxWallet: typeof import("@hot-labs/near-connect").SandboxWallet | undefined;
const meteorExecutor = "/wallet/meteor-near-connect.js";
const meteorWalletId = "meteor-wallet";
function eligible(option: NearWalletBase): boolean {
  if (injectedWallet && option instanceof injectedWallet) return option.manifest.type === "injected";
  return Boolean(sandboxWallet && option instanceof sandboxWallet && option.manifest.id === meteorWalletId
    && option.manifest.executor === meteorExecutor && !option.manifest.debug);
}
type Intent = { link: string; parsed: ParsedLink; commitment: string };

export default function AgencyWallet() {
  const [profile, setProfile] = useState<AppProfile>();
  const [wallets, setWallets] = useState<NearWalletBase[]>([]);
  const [wallet, setWallet] = useState<NearWalletBase>();
  const [accounts, setAccounts] = useState<string[]>([]);
  const [account, setAccount] = useState("");
  const [subject, setSubject] = useState("");
  const [claim, setClaim] = useState("");
  const [approved, setApproved] = useState(false);
  const [input, setInput] = useState("");
  const [intent, setIntent] = useState<Intent>();
  const [verdict, setVerdict] = useState<"VALID" | "REVOKED">();
  const [pending, setPending] = useState<"issue" | "revoke">();
  const [canRetry, setCanRetry] = useState(false);
  const [definiteFailure, setDefiniteFailure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void getProfile(controller.signal).then(setProfile, () => { if (!controller.signal.aborted) setMessage("Configuration unavailable. Reload to try again."); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const active = connector;
    if (!active || !scanned) return;
    const refresh = () => setWallets(active.availableWallets.filter(eligible));
    active.on("selector:walletsChanged", refresh); refresh();
    return () => active.off("selector:walletsChanged", refresh);
  }, [scanned]);

  async function findWallets() {
    if (location.search || location.hash) history.replaceState(history.state, "", location.pathname);
    setBusy(true); setMessage("");
    try {
      if (!connector) {
        const { NearConnector: Connector, InjectedWallet, SandboxWallet } = await import("@hot-labs/near-connect");
        injectedWallet = InjectedWallet; sandboxWallet = SandboxWallet;
        connector = new Connector({ network: "testnet", autoConnect: false, manifest: { wallets: [{
          id: meteorWalletId, name: "Meteor Wallet", type: "sandbox", executor: meteorExecutor,
          version: "1.1.1", platform: [], icon: "", description: "NEAR wallet", website: "https://meteorwallet.app/",
          permissions: { storage: true, external: ["meteorCom", "meteorComV2"], allowsOpen: ["https://chromewebstore.google.com", "https://wallet.meteorwallet.app", "https://meteorwallet.app", "meteorwallet://", "meteorwalletdev://"] },
          features: { testnet: true, mainnet: true, signInWithoutAddKey: true, signAndSendTransaction: true, signInAndSignMessage: false, signInWithFunctionCallKey: false, signMessage: false, signTransaction: false, signAndSendTransactions: false, signDelegateActions: false },
        }], version: "1.0.0" }, cspNonce: document.querySelector<HTMLMetaElement>('meta[name="eva-csp-nonce"]')?.content, features: { signInWithoutAddKey: true, signAndSendTransaction: true }, footerBranding: null });
      }
      await connector.whenManifestLoaded;
      setScanned(true);
    } catch { setMessage("Could not start the wallet connector."); } finally { setBusy(false); }
  }
  async function connect(option: NearWalletBase) {
    if (!connector) return;
    setBusy(true);
    try {
      let authorized: string[] = [];
      const onSignIn = (event: { wallet: NearWalletBase; accounts: { accountId: string }[] }) => {
        if (event.wallet === option) authorized = event.accounts.map(item => item.accountId);
      };
      connector.on("wallet:signIn", onSignIn);
      let connected: NearWalletBase;
      try { connected = await connector.connect({ walletId: option.manifest.id }); }
      finally { connector.off("wallet:signIn", onSignIn); }
      if (connected !== option) throw new Error("WALLET_CHANGED");
      const found = option.manifest.id === meteorWalletId ? authorized : (await connected.getAccounts({ network: "testnet" })).map(item => item.accountId);
      if (!found.length || (option.manifest.id === meteorWalletId && found.length !== 1)) throw new Error("NO_ACCOUNT");
      setWallet(connected);
      setAccounts(found);
      setAccount(found[0]);
      setMessage("");
    } catch {
      setMessage("Wallet connection was cancelled or failed.");
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    if (!connector || !wallet) return;
    setBusy(true);
    try { await connector.disconnect(wallet); setWallet(undefined); setAccounts([]); setAccount(""); }
    catch { setMessage("Could not disconnect the wallet. Try again."); }
    finally { setBusy(false); }
  }
  async function read(current: Intent, action?: "issue" | "revoke") {
    if (!profile) return;
    setCanRetry(false);
    const result = await verifyReference(current.parsed, profile, id => getReference(id));
    if (result.status === "VALID" || result.status === "REVOKED") {
      setVerdict(result.status);
      if ((action === "issue" && result.status === "VALID") || (action === "revoke" && result.status === "REVOKED")) {
        setPending(undefined); if (action === "issue") setInput(current.link); setMessage(action === "issue" ? "Reference confirmed on final state." : "Revocation confirmed on final state.");
      } else if (action === "issue" && result.status === "REVOKED") { setPending(undefined); setMessage("This reference was revoked. Create a new reference."); }
      else if (action) { setCanRetry(action === "revoke" && result.status === "VALID"); setMessage("Final state has not confirmed the action. You may retry the same transaction."); }
      else setMessage("");
    } else {
      setVerdict(undefined);
      if (action === "issue" && result.status === "INVALID" && result.code === "REFERENCE_NOT_FOUND") setCanRetry(true);
      else if (action && result.status === "INVALID") { setPending(undefined); setMessage("This reference conflicts with the final record. Create a new reference."); return; }
      setMessage(result.status === "UNAVAILABLE" ? "Final state is unavailable. Check again before retrying." : action ? "No matching final record yet. Check again before retrying." : "This reference could not be verified.");
    }
  }
  async function issue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wallet || !profile || !account || busy || pending || !approved) return;
    setBusy(true);
    try {
      const payload = createPayload({ ...profile, issuerId: account }, {
        referenceId: randomReferenceId(), salt: randomSalt(), subject, claim,
      });
      const payloadBytes = encodePayload(payload);
      const current = {
        link: createShareLink(location.origin, payloadBytes),
        parsed: { payload, payloadBytes },
        commitment: await sha256Hex(payloadBytes),
      };
      setIntent(current); setInput(""); setVerdict(undefined);
      await send(current, "issue");
    } catch { setMessage("Check the name and claim; they must fit the reference format."); } finally { setBusy(false); }
  }
  async function send(current: Intent, action: "issue" | "revoke") {
    if (!wallet || !profile || account !== current.parsed.payload.issuerId) return;
    if (location.search || location.hash) history.replaceState(history.state, "", location.pathname);
    setCanRetry(false);
    setDefiniteFailure(false);
    setPending(action);
    setVerdict(undefined);
    setMessage("Review the transaction in your wallet.");
    try {
      const found = await wallet.getAccounts({ network: "testnet" });
      if (!found.some(item => item.accountId === account)) {
        setMessage("Reconnect the issuing account, then check final state.");
        return;
      }
      const reference_id = current.parsed.payload.referenceId;
      const result = await wallet.signAndSendTransaction({
        network: "testnet",
        signerId: account,
        receiverId: profile.contractId,
        actions: [{ type: "FunctionCall", params: {
          methodName: action,
          args: action === "issue" ? { reference_id, commitment: current.commitment } : { reference_id },
          gas: "60000000000000",
          deposit: action === "issue" ? "10000000000000000000000" : "0",
        } }],
      });
      if (typeof result?.status === "object" && result.status && "Failure" in result.status) {
        setDefiniteFailure(true);
        setMessage("Transaction failed. Check final state before retrying.");
        return;
      }
      setMessage("Transaction submitted. Waiting for final state.");
      await read(current, action);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      if (/reject|cancel|denied/i.test(text)) { setDefiniteFailure(true); setMessage("Wallet request rejected. Check final state before retrying."); }
      else setMessage("Transaction result is unknown. Check final state before retrying.");
      setVerdict(undefined);
    }
  }
  async function checkReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!profile || busy || pending) return;
    setBusy(true);
    try {
      const text = input.trim(); const url = text.startsWith("#r=") ? undefined : new URL(text);
      if (url && (url.origin !== location.origin || url.pathname !== "/verify" || url.search || url.username || url.password)) throw new Error("INVALID_LINK");
      const parsed = parseLinkFragment(url?.hash ?? text);
      const current = { link: location.origin + "/verify" + (url?.hash ?? text), parsed, commitment: await sha256Hex(parsed.payloadBytes) };
      setIntent(current); await read(current);
    } catch { setIntent(undefined); setVerdict(undefined); setMessage("Paste a /verify link from this site or its #r= fragment."); } finally { setBusy(false); }
  }
  return <main id="main" tabIndex={-1} className="workspace">
    <p className="eyebrow">{profile?.network === "sandbox" ? "Local NEAR Sandbox" : "Agency"}</p>
    <h1>Issue a work reference</h1>
    <p className="lede">Approve the wording and issue it with your agency wallet. Share the link with the freelancer.</p>
    {profile?.network === "sandbox" && <p><a href="/issue">Issue in Local NEAR Sandbox</a></p>}
    {profile?.network === "testnet" && <div className="verify-grid">
      <section className="role-section agency-issue">
        <h2>Agency wallet</h2>
        <p className="fine-print">NEAR Testnet</p>
        {!wallet ? <>
          <button className="primary" disabled={busy} onClick={() => void findWallets()}>Connect NEAR Wallet</button>
          {scanned && (wallets.length ? <div className="actions">
            {wallets.map(option => <button key={option.manifest.id} disabled={busy} onClick={() => void connect(option)}>{option.manifest.name}</button>)}
          </div> : <p>No compatible Testnet wallet detected.</p>)}
        </> : <>
          <label htmlFor="account">Issuer account</label>
          <div className="agency-account">
            <select id="account" value={account} disabled={busy} onChange={event => setAccount(event.target.value)}>
              {accounts.map(id => <option key={id}>{id}</option>)}
            </select>
            <button disabled={busy} onClick={() => void disconnect()}>Disconnect wallet</button>
          </div>
        </>}
        <form className="request-form" onSubmit={event => void issue(event)}>
          <label htmlFor="subject">Professional name or alias</label>
          <input id="subject" required maxLength={80} value={subject} onChange={event => { setSubject(event.target.value); setApproved(false); }} />
          <label htmlFor="claim">Approved contribution</label>
          <textarea id="claim" required maxLength={240} rows={3} value={claim} onChange={event => { setClaim(event.target.value); setApproved(false); }} />
          <label className="approval">
            <input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)} />
            I approve this wording for sharing.
          </label>
          <button className="primary" disabled={!wallet || busy || !!pending || !approved}>Issue reference</button>
        </form>
      </section>
      <section className="workspace-aside">
        <h2>Check or manage a reference</h2>
        <form className="request-form" onSubmit={event => void checkReference(event)}>
          <label htmlFor="wallet-link">Reference link</label>
          <input id="wallet-link" required value={input} disabled={busy || !!pending}
            onChange={event => { setInput(event.target.value); setIntent(undefined); setVerdict(undefined); }} />
          <button disabled={busy || !!pending}>Check reference</button>
        </form>
        {message && <p role="status">{message}</p>}
        {intent && pending && <div className="actions">
          <button disabled={busy} onClick={() => { setBusy(true); void read(intent, pending).finally(() => setBusy(false)); }}>Check final status</button>
          {canRetry && account === intent.parsed.payload.issuerId && <button disabled={busy} onClick={() => {
            setBusy(true);
            void (async () => {
              const check = await verifyReference(intent.parsed, profile, id => getReference(id));
              if ((pending === "issue" && check.status === "INVALID" && check.code === "REFERENCE_NOT_FOUND")
                || (pending === "revoke" && check.status === "VALID")) await send(intent, pending);
              else await read(intent, pending);
            })().finally(() => setBusy(false));
          }}>Retry same transaction</button>}
          {pending === "issue" && canRetry && definiteFailure && <button disabled={busy} onClick={() => {
            setPending(undefined);
            setIntent(undefined);
            setCanRetry(false);
            setMessage("You can prepare a new reference.");
          }}>Start a new reference</button>}
        </div>}
        {intent && verdict && <div className="agency-result">
          <span className={"status " + verdict.toLowerCase()}>{verdict}</span>
          <p>{intent.parsed.payload.claim}</p>
          <p>Issuer: {intent.parsed.payload.issuerId}</p>
          {verdict === "VALID" && <>
            <label htmlFor="issued-link">Verified reference link</label>
            <textarea id="issued-link" readOnly value={intent.link} />
            <div className="actions">
              <button type="button" onClick={() => {
                void navigator.clipboard.writeText(intent.link).then(
                  () => setMessage("Reference link copied."),
                  () => setMessage("Select and copy the reference link."),
                );
              }}>Copy link</button>
              <a className="button" href={intent.link}>Open reference</a>
            </div>
            {account === intent.parsed.payload.issuerId && <details>
              <summary>Revoke this reference</summary>
              <p>Revocation is permanent.</p>
              <button disabled={busy || !!pending} onClick={() => {
                setBusy(true);
                void send(intent, "revoke").finally(() => setBusy(false));
              }}>Confirm revoke in wallet</button>
            </details>}
          </>}
        </div>}
      </section>
    </div>}
    {(!profile || profile.network === "sandbox") && <p role="status">{message || (!profile ? "Loading Agency workspace…" : "")}</p>}
  </main>;
}
