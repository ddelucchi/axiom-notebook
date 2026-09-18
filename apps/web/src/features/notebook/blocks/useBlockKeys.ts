"use client";

import { useNotebook } from "@/features/notebook/store";
import { nanoid } from "nanoid";
import type { ParagraphBlock } from "@/features/notebook/types";

/**
 * Shared keyboard behavior for text-bearing blocks (paragraphs, headings):
 *  - Enter (no shift): insert a new paragraph below and focus it
 *  - Backspace on empty: delete this block, focus the previous one
 *  - Cmd/Ctrl + ArrowUp/Down: move block up/down
 */
export function useBlockKeys(blockId: string) {
  const insertAfter = useNotebook((s) => s.insertBlockAfter);
  const deleteBlock = useNotebook((s) => s.deleteBlock);
  const moveBlock = useNotebook((s) => s.moveBlock);

  function handle(
    e: React.KeyboardEvent<HTMLDivElement>,
    ctx: { text: string },
  ) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const newBlock: ParagraphBlock = { id: nanoid(10), kind: "paragraph", text: "" };
      insertAfter(blockId, newBlock);
      // Focus the new block after the next paint.
      requestAnimationFrame(() => {
        const next = document.querySelector<HTMLDivElement>(
          `[data-block-id="${newBlock.id}"] [contenteditable]`,
        );
        next?.focus();
      });
      return;
    }

    if (e.key === "Backspace" && ctx.text.length === 0) {
      e.preventDefault();
      const wrapper = (e.currentTarget.closest("[data-block-id]") as HTMLElement) || null;
      const prev = wrapper?.previousElementSibling as HTMLElement | null;
      deleteBlock(blockId);
      requestAnimationFrame(() => {
        const target = prev?.querySelector<HTMLDivElement>("[contenteditable]");
        target?.focus();
        // Place caret at end
        if (target) {
          const range = document.createRange();
          range.selectNodeContents(target);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      });
      return;
    }

    if ((e.metaKey || e.ctrlKey) && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      moveBlock(blockId, e.key === "ArrowUp" ? -1 : 1);
    }
  }

  return { handle };
}

