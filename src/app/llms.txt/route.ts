import { getEducation, getExperience, getPerson, getPosts, getProjects, getSkills } from "@/lib/content";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { ym } from "@/lib/text";

// llmstxt.org: one plain-text map of the site for models, so an assistant can answer from the same
// facts the pages show instead of scraping a WebGL canvas. Built from the content readers, so it
// cannot drift; the hour is only a safety net behind the content tag an admin save revalidates.
// No window: the page is rebuilt when a save or the publish button says so, not on a timer.
export const revalidate = false;

const section = (title: string, lines: readonly string[]): string => `## ${title}\n\n${lines.join("\n")}`;

export async function GET(): Promise<Response> {
  const [person, projects, experience, skills, education, posts] = await Promise.all([
    getPerson(), getProjects(), getExperience(), getSkills(), getEducation(), getPosts(),
  ]);

  const blocks = [
    `# ${SITE_NAME} — ${person.fullName}`,
    `> ${person.metaDescription}`,
    person.summary,
    section("Projects", projects.map((p) => {
      const where = p.live ? `live at ${p.live}` : p.status ?? "source only";
      return `- [${p.title}](${absoluteUrl(`/read/projects/${p.id}`)}): ${p.tagline} — ${p.stack.join(", ")}; ${where}; source ${p.github}`;
    })),
    section("Experience", experience.map((e) =>
      `- **${e.title}**, ${e.company} (${e.location}) · ${ym(e.start)} – ${ym(e.end)} · ${e.stack.join(", ")}`,
    )),
    section("Skills", skills.map((g) => `- **${g.group}**: ${g.items.join(", ")}`)),
    section("Education", education.map((e) => `- ${e.degree}, ${e.school} · ${e.start} – ${e.end} · ${e.grade}`)),
    ...(posts.length
      ? [section("Writing", posts.map((p) => `- [${p.title}](${absoluteUrl(`/read/blog/${p.slug}`)}): ${p.excerpt}`))]
      : []),
    section("Contact", [
      `- [Contact form](${absoluteUrl("/read/contact")}): reaches my inbox, reply-to is you`,
      `- Email: ${person.email}`,
      `- Phone: ${person.phone}`,
      `- Based in ${person.location} (${person.tzLabel}), open to remote roles`,
    ]),
    section("Optional", [
      `- [Résumé (PDF)](${absoluteUrl(person.cv)}): the same facts on one page`,
      `- [GitHub profile](${person.github}): every project above`,
      `- [LinkedIn](${person.linkedin})`,
      `- [All projects](${absoluteUrl("/read/projects")}): index of the ${projects.length} pages above`,
      `- [Flight deck](${absoluteUrl("/ship")}): the same projects as a WebGL solar system — needs a browser, not a crawler`,
    ]),
  ];

  return new Response(`${blocks.join("\n\n")}\n`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
