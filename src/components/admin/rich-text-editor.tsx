"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import type { RichTextDoc } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Tiptap editor that stores its JSON in a hidden input (`name`), so it works with plain
 * <form action={serverAction}>. Output is rendered on the public site by an allow-list renderer.
 */
export function RichTextEditor({
  name,
  defaultValue,
  label,
  id,
}: {
  name: string;
  defaultValue?: RichTextDoc | null;
  label: string;
  id: string;
}) {
  const [json, setJson] = useState(() =>
    JSON.stringify(defaultValue ?? { type: "doc", content: [] }),
  );
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto", "tel"] },
      }),
    ],
    content: defaultValue ?? "",
    editorProps: {
      attributes: {
        id,
        "aria-label": label,
        class:
          "min-h-56 px-4 py-3 outline-none [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-brand-purple [&_blockquote]:pl-4 [&_a]:text-brand-cyan-strong [&_a]:underline space-y-3",
      },
    },
    onUpdate: ({ editor }) => setJson(JSON.stringify(editor.getJSON())),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
          }
        : null,
  });

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Холбоос (https://...)", prev ?? "https://");
    if (url === null) return;
    if (url === "" || url === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!/^(https?:\/\/|mailto:|tel:|\/)/.test(url)) {
      window.alert("Зөвхөн https://, mailto:, tel: эсвэл / -ээр эхэлсэн холбоос оруулна уу.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  const tools = [
    {
      label: "Тод",
      icon: Bold,
      active: state?.bold,
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: "Налуу",
      icon: Italic,
      active: state?.italic,
      run: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      label: "Доогуур зураас",
      icon: Underline,
      active: state?.underline,
      run: () => editor?.chain().focus().toggleUnderline().run(),
    },
    {
      label: "Дундуур зураас",
      icon: Strikethrough,
      active: state?.strike,
      run: () => editor?.chain().focus().toggleStrike().run(),
    },
    {
      label: "Гарчиг 2",
      icon: Heading2,
      active: state?.h2,
      run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Гарчиг 3",
      icon: Heading3,
      active: state?.h3,
      run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "Жагсаалт",
      icon: List,
      active: state?.bullet,
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Дугаартай жагсаалт",
      icon: ListOrdered,
      active: state?.ordered,
      run: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Ишлэл",
      icon: Quote,
      active: state?.quote,
      run: () => editor?.chain().focus().toggleBlockquote().run(),
    },
    { label: "Холбоос", icon: Link2, active: state?.link, run: setLink },
    {
      label: "Хэвтээ шугам",
      icon: Minus,
      active: false,
      run: () => editor?.chain().focus().setHorizontalRule().run(),
    },
    {
      label: "Буцаах",
      icon: Undo2,
      active: false,
      run: () => editor?.chain().focus().undo().run(),
    },
    { label: "Дахих", icon: Redo2, active: false, run: () => editor?.chain().focus().redo().run() },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <div
        role="toolbar"
        aria-label={`${label} — хэрэгслүүд`}
        className="flex flex-wrap gap-0.5 border-b bg-muted/50 p-1"
      >
        {tools.map(({ label: l, icon: Icon, active, run }) => (
          <button
            key={l}
            type="button"
            title={l}
            aria-label={l}
            aria-pressed={active ?? false}
            onClick={run}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg text-foreground/70 hover:bg-background hover:text-foreground",
              active && "bg-background text-foreground shadow-sm ring-1 ring-border",
            )}
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={json} />
    </div>
  );
}
