import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { NearConnector, NearWalletBase } from "@hot-labs/near-connect";
import { parseLinkFragment, verifyReference } from "@eva/backend/reference";
import type { ParsedLink } from "@eva/backend/reference";
import { getProfile, getReference } from "./api.ts";
import type { AppProfile } from "./api.ts";

let connector: NearConnector | undefined;

export default function AgencyWallet() {
  const [profile, setProfile] = useState<AppProfile>();
  const [wallets, setWallets] = useState<NearWalletBase[]>([]);
  const [wallet, setWallet] = useState<NearWalletBase>();
  const [account, setAccount] = useState("");
  const [input, setInput] = useState("");
  const [reference, setReference] = useState<ParsedLink>();
  const [verdict, setVerdict] = useState<"VALID" | "REVOKED">();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void getProfile(controller.signal).then(setProfile, () => {
      if (!controller.signal.aborted) setMessage("Could not load the NEAR issuer configuration. Reload this page to try again.");
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const activeConnector = connector;
    if (!activeConnector || !scanned) return;
    const refresh = () => setWallets([...activeConnector.availableWallets]);
    activeConnector.on("selector:walletsChanged", refresh);
    refresh();
    return () => activeConnector.off("selector:walletsChanged", refresh);
  }, [scanned]);

  async function findWallets() {
    setBusy(true);
    setMessage("");
    try {
      if (!connector) {
        const { NearConnector: Connector } = await import("@hot-labs/near-connect");
        connector = new Connector({
          network: "testnet",
          autoConnect: false,
          manifest: { wallets: [], version: "1.0.0" },
          features: { signInWithoutAddKey: true, signAndSendTransaction: true },
          footerBranding: null,
        });
      }
      await connector.whenManifestLoaded;
      setScanned(true);
      setWallets([...connector.availableWallets]);
    } catch {
      setMessage("Could not start the NEAR wallet connector. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function connect(option: NearWalletBase) {
    if (!connector) return;
    setBusy(true);
    setMessage("");
    try {
      const connected = await connector.connect({ walletId: option.manifest.id });
      const accounts = await connected.getAccounts({ network: "testnet" });
      const selected = accounts.find(item => item.accountId === profile?.issuerId) ?? accounts[0];
      if (!selected) throw new Error("NO_ACCOUNT");
      setWallet(connected);
      setAccount(selected.accountId);
    } catch {
      setMessage("Wallet connection was cancelled or failed. Choose a wallet to try again.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!connector || !wallet) return;
    setBusy(true);
    try {
      await connector.disconnect(wallet);
      setWallet(undefined);
      setAccount("");
      setMessage("");
    } catch {
      setMessage("The wallet could not disconnect. Try again in your wallet.");
    } finally {
      setBusy(false);
    }
  }

  async function read(link: ParsedLink, config: AppProfile, awaitingFinal = pending) {
    const result = await verifyReference(link, config, id => getReference(id, config));
    if (result.status !== "VALID" && result.status !== "REVOKED") {
      setVerdict(undefined);
      setMessage(result.status === "INVALID" ? "This reference could not be verified for the configured issuer." : "NEAR status is unavailable. Check again before taking action.");
      return;
    }
    setVerdict(result.status);
    if (result.status === "REVOKED") setPending(false);
    setMessage(result.status === "VALID" && awaitingFinal ? "The final record is still active. Check again after the transaction has settled." : "");
  }

  async function checkReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const text = input.trim();
      const url = text.startsWith("#r=") ? undefined : new URL(text);
      if (url && (url.origin !== location.origin || url.pathname !== "/verify" || url.search || url.username || url.password)) throw new Error("INVALID_LINK");
      const link = parseLinkFragment(url?.hash ?? text);
      setReference(link);
      await read(link, profile);
    } catch {
      setReference(undefined);
      setVerdict(undefined);
      setMessage("Paste a /verify link from this site or its #r= fragment.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!wallet || !profile || !reference || account !== profile.issuerId || verdict !== "VALID" || busy || pending) return;
    setBusy(true);
    setPending(true);
    setMessage("Review the revocation in your wallet.");
    try {
      const accounts = await wallet.getAccounts({ network: "testnet" });
      if (!accounts.some(item => item.accountId === profile.issuerId)) {
        setPending(false);
        setMessage("Switch to the registered issuer account in your wallet.");
        return;
      }
      const result = await wallet.signAndSendTransaction({
        network: "testnet",
        signerId: profile.issuerId,
        receiverId: profile.contractId,
        actions: [{ type: "FunctionCall", params: { methodName: "revoke", args: { reference_id: reference.payload.referenceId }, gas: "30000000000000", deposit: "0" } }],
      });
      if (typeof result?.status === "object" && result.status && "Failure" in result.status) {
        setPending(false);
        setMessage("NEAR rejected the transaction. Check the reference before retrying.");
        setVerdict(undefined);
        return;
      }
      if (result?.transaction?.hash) setTransactionHash(result.transaction.hash);
      await read(reference, profile, true);
    } catch {
      setMessage("The wallet did not confirm a result. Check the reference before signing again.");
    } finally {
      setBusy(false);
    }
  }

  const isTestnet = profile?.network === "testnet";
  return <main id="main" tabIndex={-1} className="workspace">
    <p className="eyebrow">{profile?.network === "sandbox" ? "Local NEAR Sandbox" : "Agency · NEAR Testnet"}</p>
    <h1>Manage an issued reference</h1>
    <p className="lede">Connect the registered issuer’s wallet, then check the reference you want to revoke.</p>
    <div className="verify-grid">
      <section className="role-section" aria-labelledby="wallet-title">
        <h2 id="wallet-title">Issuer wallet</h2>
        {!profile && <p>{message || "Loading the issuer configuration…"}</p>}
        {profile?.network === "sandbox" && <p>This preview uses a local issuer. <a href="/issue">Open Local NEAR Sandbox</a>.</p>}
        {isTestnet && <>
          <p className="fine-print">Registered issuer <strong className="identifier">{profile.issuerId}</strong></p>
          {account ? <>
            <p className="identifier">{account}</p>
            {account !== profile.issuerId && <p>This account cannot revoke the agency’s references.</p>}
            <button type="button" disabled={busy} onClick={() => void disconnect()}>Disconnect wallet</button>
          </> : <>
            <button className="primary" type="button" disabled={busy} onClick={() => void findWallets()}>Connect NEAR Wallet</button>
            {scanned && (wallets.length ? <div className="actions" aria-label="Detected Testnet wallets">
              {wallets.map(option => <button key={option.manifest.id} type="button" disabled={busy} onClick={() => void connect(option)}>{option.manifest.name}</button>)}
            </div> : <p>No compatible Testnet wallet detected. Open your NEAR wallet extension and return to this page.</p>)}
          </>}
        </>}
        <p role="status" className="wallet-message">{message}</p>
      </section>
      {isTestnet && <section className="workspace-aside" aria-labelledby="wallet-reference">
        <h2 id="wallet-reference">Reference status</h2>
        <form className="request-form" onSubmit={checkReference}>
          <label htmlFor="wallet-link">Reference link</label>
          <input id="wallet-link" autoComplete="off" required value={input} disabled={busy || pending} onChange={event => { setInput(event.target.value); setReference(undefined); setVerdict(undefined); setTransactionHash(""); setMessage(""); }} />
          <button type="submit" disabled={busy}>Check reference</button>
        </form>
        {transactionHash && <p className="fine-print">Transaction <span className="identifier">{transactionHash}</span></p>}
        {reference && verdict && <div className="wallet-reference">
          <span className={"status " + verdict.toLowerCase()}>{verdict}</span>
          <p>{reference.payload.claim}</p>
          <p className="fine-print">{reference.payload.subject}</p>
        </div>}
        {account === profile.issuerId && verdict === "VALID" && <details>
          <summary>Revoke this reference</summary>
          <p>Revocation is permanent. Anyone holding the reference can still read its wording.</p>
          <button className="primary" type="button" disabled={busy || pending} onClick={() => void revoke()}>Confirm revoke in wallet</button>
        </details>}
      </section>}
    </div>
    <a className="workspace-back" href="/agency">Back to Agency</a>
  </main>;
}
