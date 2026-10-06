// A project's picture: a screenshot of the product in a 16:10 box, or, when there is none, a title
// card in the same box. The box reserves its own height, so nothing below it moves when the image
// arrives. The duotone and the scanlines are CSS over the image (read.css, `.shot`), and both lift on
// hover or focus to show the screenshot in full colour.

import Image from "next/image";

export interface ShotProject { id: string; title: string; category: string; stack: readonly string[] }

export default function ProjectShot({ project, src, priority = false, eager = false, sizes, href }: {
  project: ShotProject;
  /** From projectShot(): the admin's cover, the committed screenshot, or null for the title card. */
  src: string | null;
  /** The page's largest image: fetched eagerly, at high priority, with a preload hint in the head. */
  priority?: boolean;
  /** Fetched eagerly at high priority but with no preload hint, for an image that is the largest one
   *  only on some screens (the home page's lead card is in a desktop's first screen, not a phone's). */
  eager?: boolean;
  /** How wide the box renders at each breakpoint, so the browser picks the right file from the srcset. */
  sizes: string;
  /** Makes the box a link of its own. Leave it out inside a card that is already a link. */
  href?: string;
}) {
  const inner = src ? (
    <Image
      className="shot__img"
      src={src}
      alt={`${project.title} screenshot`}
      fill
      sizes={sizes}
      {...(priority ? { preload: true, fetchPriority: "high" as const }
        : eager ? { loading: "eager" as const, fetchPriority: "high" as const }
        : { loading: "lazy" as const })}
    />
  ) : (
    <span className="shot__card" aria-hidden="true">
      <span className="shot__k">{project.category}</span>
      <span className="shot__t">{project.title}</span>
      {project.stack.length > 0 && <span className="shot__s">{project.stack.slice(0, 4).join(" · ")}</span>}
    </span>
  );
  const cls = `shot${src ? "" : " shot--type"}`;

  return href ? (
    <a className={cls} href={href} target="_blank" rel="noopener" aria-label={`${project.title}, open the live site`}>
      {inner}
    </a>
  ) : (
    <span className={cls}>{inner}</span>
  );
}
