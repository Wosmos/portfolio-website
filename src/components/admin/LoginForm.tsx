"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (r.ok) { router.replace("/admin"); router.refresh(); return; }
      const body: { error?: string } = await r.json().catch(() => ({}));
      setError(body.error ?? (r.status === 429 ? "too many attempts · wait a few minutes" : "wrong username or password"));
    } catch {
      setError("no connection");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)}>
      <div className="fld">
        <label htmlFor="u">username</label>
        <input id="u" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </div>
      <div className="fld">
        <label htmlFor="p">password</label>
        <input id="p" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && <p className="err">{error}</p>}
      <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? "checking…" : "sign in"}</button>
    </form>
  );
}
