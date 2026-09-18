"use client";

import { useEffect, useRef } from "react";
import type { ParagraphBlock } from "@/features/notebook/types";
import { useNotebook } from "@/features/notebook/store";
import { useBlockKeys } from "./useBlockKeys";

interface ParagraphBlockViewProps {
  readonly block: ParagraphBlock;
  readonly onRequestSlash: (id: string, rect: DOMRect) => void;
  readonly autoFocus?: boolean;
}

export function ParagraphBlockView({
  block,
  onRequestSlash,
  autoFocus,
}: ParagraphBlockViewProps) {
  const updateBlock = useNotebook((s) => s.updateBlock);
  const ref = useRef<HTMLDivElement>(null);
  const keys = useBlockKeys(block.id);

  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== block.text) {
      ref.current.innerText = block.text;
    }
  }, [block.text]);

  return (
    /* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/interactive-supports-focus */
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder="Type, or press / for blocks"
      className="block-text min-h-[1.6em] whitespace-pre-wrap py-1.5 text-[17px] leading-[1.7] text-ink-900 outline-none [&[data-empty=true]]:before:pointer-events-none [&[data-empty=true]]:before:absolute [&[data-empty=true]]:before:text-ink-400 [&[data-empty=true]]:before:content-[attr(data-placeholder)]"
      data-empty={block.text.length === 0}
      onInput={(e) => {
        const text = (e.currentTarget as HTMLDivElement).innerText;
        (e.currentTarget as HTMLDivElement).dataset.empty = String(text.length === 0);
        updateBlock<ParagraphBlock>(block.id, { text });
        // Detect freshly typed `/` on an empty line to open slash menu.
        if (text === "/") {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          onRequestSlash(block.id, rect);
        }
      }}
      onKeyDown={(e) => keys.handle(e, { text: block.text })}
    />
  );
}

