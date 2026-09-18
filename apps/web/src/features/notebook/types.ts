/**
 * Notebook domain model.
 *
 * A Page has an ordered list of Blocks. A Block is a discriminated union so
 * the renderer can switch exhaustively. Drawing strokes are stored as raw
 * pointer samples; the path is re-derived per-render via perfect-freehand
 * so we can later re-style strokes without mutating data.
 */

export type BlockId = string;
export type PageId = string;

export interface ParagraphBlock {
  id: BlockId;
  kind: "paragraph";
  text: string;
}

export interface HeadingBlock {
  id: BlockId;
  kind: "heading";
  level: 1 | 2 | 3;
  text: string;
}

export interface DividerBlock {
  id: BlockId;
  kind: "divider";
}

export interface MathBlock {
  id: BlockId;
  kind: "math";
  /** Raw LaTeX as authored. */
  latex: string;
  /** Optional canonical form populated when the math service is reachable. */
  canonical: {
    srepr: string;
    head: string;
    freeSymbols: string[];
    graphable: boolean;
    isRelational: boolean;
  } | null;
  parseStatus: "empty" | "pending" | "ok" | "error" | "offline";
}

export interface DrawStroke {
  id: string;
  /** [x, y, pressure?] samples in CSS pixels relative to the canvas. */
  points: [number, number, number?][];
  color: string;
  size: number;
  /** Eraser strokes are recorded as a separate kind so undo is trivial. */
  tool: "pen" | "highlighter";
}

export interface DrawBlock {
  id: BlockId;
  kind: "draw";
  height: number;
  strokes: DrawStroke[];
}

export type Block =
  | ParagraphBlock
  | HeadingBlock
  | DividerBlock
  | MathBlock
  | DrawBlock;

export interface Page {
  id: PageId;
  title: string;
  blocks: Block[];
  createdAt: number;
  updatedAt: number;
}

export interface NotebookState {
  pages: Record<PageId, Page>;
  pageOrder: PageId[];
  activePageId: PageId | null;
}

