import exercisesData from "../../../data/exercises.json";
import memberContextData from "../../../data/member-context.json";

export type CatalogExercise = (typeof exercisesData)[number];
export type MemberContext = typeof memberContextData;

export type WorkoutItem = {
  id: string;
  name: string;
  dose: string;
  why: string;
  provenance: string;
  decisionId?: string;
  catalogId: string | null;
  catalogName: string;
};

type CopilotCard = {
  id: "brief" | "adherence" | "sleep" | "change" | "churn";
  kicker: string;
  title: string;
  headline?: string;
  rows?: { label: string; value: string }[];
  bars?: { label: string; value: number }[];
  sources: string[];
  detail?: { recent: string; trend: string; stable: string; action: string };
};

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function roundedAverage(values: number[]) {
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
}

export function buildDashboardFixture(memberContext: MemberContext, exercises: CatalogExercise[]) {
  const profile = memberContext.profile;
  const latestAdherence = memberContext.adherence.weekly_completion_pct.at(-1)!;
  const latestWorkout = memberContext.workout_history[0];
  const injury = memberContext.injuries[0];
  const exerciseByName = new Map(exercises.map((exercise) => [exercise.name, exercise]));
  const catalogItem = (
    id: string,
    catalogName: string,
    dose: string,
    why: string,
    provenance: string,
    decisionId?: string,
  ): WorkoutItem => {
    const exercise = exerciseByName.get(catalogName);
    if (!exercise) throw new Error(`Dashboard fixture references missing catalog exercise: ${catalogName}`);
    return { id, name: catalogName, dose, why, provenance, decisionId, catalogId: exercise.id, catalogName };
  };
  const contextualItem = (
    id: string,
    name: string,
    dose: string,
    why: string,
    provenance: string,
    decisionId?: string,
  ): WorkoutItem => ({ id, name, dose, why, provenance, decisionId, catalogId: null, catalogName: name });

  const adherenceBars = memberContext.adherence.weekly_completion_pct.map(({ week_of, pct }) => ({
    label: `${Number(week_of.slice(5, 7))}/${Number(week_of.slice(8, 10))}`,
    value: pct,
  }));
  const sleepAverage = roundedAverage(memberContext.biomarkers.sleep_hours_last_7_days);
  const skippedWorkout = memberContext.workout_history.find((workout) => !workout.completed)!;

  const copilotCards: Record<CopilotCard["id"], CopilotCard> = {
    brief: {
      id: "brief",
      kicker: "MORNING BRIEF · THU JUN 4",
      title: "Celebrate the knee win, watch churn",
      rows: [
        { label: "CELEBRATE", value: memberContext.coach_brief.morning_tasks[0].text },
        { label: "RISK", value: `Adherence ${memberContext.adherence.weekly_completion_pct[0].pct}% → ${latestAdherence.pct}% over 2 weeks · churn ${memberContext.coach_brief.churn_risk.level}` },
        { label: "DO NEXT", value: "Reply to Jordan’s check-in · review today’s draft" },
      ],
      sources: ["workout 06/03", "adherence log", "chat 06/03"],
    },
    adherence: {
      id: "adherence",
      kicker: "ADHERENCE",
      title: `Declining — ${adherenceBars[0].value}% → ${latestAdherence.pct}%`,
      headline: `Two strong weeks, then a slide. One skipped session (“${memberContext.chat_history.find((message) => message.text.includes("work blew up"))?.text.split(", ")[1]?.replace(" Sorry!", "") ?? "work fatigue"}”).`,
      bars: adherenceBars,
      sources: ["adherence log · 4 wks", "chat 05/30"],
      detail: {
        recent: `${latestAdherence.pct}% last week — ${skippedWorkout.title} was not completed.`,
        trend: `Weekly completion moved from ${adherenceBars[0].value}% to ${latestAdherence.pct}%.`,
        stable: `Preference remains ${memberContext.preferences.training_days_per_week} days/week.`,
        action: "Trim sessions to 35–40 min this week and anchor the check-in on the pain-free squat milestone.",
      },
    },
    sleep: {
      id: "sleep",
      kicker: "SLEEP",
      title: `${sleepAverage}h avg vs 7h goal`,
      headline: "Two nights under 5.5h this week; weekends recover.",
      bars: memberContext.biomarkers.sleep_hours_last_7_days.map((value, index) => ({ label: ["F", "S", "S", "M", "T", "W", "T"][index], value: value * 12.5 })),
      sources: ["sleep log · 7 days", "goal: 7h weeknights"],
      detail: {
        recent: `${sleepAverage}h average over the last 7 days; ${Math.min(...memberContext.biomarkers.sleep_hours_last_7_days)}h was the low.`,
        trend: "Weeknights remain under the goal while weekends recover.",
        stable: memberContext.goals.find((goal) => goal.id === "goal_sleep")!.text,
        action: "Keep intensity moderate after short-sleep nights; today qualifies.",
      },
    },
    change: {
      id: "change",
      kicker: "WEEK OVER WEEK",
      title: "What changed since last week",
      rows: [
        { label: "ADHERENCE", value: `${adherenceBars.at(-2)!.value}% → ${latestAdherence.pct}% — one planned session missed` },
        { label: "SLEEP", value: `${sleepAverage}h current average — still under goal` },
        { label: "KNEE", value: `First pain-free loaded squats ✓ (${latestWorkout.exercises[0]})` },
      ],
      sources: ["4 workouts", "sleep log", "2 messages"],
    },
    churn: {
      id: "churn",
      kicker: "CHURN RISK",
      title: `${memberContext.coach_brief.churn_risk.level[0].toUpperCase()}${memberContext.coach_brief.churn_risk.level.slice(1)} — act this week`,
      bars: adherenceBars,
      rows: [
        { label: "SIGNALS", value: memberContext.coach_brief.churn_risk.reasons.join(" · ") },
        { label: "COUNTER", value: "Pain-free knee day + upbeat message Jun 3" },
      ],
      sources: ["adherence log", "chat 05/30", "login events"],
      detail: {
        recent: "Skipped Thursday, citing work fatigue. Upbeat again after Jun 3 session.",
        trend: "Engagement has slid for 2 weeks across sessions and logins.",
        stable: `${profile.tier} member since ${profile.member_since}.`,
        action: "Send a personal nudge tied to the squat milestone before scheduling this week.",
      },
    },
  };

  const splitSquat = catalogItem(
    "split-squat",
    "Dumbbell Goblet Split Squat",
    "2×8 · LIGHT",
    `Excluded for ${injury.region} ${injury.status}: avoid deep flexion under load.`,
    "CATALOG · INJURY REPORT 05/10",
    "split-squat",
  );

  return {
    member: {
      name: profile.name,
      initials: initials(profile.name),
      age: profile.age,
      height: profile.height_cm,
      weight: profile.weight_kg,
      tier: profile.tier,
      memberSince: profile.member_since,
      trainingDaysPerWeek: memberContext.preferences.training_days_per_week,
    },
    metrics: {
      adherence: `${latestAdherence.pct}%`,
      sleep: `${sleepAverage}h`,
      restingHeartRate: `${memberContext.biomarkers.resting_hr_bpm}`,
    },
    morningBrief: {
      celebration: memberContext.coach_brief.morning_tasks[0].text,
      risk: memberContext.coach_brief.morning_tasks[1].text,
      memberMessage: memberContext.chat_history[0].text,
    },
    profile: {
      injury,
      goals: memberContext.goals,
      preferences: memberContext.preferences,
      equipment: memberContext.equipment_available,
    },
    workoutSections: [
      {
        title: "WARM-UP",
        items: [
          catalogItem("worlds-greatest-stretch", "World's Greatest Stretch", "2 MIN · FLOW", "Dynamic full-body mobility with no loaded knee flexion.", "CATALOG · MOBILITY-DYNAMIC"),
          contextualItem("banded-lateral-walk", "Banded Lateral Walk", "2×12 · LOOP BAND", "Knee-stability activation; loop band available at home.", "WORKOUT LOG 06/03 · EQUIPMENT"),
        ],
      },
      {
        title: "MAIN",
        items: [
          contextualItem("box-goblet-squat", "Box Goblet Squat", "3×10 · DUMBBELL", "Strength goal + first pain-free box squats Jun 3.", "GOALS · WORKOUT LOG 06/03", "box-squat"),
          contextualItem("step-up", "Step-Up (low box)", "3×8 / SIDE · DUMBBELL", "Knee-safe lower push selected where jumping was removed.", "WORKOUT LOG 05/27 · SAFETY", "jumps"),
          contextualItem("hip-thrust", "Hip Thrust", "3×12 · BENCH", "Posterior chain with minimal knee flexion; bench available at home.", "WORKOUT LOG 06/03 · EQUIPMENT"),
          catalogItem("bench-press", "Dumbbell Neutral-Grip Bench Press", "3×10 · DB + BENCH", "Upper push; dumbbells and flat bench are available.", "CATALOG · EQUIPMENT"),
        ],
      },
      {
        title: "COOL-DOWN",
        items: [
          catalogItem("cow-pose", "Cow Pose", "1 MIN · MAT", "Down-regulation and gentle lumbar mobility.", "CATALOG · REGEN"),
          catalogItem("upper-trap-stretch", "Ground Upper Trap Stretch", "1 MIN / SIDE", "Neck and trap release to close.", "CATALOG · MOBILITY-STATIC"),
        ],
      },
    ],
    exclusions: [
      { ...splitSquat, reason: "Deep knee flexion under load — patellofemoral pain (recovering)", overridable: true },
      { ...catalogItem("jumps", "Static Jump", "", "", "CATALOG · INJURY REPORT", "jumps"), reason: "Plyometric loading contraindicated during knee recovery", overridable: false },
      { ...contextualItem("deadlifts", "Deadlift variations", "", "", "MEMBER PREFERENCES", "deadlifts"), reason: "Member dislikes deadlifts — explicit preference exclusion", overridable: false },
    ],
    decisionPaths: {
      "split-squat": {
        kind: "SAFETY EXCLUSION",
        lanes: [
          { name: "MEMBER", text: `${injury.region} pain · ${injury.status}`, source: "INJURY REPORT · 05/10" },
          { name: "ANATOMY", text: "patellofemoral joint ⊂ knee joint", source: "SNOMED CT SUBSET" },
          { name: "RULE", text: "Avoid deep knee flexion under load", source: "CONTRAINDICATION EDGE" },
          { name: "WORKOUT", text: "Dumbbell Goblet Split Squat removed", source: "SAFETY LAYER · DETERMINISTIC" },
        ],
      },
      jumps: {
        kind: "SAFETY EXCLUSION",
        lanes: [
          { name: "MEMBER", text: `${injury.region} pain · ${injury.status}`, source: "INJURY REPORT · 05/10" },
          { name: "ANATOMY", text: "knee joint + modeled substructures", source: "SNOMED CT SUBSET" },
          { name: "RULE", text: "Avoid plyometric loading", source: "CONTRAINDICATION EDGE" },
          { name: "WORKOUT", text: "Static Jump removed; Step-Up selected", source: "SUBSTITUTION EDGE" },
        ],
      },
      deadlifts: {
        kind: "PREFERENCE",
        lanes: [
          { name: "MEMBER", text: "Dislikes: deadlifts, burpees", source: "MEMBER PREFERENCES" },
          { name: "ANATOMY", text: "No anatomy restriction", source: "—" },
          { name: "RULE", text: "Explicit preference exclusion", source: "EQUIVALENCE SET" },
          { name: "WORKOUT", text: "Deadlift variations hidden", source: "PREFERENCE FILTER" },
        ],
      },
      "box-squat": {
        kind: "SELECTION",
        lanes: [
          { name: "MEMBER", text: "Lower-body strength goal + pain-free box squats", source: "GOALS · WORKOUT LOG 06/03" },
          { name: "ANATOMY", text: "Limited flexion range at knee joint", source: "SNOMED CT SUBSET" },
          { name: "RULE", text: "Prefer knee-safe squat patterns while recovering", source: "GRADED-RETURN RULE" },
          { name: "WORKOUT", text: "Box Goblet Squat 3×10 selected", source: "COMPOSER · EQUIPMENT" },
        ],
      },
    },
    copilotCards,
    history: memberContext.workout_history,
  };
}

export const dashboardFixture = buildDashboardFixture(memberContextData, exercisesData);
