import type { Metadata } from "next";
import { getPerson } from "@/lib/content";
import { OG_SIZE } from "@/lib/seo";
import ContactForm from "@/components/read/ContactForm";

// No window: the page is rebuilt when a save or the publish button says so, not on a timer.
export const revalidate = false;

export async function generateMetadata(): Promise<Metadata> {
  const person = await getPerson();
  const description = `Get in touch with ${person.name} about roles, contracts, or one of the projects. Replies within a day.`;
  return {
    title: "Contact",
    description,
    alternates: { canonical: "/read/contact" },
    // naming `openGraph` replaces the parent's whole object, so the root brand card is repeated here —
    // see the same note in src/app/read/page.tsx
    openGraph: { type: "website", url: "/read/contact", title: "Contact", description, images: [{ url: "/opengraph-image", ...OG_SIZE, alt: "Contact" }] },
    twitter: { card: "summary_large_image", title: "Contact", description, images: ["/opengraph-image"] },
  };
}

export default async function ContactPage() {
  const person = await getPerson();
  const tel = person.phone.replace(/\s/g, "");
  return (
    <>
      <section className="hero pj" style={{ marginTop: 0, gridTemplateColumns: "1fr" }}>
        <div>
          <p className="k"><i className="live" />open to remote roles · replies within a day</p>
          <h1 style={{ marginTop: 12 }}><span className="name">Get in touch</span></h1>
        </div>
      </section>
      <section className="contact" style={{ marginTop: 36 }}>
        <div>
          <p className="contact__lead hero__p" style={{ marginTop: 0 }}>Roles, contracts, or a question about one of the projects. The form lands in my inbox; reply-to is your address.</p>
          <div className="contact__alt rv">
            <a href={`mailto:${person.email}`}><span>email</span><span>{person.email}</span></a>
            <a href={`tel:${tel}`}><span>phone</span><span>{person.phone}</span></a>
            <a href={person.linkedin} target="_blank" rel="noopener"><span>linkedin</span><span>↗</span></a>
            <a href={person.github} target="_blank" rel="noopener"><span>github</span><span>Wosmos ↗</span></a>
          </div>
        </div>
        <div className="rv"><ContactForm /></div>
      </section>
    </>
  );
}
