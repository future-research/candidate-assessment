export type TimelineVersion = { title: string; meta: string; changes?: string[]; signal?: boolean; filled?: boolean };

export function VersionTimeline({ versions }: { versions: TimelineVersion[] }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{versions.map((version, index) => <div key={`${version.title}-${version.meta}`} style={{ display: "flex", gap: 12 }}><div aria-hidden="true" style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: version.signal ? "var(--ax-signal)" : version.filled ? "var(--ax-ink)" : "var(--ax-surface)", border: "1.5px solid var(--ax-ink)" }} />{index < versions.length - 1 && <div style={{ width: 1, flex: 1, background: "var(--ax-line)", marginTop: 4 }} />}</div><CardBody version={version} /></div>)}</div>;
}

function CardBody({ version }: { version: TimelineVersion }) {
  return <div style={{ flex: 1, background: "var(--ax-surface)", border: "var(--ax-border)", borderRadius: "var(--ax-r-md)", padding: "13px 15px" }}><strong>{version.title}</strong><div style={{ fontFamily: "var(--ax-font-mono)", fontSize: 9.5, color: "var(--ax-color-text-micro)", marginTop: 3 }}>{version.meta}</div>{version.changes?.map((change) => <div key={change} style={{ fontSize: 12.5, color: "var(--ax-ink-2)", marginTop: 6 }}>· {change}</div>)}</div>;
}
