"use client";

import clsx from "clsx";
import { useNotebook } from "@/features/notebook/store";
import type { Block } from "@/features/notebook/types";
import { ParagraphBlockView } from "./blocks/ParagraphBlockView";
import { HeadingBlockView } from "./blocks/HeadingBlockView";
import { DividerBlockView } from "./blocks/DividerBlockView";
import { MathBlockView } from "./blocks/MathBlockView";
import { DrawingCanvas } from "@/features/drawing/DrawingCanvas";

interface BlockRendererProps {
  readonly block: Block;
  readonly onRequestSlash: (id: string, rect: DOMRect) => void;
}

export function BlockRenderer({ block, onRequestSlash }: BlockRendererProps) {
  const deleteBlock = useNotebook((s) => s.deleteBlock);

  return (
    <div data-block-id={block.id} className="group/block relative">
      <div
        className={clsx(
          "pointer-events-none absolute -left-10 top-1.5 flex h-7 items-center gap-1 opacity-0 transition group-hover/block:opacity-100",
        )}
      >
        <button
          type="button"
          aria-label="Delete block"
          className="pointer-events-auto rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          onClick={() => deleteBlock(block.id)}
        >
          ×
        </button>
      </div>

      {renderBlock(block, onRequestSlash)}
    </div>
  );
}

function renderBlock(
  block: Block,
  onRequestSlash: (id: string, rect: DOMRect) => void,
) {
  switch (block.kind) {
    case "paragraph":
      return <ParagraphBlockView block={block} onRequestSlash={onRequestSlash} />;
    case "heading":
      return <HeadingBlockView block={block} />;
    case "divider":
      return <DividerBlockView />;
    case "math":
      return <MathBlockView block={block} />;
    case "draw":
      return <DrawingCanvas block={block} />;
  }
}

