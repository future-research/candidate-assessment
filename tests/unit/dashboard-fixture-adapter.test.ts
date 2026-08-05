import { describe, expect, it } from "vitest";

import exercises from "../../data/exercises.json";
import memberContext from "../../data/member-context.json";
import {
  buildDashboardFixture,
  fixtureDashboardAdapter,
} from "../../src/features/coach-dashboard/fixture-adapter";

describe("dashboard fixture adapter", () => {
  it("derives the flagship member summary from canonical fixture data", () => {
    const fixture = buildDashboardFixture(memberContext, exercises);

    expect(fixture.member).toMatchObject({
      name: "Jordan Rivera",
      initials: "JR",
      tier: "1:1 Coaching",
      trainingDaysPerWeek: 4,
    });
    expect(fixture.metrics).toEqual({ adherence: "50%", sleep: "6.3h", restingHeartRate: "58" });
    expect(fixture.morningBrief.celebration).toContain("pain-free squat");
    expect(fixture.history[0]).toMatchObject({ title: "Lower Body - Bands & DB", completed: true });
  });

  it("resolves all catalog-backed workout and exclusion records through one adapter", () => {
    const fixture = buildDashboardFixture(memberContext, exercises);
    const catalogNames = new Set(exercises.map((exercise) => exercise.name));
    const catalogBacked = [...fixture.workoutSections.flatMap((section) => section.items), ...fixture.exclusions]
      .filter((item) => item.catalogId);

    expect(catalogBacked.length).toBeGreaterThan(0);
    expect(catalogBacked.every((item) => catalogNames.has(item.catalogName))).toBe(true);
    expect(fixture.exclusions.find((item) => item.id === "split-squat")).toMatchObject({
      catalogName: "Dumbbell Goblet Split Squat",
      overridable: true,
    });
    expect(fixture.exclusions.every((item) => fixture.decisionPaths[item.decisionId])).toBe(true);
  });

  it("derives adapter-owned member and date copy for a different member", () => {
    const alternate = structuredClone(memberContext);
    alternate.profile.name = "Avery Chen";
    alternate.coach_brief.generated_for = "2026-07-08";
    alternate.chat_history[0].ts = "2026-07-07T18:42:00-07:00";

    const fixture = buildDashboardFixture(alternate, exercises);

    expect(fixture.member).toMatchObject({ name: "Avery Chen", initials: "AC" });
    expect(fixture.asOfDate).toEqual({ weekday: "WED", monthDay: "JUL 8" });
    expect(fixture.morningBrief.memberMessageDate).toBe("Jul 7");
  });

  it("implements the async load-state contract without enabling external draft creation", async () => {
    expect(fixtureDashboardAdapter.initialState.status).toBe("ready");
    await expect(fixtureDashboardAdapter.load()).resolves.toMatchObject({
      status: "ready",
      data: expect.objectContaining({ member: expect.objectContaining({ name: "Jordan Rivera" }) }),
    });
    expect(fixtureDashboardAdapter.capabilities.startNewDraft).toEqual({
      available: false,
      reason: "New drafts require a connected coaching service.",
    });
  });
});
