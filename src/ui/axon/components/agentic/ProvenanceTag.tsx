import type { HTMLAttributes } from "react";

export function ProvenanceTag({ style, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span style={{ fontFamily: "var(--ax-font-mono)", fontSize: 9.5, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ax-color-text-micro)", border: "var(--ax-border)", borderRadius: "var(--ax-r-pill)", padding: "5px 10px", display: "inline-block", background: "var(--ax-surface)", ...style }} {...props} />;
}
