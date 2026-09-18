"use client";

import { getStroke } from "perfect-freehand";
import type { DrawStroke } from "@/features/notebook/types";

export interface StrokeStyle {
  color: string;
  size: number;
  thinning: number;
  smoothing: number;
  streamline: number;
}

export const PEN_STYLE: StrokeStyle = {
  color: "#16160f",
  size: 3,
  thinning: 0.6,
  smoothing: 0.62,
  streamline: 0.5,
};

export const HIGHLIGHTER_STYLE: StrokeStyle = {
  color: "#fde68a",
  size: 18,
  thinning: 0,
  smoothing: 0.5,
  streamline: 0.5,
};

export function styleFor(stroke: DrawStroke): StrokeStyle {
  const base = stroke.tool === "highlighter" ? HIGHLIGHTER_STYLE : PEN_STYLE;
  return { ...base, color: stroke.color, size: stroke.size };
}

/**
 * Convert raw pointer samples into an SVG path string via perfect-freehand.
 * Returns null if the stroke is too short to render.
 */
export function strokeToPath(stroke: DrawStroke): string | null {
  if (stroke.points.length === 0) return null;
  const style = styleFor(stroke);
  const samples = stroke.points.map(([x, y, p]) => [x, y, p ?? 0.5] as number[]);
  const outline = getStroke(samples, {
    size: style.size,
    thinning: style.thinning,
    smoothing: style.smoothing,
    streamline: style.streamline,
    simulatePressure: true,
    last: true,
  });
  if (outline.length < 2) return null;
  return outlineToSvgPath(outline);
}

function outlineToSvgPath(points: ReadonlyArray<readonly [number, number]>): string {
  const len = points.length;
  if (len < 2) return "";
  const [fx, fy] = points[0] as readonly [number, number];
  let d = `M ${fx.toFixed(2)} ${fy.toFixed(2)} Q`;
  for (let i = 0; i < len - 1; i++) {
    const [ax, ay] = points[i] as readonly [number, number];
    const [bx, by] = points[i + 1] as readonly [number, number];
    const mx = ((ax + bx) / 2).toFixed(2);
    const my = ((ay + by) / 2).toFixed(2);
    d += ` ${ax.toFixed(2)} ${ay.toFixed(2)} ${mx} ${my}`;
  }
  d += " Z";
  return d;
}

