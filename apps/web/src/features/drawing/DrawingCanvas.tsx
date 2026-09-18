"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import clsx from "clsx";
import type { DrawBlock, DrawStroke } from "@/features/notebook/types";
import { useNotebook } from "@/features/notebook/store";
import { strokeToPath } from "./stroke";

type Tool = "pen" | "highlighter" | "eraser";

const COLORS = ["#16160f", "#3056d3", "#c2410c", "#15803d", "#7c3aed"] as const;
const SIZES = [2, 3, 5, 8] as const;

interface DrawingCanvasProps {
  readonly block: DrawBlock;
}

export function DrawingCanvas({ block }: DrawingCanvasProps) {
  const addStroke = useNotebook((s) => s.addStroke);
  const undoStroke = useNotebook((s) => s.undoStroke);
  const clearStrokes = useNotebook((s) => s.clearStrokes);
  const updateBlock = useNotebook((s) => s.updateBlock);
  const resize = useNotebook((s) => s.resizeDrawBlock);

  const svgRef = useRef<SVGSVGElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(COLORS[0]);
  const [size, setSize] = useState<number>(SIZES[1] ?? 4);
  const [live, setLive] = useState<DrawStroke | null>(null);

  const finishedPaths = useMemo(
    () =>
      block.strokes.map((s) => ({
        id: s.id,
        d: strokeToPath(s),
        color: s.color,
        opacity: s.tool === "highlighter" ? 0.35 : 1,
      })),
    [block.strokes],
  );

  const livePath = useMemo(() => (live ? strokeToPath(live) : null), [live]);

  const pointerToLocal = useCallback((ev: PointerEvent | React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return [0, 0, 0.5] as [number, number, number];
    const rect = svg.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const pressure = (ev as PointerEvent).pressure || 0.5;
    return [x, y, pressure] as [number, number, number];
  }, []);

  const eraseAt = useCallback(
    (x: number, y: number) => {
      const radius = 14;
      const remaining = block.strokes.filter((s) => {
        return !s.points.some(([px, py]) => {
          const dx = (px ?? 0) - x;
          const dy = (py ?? 0) - y;
          return dx * dx + dy * dy < radius * radius;
        });
      });
      if (remaining.length !== block.strokes.length) {
        updateBlock<DrawBlock>(block.id, { strokes: remaining });
      }
    },
    [block.id, block.strokes, updateBlock],
  );

  const onPointerDown = useCallback(
    (ev: React.PointerEvent<SVGSVGElement>) => {
      ev.preventDefault();
      (ev.target as Element).setPointerCapture?.(ev.pointerId);
      const p = pointerToLocal(ev);
      if (tool === "eraser") {
        eraseAt(p[0], p[1]);
        return;
      }
      setLive({
        id: nanoid(8),
        points: [p],
        color,
        size,
        tool: tool === "highlighter" ? "highlighter" : "pen",
      });
    },
    [color, eraseAt, pointerToLocal, size, tool],
  );

  const onPointerMove = useCallback(
    (ev: React.PointerEvent<SVGSVGElement>) => {
      const p = pointerToLocal(ev);
      if (tool === "eraser" && (ev.buttons & 1) === 1) {
        eraseAt(p[0], p[1]);
        return;
      }
      if (!live) return;
      setLive({ ...live, points: [...live.points, p] });
    },
    [eraseAt, live, pointerToLocal, tool],
  );

  const finalize = useCallback(() => {
    if (!live) return;
    if (live.points.length >= 2) addStroke(block.id, live);
    setLive(null);
  }, [addStroke, block.id, live]);

  // Resize handle
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);
  const onResizeDown = (ev: React.PointerEvent) => {
    ev.preventDefault();
    (ev.target as Element).setPointerCapture(ev.pointerId);
    dragRef.current = { startY: ev.clientY, startH: block.height };
  };
  const onResizeMove = (ev: React.PointerEvent) => {
    if (!dragRef.current) return;
    const next = Math.max(160, dragRef.current.startH + (ev.clientY - dragRef.current.startY));
    resize(block.id, next);
  };
  const onResizeUp = () => {
    dragRef.current = null;
  };

  // Keyboard: Cmd/Ctrl+Z to undo within an active drawing block
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        // Only act if focus is inside this svg
        if (svgRef.current?.contains(document.activeElement)) {
          e.preventDefault();
          undoStroke(block.id);
        }
      }
    };
    globalThis.addEventListener("keydown", handler);
    return () => globalThis.removeEventListener("keydown", handler);
  }, [block.id, undoStroke]);

  return (
    <div className="group/draw rounded-xl border border-ink-200 bg-white shadow-sm">
      <Toolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        size={size}
        setSize={setSize}
        onUndo={() => undoStroke(block.id)}
        onClear={() => clearStrokes(block.id)}
      />

      <div className="relative">
        <svg
          ref={svgRef}
          tabIndex={0}
          className={clsx(
            "block w-full select-none rounded-b-xl bg-paper",
            tool === "eraser" ? "cursor-cell" : "cursor-crosshair",
          )}
          style={{ height: block.height, touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finalize}
          onPointerLeave={finalize}
          onPointerCancel={() => setLive(null)}
        >
          {/* subtle ruled background */}
          <defs>
            <pattern id={`grid-${block.id}`} width="24" height="24" patternUnits="userSpaceOnUse">
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="rgba(22,22,15,0.04)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-${block.id})`} />

          {finishedPaths.map(
            (p) =>
              p.d && (
                <path
                  key={p.id}
                  d={p.d}
                  fill={p.color}
                  opacity={p.opacity}
                  stroke="none"
                />
              ),
          )}
          {livePath && live && (
            <path
              d={livePath}
              fill={live.color}
              opacity={live.tool === "highlighter" ? 0.35 : 1}
              stroke="none"
            />
          )}
        </svg>

        <div
          className="absolute bottom-0 left-1/2 h-2 w-12 -translate-x-1/2 cursor-ns-resize rounded-full bg-ink-200 opacity-0 transition group-hover/draw:opacity-100"
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
        />
      </div>
    </div>
  );
}

interface ToolbarProps {
  readonly tool: Tool;
  readonly setTool: (t: Tool) => void;
  readonly color: string;
  readonly setColor: (c: string) => void;
  readonly size: number;
  readonly setSize: (s: number) => void;
  readonly onUndo: () => void;
  readonly onClear: () => void;
}

function Toolbar({
  tool,
  setTool,
  color,
  setColor,
  size,
  setSize,
  onUndo,
  onClear,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-3 py-2 text-xs">
      <ToolButton active={tool === "pen"} onClick={() => setTool("pen")}>
        Pen
      </ToolButton>
      <ToolButton active={tool === "highlighter"} onClick={() => setTool("highlighter")}>
        Highlighter
      </ToolButton>
      <ToolButton active={tool === "eraser"} onClick={() => setTool("eraser")}>
        Eraser
      </ToolButton>

      <div className="mx-1 h-5 w-px bg-ink-100" />

      <div className="flex items-center gap-1.5">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            onClick={() => setColor(c)}
            className={clsx(
              "h-5 w-5 rounded-full border transition",
              color === c ? "ring-2 ring-offset-1 ring-ink-700" : "border-ink-200",
            )}
            style={{ background: c }}
          />
        ))}
      </div>

      <div className="mx-1 h-5 w-px bg-ink-100" />

      <div className="flex items-center gap-1.5">
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            aria-label={`Size ${s}`}
            onClick={() => setSize(s)}
            className={clsx(
              "flex h-6 w-6 items-center justify-center rounded transition",
              size === s ? "bg-ink-100" : "hover:bg-ink-50",
            )}
          >
            <span
              className="block rounded-full bg-ink-700"
              style={{ width: s + 2, height: s + 2 }}
            />
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onUndo}
          className="rounded px-2 py-1 text-ink-700 hover:bg-ink-100"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded px-2 py-1 text-ink-400 hover:bg-red-50 hover:text-red-700"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

interface ToolButtonProps {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}

function ToolButton({ active, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded px-2 py-1 font-sans transition",
        active ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-100",
      )}
    >
      {children}
    </button>
  );
}

