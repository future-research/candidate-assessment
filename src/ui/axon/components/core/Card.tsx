import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & { signal?: boolean; recessed?: boolean; radius?: "sm" | "md" | "lg"; children: ReactNode };

export function Card({ signal, recessed, radius = "lg", style, ...props }: CardProps) {
  return <div style={{ background: signal ? "var(--ax-signal-soft), var(--ax-surface)" : recessed ? "var(--ax-surface-sub)" : "var(--ax-surface)", border: recessed ? "var(--ax-border-dashed)" : "var(--ax-border)", borderRadius: `var(--ax-r-${radius})`, padding: 16, boxShadow: recessed ? "none" : "var(--ax-shadow-card)", ...style }} {...props} />;
}
