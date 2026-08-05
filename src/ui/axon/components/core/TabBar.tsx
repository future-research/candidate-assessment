type TabBarProps<T extends string> = { tabs: readonly T[]; active: T; onChange: (tab: T) => void };

export function TabBar<T extends string>({ tabs, active, onChange }: TabBarProps<T>) {
  return <div role="tablist" aria-label="Dashboard sections" style={{ display: "flex", borderTop: "1px solid var(--ax-line-2)", background: "var(--ax-surface-sub)" }}>{tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={active === tab} onClick={() => onChange(tab)} style={{ flex: 1, minHeight: 58, border: 0, background: "transparent", color: active === tab ? "var(--ax-ink)" : "var(--ax-ink-4)", fontWeight: 600, cursor: "pointer" }}>{tab}</button>)}</div>;
}
