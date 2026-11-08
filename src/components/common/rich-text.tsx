import { Fragment, type ReactNode } from "react";
import { safeHref, safeImageSrc } from "@/lib/rich-text/sanitize";
import type { RichTextDoc, RichTextNode } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Renders Tiptap JSON as React elements using an allow-list of node and mark types.
 * No HTML strings are ever injected, so stored content cannot run scripts.
 */
export function RichText({
  doc,
  className,
}: {
  doc: RichTextDoc | null | undefined;
  className?: string;
}) {
  if (!doc?.content?.length) return null;
  return (
    <div
      className={cn(
        "space-y-5 text-base leading-relaxed sm:text-lg [&_a]:font-semibold [&_a]:text-brand-cyan-strong [&_a]:underline",
        className,
      )}
    >
      {renderNodes(doc.content)}
    </div>
  );
}

function renderNodes(nodes: RichTextNode[] | undefined): ReactNode {
  return (nodes ?? []).map((node, i) => <Fragment key={i}>{renderNode(node)}</Fragment>);
}

function renderNode(node: RichTextNode): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p>{renderNodes(node.content)}</p>;
    case "heading": {
      const level = Number(node.attrs?.level);
      if (level <= 2)
        return <h2 className="pt-2 text-2xl font-extrabold">{renderNodes(node.content)}</h2>;
      return <h3 className="pt-1 text-xl font-bold">{renderNodes(node.content)}</h3>;
    }
    case "bulletList":
      return (
        <ul className="list-disc space-y-1.5 pl-6 marker:text-brand-cyan">
          {renderNodes(node.content)}
        </ul>
      );
    case "orderedList":
      return (
        <ol className="list-decimal space-y-1.5 pl-6 marker:font-bold">
          {renderNodes(node.content)}
        </ol>
      );
    case "listItem":
      return <li className="[&>p]:inline">{renderNodes(node.content)}</li>;
    case "blockquote":
      return (
        <blockquote className="rounded-r-2xl border-l-4 border-brand-purple bg-brand-purple-soft px-5 py-4 font-semibold italic">
          {renderNodes(node.content)}
        </blockquote>
      );
    case "horizontalRule":
      return <hr className="my-8" />;
    case "hardBreak":
      return <br />;
    case "image": {
      const src = safeImageSrc(node.attrs?.src);
      if (!src) return null;
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      // eslint-disable-next-line @next/next/no-img-element -- user content image from R2
      return <img src={src} alt={alt} loading="lazy" className="w-full rounded-2xl" />;
    }
    case "text":
      return renderText(node);
    default:
      // Unknown node: render its children only (never raw attributes).
      return renderNodes(node.content);
  }
}

function renderText(node: RichTextNode): ReactNode {
  let out: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        out = <strong>{out}</strong>;
        break;
      case "italic":
        out = <em>{out}</em>;
        break;
      case "underline":
        out = <u>{out}</u>;
        break;
      case "strike":
        out = <s>{out}</s>;
        break;
      case "code":
        out = <code className="rounded bg-muted px-1.5 py-0.5 text-[0.9em]">{out}</code>;
        break;
      case "link": {
        const href = safeHref(mark.attrs?.href);
        if (href) {
          const external = /^https?:/.test(href);
          out = (
            <a
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
            >
              {out}
            </a>
          );
        }
        break;
      }
    }
  }
  return out;
}
