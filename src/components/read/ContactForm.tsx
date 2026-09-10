"use client";
// Posts to /api/contact, which sends through Resend. `website` is a honeypot: a real visitor never
// fills it, and a submission that does is accepted and dropped server-side.

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { getAudio } from "@/lib/sound-client";
import { ev } from "@/lib/analytics";

type Status = { text: string; kind: "" | "ok" | "bad" };
const FIELDS = ["name", "email", "subject", "message"] as const;

export default function ContactForm() {
  const form = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>({ text: "", kind: "" });
  // when this form appeared. The route refuses anything sent within two seconds of it — a script, not a person.
  const shownAt = useRef(0);
  useEffect(() => { shownAt.current = Date.now(); }, []);
  const [sending, setSending] = useState(false);
  const [count, setCount] = useState(0);

  const shake = (): void => { if (form.current && !matchMedia("(prefers-reduced-motion: reduce)").matches) gsap.fromTo(form.current, { x: -5 }, { x: 0, duration: 0.45, ease: "elastic.out(1, 0.3)" }); };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const el = e.currentTarget;
    const data = Object.fromEntries(new FormData(el).entries());
    for (const k of FIELDS) {
      if (!String(data[k] ?? "").trim()) {
        setStatus({ text: `${k} is required`, kind: "bad" }); shake();
        el.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name=${k}]`)?.focus();
        return;
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) {
      setStatus({ text: "that email does not look right", kind: "bad" }); shake();
      el.querySelector<HTMLInputElement>("[name=email]")?.focus();
      return;
    }
    setSending(true);
    setStatus({ text: "sending …", kind: "" });
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...data, at: shownAt.current }) });
      const j: { success?: boolean; error?: string } = await r.json().catch(() => ({}));
      if (r.ok && j.success) {
        setStatus({ text: "sent · i will reply from my inbox", kind: "ok" });
        el.reset(); setCount(0); getAudio().arrive(); ev("contact_submit", { ok: true });
      } else {
        const wait = Number(r.headers.get("retry-after"));
        const tooMany = r.status === 429;
        setStatus({
          text: j.error ?? (tooMany ? `too many messages — try again in ${Math.max(1, Math.ceil(wait / 60))} min` : `could not send (${r.status})`),
          kind: "bad",
        });
        shake(); setSending(false); ev("contact_submit", { ok: false });
      }
    } catch {
      setStatus({ text: "no connection to the mail endpoint", kind: "bad" }); shake(); setSending(false);
    }
  }

  const tick = (): void => getAudio().type();

  return (
    <form className="form" ref={form} noValidate onSubmit={(e) => void onSubmit(e)}>
      <div className="form__row">
        <div className="f"><label htmlFor="c-name">name</label><input id="c-name" name="name" type="text" required maxLength={100} autoComplete="name" onInput={tick} /></div>
        <div className="f"><label htmlFor="c-email">email</label><input id="c-email" name="email" type="email" required maxLength={254} autoComplete="email" onInput={tick} /></div>
      </div>
      <div className="f"><label htmlFor="c-subject">subject</label><input id="c-subject" name="subject" type="text" required maxLength={150} onInput={tick} /></div>
      <div className="f f--msg">
        <label htmlFor="c-msg">message</label>
        <textarea id="c-msg" name="message" required maxLength={5000} onInput={(e) => { setCount(e.currentTarget.value.length); tick(); }} />
        {/* the send control lives inside the message box, like a composer */}
        <div className="f__send">
          <span className="f__count" aria-hidden="true">{count} / 5000</span>
          <span className={`form__msg${status.kind ? ` is-${status.kind}` : ""}`} role="status">{status.text}</span>
          <button className="sf sf--btn" type="submit" disabled={sending}><span className="sf__in">send <i>→</i></span></button>
        </div>
      </div>
      <div className="f f--hp" aria-hidden="true"><label htmlFor="c-web">website</label><input id="c-web" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
    </form>
  );
}
