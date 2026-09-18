"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import { get as idbGet, set as idbSet } from "idb-keyval";
import type {
  Block,
  BlockId,
  DrawBlock,
  DrawStroke,
  MathBlock,
  NotebookState,
  Page,
  PageId,
} from "./types";

const STORAGE_KEY = "axiom-notebook-v1";

const newId = () => nanoid(10);
const now = () => Date.now();

function blankParagraph(): Block {
  return { id: newId(), kind: "paragraph", text: "" };
}

function blankPage(title = "Untitled"): Page {
  return {
    id: newId(),
    title,
    blocks: [
      { id: newId(), kind: "heading", level: 1, text: title },
      blankParagraph(),
    ],
    createdAt: now(),
    updatedAt: now(),
  };
}

interface Actions {
  hydrate: () => Promise<void>;
  createPage: () => PageId;
  deletePage: (id: PageId) => void;
  selectPage: (id: PageId) => void;
  renamePage: (id: PageId, title: string) => void;

  insertBlockAfter: (afterId: BlockId, block: Block) => BlockId;
  appendBlock: (block: Block) => BlockId;
  updateBlock: <T extends Block>(id: BlockId, patch: Partial<T>) => void;
  deleteBlock: (id: BlockId) => void;
  moveBlock: (id: BlockId, direction: -1 | 1) => void;

  addStroke: (blockId: BlockId, stroke: DrawStroke) => void;
  undoStroke: (blockId: BlockId) => void;
  clearStrokes: (blockId: BlockId) => void;
  resizeDrawBlock: (blockId: BlockId, height: number) => void;
}

export type NotebookStore = NotebookState & Actions & { hydrated: boolean };

function persist(state: NotebookState) {
  const snapshot: NotebookState = {
    pages: state.pages,
    pageOrder: state.pageOrder,
    activePageId: state.activePageId,
  };
  void idbSet(STORAGE_KEY, snapshot);
}

function withActivePage(
  state: NotebookState,
  fn: (page: Page) => Page,
): Partial<NotebookState> {
  const id = state.activePageId;
  if (!id) return {};
  const page = state.pages[id];
  if (!page) return {};
  const updated = { ...fn(page), updatedAt: now() };
  return { pages: { ...state.pages, [id]: updated } };
}

export const useNotebook = create<NotebookStore>()((set, get) => ({
  pages: {},
  pageOrder: [],
  activePageId: null,
  hydrated: false,

  hydrate: async () => {
    const stored = (await idbGet(STORAGE_KEY)) as NotebookState | undefined;
    if (stored && stored.pageOrder.length > 0) {
      set({ ...stored, hydrated: true });
      return;
    }
    const first = blankPage("Welcome to Axiom");
    first.blocks = [
      { id: newId(), kind: "heading", level: 1, text: "Welcome to Axiom" },
      {
        id: newId(),
        kind: "paragraph",
        text: "A math-native notebook. Type freely. Press / on a blank line to insert a math block, a drawing canvas, a heading, or a divider.",
      },
      {
        id: newId(),
        kind: "math",
        latex: "e^{i\\pi} + 1 = 0",
        canonical: null,
        parseStatus: "empty",
      },
      {
        id: newId(),
        kind: "draw",
        height: 280,
        strokes: [],
      },
      blankParagraph(),
    ];
    const state: NotebookState = {
      pages: { [first.id]: first },
      pageOrder: [first.id],
      activePageId: first.id,
    };
    set({ ...state, hydrated: true });
    persist(state);
  },

  createPage: () => {
    const page = blankPage("Untitled");
    set((s) => {
      const next: NotebookState = {
        pages: { ...s.pages, [page.id]: page },
        pageOrder: [...s.pageOrder, page.id],
        activePageId: page.id,
      };
      persist(next);
      return next;
    });
    return page.id;
  },

  deletePage: (id) => {
    set((s) => {
      const { [id]: _gone, ...rest } = s.pages;
      const order = s.pageOrder.filter((p) => p !== id);
      const active = s.activePageId === id ? (order[0] ?? null) : s.activePageId;
      const next: NotebookState = { pages: rest, pageOrder: order, activePageId: active };
      persist(next);
      return next;
    });
  },

  selectPage: (id) =>
    set((s) => {
      if (!s.pages[id]) return {};
      const next = { ...s, activePageId: id };
      persist(next);
      return { activePageId: id };
    }),

  renamePage: (id, title) =>
    set((s) => {
      const page = s.pages[id];
      if (!page) return {};
      const updated: Page = { ...page, title, updatedAt: now() };
      const next: NotebookState = { ...s, pages: { ...s.pages, [id]: updated } };
      persist(next);
      return { pages: next.pages };
    }),

  insertBlockAfter: (afterId, block) => {
    set((s) => {
      const partial = withActivePage(s, (page) => {
        const idx = page.blocks.findIndex((b) => b.id === afterId);
        const blocks = [...page.blocks];
        const insertAt = idx === -1 ? blocks.length : idx + 1;
        blocks.splice(insertAt, 0, block);
        return { ...page, blocks };
      });
      const next = { ...s, ...partial } as NotebookState;
      persist(next);
      return partial;
    });
    return block.id;
  },

  appendBlock: (block) => {
    set((s) => {
      const partial = withActivePage(s, (page) => ({
        ...page,
        blocks: [...page.blocks, block],
      }));
      const next = { ...s, ...partial } as NotebookState;
      persist(next);
      return partial;
    });
    return block.id;
  },

  updateBlock: (id, patch) => {
    set((s) => {
      const partial = withActivePage(s, (page) => ({
        ...page,
        blocks: page.blocks.map((b) =>
          b.id === id ? ({ ...b, ...patch } as Block) : b,
        ),
      }));
      const next = { ...s, ...partial } as NotebookState;
      persist(next);
      return partial;
    });
  },

  deleteBlock: (id) => {
    set((s) => {
      const partial = withActivePage(s, (page) => {
        if (page.blocks.length <= 1) return page;
        return { ...page, blocks: page.blocks.filter((b) => b.id !== id) };
      });
      const next = { ...s, ...partial } as NotebookState;
      persist(next);
      return partial;
    });
  },

  moveBlock: (id, direction) => {
    set((s) => {
      const partial = withActivePage(s, (page) => {
        const idx = page.blocks.findIndex((b) => b.id === id);
        if (idx === -1) return page;
        const target = idx + direction;
        if (target < 0 || target >= page.blocks.length) return page;
        const blocks = [...page.blocks];
        const [moved] = blocks.splice(idx, 1);
        blocks.splice(target, 0, moved!);
        return { ...page, blocks };
      });
      const next = { ...s, ...partial } as NotebookState;
      persist(next);
      return partial;
    });
  },

  addStroke: (blockId, stroke) =>
    get().updateBlock<DrawBlock>(blockId, {
      strokes: [
        ...((get().pages[get().activePageId ?? ""]?.blocks.find(
          (b) => b.id === blockId,
        ) as DrawBlock | undefined)?.strokes ?? []),
        stroke,
      ],
    }),

  undoStroke: (blockId) => {
    const page = get().pages[get().activePageId ?? ""];
    const block = page?.blocks.find((b) => b.id === blockId) as DrawBlock | undefined;
    if (!block) return;
    get().updateBlock<DrawBlock>(blockId, {
      strokes: block.strokes.slice(0, -1),
    });
  },

  clearStrokes: (blockId) =>
    get().updateBlock<DrawBlock>(blockId, { strokes: [] }),

  resizeDrawBlock: (blockId, height) =>
    get().updateBlock<DrawBlock>(blockId, { height }),
}));

// Convenience selectors
export const selectActivePage = (s: NotebookStore): Page | null =>
  s.activePageId ? (s.pages[s.activePageId] ?? null) : null;

// Re-exports so block components don't import the type module directly.
export type { Block, MathBlock, DrawBlock };

