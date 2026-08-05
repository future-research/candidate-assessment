import type { HTMLAttributes } from "react";

export function SignalKicker({ working, style, ...props }: HTMLAttributes<HTMLSpanElement> & { working?: boolean }) {
  return <span style={{ fontFamily: "var(--ax-font-mono)", fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", background: working ? "var(--ax-signal)" : "var(--ax-signal-soft)", backgroundSize: working ? "200% 100%" : undefined, animation: working ? "ax-signal-shift 1.6s ease infinite" : undefined, borderRadius: "var(--ax-r-pill)", padding: "5px 10px", display: "inline-block", ...style }} {...props} />;
}
