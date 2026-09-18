"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import type { HeadingBlock } from "@/features/notebook/types";
import { useNotebook } from "@/features/notebook/store";
import { useBlockKeys } from "./useBlockKeys";

const SIZES: Record<HeadingBlock["level"], string> = {
  1: "text-4xl font-semibold tracking-tight",
  2: "text-2xl font-semibold tracking-tight",
  3: "text-xl font-medium",
};

interface HeadingBlockViewProps {
  readonly block: HeadingBlock;
}

export function HeadingBlockView({ block }: HeadingBlockViewProps) {
  const updateBlock = useNotebook((s) => s.updateBlock);
  const ref = useRef<HTMLDivElement>(null);
  const keys = useBlockKeys(block.id);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== block.text) {
      ref.current.innerText = block.text;
    }
  }, [block.text]);

  return (
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    <div
      ref={ref}
      aria-label={`Heading ${block.level}`}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={`Heading ${block.level}`}
      data-empty={block.text.length === 0}
      className={clsx(
        SIZES[block.level],
        "block-text mt-2 py-1 text-ink-900 outline-none [&[data-empty=true]]:before:pointer-events-none [&[data-empty=true]]:before:absolute [&[data-empty=true]]:before:text-ink-200 [&[data-empty=true]]:before:content-[attr(data-placeholder)]",
      )}
      onInput={(e) => {
        const text = (e.currentTarget as HTMLDivElement).innerText;
        (e.currentTarget as HTMLDivElement).dataset.empty = String(text.length === 0);
        updateBlock<HeadingBlock>(block.id, { text });
      }}
      onKeyDown={(e) => keys.handle(e, { text: block.text })}
    />
  );
}

