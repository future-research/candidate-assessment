"use client";

import { useEffect, useReducer, useRef } from "react";

import { VersionTimeline } from "@/ui/axon/components/data/VersionTimeline";
import { dashboardFixture as fixture } from "./fixture-adapter";
import {
  dashboardReducer,
  initialDashboardState,
  selectCurrentVersion,
  selectIsPublished,
  type DashboardAction,
  type DashboardScreen,
  type DashboardState,
  type InsightId,
  type QuickPromptId,
  type WorkoutVersion,
} from "./state";
import styles from "./dashboard.module.css";

const tabs = [
  { id: "today", label: "Today" },
  { id: "workout", label: "Workout" },
  { id: "copilot", label: "Copilot" },
  { id: "history", label: "History" },
] as const;

const prompts: { id: QuickPromptId; label: string }[] = [
  { id: "brief", label: "Morning brief" },
  { id: "adherence", label: "Adherence" },
  { id: "sleep", label: "Sleep" },
  { id: "change", label: "Wk over wk" },
  { id: "churn", label: "Churn risk" },
];

export function CoachDashboard() {
  const [state, dispatch] = useReducer(dashboardReducer, initialDashboardState);
  const promptTimer = useRef<number | null>(null);
  const currentVersion = selectCurrentVersion(state);
  const published = selectIsPublished(state);

  const openScreen = (screen: DashboardScreen, detailId?: string, decisionId?: string) =>
    dispatch({ type: "open-screen", screen, detailId, decisionId });

  const ask = (promptId: QuickPromptId) => {
    if (state.pendingPrompt) return;
    dispatch({ type: "request-prompt", promptId });
    promptTimer.current = window.setTimeout(() => {
      dispatch({ type: "complete-prompt", promptId });
      promptTimer.current = null;
    }, 500);
  };

  useEffect(() => () => {
    if (promptTimer.current !== null) window.clearTimeout(promptTimer.current);
  }, []);

  return (
    <main className={styles.desk}>
      <div className={styles.app} data-testid="coach-dashboard">
        {state.screen ? (
          <DetailScreen state={state} dispatch={dispatch} currentVersion={currentVersion} published={published} />
        ) : (
          <>
            <MemberHeader onOpenProfile={() => openScreen("profile")} />
            {state.tab === "today" && (
              <TodayScreen state={state} currentVersion={currentVersion} published={published} dispatch={dispatch} ask={ask} openScreen={openScreen} />
            )}
            {state.tab === "workout" && (
              <WorkoutScreen currentVersion={currentVersion} published={published} dispatch={dispatch} openScreen={openScreen} />
            )}
            {state.tab === "copilot" && (
              <CopilotScreen state={state} dispatch={dispatch} ask={ask} openScreen={openScreen} />
            )}
            {state.tab === "history" && <HistoryScreen state={state} />}
            <nav className={styles.tabs} aria-label="Dashboard sections">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`${styles.tab} ${state.tab === tab.id ? styles.tabActive : ""}`}
                  type="button"
                  aria-current={state.tab === tab.id ? "page" : undefined}
                  onClick={() => dispatch({ type: "select-tab", tab: tab.id })}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </>
        )}
        {state.dialog && <DashboardDialog state={state} dispatch={dispatch} />}
      </div>
    </main>
  );
}

function MemberHeader({ onOpenProfile }: { onOpenProfile: () => void }) {
  return (
    <header className={styles.memberHeader}>
      <button className={styles.memberButton} type="button" onClick={onOpenProfile} aria-label="Open Jordan Rivera profile">
        <span className={styles.avatar} aria-hidden="true">{fixture.member.initials}</span>
        <span>
          <span className={styles.memberName}>{fixture.member.name} <span aria-hidden="true">›</span></span>
          <span className={styles.micro}>{fixture.member.tier} · {fixture.member.trainingDaysPerWeek} days/wk</span>
        </span>
      </button>
      <div className={styles.date}>THU<br />JUN 4</div>
    </header>
  );
}

function TodayScreen({
  state,
  currentVersion,
  published,
  dispatch,
  ask,
  openScreen,
}: {
  state: DashboardState;
  currentVersion: WorkoutVersion;
  published: boolean;
  dispatch: React.Dispatch<DashboardAction>;
  ask: (id: QuickPromptId) => void;
  openScreen: (screen: DashboardScreen, detailId?: string, decisionId?: string) => void;
}) {
  return (
    <section className={`${styles.scroll} ${styles.stack}`} aria-label="Today">
      <button className={styles.heroCard} type="button" onClick={() => dispatch({ type: "select-tab", tab: "workout" })} style={{ textAlign: "left", cursor: "pointer" }}>
        <div className={styles.micro}>{published ? "PUBLISHED ✓" : "TODAY’S DRAFT · READY"}</div>
        <h1 className={styles.heroTitle}>{published ? "Local publication recorded" : `${currentVersion.durationMinutes}-min knee-safe strength`}</h1>
        <div className={styles.subtle}>{published ? `Exact approved v${currentVersion.number} · history retained` : `3 constraint decisions · warm-up to cool-down sized to ${currentVersion.durationMinutes} min`}</div>
        <span className={styles.heroAction}>{published ? "View published workout →" : "Review & approve →"}</span>
      </button>

      {state.pins.map((id) => (
        <button key={id} className={styles.card} type="button" onClick={() => openScreen("insight", id)} style={{ textAlign: "left", cursor: "pointer" }}>
          <div className={styles.micro}>PINNED · COPILOT</div>
          <div className={styles.bodyStrong}>{fixture.copilotCards[id].title} →</div>
        </button>
      ))}

      <div className={styles.sectionLabel}>MORNING BRIEF</div>
      <div className={styles.card}>
        <div className={styles.briefRow}>
          <span className={styles.inkIcon}>✓</span>
          <div><div className={styles.bodyStrong}>First pain-free squat day</div><div className={styles.bodyCopy}>Box squats Jun 3 — “knee felt okay”. Worth celebrating today.</div></div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.briefRow}>
          <span className={styles.inkIcon}>!</span>
          <div><div className={styles.bodyStrong}>Churn risk elevated</div><div className={styles.bodyCopy}>Adherence 100% → 50% in 2 weeks · logins down</div></div>
        </div>
        <div className={styles.sparkBars} role="img" aria-label="Adherence declined from 100 to 50 percent">
          {[90, 90, 66, 44].map((height, index) => <span key={index} style={{ height: `${height}%`, opacity: index === 3 ? 1 : 0.18 }} />)}
        </div>
        <button className={styles.secondaryButton} type="button" onClick={() => { dispatch({ type: "select-tab", tab: "copilot" }); ask("churn"); }}>Ask Copilot about churn →</button>
      </div>
      <div className={styles.card}>
        <div className={styles.micro}>PENDING · 2</div>
        <div className={styles.pendingRows}>
          <div><div className={styles.bodyStrong}>Reply to Jordan’s check-in</div><div className={styles.bodyCopy}>“{fixture.morningBrief.memberMessage}” · Jun 3</div></div>
          <div><div className={styles.bodyStrong}>Review churn signals</div><div className={styles.bodyCopy}>flagged by assistant · this morning</div></div>
        </div>
      </div>
      <div className={styles.metrics}>
        {[['adherence', fixture.metrics.adherence, 'ADHERENCE WK'], ['sleep', fixture.metrics.sleep, 'SLEEP AVG 7D'], ['heart', fixture.metrics.restingHeartRate, 'RESTING HR']].map(([id, value, label]) => (
          <div className={styles.metric} key={id}><strong>{value}</strong><div className={styles.micro}>{label}</div></div>
        ))}
      </div>
    </section>
  );
}

function WorkoutScreen({ currentVersion, published, dispatch, openScreen }: {
  currentVersion: WorkoutVersion;
  published: boolean;
  dispatch: React.Dispatch<DashboardAction>;
  openScreen: (screen: DashboardScreen, detailId?: string, decisionId?: string) => void;
}) {
  const sections = fixture.workoutSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => !(item.id === "bench-press" && currentVersion.durationMinutes <= 40)),
  }));
  if (currentVersion.splitSquatIncluded) {
    sections[1] = {
      ...sections[1],
      items: [...sections[1].items, {
        ...fixture.exclusions[0],
        name: fixture.exclusions[0].catalogName,
        why: `Included by Coach Sam. Warning retained. Reason: “${currentVersion.overrideReason}”`,
        provenance: "PROV-O · OVERRIDE · COACH SAM",
      }],
    };
  }

  return (
    <section className={`${styles.scroll} ${styles.stack}`} aria-label="Workout">
      <div className={styles.workoutTopline}>
        <div><div className={styles.micro}>{published ? "PUBLISHED WORKOUT" : "TODAY’S WORKOUT"}</div><h1 className={styles.heroTitle}>{currentVersion.durationMinutes}-min knee-safe strength</h1></div>
        <span className={styles.versionPill}>v{currentVersion.number}</span>
      </div>
      <div className={styles.subtle}>{sections.reduce((count, section) => count + section.items.length, 0)} exercises · {currentVersion.intensity} intensity · source-backed</div>

      {sections.map((section) => (
        <div className={styles.workoutGroup} key={section.title}>
          <div className={styles.sectionLabel}>{section.title}</div>
          {section.items.map((item) => (
            <details className={styles.exercise} key={item.id}>
              <summary><span className={styles.exerciseName}>{item.name}</span><span className={styles.exerciseDose}>{item.dose}</span></summary>
              <div className={styles.exerciseDetail}>
                <div className={styles.bodyCopy}>{item.why}</div>
                <div className={styles.source}>{item.provenance}</div>
                {item.decisionId && <button className={styles.pillButton} type="button" onClick={() => openScreen("decision-path", undefined, item.decisionId)} style={{ marginTop: 10 }}>Decision path →</button>}
              </div>
            </details>
          ))}
        </div>
      ))}

      <div className={styles.sectionLabel}>EXCLUSIONS</div>
      <div className={styles.card}>
        {fixture.exclusions.filter((item) => item.id !== "split-squat" || !currentVersion.splitSquatIncluded).map((item) => (
          <div className={styles.exclusion} key={item.id}>
            <div className={styles.bodyStrong}>{item.catalogName}</div>
            <div className={styles.bodyCopy}>{item.reason}</div>
            <div className={styles.exclusionActions}>
              <button className={styles.pillButton} type="button" onClick={() => openScreen("decision-path", undefined, item.decisionId)}>Decision path →</button>
              {item.overridable && !published && <button className={styles.pillButton} type="button" onClick={() => dispatch({ type: "open-override" })}>Override</button>}
            </div>
          </div>
        ))}
      </div>

      {published ? (
        <div className={styles.publishedBanner}>✓ Local publication recorded for exact v{currentVersion.number} · no external delivery</div>
      ) : (
        <div className={styles.actionRow}>
          <button className={styles.secondaryButton} type="button" onClick={() => dispatch({ type: "open-adjustment" })}>Adjust</button>
          <button className={styles.primaryButton} type="button" onClick={() => openScreen("approve")}>Approve & record locally</button>
        </div>
      )}
    </section>
  );
}

function CopilotScreen({ state, dispatch, ask, openScreen }: {
  state: DashboardState;
  dispatch: React.Dispatch<DashboardAction>;
  ask: (id: QuickPromptId) => void;
  openScreen: (screen: DashboardScreen, detailId?: string) => void;
}) {
  return (
    <section className={`${styles.scroll} ${styles.stack}`} aria-label="Copilot">
      <div><div className={styles.micro}>COPILOT · FIXTURE DEMO</div><h1 className={styles.heroTitle}>Member context, ready to act on</h1></div>
      <div className={styles.promptRow} aria-label="Copilot quick prompts">
        {prompts.map((prompt) => <button className={styles.pillButton} type="button" key={prompt.id} onClick={() => ask(prompt.id)}>{prompt.label}</button>)}
      </div>
      {state.pendingPrompt && <div className={styles.card}><span className={styles.signalKicker}>Retrieving member context…</span></div>}
      {state.feed.map((id) => {
        const card = fixture.copilotCards[id];
        return (
          <article className={styles.copilotCard} key={card.id}>
            <div className={styles.cardTop}>
              <span className={styles.signalKicker}>{card.kicker}</span>
              <button className={styles.textButton} type="button" onClick={() => dispatch({ type: "toggle-pin", insightId: id })}>{state.pins.includes(id) ? "PINNED ✓" : "PIN TO TODAY"}</button>
            </div>
            <div className={styles.copilotTitle}>{card.title}</div>
            {card.headline && <div className={styles.subtle}>{card.headline}</div>}
            {card.bars && <BarChart bars={card.bars} />}
            {card.rows?.map((row) => <div className={styles.dataRow} key={row.label}><span className={styles.dataLabel}>{row.label}</span><span>{row.value}</span></div>)}
            <div className={styles.sources}>{card.sources.map((source) => <span className={styles.sourceChip} key={source}>{source}</span>)}</div>
            {card.detail && <button className={styles.secondaryButton} type="button" onClick={() => openScreen("insight", id)}>Recent vs trend vs stable →</button>}
          </article>
        );
      })}
      <div className={styles.deferredInput} aria-disabled="true"><span>Ask about Jordan…</span><span className={styles.micro}>FREE TEXT DEFERRED · USE PROMPTS</span></div>
    </section>
  );
}

function BarChart({ bars }: { bars: { label: string; value: number }[] }) {
  const max = Math.max(...bars.map((bar) => bar.value));
  return <div className={styles.barChart}>{bars.map((bar, index) => <div className={styles.barColumn} key={`${bar.label}-${index}`}><div className={styles.barFill} style={{ height: `${Math.max(8, (bar.value / max) * 100)}%` }} /><div className={styles.barLabel}>{bar.label}</div></div>)}</div>;
}

function HistoryScreen({ state }: { state: DashboardState }) {
  return (
    <section className={`${styles.scroll} ${styles.stack}`} aria-label="History">
      <div><div className={styles.micro}>VERSION HISTORY</div><h1 className={styles.heroTitle}>Today’s workout trail</h1><div className={styles.subtle}>Content versions are immutable. Publication is recorded separately.</div></div>
      <div className={styles.timelineWrap}>
        <VersionTimeline versions={[...state.contentVersions].reverse().map((version) => ({
          title: `v${version.number} · ${version.title}`,
          meta: `${version.actor.toUpperCase()} · ${version.time}`,
          changes: version.changes,
          signal: version.kind === "generated",
          filled: version.kind !== "generated",
        }))} />
      </div>
      {state.publicationEvents.map((event) => <div className={styles.publicationCard} key={event.id}><div className={styles.micro}>LOCAL PUBLICATION EVENT · {event.time}</div><div className={styles.bodyStrong}>Exact {event.workoutVersionId.replace("workout-", "")} recorded for the fixture demo</div><div className={styles.bodyCopy}>Approved by {event.actor}. No external delivery or new content version occurred.</div></div>)}
      <div className={styles.sectionLabel}>RECENT SESSIONS</div>
      {fixture.history.map((workout) => <div className={styles.card} key={workout.date}><div className={styles.workoutTopline}><div className={styles.bodyStrong}>{workout.title}</div><span className={styles.statusPill}>{workout.completed ? "COMPLETED" : "MISSED"}</span></div><div className={styles.bodyCopy}>{workout.date} · {workout.completed ? `${workout.duration_min} min · RPE ${workout.rpe}` : "planned session"}</div></div>)}
    </section>
  );
}

function ScreenHeader({ title, kicker, onBack }: { title: string; kicker: string; onBack: () => void }) {
  return <header className={styles.screenHeader}><button className={styles.backButton} type="button" onClick={onBack} aria-label="Go back">←</button><div><h1 className={styles.screenTitle}>{title}</h1><div className={styles.micro}>{kicker}</div></div></header>;
}

function DetailScreen({ state, dispatch, currentVersion, published }: {
  state: DashboardState;
  dispatch: React.Dispatch<DashboardAction>;
  currentVersion: WorkoutVersion;
  published: boolean;
}) {
  const back = () => dispatch({ type: "close-screen" });
  if (state.screen === "profile") return <ProfileScreen onBack={back} dispatch={dispatch} />;
  if (state.screen === "decision-path") return <DecisionPathScreen state={state} onBack={back} />;
  if (state.screen === "insight") return <InsightScreen state={state} dispatch={dispatch} onBack={back} />;
  if (state.screen === "approve") return <ApproveScreen currentVersion={currentVersion} published={published} dispatch={dispatch} onBack={back} />;
  return null;
}

function ProfileScreen({ onBack, dispatch }: { onBack: () => void; dispatch: React.Dispatch<DashboardAction> }) {
  return <><ScreenHeader title={fixture.member.name} kicker="MEMBER PROFILE" onBack={onBack} /><section className={`${styles.scroll} ${styles.stack}`} aria-label="Profile">
    <div className={`${styles.card} ${styles.profileHero}`}><span className={styles.avatar}>{fixture.member.initials}</span><div><div className={styles.heroTitle}>{fixture.member.name}</div><div className={styles.micro}>{fixture.member.age} · {fixture.member.height} CM · {fixture.member.weight} KG</div><div className={styles.micro}>{fixture.member.tier} · SINCE {fixture.member.memberSince.slice(0, 7)}</div></div></div>
    <div className={styles.sectionLabel}>STATUS</div>
    <div className={styles.card}><div className={styles.workoutTopline}><div className={styles.bodyStrong}>Patellofemoral pain — {fixture.profile.injury.region}</div><span className={styles.statusPill}>{fixture.profile.injury.status}</span></div><div className={styles.bodyCopy}>{fixture.profile.injury.severity} · since May 10. {fixture.profile.injury.notes}</div><div className={styles.source}>INJURY REPORT · 05/10 · SNOMED CT SUBSET</div><button className={styles.secondaryButton} type="button" style={{ marginTop: 10 }} onClick={() => dispatch({ type: "open-screen", screen: "decision-path", decisionId: "split-squat" })}>What this changes today →</button></div>
    <div className={styles.sectionLabel}>GOALS</div>
    <div className={styles.card}>{fixture.profile.goals.map((goal) => <div className={styles.goalRow} key={goal.id}><span className={styles.micro}>P{goal.priority}</span><span>{goal.text}</span></div>)}</div>
    <div className={styles.sectionLabel}>PREFERENCES</div>
    <div className={styles.card}><div className={styles.bodyCopy}>{fixture.profile.preferences.preferred_session_minutes}-min sessions · {fixture.profile.preferences.training_days_per_week} days/wk · {fixture.profile.preferences.preferred_days.join(" ")}</div><div className={styles.bodyCopy}>{fixture.profile.preferences.notes}</div><div className={styles.chips}>{fixture.profile.preferences.dislikes.map((item) => <span className={styles.sourceChip} key={item}>NEVER · {item}</span>)}</div></div>
    <div className={styles.sectionLabel}>EQUIPMENT</div>
    <div className={styles.chips}>{fixture.profile.equipment.map((item) => <span className={styles.sourceChip} key={item}>{item}</span>)}</div>
  </section></>;
}

function DecisionPathScreen({ state, onBack }: { state: DashboardState; onBack: () => void }) {
  const path = fixture.decisionPaths[state.decisionId as keyof typeof fixture.decisionPaths] ?? fixture.decisionPaths["split-squat"];
  const overridden = state.contentVersions.some((version) => version.kind === "override");
  return <><ScreenHeader title="Decision path" kicker="GRAPH-TRAVERSED · SOURCE-BACKED" onBack={onBack} /><section className={`${styles.scroll} ${styles.stack}`} aria-label="Decision Path">
    <div className={styles.workoutTopline}><span className={styles.statusPill}>{path.kind}</span>{overridden && state.decisionId === "split-squat" && <span className={styles.versionPill}>COACH OVERRIDE · INK</span>}</div>
    {path.lanes.map((lane) => <div className={styles.lane} key={lane.name}><div className={styles.micro}>{lane.name}</div><div className={styles.bodyStrong}>{lane.text}</div><div className={styles.source}>{lane.source}</div></div>)}
    {overridden && state.decisionId === "split-squat" && <div className={styles.card}><div className={styles.bodyStrong}>Coach Sam retained this exercise</div><div className={styles.bodyCopy}>Human ownership is shown in ink. Signal marks only the retained graph provenance and warning.</div><span className={styles.signalKicker} style={{ marginTop: 10 }}>WARNING PROVENANCE RETAINED</span></div>}
    <div className={styles.subtle} style={{ textAlign: "center" }}>The same four lanes explain each selection, exclusion, substitution, override, and Copilot claim.</div>
  </section></>;
}

function InsightScreen({ state, dispatch, onBack }: { state: DashboardState; dispatch: React.Dispatch<DashboardAction>; onBack: () => void }) {
  const id = (state.detailId ?? "adherence") as InsightId;
  const card = fixture.copilotCards[id];
  const detail = card.detail;
  return <><ScreenHeader title={card.title} kicker={`${card.kicker} · INSIGHT DETAIL`} onBack={onBack} /><section className={`${styles.scroll} ${styles.stack}`} aria-label="Insight">
    <span className={styles.signalKicker}>COPILOT SYNTHESIS</span>
    {detail ? <div className={styles.detailGrid}>{(["recent", "trend", "stable", "action"] as const).map((key) => <div key={key}><div className={styles.micro}>{key}</div><div className={styles.bodyCopy}>{detail[key]}</div></div>)}</div> : <div className={styles.card}>{card.rows?.map((row) => <div className={styles.dataRow} key={row.label}><span className={styles.dataLabel}>{row.label}</span><span>{row.value}</span></div>)}</div>}
    <div className={styles.sources}>{card.sources.map((source) => <span className={styles.sourceChip} key={source}>{source}</span>)}</div>
    <button className={styles.secondaryButton} type="button" onClick={() => dispatch({ type: "toggle-pin", insightId: id })}>{state.pins.includes(id) ? "Remove pin from Today" : "Pin to Today"}</button>
  </section></>;
}

function ApproveScreen({ currentVersion, published, dispatch, onBack }: { currentVersion: WorkoutVersion; published: boolean; dispatch: React.Dispatch<DashboardAction>; onBack: () => void }) {
  return <><ScreenHeader title={`Approve v${currentVersion.number}`} kicker="FINAL CHECK BEFORE PUBLISH" onBack={onBack} /><section className={`${styles.scroll} ${styles.stack}`} aria-label="Approve">
    <div className={styles.card}><div className={styles.workoutTopline}><div className={styles.bodyStrong}>{currentVersion.durationMinutes}-min knee-safe strength</div><span className={styles.versionPill}>v{currentVersion.number}</span></div><div className={styles.bodyCopy}>{currentVersion.intensity} intensity · {currentVersion.splitSquatIncluded ? "1 override · reason on file · warning retained" : "No overrides · all constraints pass"}</div></div>
    <div className={styles.sectionLabel}>CHANGES IN THIS APPROVAL</div>
    <div className={styles.card}>{currentVersion.kind === "generated" ? <div className={styles.bodyCopy}>Original machine-generated, safety-checked draft.</div> : currentVersion.changes.map((change) => <div className={styles.bodyCopy} key={change}>· {change}</div>)}</div>
    <div className={styles.heroCard}><div className={styles.bodyCopy}>This fixture-only action records a local publication event for workout-v{currentVersion.number}. It does not send anything externally. Every prior draft, adjustment, and override stays in History.</div></div>
    <button className={styles.primaryButton} type="button" disabled={published} onClick={() => dispatch({ type: "publish-current-version" })}>{published ? "Already recorded" : `Approve & record v${currentVersion.number} locally`}</button>
    <div className={styles.subtle} style={{ textAlign: "center" }}>or go back to keep adjusting</div>
  </section></>;
}

function DashboardDialog({ state, dispatch }: { state: DashboardState; dispatch: React.Dispatch<DashboardAction> }) {
  if (state.dialog === "adjustment") return <div className={styles.dialogLayer} role="presentation"><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="adjust-title">
    <span className={styles.handle} /><div><div id="adjust-title" className={styles.screenTitle}>Adjust today’s workout</div><div className={styles.bodyCopy}>Guided controls create one new content version when applied.</div></div>
    <label><span className={styles.bodyStrong}>Duration · {state.draftDuration} min</span><input className={styles.range} aria-label="Workout duration" type="range" min="30" max="60" step="5" value={state.draftDuration} onChange={(event) => dispatch({ type: "set-draft-duration", duration: Number(event.target.value) })} /></label>
    <div><div className={styles.bodyStrong} style={{ marginBottom: 8 }}>Intensity</div><div className={styles.choiceRow}>{(["Light", "Moderate", "Hard"] as const).map((intensity) => <button className={`${styles.choice} ${state.draftIntensity === intensity ? styles.choiceActive : ""}`} type="button" key={intensity} onClick={() => dispatch({ type: "set-draft-intensity", intensity })}>{intensity}</button>)}</div></div>
    <div className={styles.actionRow}><button className={styles.secondaryButton} type="button" onClick={() => dispatch({ type: "cancel-dialog" })}>Cancel</button><button className={styles.primaryButton} type="button" onClick={() => dispatch({ type: "apply-adjustment" })}>Apply adjustment</button></div>
  </section></div>;

  return <div className={styles.dialogLayer} role="presentation"><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="override-title">
    <span className={styles.handle} /><div><div id="override-title" className={styles.screenTitle}>Override: Dumbbell Goblet Split Squat</div><div className={styles.bodyCopy}>Human coach ownership is recorded in ink. The graph warning remains attached.</div></div>
    <div className={styles.card}><div className={styles.bodyStrong}>! Deep knee flexion under load</div><div className={styles.bodyCopy}>Flagged for patellofemoral pain (left, recovering).</div><span className={styles.signalKicker} style={{ marginTop: 9 }}>SNOMED CT · WARNING PROVENANCE</span></div>
    <textarea className={styles.textarea} aria-label="Override reason" placeholder="Reason (required) — e.g. cleared by PT, light load only" value={state.overrideReasonDraft} onChange={(event) => dispatch({ type: "set-override-reason", reason: event.target.value })} />
    <div className={styles.actionRow}><button className={styles.secondaryButton} type="button" onClick={() => dispatch({ type: "cancel-dialog" })}>Cancel</button><button className={styles.primaryButton} type="button" disabled={state.overrideReasonDraft.trim().length < 4} onClick={() => dispatch({ type: "apply-override" })}>Override — keep warning</button></div>
  </section></div>;
}
