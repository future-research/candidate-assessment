import Link from "next/link";

export default function HomePage() {
  return <main style={{ width: "min(100% - 32px, 720px)", margin: "48px auto", padding: 24, borderRadius: "var(--ax-r-lg)", background: "var(--ax-surface)", border: "var(--ax-border)" }}><p style={{ font: "var(--ax-type-micro)", letterSpacing: "var(--ax-track-micro)" }}>AXON · PRODUCTION SHELL</p><h1 style={{ font: "var(--ax-type-hero)", fontStretch: "var(--ax-stretch-display)", letterSpacing: "var(--ax-track-display)" }}>Coach dashboard</h1><p style={{ color: "var(--ax-ink-2)" }}>The copied AXON production boundary is ready for the focused dashboard.</p><Link href="/gallery">Open component gallery →</Link></main>;
}
