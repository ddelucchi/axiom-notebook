"use client";

import clsx from "clsx";
import { useNotebook } from "@/features/notebook/store";

export function Sidebar() {
  const pages = useNotebook((s) => s.pages);
  const order = useNotebook((s) => s.pageOrder);
  const active = useNotebook((s) => s.activePageId);
  const select = useNotebook((s) => s.selectPage);
  const create = useNotebook((s) => s.createPage);
  const remove = useNotebook((s) => s.deletePage);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-ink-100 bg-white/60 px-3 py-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between px-2">
        <h2 className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink-400">
          Notebook
        </h2>
        <button
          type="button"
          onClick={() => create()}
          className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          aria-label="New page"
          title="New page"
        >
          +
        </button>
      </div>

      <ul className="flex-1 space-y-0.5 overflow-y-auto">
        {order.map((id) => {
          const page = pages[id];
          if (!page) return null;
          return (
            <li key={id} className="group flex items-center">
              <button
                type="button"
                onClick={() => select(id)}
                className={clsx(
                  "flex-1 truncate rounded px-2 py-1.5 text-left text-sm transition",
                  id === active
                    ? "bg-ink-900 text-white"
                    : "text-ink-700 hover:bg-ink-100",
                )}
              >
                {page.title || "Untitled"}
              </button>
              {order.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(id)}
                  className="ml-1 rounded p-1 text-ink-200 opacity-0 transition hover:bg-red-50 hover:text-red-700 group-hover:opacity-100"
                  aria-label="Delete page"
                  title="Delete page"
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 px-2 font-sans text-[10px] leading-relaxed text-ink-400">
        Saved locally in your browser. Math is canonicalized via the SymPy
        service when reachable.
      </p>
    </aside>
  );
}

