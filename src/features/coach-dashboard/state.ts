export type DashboardTab = "today" | "workout" | "copilot" | "history";
export type DashboardScreen = "profile" | "insight" | "decision-path" | "approve";
export type DashboardDialog = "adjustment" | "override";
import type { DashboardDecisionId, DashboardInsightId } from "./dashboard-contract";

export type QuickPromptId = DashboardInsightId;
export type InsightId = QuickPromptId;

export type WorkoutVersion = {
  id: string;
  number: number;
  kind: "generated" | "adjustment" | "override";
  title: string;
  actor: string;
  time: string;
  durationMinutes: number;
  intensity: "Light" | "Moderate" | "Hard";
  overrideDecisionId: DashboardDecisionId | null;
  overrideReason: string | null;
  changes: string[];
};

export type PublicationEvent = {
  id: string;
  workoutVersionId: string;
  actor: string;
  time: string;
};

export type DashboardState = {
  tab: DashboardTab;
  screen: DashboardScreen | null;
  returnScreen: DashboardScreen | null;
  dialog: DashboardDialog | null;
  detailId: string | null;
  decisionId: DashboardDecisionId | null;
  pendingPrompt: QuickPromptId | null;
  feed: QuickPromptId[];
  pins: InsightId[];
  draftDuration: number;
  draftIntensity: WorkoutVersion["intensity"];
  pendingAdjustment: boolean;
  overrideDecisionIdDraft: DashboardDecisionId | null;
  overrideReasonDraft: string;
  currentVersionId: string;
  contentVersions: WorkoutVersion[];
  publicationEvents: PublicationEvent[];
  announcement: string;
};

export type DashboardAction =
  | { type: "select-tab"; tab: DashboardTab }
  | { type: "open-screen"; screen: Exclude<DashboardScreen, "decision-path">; detailId?: string }
  | { type: "open-screen"; screen: "decision-path"; decisionId: DashboardDecisionId }
  | { type: "close-screen" }
  | { type: "open-adjustment" }
  | { type: "open-override"; decisionId: DashboardDecisionId }
  | { type: "set-draft-duration"; duration: number }
  | { type: "set-draft-intensity"; intensity: WorkoutVersion["intensity"] }
  | { type: "set-override-reason"; reason: string }
  | { type: "cancel-dialog" }
  | { type: "request-adjustment" }
  | { type: "complete-adjustment"; actor: string }
  | { type: "apply-override"; actor: string; exerciseName: string; warning: string }
  | { type: "publish-current-version"; actor: string }
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
  overrideDecisionId: null,
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
  decisionId: null,
  pendingPrompt: null,
  feed: ["brief", "adherence", "sleep", "change", "churn"],
  pins: [],
  draftDuration: generatedVersion.durationMinutes,
  draftIntensity: generatedVersion.intensity,
  pendingAdjustment: false,
  overrideDecisionIdDraft: null,
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
  actor: string,
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
    actor,
    time: kind === "adjustment" ? "7:41 AM" : "7:48 AM",
    changes,
  };

  return {
    ...state,
    dialog: null,
    pendingAdjustment: false,
    overrideDecisionIdDraft: null,
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
        detailId: "detailId" in action ? action.detailId ?? state.detailId : state.detailId,
        decisionId: action.screen === "decision-path" ? action.decisionId : state.decisionId,
      };
    case "close-screen":
      return { ...state, screen: state.returnScreen, returnScreen: null, detailId: null };
    case "open-adjustment": {
      if (isPublished(state)) return state;
      const version = currentVersion(state);
      return {
        ...state,
        dialog: "adjustment",
        pendingAdjustment: false,
        draftDuration: version.durationMinutes,
        draftIntensity: version.intensity,
      };
    }
    case "open-override":
      return isPublished(state) ? state : {
        ...state,
        dialog: "override",
        overrideDecisionIdDraft: action.decisionId,
        overrideReasonDraft: "",
      };
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
      return state.pendingAdjustment
        ? state
        : { ...state, dialog: null, overrideDecisionIdDraft: null, overrideReasonDraft: "" };
    case "request-adjustment":
      if (state.dialog !== "adjustment" || state.pendingAdjustment || isPublished(state)) return state;
      return { ...state, pendingAdjustment: true, announcement: "Applying adjustment…" };
    case "complete-adjustment": {
      if (state.dialog !== "adjustment" || !state.pendingAdjustment || isPublished(state)) return state;
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
        action.actor,
      );
    }
    case "apply-override": {
      const reason = state.overrideReasonDraft.trim();
      if (state.dialog !== "override" || !state.overrideDecisionIdDraft || isPublished(state) || reason.length < 4) return state;
      return addVersion(
        state,
        "override",
        [
          `${action.exerciseName} added`,
          `${action.warning} · warning retained on version`,
          `Reason: “${reason}”`,
        ],
        { overrideDecisionId: state.overrideDecisionIdDraft, overrideReason: reason },
        action.actor,
      );
    }
    case "publish-current-version": {
      if (isPublished(state)) return state;
      const event: PublicationEvent = {
        id: "publication-1",
        workoutVersionId: state.currentVersionId,
        actor: action.actor,
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
