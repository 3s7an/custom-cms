import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { Extension, Node, mergeAttributes } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
import { NodeSelection } from "@tiptap/pm/state";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Table as TableIcon,
  List,
  ListOrdered,
  Heading2,
  ImageIcon,
  LinkIcon,
  Link2Off,
  Paperclip,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

// Custom FontSize extension
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, "") || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: any) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }: any) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "48px"];
const BASIC_COLORS = [
  { label: "Čierna", value: "#000000" },
  { label: "Sivá", value: "#4b5563" },
  { label: "Hnedá", value: "#59412d" },
  { label: "Červená", value: "#b80000" },
  { label: "Oranžová", value: "#db3e00" },
  { label: "Zelená", value: "#008b02" },
  { label: "Modrá", value: "#1273de" },
];

const ImageRow = Node.create({
  name: "imageRow",
  group: "block",
  content: "image+",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-slk-image-row="true"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-slk-image-row": "true",
        class: "slk-image-row",
      }),
      0,
    ];
  },
});

const ImageWithAttrs = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width") || element.style.width || null,
        renderHTML: (attrs) => (attrs.width ? { width: String(attrs.width) } : {}),
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height") || element.style.height || null,
        renderHTML: (attrs) => (attrs.height ? { height: String(attrs.height) } : {}),
      },
      slkAlign: {
        default: null as null | "left" | "center" | "right",
        parseHTML: (element) => (element.getAttribute("data-align") as any) || null,
        renderHTML: (attrs) => (attrs.slkAlign ? { "data-align": attrs.slkAlign } : {}),
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const align = ((HTMLAttributes as any)["data-align"] as null | "left" | "center" | "right") || null;
    const baseStyle = (HTMLAttributes.style as string | undefined) || "";

    // Keep alignment purely presentational; avoid floats (tables etc.).
    let alignStyle = "";
    if (align === "center") alignStyle = "display:block;margin-left:auto;margin-right:auto;";
    if (align === "left") alignStyle = "display:block;margin-left:0;margin-right:auto;";
    if (align === "right") alignStyle = "display:block;margin-left:auto;margin-right:0;";

    const style = `${baseStyle}${baseStyle && !baseStyle.endsWith(";") ? ";" : ""}${alignStyle}`;
    const merged = mergeAttributes(HTMLAttributes, style ? { style } : {});

    return ["img", merged];
  },
});

type TiptapEditorProps = {
  content: string;
  onChange: (html: string) => void;
};

const TiptapEditor = ({ content, onChange }: TiptapEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const tableFixScheduledRef = useRef<number | null>(null);
  const isApplyingTableFixRef = useRef(false);
  const lastTableSelectionPosRef = useRef<number | null>(null);
  const [selectedImagePos, setSelectedImagePos] = useState<number | null>(null);
  const [selectedImageNodeAttrs, setSelectedImageNodeAttrs] = useState<Record<string, any> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageRow,
      ImageWithAttrs.configure({ inline: false }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      Underline,
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "slk-table",
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      FontSize,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      handleClickOn: (view, _pos, node, nodePos) => {
        if (node.type.name !== "image") return false;
        const tr = view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos));
        view.dispatch(tr);
        return true;
      },
    },
    onTransaction: ({ editor, transaction }) => {
      // Keep track of the last known selection position inside a table.
      // Some table operations can move the selection outside the table, which makes toolbar commands
      // like addRowAfter() become unavailable until the user clicks back into a cell.
      if (lastTableSelectionPosRef.current != null && transaction.docChanged) {
        lastTableSelectionPosRef.current = transaction.mapping.map(lastTableSelectionPosRef.current);
      }
      if (editor.isActive("table")) {
        lastTableSelectionPosRef.current = editor.state.selection.from;
      }

      // If table structure changes via keyboard/backspace (not our toolbar buttons),
      // column widths in prosemirror-tables can get stale and the editor layout "jumps".
      // Auto-normalize table layout after any doc change while selection is in a table.
      if (!transaction.docChanged) return;
      if (!editor.isActive("table")) return;
      if (isApplyingTableFixRef.current) return;

      if (tableFixScheduledRef.current != null) {
        window.clearTimeout(tableFixScheduledRef.current);
      }
      tableFixScheduledRef.current = window.setTimeout(() => {
        tableFixScheduledRef.current = null;
        try {
          isApplyingTableFixRef.current = true;
          // This will dispatch a transaction; guard prevents loops.
          clearCurrentTableColwidths();
          editor.commands.fixTables();
        } finally {
          isApplyingTableFixRef.current = false;
        }
      }, 0);
    },
  });

  if (!editor) return null;

  useEffect(() => {
    const updateSelectedImage = () => {
      const { selection } = editor.state;

      if (selection instanceof NodeSelection && selection.node.type.name === "image") {
        setSelectedImagePos(selection.from);
        setSelectedImageNodeAttrs(selection.node.attrs as Record<string, any>);
        return;
      }

      // When focus moves to an input (panel), TipTap may no longer have a NodeSelection.
      // Keep the previously selected image as long as the editor isn't focused.
      if (editor.isFocused) {
        setSelectedImagePos(null);
        setSelectedImageNodeAttrs(null);
      }

      if (editor.isActive("table")) {
        lastTableSelectionPosRef.current = editor.state.selection.from;
      }
    };

    updateSelectedImage();
    editor.on("selectionUpdate", updateSelectedImage);
    editor.on("transaction", updateSelectedImage);

    return () => {
      editor.off("selectionUpdate", updateSelectedImage);
      editor.off("transaction", updateSelectedImage);
    };
  }, [editor]);

  const runTableCommand = (
    canRun: () => boolean,
    run: () => void,
  ) => {
    if (canRun()) {
      run();
      return;
    }

    const fallbackPos = lastTableSelectionPosRef.current;
    if (fallbackPos == null) return;

    editor.chain().focus().setTextSelection(fallbackPos).run();
    if (canRun()) run();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const uploadOne = async (file: File) => {
      const ext = file.name.split(".").pop();
      const safeExt = ext && /^[a-z0-9]+$/i.test(ext) ? ext : "bin";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
      const { error } = await supabase.storage.from("post-images").upload(path, file);
      if (error) throw new Error(error.message);
      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path);
      return urlData.publicUrl;
    };

    let urls: string[] = [];
    try {
      urls = await Promise.all(files.map(uploadOne));
    } catch (err) {
      alert("Chyba pri nahrávaní obrázka: " + (err instanceof Error ? err.message : String(err)));
      return;
    }

    const chain = editor.chain().focus();
    if (urls.length === 1) {
      chain.setImage({ src: urls[0] }).run();
    } else {
      chain
        .insertContent({
          type: "imageRow",
          content: urls.map((src) => ({ type: "image", attrs: { src } })),
        })
        .run();
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const safeExt = ext && /^[a-z0-9]+$/.test(ext) ? ext : "bin";
    const path = `attachments/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;

    const { error } = await supabase.storage.from("site-assets").upload(path, file);
    if (error) {
      alert("Chyba pri nahrávaní súboru: " + error.message);
      return;
    }

    const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
    const href = urlData.publicUrl;
    const label = file.name.trim() || "Súbor";

    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: "text",
          text: label,
          marks: [
            {
              type: "link",
              attrs: { href, target: "_blank", rel: "noopener noreferrer" },
            },
          ],
        },
        { type: "text", text: " " },
      ])
      .run();

    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
  };

  const addLink = () => {
    const url = prompt("URL odkazu:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const currentFontSize = editor.getAttributes("textStyle").fontSize || "16px";

  const setTextColor = (hex: string | null) => {
    const chain = editor.chain().focus();
    if (!hex) chain.unsetColor().run();
    else chain.setColor(hex).run();
  };

  const changeFontSize = (direction: "up" | "down") => {
    const idx = FONT_SIZES.indexOf(currentFontSize);
    const newIdx = direction === "up"
      ? Math.min((idx === -1 ? FONT_SIZES.indexOf("16px") : idx) + 1, FONT_SIZES.length - 1)
      : Math.max((idx === -1 ? FONT_SIZES.indexOf("16px") : idx) - 1, 0);
    (editor.commands as any).setFontSize(FONT_SIZES[newIdx]);
  };

  const insertParagraphBeforeCurrentBlock = () => {
    const { state } = editor;
    const { selection } = state;

    // 1) If cursor is inside table, insert paragraph before the table node.
    if (editor.isActive("table")) {
      const $from = selection.$from;
      for (let d = $from.depth; d > 0; d -= 1) {
        const n = $from.node(d);
        if (n.type.name === "table") {
          const pos = $from.before(d);
          editor.chain().focus().insertContentAt(pos, { type: "paragraph" }).setTextSelection(pos + 1).run();
          return;
        }
      }
    }

    // 2) If we have a node selection (image, imageRow, table, ...), insert paragraph before it.
    if (selection instanceof NodeSelection) {
      const pos = selection.from;
      editor.chain().focus().insertContentAt(pos, { type: "paragraph" }).setTextSelection(pos + 1).run();
      return;
    }

    // 3) Fallback: insert paragraph at the current block start.
    const pos = selection.$from.start(selection.$from.depth);
    editor.chain().focus().insertContentAt(pos, { type: "paragraph" }).setTextSelection(pos + 1).run();
  };

  const isImageSelected = selectedImagePos != null;

  const selectedImageWidth = useMemo(() => {
    const v = selectedImageNodeAttrs?.width;
    return v != null && String(v).trim() !== "" ? String(v) : "";
  }, [selectedImageNodeAttrs?.width]);

  const selectedImageHeight = useMemo(() => {
    const v = selectedImageNodeAttrs?.height;
    return v != null && String(v).trim() !== "" ? String(v) : "";
  }, [selectedImageNodeAttrs?.height]);

  const selectedImageAlign = useMemo(() => {
    const v = selectedImageNodeAttrs?.slkAlign as null | "left" | "center" | "right" | undefined;
    return v || null;
  }, [selectedImageNodeAttrs?.slkAlign]);

  const setSelectedImageAttrs = (attrs: Record<string, any>) => {
    if (selectedImagePos == null) return;
    const node = editor.state.doc.nodeAt(selectedImagePos);
    if (!node || node.type.name !== "image") return;

    const nextAttrs = { ...(node.attrs as any), ...attrs };
    const tr = editor.state.tr.setNodeMarkup(selectedImagePos, undefined, nextAttrs);
    editor.view.dispatch(tr);
    setSelectedImageNodeAttrs(nextAttrs);
  };

  const clearCurrentTableColwidths = () => {
    const { state } = editor;
    const $from = state.selection.$from;
    let tablePos: number | null = null;
    let tableNode: typeof state.doc | null = null;

    for (let d = $from.depth; d > 0; d -= 1) {
      const n = $from.node(d);
      if (n.type.name === "table") {
        tableNode = n;
        tablePos = $from.before(d);
        break;
      }
    }

    if (!tableNode || tablePos == null) return;

    let tr: Transaction = state.tr;
    let changed = false;

    tableNode.descendants((node, offset) => {
      const isCell = node.type.name === "tableCell" || node.type.name === "tableHeader";
      if (!isCell) return true;

      // prosemirror-tables stores widths in `colwidth` (array). Clearing it allows browser layout to reflow.
      if ((node.attrs as { colwidth?: unknown }).colwidth) {
        const pos = tablePos + 1 + offset;
        tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, colwidth: null });
        changed = true;
      }
      return true;
    });

    if (changed) editor.view.dispatch(tr);
  };

  const fixTableLayout = () => {
    requestAnimationFrame(() => {
      try {
        clearCurrentTableColwidths();
        editor.commands.fixTables();
      } catch {
      }
    });
  };

  const insertBasicTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    fixTableLayout();
  };

  const canTableOp = (op: "addRowAfter" | "deleteRow" | "addColumnAfter" | "deleteColumn" | "deleteTable") =>
    (editor.can() as any)[op]() || lastTableSelectionPosRef.current != null;

  return (
    <div className="border border-border">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted">
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive("bold") ? "bg-accent" : ""}>
          <Bold className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive("italic") ? "bg-accent" : ""}>
          <Italic className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive("underline") ? "bg-accent" : ""}>
          <UnderlineIcon className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive("heading", { level: 2 }) ? "bg-accent" : ""}>
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive("bulletList") ? "bg-accent" : ""}>
          <List className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive("orderedList") ? "bg-accent" : ""}>
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={addLink}>
          <LinkIcon className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive("link")}
          title="Odstrániť odkaz"
        >
          <Link2Off className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={insertBasicTable} title="Vložiť tabuľku (3×3)">
          <TableIcon className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            runTableCommand(
              () => editor.can().addRowAfter(),
              () => {
                editor.chain().focus().addRowAfter().run();
                fixTableLayout();
              },
            );
          }}
          disabled={!canTableOp("addRowAfter")}
          title="Pridať riadok"
        >
          +R
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            runTableCommand(
              () => editor.can().deleteRow(),
              () => {
                editor.chain().focus().deleteRow().run();
                fixTableLayout();
              },
            );
          }}
          disabled={!canTableOp("deleteRow")}
          title="Odstrániť riadok"
        >
          -R
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            runTableCommand(
              () => editor.can().addColumnAfter(),
              () => {
                editor.chain().focus().addColumnAfter().run();
                fixTableLayout();
              },
            );
          }}
          disabled={!canTableOp("addColumnAfter")}
          title="Pridať stĺpec"
        >
          +S
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            runTableCommand(
              () => editor.can().deleteColumn(),
              () => {
                editor.chain().focus().deleteColumn().run();
                fixTableLayout();
              },
            );
          }}
          disabled={!canTableOp("deleteColumn")}
          title="Odstrániť stĺpec"
        >
          -S
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            runTableCommand(
              () => editor.can().deleteTable(),
              () => editor.chain().focus().deleteTable().run(),
            );
          }}
          disabled={!canTableOp("deleteTable")}
          title="Zmazať tabuľku"
        >
          Del
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Font size controls */}
        <div className="flex items-center gap-0.5">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-6" onClick={() => changeFontSize("down")}>
            <Minus className="w-3 h-3" />
          </Button>
          <select
            className="h-8 w-16 text-xs border border-border bg-background px-1 text-center"
            value={currentFontSize}
            onChange={(e) => (editor.commands as any).setFontSize(e.target.value)}
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-6" onClick={() => changeFontSize("up")}>
            <Plus className="w-3 h-3" />
          </Button>
        </div>

        {/* Text color (simple presets; avoids native picker selection issues) */}
        <div className="flex items-center gap-1">
          {BASIC_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              className="h-6 w-6 rounded border border-border"
              title={c.label}
              aria-label={c.label}
              style={{ backgroundColor: c.value }}
              onClick={() => setTextColor(c.value)}
            />
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => setTextColor(null)} title="Zrušiť farbu">
            Reset
          </Button>
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={editor.isActive({ textAlign: "left" }) ? "bg-accent" : ""}>
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={editor.isActive({ textAlign: "center" }) ? "bg-accent" : ""}>
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={editor.isActive({ textAlign: "right" }) ? "bg-accent" : ""}>
          <AlignRight className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign("justify").run()} className={editor.isActive({ textAlign: "justify" }) ? "bg-accent" : ""}>
          <AlignJustify className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertParagraphBeforeCurrentBlock}
          title="Vložiť riadok pred (tabuľku / fotku)"
        >
          Pred
        </Button>

        <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
          <ImageIcon className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => attachmentInputRef.current?.click()} title="Pridať súbor (PDF/DOC/XLS)">
          <Paperclip className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      {isImageSelected ? (
        <div
          className="flex flex-wrap items-center gap-2 p-2 border-b border-border bg-background text-xs"
          onMouseDown={(e) => {
            // Prevent ProseMirror from stealing focus/selection when interacting with panel inputs.
            e.stopPropagation();
          }}
        >
          <span className="text-muted-foreground">Obrázok:</span>
          <label className="flex items-center gap-1">
            Šírka
            <input
              className="h-8 w-20 text-xs border border-border bg-background px-2"
              value={selectedImageWidth}
              placeholder="napr. 400"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              onChange={(e) => setSelectedImageAttrs({ width: e.target.value.trim() || null })}
            />
          </label>
          <label className="flex items-center gap-1">
            Výška
            <input
              className="h-8 w-20 text-xs border border-border bg-background px-2"
              value={selectedImageHeight}
              placeholder="napr. 300"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              onChange={(e) => setSelectedImageAttrs({ height: e.target.value.trim() || null })}
            />
          </label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={selectedImageAlign === "left" ? "bg-accent" : ""}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setSelectedImageAttrs({ slkAlign: "left" })}
              title="Zarovnať vľavo"
            >
              <AlignLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={selectedImageAlign === "center" ? "bg-accent" : ""}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setSelectedImageAttrs({ slkAlign: "center" })}
              title="Zarovnať na stred"
            >
              <AlignCenter className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={selectedImageAlign === "right" ? "bg-accent" : ""}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setSelectedImageAttrs({ slkAlign: "right" })}
              title="Zarovnať vpravo"
            >
              <AlignRight className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setSelectedImageAttrs({ width: null, height: null, slkAlign: null })}
              title="Reset"
            >
              Reset
            </Button>
          </div>
          <span className="text-muted-foreground">
            (Tip: viac fotiek naraz = vložia sa do jedného riadku)
          </span>
        </div>
      ) : null}

      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[200px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror_a]:no-underline [&_.ProseMirror_a:hover]:underline [&_.slk-table]:border-collapse [&_.slk-table]:table-fixed [&_.slk-table]:my-4 [&_.slk-table]:w-full [&_.slk-table]:max-w-none [&_.slk-table col]:!w-[1%] [&_.slk-table td]:border [&_.slk-table td]:border-border/70 [&_.slk-table td]:p-2 [&_.slk-table td]:align-top [&_.slk-table td]:break-words [&_.slk-table td]:whitespace-pre-wrap [&_.slk-table td]:min-w-[88px] [&_.slk-table td]:cursor-text [&_.slk-table td:hover]:bg-muted/70 [&_.slk-table th]:border [&_.slk-table th]:border-border/70 [&_.slk-table th]:p-2 [&_.slk-table th]:bg-muted [&_.slk-table th]:align-top [&_.slk-table th]:break-words [&_.slk-table th]:whitespace-pre-wrap [&_.slk-table th]:text-left [&_.slk-table td]:text-left [&_.slk-image-row]:my-4 [&_.slk-image-row]:flex [&_.slk-image-row]:gap-3 [&_.slk-image-row]:flex-wrap [&_.slk-image-row_img]:max-w-full [&_.slk-image-row_img]:h-auto"
      />
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
      <input
        ref={attachmentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={handleAttachmentUpload}
      />
    </div>
  );
};

export default TiptapEditor;
