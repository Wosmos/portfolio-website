// Markdown for the blog posts. A deliberately small subset, rendered the way mdLite in
// src/lib/github.ts renders a README: the source is escaped first and markup is only ever added
// afterwards, so no HTML written into a post can survive into the page.

import { escapeHtml } from "@/lib/text";

const EXTERNAL = /^https?:\/\//;
/** Only these schemes reach an href/src; anything else (javascript:, data:) becomes an inert "#". */
const safeUrl = (u: string): string => (/^(https?:|mailto:|\/|#|\.{0,2}\/)/.test(u) ? u : "#");

function marks(s: string): string {
  return s
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, src: string) => `<img src="${safeUrl(src)}" alt="${alt}" loading="lazy" />`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
      const url = safeUrl(href);
      return `<a href="${url}"${EXTERNAL.test(url) ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^\w*_])[*_]([^*_\n]+)[*_](?!\w)/g, "$1<em>$2</em>");
}

// Inline code is split out before the other marks run, so bold/italic/link rules cannot rewrite
// what is inside a code span.
function inline(text: string): string {
  return escapeHtml(text)
    .split(/(`[^`]+`)/)
    .map((part) => (part.length > 1 && part.startsWith("`") && part.endsWith("`") ? `<code>${part.slice(1, -1)}</code>` : marks(part)))
    .join("");
}

/** Blog markdown to HTML: h2/h3, paragraphs, lists, quotes, fenced code, rules and inline marks. */
export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let items: string[] = [];
  let ordered = false;

  const closePara = (): void => {
    if (!para.length) return;
    out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  const closeList = (): void => {
    if (!items.length) return;
    const tag = ordered ? "ol" : "ul";
    out.push(`<${tag}>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</${tag}>`);
    items = [];
  };
  const close = (): void => { closePara(); closeList(); };

  for (let i = 0; i < lines.length; i += 1) {
    const line = (lines[i] ?? "").trim();

    if (line.startsWith("```")) {
      close();
      const lang = line.slice(3).trim().split(/\s+/)[0] ?? "";
      const body: string[] = [];
      for (i += 1; i < lines.length && !(lines[i] ?? "").trimStart().startsWith("```"); i += 1) body.push(lines[i] ?? "");
      const cls = lang ? ` class="language-${lang.replace(/[^\w.+-]/g, "")}"` : "";
      out.push(`<pre><code${cls}>${escapeHtml(body.join("\n"))}</code></pre>`);
      continue;
    }
    if (!line) { close(); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) { close(); out.push("<hr />"); continue; }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      close();
      // the post's own title is the h1, so a heading in the body starts at h2
      const level = Math.min(3, Math.max(2, (heading[1] ?? "").length));
      out.push(`<h${level}>${inline(heading[2] ?? "")}</h${level}>`);
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      close();
      const body: string[] = [quote[1] ?? ""];
      for (; i + 1 < lines.length; i += 1) {
        const more = /^>\s?(.*)$/.exec((lines[i + 1] ?? "").trim());
        if (!more) break;
        body.push(more[1] ?? "");
      }
      out.push(`<blockquote><p>${inline(body.join(" ").trim())}</p></blockquote>`);
      continue;
    }

    const bullet = /^[-*+]\s+(.+)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (bullet || numbered) {
      closePara();
      const wantOrdered = numbered !== null;
      if (items.length && wantOrdered !== ordered) closeList();
      ordered = wantOrdered;
      items.push(bullet?.[1] ?? numbered?.[1] ?? "");
      continue;
    }

    closeList();
    para.push(line);
  }

  close();
  return out.join("");
}
