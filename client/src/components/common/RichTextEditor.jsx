import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code2,
} from "lucide-react";

const RichTextEditor = ({
  content = "",
  onChange,
  placeholder = "Write a description or comment...",
  readOnly = false,
  minHeight = "120px",
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: "text-indigo-600 underline hover:text-indigo-800",
        },
      }),
    ],
    content: content || "",
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange && onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `focus:outline-none text-xs leading-relaxed text-gray-800 dark:text-slate-100 p-3.5 prose prose-xs dark:prose-invert max-w-none`,
        style: `min-height: ${minHeight};`,
      },
    },
  });

  // Sync external content changes if editor is out of sync
  useEffect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content) {
      editor.commands.setContent(content || "");
    }
  }, [content, editor]);

  if (!editor) return null;

  if (readOnly) {
    return (
      <div className="prose prose-xs dark:prose-invert max-w-none text-xs leading-relaxed text-gray-800 dark:text-slate-100 p-1">
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className="border border-gray-200/90 dark:border-slate-700/80 rounded-xl overflow-hidden bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-400 dark:focus-within:border-indigo-500 transition-all">
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-gray-50/80 dark:bg-slate-950/70 border-b border-gray-200/80 dark:border-slate-800 text-gray-600 dark:text-slate-400">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors ${
            editor.isActive("bold") ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold" : ""
          }`}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors ${
            editor.isActive("italic") ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300" : ""
          }`}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors ${
            editor.isActive("strike") ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300" : ""
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-1.5 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors ${
            editor.isActive("code") ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300" : ""
          }`}
          title="Inline Code"
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-gray-300 dark:bg-slate-700 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors ${
            editor.isActive("heading", { level: 1 }) ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold" : ""
          }`}
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors ${
            editor.isActive("heading", { level: 2 }) ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold" : ""
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-gray-300 dark:bg-slate-700 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors ${
            editor.isActive("bulletList") ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300" : ""
          }`}
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors ${
            editor.isActive("orderedList") ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300" : ""
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors ${
            editor.isActive("blockquote") ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300" : ""
          }`}
          title="Quote"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-1.5 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors ${
            editor.isActive("codeBlock") ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300" : ""
          }`}
          title="Code Block"
        >
          <Code2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editor Canvas */}
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
