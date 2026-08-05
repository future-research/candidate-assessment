import { LaneNode } from "@/ui/axon/components/agentic/LaneNode";
import { ProvenanceTag } from "@/ui/axon/components/agentic/ProvenanceTag";
import { SignalKicker } from "@/ui/axon/components/agentic/SignalKicker";
import { Button } from "@/ui/axon/components/core/Button";
import { Card } from "@/ui/axon/components/core/Card";
import { Chip } from "@/ui/axon/components/core/Chip";
import { Input } from "@/ui/axon/components/core/Input";
import { StatTile } from "@/ui/axon/components/data/StatTile";
import { VersionTimeline } from "@/ui/axon/components/data/VersionTimeline";

export default function GalleryPage() {
  return <main style={{ width: "min(100%, 430px)", minHeight: "100vh", margin: "0 auto", padding: 18, background: "var(--ax-bg)", display: "grid", alignContent: "start", gap: 14 }}><header><SignalKicker>Graph-backed UI</SignalKicker><h1 style={{ font: "var(--ax-type-title)", fontStretch: "var(--ax-stretch-display)" }}>AXON primitives</h1><p style={{ color: "var(--ax-ink-2)" }}>Ink is human. Signal is machine.</p></header><Card><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><Button>Approve</Button><Button variant="secondary">Adjust</Button><Chip selected>Today</Chip><Chip dashed>Excluded</Chip></div></Card><Card signal><SignalKicker working>Retrieving context</SignalKicker><div style={{ marginTop: 12 }}><LaneNode text="Knee flexion under load is constrained" source="Member context · 05/10" /></div></Card><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><StatTile value="50%" label="Adherence" /><StatTile value="6.3h" label="Sleep" /></div><Card><label htmlFor="coach-note" style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>Coach note</label><Input id="coach-note" placeholder="Record the reason" /><div style={{ marginTop: 10 }}><ProvenanceTag>member-context.json</ProvenanceTag></div></Card><VersionTimeline versions={[{ title: "Draft v2", meta: "COACH ADJUSTMENT · 7:42 AM", changes: ["Duration 50 → 40 min"], filled: true }, { title: "Draft v1", meta: "GRAPH DRAFT · 7:35 AM", signal: true }]} /></main>;
}
