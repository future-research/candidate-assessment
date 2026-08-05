export function LaneNode({ text, source, empty }: { text?: string; source?: string; empty?: boolean }) {
  if (empty) return <div style={{ border: "var(--ax-border-dashed)", borderRadius: "var(--ax-r-md)", padding: "11px 13px", color: "var(--ax-ink-4)" }}>not used for this decision</div>;
  return <div style={{ border: "1px solid var(--ax-line-strong)", background: "var(--ax-signal-faint), var(--ax-surface)", borderRadius: "var(--ax-r-md)", padding: "11px 13px" }}><div>{text}</div>{source && <div style={{ fontFamily: "var(--ax-font-mono)", fontSize: 9, textTransform: "uppercase", color: "var(--ax-color-text-micro)", marginTop: 4 }}>{source}</div>}</div>;
}
