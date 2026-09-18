"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "mathlive";
import type { MathBlock } from "@/features/notebook/types";
import { useNotebook } from "@/features/notebook/store";
import { mathClient, MathServiceUnavailable } from "@/lib/mathClient";

interface MathBlockViewProps {
  readonly block: MathBlock;
}

export function MathBlockView({ block }: MathBlockViewProps) {
  const updateBlock = useNotebook((s) => s.updateBlock);
  const ref = useRef<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);

  const commit = useCallback(
    async (latex: string) => {
      const trimmed = latex.trim();
      updateBlock<MathBlock>(block.id, {
        latex: trimmed,
        parseStatus: trimmed ? "pending" : "empty",
      });
      if (!trimmed) {
        updateBlock<MathBlock>(block.id, { canonical: null });
        return;
      }
      setBusy(true);
      try {
        const parsed = await mathClient.parse({ rawLatex: trimmed });
        updateBlock<MathBlock>(block.id, {
          parseStatus: parsed.parseStatus === "error" ? "error" : "ok",
          canonical: {
            srepr: parsed.serverCanonicalForm.srepr,
            head: parsed.serverCanonicalForm.head,
            freeSymbols: parsed.serverCanonicalForm.freeSymbols,
            graphable: parsed.serverCanonicalForm.graphable,
            isRelational: parsed.serverCanonicalForm.isRelational,
          },
        });
      } catch (e) {
        updateBlock<MathBlock>(block.id, {
          parseStatus: e instanceof MathServiceUnavailable ? "offline" : "error",
        });
      } finally {
        setBusy(false);
      }
    },
    [block.id, updateBlock],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    (el as unknown as { value: string }).value = block.latex;
    const onBlur = () => {
      const v = (el as unknown as { value: string }).value ?? "";
      void commit(v);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        el.blur();
      }
    };
    el.addEventListener("blur", onBlur);
    el.addEventListener("keydown", onKey as EventListener);
    return () => {
      el.removeEventListener("blur", onBlur);
      el.removeEventListener("keydown", onKey as EventListener);
    };
    // We intentionally do NOT depend on `block.latex` to avoid stomping
    // user edits in flight; we only sync via the imperative .value above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit]);

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-400">
        <span>math</span>
        <StatusPill status={block.parseStatus} busy={busy} />
      </div>
      <math-field ref={ref as never} virtual-keyboard-mode="manual" />
      {block.canonical && (
        <p className="mt-2 truncate font-mono text-[11px] text-ink-400">
          {block.canonical.head} · {block.canonical.freeSymbols.join(", ") || "no free symbols"}
          {block.canonical.graphable ? " · graphable" : ""}
        </p>
      )}
      {block.parseStatus === "offline" && (
        <p className="mt-2 text-[11px] text-ink-400">
          Math service unreachable — LaTeX is saved locally and will be
          canonicalized when the backend is online.
        </p>
      )}
    </div>
  );
}

interface StatusPillProps {
  readonly status: MathBlock["parseStatus"];
  readonly busy: boolean;
}

function StatusPill({ status, busy }: StatusPillProps) {
  const label = busy ? "parsing" : status;
  const cls: Record<string, string> = {
    empty: "bg-ink-100 text-ink-400",
    pending: "bg-accent-subtle text-accent",
    parsing: "bg-accent-subtle text-accent",
    ok: "bg-emerald-50 text-emerald-700",
    error: "bg-red-50 text-red-700",
    offline: "bg-amber-50 text-amber-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] ${cls[label] ?? cls.empty}`}>
      {label}
    </span>
  );
}

