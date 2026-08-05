import type { ButtonHTMLAttributes } from "react";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; dashed?: boolean };

export function Chip({ selected, dashed, style, ...props }: ChipProps) {
  return <button aria-pressed={selected} style={{ minHeight: "var(--ax-hit)", padding: "0 15px", borderRadius: "var(--ax-r-pill)", whiteSpace: "nowrap", cursor: "pointer", background: selected ? "var(--ax-ink)" : "var(--ax-surface)", color: selected ? "var(--ax-on-ink)" : "var(--ax-ink-2)", border: dashed ? "var(--ax-border-dashed)" : selected ? "1px solid var(--ax-ink)" : "var(--ax-border-strong)", ...style }} {...props} />;
}
