export type DashboardTab = "today" | "workout" | "copilot" | "history";
export type DashboardScreen = "profile" | "insight" | "decision-path" | "approve";
export type DashboardDialog = "adjustment" | "override";
import type { DashboardInsightId } from "./dashboard-contract";

export type QuickPromptId = DashboardInsightId;
export type InsightId = QuickPromptId;

export type WorkoutVersion = {
  id: string;
  number: number;
  kind: "generated" | "adjustment" | "override";
  title: string;
  actor: "Axon" | "Coach Sam";
  time: string;
  durationMinutes: number;
  intensity: "Light" | "Moderate" | "Hard";
  splitSquatIncluded: boolean;
  overrideReason: string | null;
  changes: string[];
};

export type PublicationEvent = {
  id: string;
  workoutVersionId: string;
  actor: "Coach Sam";
  time: string;
};

export type DashboardState = {
  tab: DashboardTab;
  screen: DashboardScreen | null;
  returnScreen: DashboardScreen | null;
  dialog: DashboardDialog | null;
  detailId: string | null;
  decisionId: string;
  pendingPrompt: QuickPromptId | null;
  feed: QuickPromptId[];
  pins: InsightId[];
  draftDuration: number;
  draftIntensity: WorkoutVersion["intensity"];
  overrideReasonDraft: string;
  currentVersionId: string;
  contentVersions: WorkoutVersion[];
  publicationEvents: PublicationEvent[];
  announcement: string;
};

export type DashboardAction =
  | { type: "select-tab"; tab: DashboardTab }
  | { type: "open-screen"; screen: DashboardScreen; detailId?: string; decisionId?: string }
  | { type: "close-screen" }
  | { type: "open-adjustment" }
  | { type: "open-override" }
  | { type: "set-draft-duration"; duration: number }
  | { type: "set-draft-intensity"; intensity: WorkoutVersion["intensity"] }
  | { type: "set-override-reason"; reason: string }
  | { type: "cancel-dialog" }
  | { type: "apply-adjustment" }
  | { type: "apply-override" }
  | { type: "publish-current-version" }
  | { type: "request-prompt"; promptId: QuickPromptId }
  | { type: "complete-prompt"; promptId: QuickPromptId }
  | { type: "toggle-pin"; insightId: InsightId };

const generatedVersion: WorkoutVersion = {
  id: "workout-v1",
  number: 1,
  kind: "generated",
  title: "Auto daily draft",
  actor: "Axon",
  time: "6:02 AM",
  durationMinutes: 50,
  intensity: "Moderate",
  splitSquatIncluded: false,
  overrideReason: null,
  changes: [
    "Built from goals, injury, equipment and recent training",
    "3 constraint decisions applied (2 safety, 1 preference)",
  ],
};

export const initialDashboardState: DashboardState = {
  tab: "today",
  screen: null,
  returnScreen: null,
  dialog: null,
  detailId: null,
  decisionId: "split-squat",
  pendingPrompt: null,
  feed: ["brief", "adherence", "sleep", "change", "churn"],
  pins: [],
  draftDuration: generatedVersion.durationMinutes,
  draftIntensity: generatedVersion.intensity,
  overrideReasonDraft: "",
  currentVersionId: generatedVersion.id,
  contentVersions: [generatedVersion],
  publicationEvents: [],
  announcement: "Dashboard ready.",
};

function currentVersion(state: DashboardState) {
  return state.contentVersions.find((version) => version.id === state.currentVersionId) ?? state.contentVersions.at(-1)!;
}

function isPublished(state: DashboardState) {
  return state.publicationEvents.length > 0;
}

function addVersion(
  state: DashboardState,
  kind: "adjustment" | "override",
  changes: string[],
  updates: Partial<WorkoutVersion>,
): DashboardState {
  const previous = currentVersion(state);
  const number = state.contentVersions.length + 1;
  const version: WorkoutVersion = {
    ...previous,
    ...updates,
    id: `workout-v${number}`,
    number,
    kind,
    title: kind === "adjustment" ? "Coach adjustment" : "Safety override",
    actor: "Coach Sam",
    time: kind === "adjustment" ? "7:41 AM" : "7:48 AM",
    changes,
  };

  return {
    ...state,
    dialog: null,
    overrideReasonDraft: "",
    currentVersionId: version.id,
    contentVersions: [...state.contentVersions, version],
    announcement: `${kind === "adjustment" ? "Adjustment" : "Override"} saved as version ${number}.`,
  };
}

export function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case "select-tab":
      return {
        ...state,
        tab: action.tab,
        screen: null,
        returnScreen: null,
        detailId: null,
        announcement: `${action.tab[0].toUpperCase()}${action.tab.slice(1)} opened.`,
      };
    case "open-screen":
      return {
        ...state,
        screen: action.screen,
        returnScreen: action.screen === "insight" || action.screen === "decision-path" ? state.screen : null,
        detailId: action.detailId ?? state.detailId,
        decisionId: action.decisionId ?? state.decisionId,
      };
    case "close-screen":
      return { ...state, screen: state.returnScreen, returnScreen: null, detailId: null };
    case "open-adjustment": {
      if (isPublished(state)) return state;
      const version = currentVersion(state);
      return {
        ...state,
        dialog: "adjustment",
        draftDuration: version.durationMinutes,
        draftIntensity: version.intensity,
      };
    }
    case "open-override":
      return isPublished(state) ? state : { ...state, dialog: "override", overrideReasonDraft: "" };
    case "set-draft-duration":
      return state.dialog === "adjustment" && !isPublished(state)
        ? { ...state, draftDuration: action.duration }
        : state;
    case "set-draft-intensity":
      return state.dialog === "adjustment" && !isPublished(state)
        ? { ...state, draftIntensity: action.intensity }
        : state;
    case "set-override-reason":
      return state.dialog === "override" && !isPublished(state)
        ? { ...state, overrideReasonDraft: action.reason }
        : state;
    case "cancel-dialog":
      return { ...state, dialog: null, overrideReasonDraft: "" };
    case "apply-adjustment": {
      if (state.dialog !== "adjustment" || isPublished(state)) return { ...state, dialog: null };
      const dropBench = state.draftDuration <= 40;
      return addVersion(
        state,
        "adjustment",
        [
          `Duration ${state.draftDuration} min · intensity ${state.draftIntensity}`,
          ...(dropBench ? ["DB Neutral-Grip Bench Press removed (time budget)"] : []),
          "Rest guidance re-sized to window",
        ],
        { durationMinutes: state.draftDuration, intensity: state.draftIntensity },
      );
    }
    case "apply-override": {
      const reason = state.overrideReasonDraft.trim();
      if (state.dialog !== "override" || isPublished(state) || reason.length < 4) return state;
      return addVersion(
        state,
        "override",
        [
          "Dumbbell Goblet Split Squat added · 2×8 light",
          "Deep-flexion warning retained on version",
          `Reason: “${reason}”`,
        ],
        { splitSquatIncluded: true, overrideReason: reason },
      );
    }
    case "publish-current-version": {
      if (isPublished(state)) return state;
      const event: PublicationEvent = {
        id: "publication-1",
        workoutVersionId: state.currentVersionId,
        actor: "Coach Sam",
        time: "7:52 AM",
      };
      return {
        ...state,
        tab: "workout",
        screen: null,
        dialog: null,
        publicationEvents: [event],
        announcement: `Version ${currentVersion(state).number} recorded locally. No external delivery occurred.`,
      };
    }
    case "request-prompt":
      if (state.pendingPrompt) return state;
      return {
        ...state,
        pendingPrompt: action.promptId,
        feed: [...state.feed.filter((id) => id !== action.promptId), action.promptId],
        announcement: `Retrieving ${action.promptId} member context…`,
      };
    case "complete-prompt":
      return state.pendingPrompt === action.promptId
        ? { ...state, pendingPrompt: null, announcement: `${action.promptId[0].toUpperCase()}${action.promptId.slice(1)} member context ready.` }
        : state;
    case "toggle-pin":
      return {
        ...state,
        pins: state.pins.includes(action.insightId)
          ? state.pins.filter((id) => id !== action.insightId)
          : [...state.pins, action.insightId],
        announcement: state.pins.includes(action.insightId)
          ? `${action.insightId} removed from Today.`
          : `${action.insightId} pinned to Today.`,
      };
    default:
      return state;
  }
}

export function selectCurrentVersion(state: DashboardState) {
  return currentVersion(state);
}

export function selectIsPublished(state: DashboardState) {
  return isPublished(state);
}
