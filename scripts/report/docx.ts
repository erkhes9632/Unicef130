/**
 * Minimal .docx reader for the yearly report import: a ZIP reader (stored/deflate entries via
 * node:zlib) and a tokenizer for word/document.xml that keeps paragraphs, tables, rows, cells and
 * embedded images (`<a:blip r:embed>`). No dependencies; enough for the report template, not a
 * general Word parser.
 */
import { inflateRawSync } from "node:zlib";

// ---------------------------------------------------------------------------
// ZIP
// ---------------------------------------------------------------------------

/** Reads every file of a ZIP archive into memory (path → bytes). */
export function readZip(buf: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a ZIP file (no end of central directory)");
  const entries = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const files = new Map<string, Uint8Array>();
  const decoder = new TextDecoder();
  for (let n = 0; n < entries; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error("Broken ZIP central directory");
    const method = view.getUint16(p + 10, true);
    const compressed = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = decoder.decode(buf.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith("/")) continue;
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = buf.subarray(start, start + compressed);
    if (method === 0) files.set(name, data.slice());
    else if (method === 8) files.set(name, new Uint8Array(inflateRawSync(data)));
    else throw new Error(`Unsupported ZIP compression ${method} for ${name}`);
  }
  return files;
}

// ---------------------------------------------------------------------------
// document.xml
// ---------------------------------------------------------------------------

export type Cell = { lines: string[]; images: string[] };
export type Row = Cell[];
export type Table = { index: number; rows: Row[] };
/** Body in reading order: paragraphs outside tables and whole tables. */
export type Block = { kind: "p"; text: string; images: string[] } | { kind: "table"; table: Table };

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");

/**
 * Splits the document body into paragraphs and tables. Nested tables are flattened into their
 * parent cell (the report has none). Image ids are relationship ids (rIdN).
 */
export function parseDocumentXml(xml: string): Block[] {
  const body = xml.slice(xml.indexOf("<w:body"));
  const re =
    /<w:tbl>|<\/w:tbl>|<w:tr[ >]|<\/w:tr>|<w:tc>|<\/w:tc>|<\/w:p>|<w:t(?: [^>]*)?>([^<]*)<\/w:t>|<a:blip r:embed="([^"]+)"|<w:tab\/>|<w:br\/>/g;
  const blocks: Block[] = [];
  let tableDepth = 0;
  let tableCount = 0;
  let table: Table | null = null;
  let cell: Cell | null = null;
  let line = "";
  let lineImages: string[] = [];
  for (const m of body.matchAll(re)) {
    const tok = m[0];
    if (tok === "<w:tbl>") {
      tableDepth++;
      if (tableDepth === 1) {
        table = { index: tableCount++, rows: [] };
        blocks.push({ kind: "table", table });
      }
    } else if (tok === "</w:tbl>") {
      tableDepth--;
      if (tableDepth === 0) table = null;
    } else if (tok.startsWith("<w:tr")) {
      if (tableDepth === 1) table!.rows.push([]);
    } else if (tok === "<w:tc>") {
      if (tableDepth === 1) {
        cell = { lines: [], images: [] };
        table!.rows.at(-1)!.push(cell);
      }
    } else if (tok === "</w:tc>") {
      if (tableDepth === 1) cell = null;
    } else if (tok === "</w:p>") {
      const text = line.replace(/\s+/g, " ").trim();
      if (cell) {
        if (text) cell.lines.push(text);
        cell.images.push(...lineImages);
      } else if (text || lineImages.length) {
        blocks.push({ kind: "p", text, images: lineImages });
      }
      line = "";
      lineImages = [];
    } else if (m[1] !== undefined) line += decodeXml(m[1]);
    else if (m[2]) lineImages.push(m[2]);
    else line += " ";
  }
  return blocks;
}

/** Relationship id → target path inside the package (e.g. rId9 → word/media/image4.jpg). */
export function parseRels(xml: string, base = "word/"): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of xml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /\bId="([^"]+)"/.exec(m[0])?.[1];
    const target = /\bTarget="([^"]+)"/.exec(m[0])?.[1];
    if (id && target) out.set(id, target.startsWith("/") ? target.slice(1) : base + target);
  }
  return out;
}

/** All `<a:blip r:embed>` ids in an XML part (used for headers/footers). */
export const blipIds = (xml: string) =>
  [...xml.matchAll(/<a:blip r:embed="([^"]+)"/g)].map((m) => m[1]!);
