# wosmos.vercel.app — Personal Portfolio

My portfolio site. A single-page, animated portfolio built with the Next.js App
Router and React 19, deployed on Vercel.

**Live:** https://wosmos.vercel.app

![Portfolio](public/logo.png)

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4
- **Animation:** GSAP + Framer Motion
- **Contact:** Resend (server route with HTML escaping, honeypot, and rate limiting)
- **Analytics:** Vercel Analytics + Speed Insights
- **OG images:** dynamic `next/og` route for real social-share previews

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

Set `RESEND_API_KEY` in `.env.local` for the contact form to send mail.

## Structure

```
src/
  app/
    layout.tsx            # metadata, fonts, metadataBase
    page.tsx              # section composition
    opengraph-image.tsx   # dynamic 1200x630 social card
    api/contact/route.ts  # hardened contact endpoint
  components/
    sections/             # Hero, About, Experience, Projects, Blog, Contact
    layout/               # Dock, Footer
    ui/                   # shared UI
  data/
    siteData.ts           # single source of truth for displayed content
```

## Notes on a few decisions

- **Content lives in one place.** `src/data/siteData.ts` holds projects,
  experience, and copy so the page and metadata stay consistent.
- **The contact route is treated as untrusted input.** User fields are
  HTML-escaped before they touch the email body, a honeypot field drops bots,
  and a per-IP in-memory limiter brakes abuse.
- **Social cards are generated, not static.** `opengraph-image.tsx` renders a
  proper 1200x630 card at request time so shared links never preview blank.
