"use client";

import { useEffect, useState } from "react";
import { selectActivePage, useNotebook } from "@/features/notebook/store";
import { BlockRenderer } from "./BlockRenderer";
import { SlashMenu, type SlashItem } from "./SlashMenu";
import { Sidebar } from "./Sidebar";
import type { Block } from "./types";

export function Notebook() {
  const hydrated = useNotebook((s) => s.hydrated);
  const hydrate = useNotebook((s) => s.hydrate);
  const page = useNotebook(selectActivePage);
  const renamePage = useNotebook((s) => s.renamePage);
  const updateBlock = useNotebook((s) => s.updateBlock);
  const insertAfter = useNotebook((s) => s.insertBlockAfter);
  const appendBlock = useNotebook((s) => s.appendBlock);

  const [slash, setSlash] = useState<{
    blockId: string;
    pos: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    hydrate().catch(() => {});
  }, [hydrate]);

  if (!hydrated || !page) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-ink-400">
        Loading…
      </div>
    );
  }

  const handleRequestSlash = (blockId: string, rect: DOMRect) => {
    setSlash({
      blockId,
      pos: { x: rect.left, y: rect.bottom + 6 },
    });
  };

  const handlePick = (item: SlashItem) => {
    if (!slash) return;
    const triggerBlock = page.blocks.find((b) => b.id === slash.blockId);
    // The trigger paragraph contained the literal `/`; clear it before insert.
    if (triggerBlock?.kind === "paragraph") {
      updateBlock(triggerBlock.id, { text: "" });
      const node = document.querySelector<HTMLDivElement>(
        `[data-block-id="${triggerBlock.id}"] [contenteditable]`,
      );
      if (node) node.innerText = "";
    }
    const built = item.build();
    insertAfter(slash.blockId, built);
    setSlash(null);
    requestAnimationFrame(() => focusBlock(built));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ink-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          title={page.title}
          onRename={(t) => renamePage(page.id, t)}
          onExport={() =>
            exportJson(`axiom-${page.title.replaceAll(/\s+/g, "-").toLowerCase()}.json`, page)
          }
        />

        <div className="flex-1 overflow-y-auto">
          <article className="mx-auto max-w-3xl px-12 py-12">
            <div className="space-y-1">
              {page.blocks.map((b) => (
                <BlockRenderer key={b.id} block={b} onRequestSlash={handleRequestSlash} />
              ))}
            </div>

            <div className="mt-10">
              <button
                type="button"
                onClick={() => {
                  const para: Block = {
                    id: crypto.randomUUID(),
                    kind: "paragraph",
                    text: "",
                  };
                  appendBlock(para);
                  requestAnimationFrame(() => focusBlock(para));
                }}
                className="font-sans text-xs text-ink-400 hover:text-ink-700"
              >
                + add block
              </button>
            </div>
          </article>
        </div>
      </div>

      {slash && (
        <SlashMenu
          query="/"
          position={slash.pos}
          onPick={handlePick}
          onClose={() => setSlash(null)}
        />
      )}
    </div>
  );
}

function focusBlock(b: Block) {
  const el = document.querySelector<HTMLElement>(
    `[data-block-id="${b.id}"] [contenteditable], [data-block-id="${b.id}"] math-field`,
  );
  el?.focus();
}

interface TopBarProps {
  readonly title: string;
  readonly onRename: (t: string) => void;
  readonly onExport: () => void;
}

function TopBar({ title, onRename, onExport }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-ink-100 bg-white/70 px-8 backdrop-blur-sm">
      <input
        value={title}
        onChange={(e) => onRename(e.target.value)}
        className="w-full max-w-md bg-transparent font-sans text-sm font-medium text-ink-700 outline-none placeholder:text-ink-200"
        placeholder="Untitled"
      />
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={onExport}
          className="rounded px-2 py-1 font-sans text-ink-400 hover:bg-ink-100 hover:text-ink-700"
        >
          Export JSON
        </button>
      </div>
    </header>
  );
}

function exportJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

