"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

// Status codes, not the server's prose: the copy stays lowercase and the route stays free to reword.
const SAID: Readonly<Record<number, string>> = {
  400: "both fields, please",
  401: "wrong username or password",
  429: "too many attempts · wait a few minutes",
};

/** ADMIN_PATH is server-only, so the way back to the panel is the URL we were served on, minus /login. */
function panelPath(): string {
  const here = window.location.pathname.replace(/\/+$/, "");
  return here.endsWith("/login") ? here.slice(0, -"/login".length) : here;
}

export default function LoginForm() {
  const first = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [peek, setPeek] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { first.current?.focus(); }, []);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      // A full load, not a router push: the panel is a separate bundle behind a rewrite, and the new
      // cookie has to be on the request that fetches it.
      if (response.ok) { window.location.assign(panelPath()); return; }
      setError(SAID[response.status] ?? "could not sign in");
    } catch {
      setError("no connection");
    }
    setBusy(false);
  }

  return (
    <form className="lgn__form" aria-busy={busy} onSubmit={(e) => void onSubmit(e)}>
      <div className="lgn__fld">
        <label htmlFor="u">username</label>
        <input
          id="u" ref={first} className="lgn__in" type="text" name="username" autoComplete="username"
          autoCapitalize="none" spellCheck={false} required
          value={username} onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="lgn__fld">
        <label htmlFor="p">password</label>
        <div className="lgn__wrap">
          <input
            id="p" className="lgn__in lgn__in--pw" type={peek ? "text" : "password"} name="password"
            autoComplete="current-password" spellCheck={false} required
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button" className="lgn__peek" aria-pressed={peek}
            aria-label={peek ? "hide the password" : "show the password"}
            onClick={() => setPeek((on) => !on)}
          >
            {peek ? "hide" : "show"}
          </button>
        </div>
      </div>
      <p className="lgn__err" role="status" aria-live="polite">{error}</p>
      <button className="lgn__go" type="submit" disabled={busy}>
        {busy ? <><i aria-hidden="true" />checking</> : "sign in"}
      </button>
      <p className="lgn__note">this page is not linked from anywhere</p>
    </form>
  );
}
