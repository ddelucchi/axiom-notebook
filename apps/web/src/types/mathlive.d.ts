import type { DetailedHTMLProps, HTMLAttributes } from "react";

/**
 * MathLive registers a `<math-field>` custom element. React 19 expects
 * intrinsic-element typings on `React.JSX`, not the legacy global `JSX`.
 */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          "virtual-keyboard-mode"?: "manual" | "onfocus" | "off";
          "default-mode"?: "math" | "text" | "inline-math";
        },
        HTMLElement
      >;
    }
  }
}

export {};

