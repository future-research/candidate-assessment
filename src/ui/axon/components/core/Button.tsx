import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "outline" | "ghost"; size?: "md" | "lg" };

export function Button({ variant = "primary", size = "md", disabled, style, ...props }: ButtonProps) {
  const variants = {
    primary: { background: "var(--ax-action)", color: "var(--ax-on-action)", border: "none" },
    secondary: { background: "var(--ax-surface)", color: "var(--ax-ink)", border: "var(--ax-border-strong)" },
    outline: { background: "transparent", color: "var(--ax-ink)", border: "1px solid var(--ax-ink)" },
    ghost: { background: "transparent", color: "var(--ax-ink-2)", border: "none" },
  } as const;
  return <button disabled={disabled} style={{ minHeight: size === "lg" ? "var(--ax-hit-lg)" : "var(--ax-hit)", padding: "0 18px", borderRadius: "var(--ax-r-pill)", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", transition: "all var(--ax-dur-fast) var(--ax-ease)", ...variants[variant], ...(disabled ? { background: "var(--ax-disabled-bg)", color: "var(--ax-disabled-fg)", border: "none" } : {}), ...style }} {...props} />;
}
