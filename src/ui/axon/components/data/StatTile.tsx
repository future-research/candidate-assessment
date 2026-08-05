import type { HTMLAttributes, ReactNode } from "react";

export function StatTile({ value, label, style, ...props }: HTMLAttributes<HTMLDivElement> & { value: ReactNode; label: string }) {
  return <div style={{ background: "var(--ax-surface)", border: "var(--ax-border)", borderRadius: "var(--ax-r-md)", padding: 12, ...style }} {...props}><div style={{ fontFamily: "var(--ax-font-display)", fontStretch: "110%", fontWeight: 700, fontSize: 19 }}>{value}</div><div style={{ fontFamily: "var(--ax-font-mono)", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ax-color-text-micro)", marginTop: 3 }}>{label}</div></div>;
}
