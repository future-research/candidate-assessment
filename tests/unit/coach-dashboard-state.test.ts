import { describe, expect, it } from "vitest";

import {
  dashboardReducer,
  initialDashboardState,
  type DashboardState,
} from "../../src/features/coach-dashboard/state";

const completeAdjustment = (state: DashboardState) => dashboardReducer(
  dashboardReducer(state, { type: "request-adjustment" }),
  { type: "complete-adjustment", actor: "Coach Sam" },
);

describe("coach dashboard state", () => {
  it("keeps cancelled edits out of the immutable content history", () => {
    const opened = dashboardReducer(initialDashboardState, { type: "open-adjustment" });
    const edited = dashboardReducer(opened, { type: "set-draft-duration", duration: 40 });
    const cancelled = dashboardReducer(edited, { type: "cancel-dialog" });

    expect(cancelled.dialog).toBeNull();
    expect(cancelled.contentVersions).toHaveLength(1);
    expect(cancelled.contentVersions[0].durationMinutes).toBe(50);
  });

  it("creates exactly one version for an adjustment and exactly one for an override", () => {
    const adjusted = completeAdjustment(
      dashboardReducer(
        dashboardReducer(initialDashboardState, { type: "open-adjustment" }), { type: "set-draft-duration", duration: 40 },
      ),
    );
    const overridden = dashboardReducer(
      dashboardReducer(
        dashboardReducer(adjusted, { type: "open-override", decisionId: "split-squat" }),
        { type: "set-override-reason", reason: "Cleared by PT; light load only" },
      ),
      { type: "apply-override", actor: "Coach Sam", exerciseName: "Split Squat", warning: "Deep flexion" },
    );

    expect(adjusted.contentVersions.map((version) => version.kind)).toEqual(["generated", "adjustment"]);
    expect(overridden.contentVersions.map((version) => version.kind)).toEqual([
      "generated",
      "adjustment",
      "override",
    ]);
    expect(overridden.currentVersionId).toBe("workout-v3");
  });

  it("keeps an adjustment pending until one explicit completion and blocks dismissal or duplicates", () => {
    const editing = dashboardReducer(
      dashboardReducer(initialDashboardState, { type: "open-adjustment" }),
      { type: "set-draft-duration", duration: 40 },
    );
    const pending = dashboardReducer(editing, { type: "request-adjustment" });

    expect(pending.pendingAdjustment).toBe(true);
    expect(pending.contentVersions).toHaveLength(1);
    expect(dashboardReducer(pending, { type: "cancel-dialog" })).toBe(pending);
    expect(dashboardReducer(pending, { type: "request-adjustment" })).toBe(pending);

    const completed = dashboardReducer(pending, { type: "complete-adjustment", actor: "Coach Lee" });
    const repeated = dashboardReducer(completed, { type: "complete-adjustment", actor: "Coach Lee" });
    expect(completed.pendingAdjustment).toBe(false);
    expect(completed.contentVersions).toHaveLength(2);
    expect(completed.contentVersions[1]).toMatchObject({ actor: "Coach Lee", durationMinutes: 40 });
    expect(repeated).toBe(completed);
  });

  it("publishes the exact current version once and freezes later content mutations", () => {
    const adjusted = completeAdjustment(
      dashboardReducer(
        dashboardReducer(initialDashboardState, { type: "open-adjustment" }), { type: "set-draft-duration", duration: 35 },
      ),
    );
    const published = dashboardReducer(adjusted, { type: "publish-current-version", actor: "Coach Sam" });
    const repeated = dashboardReducer(published, { type: "publish-current-version", actor: "Coach Sam" });
    const attemptedMutation = completeAdjustment(dashboardReducer(published, { type: "open-adjustment" }));

    expect(published.publicationEvents).toEqual([
      expect.objectContaining({ workoutVersionId: "workout-v2" }),
    ]);
    expect(repeated.publicationEvents).toHaveLength(1);
    expect(attemptedMutation.contentVersions).toEqual(published.contentVersions);
    expect(attemptedMutation.dialog).toBeNull();
  });

  it("keeps navigation, Copilot details, and pins available after publication", () => {
    const published = dashboardReducer(initialDashboardState, { type: "publish-current-version", actor: "Coach Sam" });
    const onCopilot = dashboardReducer(published, { type: "select-tab", tab: "copilot" });
    const prompted = dashboardReducer(onCopilot, { type: "request-prompt", promptId: "sleep" });
    const pinned = dashboardReducer(prompted, { type: "toggle-pin", insightId: "sleep" });
    const detail = dashboardReducer(pinned, { type: "open-screen", screen: "insight", detailId: "sleep" });

    expect(detail.tab).toBe("copilot");
    expect(detail.feed).toContain("sleep");
    expect(detail.pins).toEqual(["sleep"]);
    expect(detail.screen).toBe("insight");
    expect(detail.detailId).toBe("sleep");
  });

  it("ignores duplicate Copilot requests while a prompt is pending", () => {
    const pending = dashboardReducer(initialDashboardState, { type: "request-prompt", promptId: "sleep" });
    const duplicate = dashboardReducer(pending, { type: "request-prompt", promptId: "sleep" });
    const competing = dashboardReducer(pending, { type: "request-prompt", promptId: "churn" });

    expect(duplicate).toBe(pending);
    expect(competing).toBe(pending);
    expect(pending.pendingPrompt).toBe("sleep");
  });
});
