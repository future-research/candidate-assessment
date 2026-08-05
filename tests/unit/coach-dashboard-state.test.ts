import { describe, expect, it } from "vitest";

import {
  dashboardReducer,
  initialDashboardState,
} from "../../src/features/coach-dashboard/state";

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
    const adjusted = dashboardReducer(
      dashboardReducer(
        dashboardReducer(initialDashboardState, { type: "open-adjustment" }),
        { type: "set-draft-duration", duration: 40 },
      ),
      { type: "apply-adjustment" },
    );
    const overridden = dashboardReducer(
      dashboardReducer(
        dashboardReducer(adjusted, { type: "open-override" }),
        { type: "set-override-reason", reason: "Cleared by PT; light load only" },
      ),
      { type: "apply-override" },
    );

    expect(adjusted.contentVersions.map((version) => version.kind)).toEqual(["generated", "adjustment"]);
    expect(overridden.contentVersions.map((version) => version.kind)).toEqual([
      "generated",
      "adjustment",
      "override",
    ]);
    expect(overridden.currentVersionId).toBe("workout-v3");
  });

  it("publishes the exact current version once and freezes later content mutations", () => {
    const adjusted = dashboardReducer(
      dashboardReducer(
        dashboardReducer(initialDashboardState, { type: "open-adjustment" }),
        { type: "set-draft-duration", duration: 35 },
      ),
      { type: "apply-adjustment" },
    );
    const published = dashboardReducer(adjusted, { type: "publish-current-version" });
    const repeated = dashboardReducer(published, { type: "publish-current-version" });
    const attemptedMutation = dashboardReducer(
      dashboardReducer(published, { type: "open-adjustment" }),
      { type: "apply-adjustment" },
    );

    expect(published.publicationEvents).toEqual([
      expect.objectContaining({ workoutVersionId: "workout-v2" }),
    ]);
    expect(repeated.publicationEvents).toHaveLength(1);
    expect(attemptedMutation.contentVersions).toEqual(published.contentVersions);
    expect(attemptedMutation.dialog).toBeNull();
  });

  it("keeps navigation, Copilot details, and pins available after publication", () => {
    const published = dashboardReducer(initialDashboardState, { type: "publish-current-version" });
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
