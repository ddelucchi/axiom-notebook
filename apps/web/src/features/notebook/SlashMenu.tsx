"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import clsx from "clsx";
import type { Block } from "@/features/notebook/types";

export interface SlashItem {
  id: string;
  label: string;
  hint: string;
  build: () => Block;
}

const ITEMS: SlashItem[] = [
  {
    id: "h1",
    label: "Heading 1",
    hint: "Big section title",
    build: () => ({ id: nanoid(10), kind: "heading", level: 1, text: "" }),
  },
  {
    id: "h2",
    label: "Heading 2",
    hint: "Subsection",
    build: () => ({ id: nanoid(10), kind: "heading", level: 2, text: "" }),
  },
  {
    id: "h3",
    label: "Heading 3",
    hint: "Sub-subsection",
    build: () => ({ id: nanoid(10), kind: "heading", level: 3, text: "" }),
  },
  {
    id: "math",
    label: "Math",
    hint: "Type LaTeX with MathLive",
    build: () => ({
      id: nanoid(10),
      kind: "math",
      latex: "",
      canonical: null,
      parseStatus: "empty",
    }),
  },
  {
    id: "draw",
    label: "Drawing",
    hint: "Sketch with the mouse",
    build: () => ({ id: nanoid(10), kind: "draw", height: 280, strokes: [] }),
  },
  {
    id: "divider",
    label: "Divider",
    hint: "Horizontal rule",
    build: () => ({ id: nanoid(10), kind: "divider" }),
  },
];

export interface SlashMenuProps {
  readonly query: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly onPick: (item: SlashItem) => void;
  readonly onClose: () => void;
}

export function SlashMenu(props: SlashMenuProps) {
  const { query, position, onPick, onClose } = props;
  const filtered = useMemo(() => {
    const q = query.replace(/^\//, "").trim().toLowerCase();
    if (!q) return ITEMS;
    return ITEMS.filter(
      (i) =>
        i.label.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q),
    );
  }, [query]);

  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [query]);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(filtered.length - 1, a + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === "Enter") {
        const item = filtered[active];
        if (item) {
          e.preventDefault();
          onPick(item);
        }
      }
    };
    globalThis.addEventListener("keydown", handler, true);
    return () => globalThis.removeEventListener("keydown", handler, true);
  }, [active, filtered, onClose, onPick]);

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 w-72 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg"
      style={{ top: position.y, left: position.x }}
    >
      <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-ink-400">
        Insert block
      </div>
      <ul className="max-h-72 overflow-auto py-1">
        {filtered.length === 0 && (
          <li className="px-3 py-2 text-sm text-ink-400">No matches</li>
        )}
        {filtered.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => onPick(item)}
              className={clsx(
                "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition",
                i === active ? "bg-accent-subtle text-accent" : "hover:bg-ink-50",
              )}
            >
              <span className="font-sans font-medium">{item.label}</span>
              <span className="text-xs text-ink-400">{item.hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

