// Shared HTML for an admin reply to a contact-form submission, so the single-reply and bulk-reply
// routes send byte-identical emails instead of keeping two copies of the same markup in sync.

import { escapeHtml } from "@/lib/text";

export function replyEmailHtml(subject: string, message: string): string {
  const body = escapeHtml(message).replace(/\n/g, "<br>");
  return `<!doctype html><html><body style="margin:0;background:#050508;color:#f2f5ff;font:14px/1.7 ui-monospace,Menlo,monospace">
    <div style="max-width:600px;margin:0 auto;padding:28px 20px">
      <p style="margin:0 0 18px;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#00e5ff">wosmo · reply</p>
      <p style="margin:0 0 18px;color:rgba(242,245,255,.5)">${escapeHtml(subject)}</p>
      <div style="padding-top:16px;border-top:1px solid rgba(242,245,255,.1)">${body}</div>
    </div></body></html>`;
}
