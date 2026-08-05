"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";

import { SignalKicker } from "@/ui/axon/components/agentic/SignalKicker";
import { VersionTimeline } from "@/ui/axon/components/data/VersionTimeline";
import type { CoachDashboardViewModel, DashboardAdapter, DashboardDecisionId } from "./dashboard-contract";
import { fixtureDashboardAdapter } from "./fixture-adapter";
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

const DashboardViewModelContext = createContext<CoachDashboardViewModel | null>(null);

function useDashboardViewModel() {
  const viewModel = useContext(DashboardViewModelContext);
  if (!viewModel) throw new Error("Coach dashboard view model is unavailable.");
  return viewModel;
}

export function CoachDashboard({ adapter = fixtureDashboardAdapter }: { adapter?: DashboardAdapter }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialDashboardState);
  const [loadState, setLoadState] = useState(adapter.initialState);
  const [adapterAnnouncement, setAdapterAnnouncement] = useState("");
  const [isDesktop, setIsDesktop] = useState(false);
  const loadRequest = useRef(0);
  const promptTimer = useRef<number | null>(null);
  const adjustmentTimer = useRef<number | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const returnFocusKey = useRef<string | null>(null);
  const focusFrame = useRef<number | null>(null);
  const overlayWasOpen = useRef(false);
  const currentVersion = selectCurrentVersion(state);
  const published = selectIsPublished(state);
  const overlayOpen = Boolean(state.screen || state.dialog);

  const load = useCallback(async () => {
    const request = ++loadRequest.current;
    try {
      const next = await adapter.load();
      if (request !== loadRequest.current) return;
      setLoadState(next);
      setAdapterAnnouncement(
        next.status === "ready"
          ? "Dashboard data ready."
          : next.status === "empty" || next.status === "error"
            ? next.message
            : "Loading dashboard data.",
      );
    } catch {
      if (request !== loadRequest.current) return;
      setLoadState({ status: "error", message: "Dashboard data could not be loaded.", retryable: true });
      setAdapterAnnouncement("Dashboard data could not be loaded.");
    }
  }, [adapter]);

  const captureReturnFocus = () => {
    if (!(document.activeElement instanceof HTMLElement)) return;
    returnFocus.current = document.activeElement;
    returnFocusKey.current = document.activeElement.closest<HTMLElement>("[data-focus-key]")?.dataset.focusKey ?? null;
  };

  const openScreen = (screen: Exclude<DashboardScreen, "decision-path">, detailId?: string) => {
    captureReturnFocus();
    dispatch({ type: "open-screen", screen, detailId });
  };

  const openDecisionPath = (decisionId: DashboardDecisionId) => {
    captureReturnFocus();
    dispatch({ type: "open-screen", screen: "decision-path", decisionId });
  };

  const openDialog = (action: DashboardAction) => {
    captureReturnFocus();
    dispatch(action);
  };

  const requestAdjustment = () => {
    if (adjustmentTimer.current !== null || state.pendingAdjustment) return;
    dispatch({ type: "request-adjustment" });
    adjustmentTimer.current = window.setTimeout(() => {
      const actor = loadState.status === "ready" ? loadState.data.coach.name : "Coach";
      dispatch({ type: "complete-adjustment", actor });
      adjustmentTimer.current = null;
    }, 500);
  };

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
    if (adjustmentTimer.current !== null) window.clearTimeout(adjustmentTimer.current);
    if (focusFrame.current !== null) window.cancelAnimationFrame(focusFrame.current);
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
      loadRequest.current += 1;
    };
  }, [load]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    if (overlayOpen && !overlayWasOpen.current && document.activeElement instanceof HTMLElement) {
      returnFocus.current ??= document.activeElement;
      returnFocusKey.current ??= document.activeElement.closest<HTMLElement>("[data-focus-key]")?.dataset.focusKey ?? null;
    }
    if (!overlayOpen && overlayWasOpen.current) {
      if (focusFrame.current !== null) window.cancelAnimationFrame(focusFrame.current);
      focusFrame.current = window.requestAnimationFrame(() => {
        const original = returnFocus.current;
        const key = returnFocusKey.current;
        const equivalent = key
          ? document.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(key)}"]`)
          : null;
        (original?.isConnected ? original : equivalent)?.focus();
        focusFrame.current = null;
        returnFocus.current = null;
        returnFocusKey.current = null;
      });
    }
    overlayWasOpen.current = overlayOpen;
  }, [overlayOpen]);

  if (loadState.status !== "ready") {
    return (
      <main className={styles.desk}>
        <div className={`${styles.app} ${styles.loadPanel}`} data-testid="coach-dashboard">
          <div className={styles.micro}>COACH DASHBOARD</div>
          <h1 className={styles.heroTitle}>
            {loadState.status === "loading" ? "Loading member context…" : loadState.message}
          </h1>
          {loadState.status === "error" && loadState.retryable && (
            <button className={styles.secondaryButton} type="button" onClick={() => {
              setLoadState({ status: "loading" });
              setAdapterAnnouncement("Loading dashboard data.");
              void load();
            }}>Try again</button>
          )}
          <div className={styles.srOnly} role="status" aria-live="polite">{adapterAnnouncement}</div>
        </div>
      </main>
    );
  }

  return (
    <DashboardViewModelContext.Provider value={loadState.data}>
      <main className={styles.desk}>
        <div className={styles.app} data-testid="coach-dashboard">
          {isDesktop ? (
          <div className={styles.desktopLayout} data-testid="desktop-dashboard">
            <aside role="region" className={`${styles.desktopRail} ${styles.contextRail}`} aria-label="Today and member context">
              <MemberHeader onOpenProfile={() => openScreen("profile")} />
              <DesktopContextRail state={state} dispatch={dispatch} adapter={adapter} reload={load} setAnnouncement={setAdapterAnnouncement} />
            </aside>
            <section className={`${styles.desktopRail} ${styles.workflowRail}`} aria-label="Active workflow">
              {state.tab === "today" ? (
                <TodayScreen state={state} currentVersion={currentVersion} published={published} dispatch={dispatch} ask={ask} openScreen={openScreen} />
              ) : (
                <WorkoutScreen currentVersion={currentVersion} published={published} openScreen={openScreen} openDecisionPath={openDecisionPath} openDialog={openDialog} />
              )}
            </section>
            <aside className={`${styles.desktopRail} ${styles.detailRail}`} aria-label="Copilot and history details">
              {state.screen ? (
                <DetailScreen state={state} dispatch={dispatch} currentVersion={currentVersion} published={published} />
              ) : state.tab === "history" ? (
                <HistoryScreen state={state} />
              ) : (
                <CopilotScreen state={state} dispatch={dispatch} ask={ask} openScreen={openScreen} />
              )}
            </aside>
          </div>
          ) : (
          <div className={styles.mobileLayout}>
            {state.screen ? (
              <DetailScreen state={state} dispatch={dispatch} currentVersion={currentVersion} published={published} />
            ) : (
              <>
                <MemberHeader onOpenProfile={() => openScreen("profile")} />
                {state.tab === "today" && (
                  <TodayScreen state={state} currentVersion={currentVersion} published={published} dispatch={dispatch} ask={ask} openScreen={openScreen} />
                )}
                {state.tab === "workout" && (
                  <WorkoutScreen currentVersion={currentVersion} published={published} openScreen={openScreen} openDecisionPath={openDecisionPath} openDialog={openDialog} />
                )}
                {state.tab === "copilot" && (
                  <CopilotScreen state={state} dispatch={dispatch} ask={ask} openScreen={openScreen} />
                )}
                {state.tab === "history" && <HistoryScreen state={state} />}
                <DashboardNavigation state={state} dispatch={dispatch} />
              </>
            )}
          </div>
          )}
          <div className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
            {state.announcement} {adapterAnnouncement}
          </div>
          {state.dialog && <DashboardDialog state={state} dispatch={dispatch} onRequestAdjustment={requestAdjustment} />}
        </div>
      </main>
    </DashboardViewModelContext.Provider>
  );
}

function DashboardNavigation({ state, dispatch }: { state: DashboardState; dispatch: React.Dispatch<DashboardAction> }) {
  return <nav className={styles.tabs} aria-label="Dashboard sections">
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
  </nav>;
}

function DesktopContextRail({ state, dispatch, adapter, reload, setAnnouncement }: {
  state: DashboardState;
  dispatch: React.Dispatch<DashboardAction>;
  adapter: DashboardAdapter;
  reload: () => Promise<void>;
  setAnnouncement: (message: string) => void;
}) {
  const fixture = useDashboardViewModel();
  const capability = adapter.capabilities.startNewDraft;
  const [isStartingDraft, setIsStartingDraft] = useState(false);
  const startingDraft = useRef(false);
  const startNewDraft = async () => {
    if (!capability.available || startingDraft.current) return;
    startingDraft.current = true;
    setIsStartingDraft(true);
    setAnnouncement("Starting a new draft…");
    try {
      const result = await capability.startNewDraft({ memberId: fixture.member.id, requestedBy: fixture.coach.name });
      await reload();
      setAnnouncement(`New draft ${result.draftId} started.`);
    } catch {
      setAnnouncement("A new draft could not be started.");
    } finally {
      startingDraft.current = false;
      setIsStartingDraft(false);
    }
  };

  return <div className={`${styles.scroll} ${styles.contextStack}`}>
    <DashboardNavigation state={state} dispatch={dispatch} />
    <div className={styles.sectionLabel}>TODAY AT A GLANCE</div>
    <div className={styles.metrics}>
      <div className={styles.metric}><strong>{fixture.metrics.adherence}</strong><div className={styles.micro}>ADHERENCE</div></div>
      <div className={styles.metric}><strong>{fixture.metrics.sleep}</strong><div className={styles.micro}>SLEEP AVG</div></div>
      <div className={styles.metric}><strong>{fixture.metrics.restingHeartRate}</strong><div className={styles.micro}>RESTING HR</div></div>
    </div>
    <div className={styles.card}>
      <div className={styles.micro}>CELEBRATE</div>
      <div className={styles.bodyStrong}>{fixture.morningBrief.celebrationTitle}</div>
      <div className={styles.bodyCopy}>{fixture.morningBrief.celebration}</div>
    </div>
    <div className={styles.card}>
      <div className={styles.micro}>WATCH</div>
      <div className={styles.bodyStrong}>{fixture.morningBrief.riskTitle}</div>
      <div className={styles.bodyCopy}>{fixture.morningBrief.risk}</div>
    </div>
    {capability.available ? (
      <button className={styles.primaryButton} type="button" disabled={isStartingDraft} aria-busy={isStartingDraft} onClick={() => void startNewDraft()}>{isStartingDraft ? "Starting new draft…" : "Start new draft"}</button>
    ) : (
      <div className={styles.capabilityNote} aria-label="New draft unavailable">{capability.reason}</div>
    )}
  </div>;
}

function MemberHeader({ onOpenProfile }: { onOpenProfile: () => void }) {
  const fixture = useDashboardViewModel();
  return (
    <header className={styles.memberHeader}>
      <button className={styles.memberButton} type="button" data-focus-key="member-profile" onClick={onOpenProfile} aria-label={`Open ${fixture.member.name} profile`}>
        <span className={styles.avatar} aria-hidden="true">{fixture.member.initials}</span>
        <span>
          <span className={styles.memberName}>{fixture.member.name} <span aria-hidden="true">›</span></span>
          <span className={styles.micro}>{fixture.member.tier} · {fixture.member.trainingDaysPerWeek} days/wk</span>
        </span>
      </button>
      <div className={styles.date}>{fixture.asOfDate.weekday}<br />{fixture.asOfDate.monthDay}</div>
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
  openScreen: (screen: Exclude<DashboardScreen, "decision-path">, detailId?: string) => void;
}) {
  const fixture = useDashboardViewModel();
  return (
    <section className={`${styles.scroll} ${styles.stack}`} aria-label="Today">
      <button className={styles.heroCard} type="button" onClick={() => dispatch({ type: "select-tab", tab: "workout" })} style={{ textAlign: "left", cursor: "pointer" }}>
        <div className={styles.micro}>{published ? "PUBLISHED ✓" : "TODAY’S DRAFT · READY"}</div>
        <h1 className={styles.heroTitle}>{published ? "Local publication recorded" : `${currentVersion.durationMinutes}-min ${fixture.workoutTitle}`}</h1>
        <div className={styles.subtle}>{published ? `Exact approved v${currentVersion.number} · history retained` : `3 constraint decisions · warm-up to cool-down sized to ${currentVersion.durationMinutes} min`}</div>
        <span className={styles.heroAction}>{published ? "View published workout →" : "Review & approve →"}</span>
      </button>

      {state.pins.map((id) => (
        <button key={id} className={styles.card} type="button" data-focus-key={`insight-${id}`} onClick={() => openScreen("insight", id)} style={{ textAlign: "left", cursor: "pointer" }}>
          <div className={styles.micro}>PINNED · COPILOT</div>
          <div className={styles.bodyStrong}>{fixture.copilotCards[id].title} →</div>
        </button>
      ))}

      <div className={styles.sectionLabel}>MORNING BRIEF</div>
      <div className={styles.card}>
        <div className={styles.briefRow}>
          <span className={styles.inkIcon}>✓</span>
          <div><div className={styles.bodyStrong}>{fixture.morningBrief.celebrationTitle}</div><div className={styles.bodyCopy}>{fixture.morningBrief.celebrationSummary}</div></div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.briefRow}>
          <span className={styles.inkIcon}>!</span>
          <div><div className={styles.bodyStrong}>{fixture.morningBrief.riskTitle}</div><div className={styles.bodyCopy}>{fixture.morningBrief.riskSummary}</div></div>
        </div>
        <div className={styles.sparkBars} role="img" aria-label="Adherence declined from 100 to 50 percent">
          {[90, 90, 66, 44].map((height, index) => <span key={index} style={{ height: `${height}%`, opacity: index === 3 ? 1 : 0.18 }} />)}
        </div>
        <button className={styles.secondaryButton} type="button" onClick={() => { dispatch({ type: "select-tab", tab: "copilot" }); ask("churn"); }}>Ask Copilot about churn →</button>
      </div>
      <div className={styles.card}>
        <div className={styles.micro}>PENDING · 2</div>
        <div className={styles.pendingRows}>
          <div><div className={styles.bodyStrong}>Reply to {fixture.member.name}’s check-in</div><div className={styles.bodyCopy}>“{fixture.morningBrief.memberMessage}” · {fixture.morningBrief.memberMessageDate}</div></div>
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

function WorkoutScreen({ currentVersion, published, openScreen, openDecisionPath, openDialog }: {
  currentVersion: WorkoutVersion;
  published: boolean;
  openScreen: (screen: Exclude<DashboardScreen, "decision-path">, detailId?: string) => void;
  openDecisionPath: (decisionId: DashboardDecisionId) => void;
  openDialog: (action: DashboardAction) => void;
}) {
  const fixture = useDashboardViewModel();
  const sections = fixture.workoutSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => !(item.id === "bench-press" && currentVersion.durationMinutes <= 40)),
  }));
  const overriddenExclusion = currentVersion.overrideDecisionId
    ? fixture.exclusions.find((item) => item.decisionId === currentVersion.overrideDecisionId)
    : null;
  if (overriddenExclusion) {
    sections[1] = {
      ...sections[1],
      items: [...sections[1].items, {
        ...overriddenExclusion,
        name: overriddenExclusion.catalogName,
        why: `Included by ${fixture.coach.name}. Warning retained. Reason: “${currentVersion.overrideReason}”`,
        provenance: `PROV-O · OVERRIDE · ${fixture.coach.name.toUpperCase()}`,
      }],
    };
  }

  return (
    <section className={`${styles.scroll} ${styles.stack}`} aria-label="Workout">
      <div className={styles.workoutTopline}>
        <div><div className={styles.micro}>{published ? "PUBLISHED WORKOUT" : "TODAY’S WORKOUT"}</div><h1 className={styles.heroTitle}>{currentVersion.durationMinutes}-min {fixture.workoutTitle}</h1></div>
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
                {item.decisionId && <button className={styles.pillButton} type="button" data-focus-key={`decision-${item.decisionId}`} onClick={() => openDecisionPath(item.decisionId!)} style={{ marginTop: 10 }}>Decision path →</button>}
              </div>
            </details>
          ))}
        </div>
      ))}

      <div className={styles.sectionLabel}>EXCLUSIONS</div>
      <div className={styles.card}>
        {fixture.exclusions.filter((item) => item.decisionId !== currentVersion.overrideDecisionId).map((item) => (
          <div className={styles.exclusion} key={item.id}>
            <div className={styles.bodyStrong}>{item.catalogName}</div>
            <div className={styles.bodyCopy}>{item.reason}</div>
            <div className={styles.exclusionActions}>
              <button className={styles.pillButton} type="button" data-focus-key={`decision-${item.decisionId}`} onClick={() => openDecisionPath(item.decisionId)}>Decision path →</button>
              {item.overridable && !published && <button className={styles.pillButton} type="button" data-focus-key={`override-${item.decisionId}`} onClick={() => openDialog({ type: "open-override", decisionId: item.decisionId })}>Override</button>}
            </div>
          </div>
        ))}
      </div>

      {published ? (
        <div className={styles.publishedBanner}>✓ Local publication recorded for exact v{currentVersion.number} · no external delivery</div>
      ) : (
        <div className={styles.actionRow}>
          <button className={styles.secondaryButton} type="button" data-focus-key="adjust-workout" onClick={() => openDialog({ type: "open-adjustment" })}>Adjust</button>
          <button className={styles.primaryButton} type="button" data-focus-key="approve-workout" onClick={() => openScreen("approve")}>Approve & record locally</button>
        </div>
      )}
    </section>
  );
}

function CopilotScreen({ state, dispatch, ask, openScreen }: {
  state: DashboardState;
  dispatch: React.Dispatch<DashboardAction>;
  ask: (id: QuickPromptId) => void;
  openScreen: (screen: Exclude<DashboardScreen, "decision-path">, detailId?: string) => void;
}) {
  const fixture = useDashboardViewModel();
  return (
    <section className={`${styles.scroll} ${styles.stack}`} aria-label="Copilot">
      <div><div className={styles.micro}>COPILOT · FIXTURE DEMO</div><h1 className={styles.heroTitle}>Member context, ready to act on</h1></div>
      <div className={styles.promptRow} aria-label="Copilot quick prompts">
        {prompts.map((prompt) => <button className={styles.pillButton} type="button" key={prompt.id} onClick={() => ask(prompt.id)}>{prompt.label}</button>)}
      </div>
      {state.pendingPrompt && <div className={styles.card}><SignalKicker data-testid="copilot-motion-signal" working>Retrieving member context…</SignalKicker></div>}
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
            {card.bars && <BarChart label={card.kicker} bars={card.bars} />}
            {card.rows?.map((row) => <div className={styles.dataRow} key={row.label}><span className={styles.dataLabel}>{row.label}</span><span>{row.value}</span></div>)}
            <div className={styles.sources}>{card.sources.map((source) => <span className={styles.sourceChip} key={source}>{source}</span>)}</div>
            {card.detail && <button className={styles.secondaryButton} type="button" data-focus-key={`insight-${id}`} onClick={() => openScreen("insight", id)}>Recent vs trend vs stable →</button>}
          </article>
        );
      })}
      <div className={styles.deferredInput} aria-disabled="true"><span>Ask about {fixture.member.name}…</span><span className={styles.micro}>FREE TEXT DEFERRED · USE PROMPTS</span></div>
    </section>
  );
}

function BarChart({ label, bars }: { label: string; bars: { label: string; value: number; displayValue: string }[] }) {
  const max = Math.max(...bars.map((bar) => bar.value));
  const summary = `${label[0].toUpperCase()}${label.slice(1).toLowerCase()} chart: ${bars.map((bar) => `${bar.label} ${bar.displayValue}`).join(", ")}`;
  return <div className={styles.barChart} role="img" aria-label={summary}>{bars.map((bar, index) => <div aria-hidden="true" className={styles.barColumn} key={`${bar.label}-${index}`}><div className={styles.barFill} style={{ height: `${Math.max(8, (bar.value / max) * 100)}%` }} /><div className={styles.barLabel}>{bar.label}</div></div>)}</div>;
}

function HistoryScreen({ state }: { state: DashboardState }) {
  const fixture = useDashboardViewModel();
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
  const fixture = useDashboardViewModel();
  const injuryDecision = fixture.exclusions.find((item) => item.overridable);
  return <><ScreenHeader title={fixture.member.name} kicker="MEMBER PROFILE" onBack={onBack} /><section className={`${styles.scroll} ${styles.stack}`} aria-label="Profile">
    <div className={`${styles.card} ${styles.profileHero}`}><span className={styles.avatar}>{fixture.member.initials}</span><div><div className={styles.heroTitle}>{fixture.member.name}</div><div className={styles.micro}>{fixture.member.age} · {fixture.member.height} CM · {fixture.member.weight} KG</div><div className={styles.micro}>{fixture.member.tier} · SINCE {fixture.member.memberSince.slice(0, 7)}</div></div></div>
    <div className={styles.sectionLabel}>STATUS</div>
    <div className={styles.card}><div className={styles.workoutTopline}><div className={styles.bodyStrong}>{fixture.profile.injury.displayName} — {fixture.profile.injury.region}</div><span className={styles.statusPill}>{fixture.profile.injury.status}</span></div><div className={styles.bodyCopy}>{fixture.profile.injury.severity} · since {fixture.profile.injury.sinceLabel}. {fixture.profile.injury.notes}</div><div className={styles.source}>{fixture.profile.injury.sourceLabel}</div>{injuryDecision && <button className={styles.secondaryButton} type="button" data-focus-key={`decision-${injuryDecision.decisionId}`} style={{ marginTop: 10 }} onClick={() => dispatch({ type: "open-screen", screen: "decision-path", decisionId: injuryDecision.decisionId })}>What this changes today →</button>}</div>
    <div className={styles.sectionLabel}>GOALS</div>
    <div className={styles.card}>{fixture.profile.goals.map((goal) => <div className={styles.goalRow} key={goal.id}><span className={styles.micro}>P{goal.priority}</span><span>{goal.text}</span></div>)}</div>
    <div className={styles.sectionLabel}>PREFERENCES</div>
    <div className={styles.card}><div className={styles.bodyCopy}>{fixture.profile.preferences.preferred_session_minutes}-min sessions · {fixture.profile.preferences.training_days_per_week} days/wk · {fixture.profile.preferences.preferred_days.join(" ")}</div><div className={styles.bodyCopy}>{fixture.profile.preferences.notes}</div><div className={styles.chips}>{fixture.profile.preferences.dislikes.map((item) => <span className={styles.sourceChip} key={item}>NEVER · {item}</span>)}</div></div>
    <div className={styles.sectionLabel}>EQUIPMENT</div>
    <div className={styles.chips}>{fixture.profile.equipment.map((item) => <span className={styles.sourceChip} key={item}>{item}</span>)}</div>
  </section></>;
}

function DecisionPathScreen({ state, onBack }: { state: DashboardState; onBack: () => void }) {
  const fixture = useDashboardViewModel();
  const path = state.decisionId ? fixture.decisionPaths[state.decisionId] : undefined;
  if (!path) return <><ScreenHeader title="Decision path unavailable" kicker="SOURCE DATA UNAVAILABLE" onBack={onBack} /><section className={`${styles.scroll} ${styles.stack}`} aria-label="Decision Path"><div className={styles.card}><div className={styles.bodyStrong}>This decision path is unavailable.</div><div className={styles.bodyCopy}>The selected item does not include a matching source-backed decision identifier.</div></div></section></>;
  const overridden = state.contentVersions.some((version) => version.kind === "override" && version.overrideDecisionId === state.decisionId);
  return <><ScreenHeader title="Decision path" kicker="GRAPH-TRAVERSED · SOURCE-BACKED" onBack={onBack} /><section className={`${styles.scroll} ${styles.stack}`} aria-label="Decision Path">
    <div className={styles.workoutTopline}><span className={styles.statusPill}>{path.kind}</span>{overridden && <span className={styles.versionPill}>COACH OVERRIDE · INK</span>}</div>
    {path.lanes.map((lane) => <div className={styles.lane} key={lane.name}><div className={styles.micro}>{lane.name}</div><div className={styles.bodyStrong}>{lane.text}</div><div className={styles.source}>{lane.source}</div></div>)}
    {overridden && <div className={styles.card}><div className={styles.bodyStrong}>{fixture.coach.name} retained this exercise</div><div className={styles.bodyCopy}>Human ownership is shown in ink. Signal marks only the retained graph provenance and warning.</div><span className={styles.signalKicker} style={{ marginTop: 10 }}>WARNING PROVENANCE RETAINED</span></div>}
    <div className={styles.subtle} style={{ textAlign: "center" }}>The same four lanes explain each selection, exclusion, substitution, override, and Copilot claim.</div>
  </section></>;
}

function InsightScreen({ state, dispatch, onBack }: { state: DashboardState; dispatch: React.Dispatch<DashboardAction>; onBack: () => void }) {
  const fixture = useDashboardViewModel();
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
  const fixture = useDashboardViewModel();
  return <><ScreenHeader title={`Approve v${currentVersion.number}`} kicker="FINAL CHECK BEFORE PUBLISH" onBack={onBack} /><section className={`${styles.scroll} ${styles.stack}`} aria-label="Approve">
    <div className={styles.card}><div className={styles.workoutTopline}><div className={styles.bodyStrong}>{currentVersion.durationMinutes}-min {fixture.workoutTitle}</div><span className={styles.versionPill}>v{currentVersion.number}</span></div><div className={styles.bodyCopy}>{currentVersion.intensity} intensity · {currentVersion.overrideDecisionId ? "1 override · reason on file · warning retained" : "No overrides · all constraints pass"}</div></div>
    <div className={styles.sectionLabel}>CHANGES IN THIS APPROVAL</div>
    <div className={styles.card}>{currentVersion.kind === "generated" ? <div className={styles.bodyCopy}>Original machine-generated, safety-checked draft.</div> : currentVersion.changes.map((change) => <div className={styles.bodyCopy} key={change}>· {change}</div>)}</div>
    <div className={styles.heroCard}><div className={styles.bodyCopy}>This fixture-only action records a local publication event for workout-v{currentVersion.number}. It does not send anything externally. Every prior draft, adjustment, and override stays in History.</div></div>
    <button className={styles.primaryButton} type="button" disabled={published} onClick={() => dispatch({ type: "publish-current-version", actor: fixture.coach.name })}>{published ? "Already recorded" : `Approve & record v${currentVersion.number} locally`}</button>
    <div className={styles.subtle} style={{ textAlign: "center" }}>or go back to keep adjusting</div>
  </section></>;
}

function DashboardDialog({ state, dispatch, onRequestAdjustment }: {
  state: DashboardState;
  dispatch: React.Dispatch<DashboardAction>;
  onRequestAdjustment: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const fixture = useDashboardViewModel();
  const overrideItem = state.overrideDecisionIdDraft
    ? fixture.exclusions.find((item) => item.decisionId === state.overrideDecisionIdDraft)
    : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>("input, textarea, button:not([disabled])");
    focusable?.focus();
  }, [state.dialog]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!state.pendingAdjustment) dispatch({ type: "cancel-dialog" });
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("input, textarea, button:not([disabled])")];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (state.dialog === "adjustment") return <div className={styles.dialogLayer} role="presentation"><section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="adjust-title" onKeyDown={onKeyDown}>
    <span className={styles.handle} /><div><div id="adjust-title" className={styles.screenTitle}>Adjust today’s workout</div><div className={styles.bodyCopy}>Guided controls create one new content version when applied.</div></div>
    <label><span className={styles.bodyStrong}>Duration · {state.draftDuration} min</span><input className={styles.range} aria-label="Workout duration" type="range" min="30" max="60" step="5" disabled={state.pendingAdjustment} value={state.draftDuration} onChange={(event) => dispatch({ type: "set-draft-duration", duration: Number(event.target.value) })} /></label>
    <div><div className={styles.bodyStrong} style={{ marginBottom: 8 }}>Intensity</div><div className={styles.choiceRow}>{(["Light", "Moderate", "Hard"] as const).map((intensity) => <button className={`${styles.choice} ${state.draftIntensity === intensity ? styles.choiceActive : ""}`} type="button" disabled={state.pendingAdjustment} key={intensity} onClick={() => dispatch({ type: "set-draft-intensity", intensity })}>{intensity}</button>)}</div></div>
    <div className={styles.actionRow}><button className={styles.secondaryButton} type="button" disabled={state.pendingAdjustment} onClick={() => dispatch({ type: "cancel-dialog" })}>Cancel</button><button className={styles.primaryButton} type="button" disabled={state.pendingAdjustment} aria-busy={state.pendingAdjustment} onClick={onRequestAdjustment}>{state.pendingAdjustment ? "Applying adjustment…" : "Apply adjustment"}</button></div>
  </section></div>;

  return <div className={styles.dialogLayer} role="presentation"><section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="override-title" onKeyDown={onKeyDown}>
    <span className={styles.handle} /><div><div id="override-title" className={styles.screenTitle}>Override: {overrideItem?.catalogName ?? "Unavailable decision"}</div><div className={styles.bodyCopy}>Human coach ownership is recorded in ink. The graph warning remains attached.</div></div>
    {overrideItem ? <div className={styles.card}><div className={styles.bodyStrong}>! {overrideItem.reason}</div><div className={styles.bodyCopy}>Flagged for {fixture.profile.injury.displayName.toLowerCase()} ({fixture.profile.injury.region}, {fixture.profile.injury.status}).</div><span className={styles.signalKicker} style={{ marginTop: 9 }}>{fixture.profile.injury.sourceLabel}</span></div> : <div className={styles.card}><div className={styles.bodyStrong}>Override unavailable</div><div className={styles.bodyCopy}>No matching source-backed decision was provided.</div></div>}
    <textarea className={styles.textarea} aria-label="Override reason" placeholder="Reason (required) — e.g. cleared by PT, light load only" value={state.overrideReasonDraft} onChange={(event) => dispatch({ type: "set-override-reason", reason: event.target.value })} />
    <div className={styles.actionRow}><button className={styles.secondaryButton} type="button" onClick={() => dispatch({ type: "cancel-dialog" })}>Cancel</button><button className={styles.primaryButton} type="button" disabled={!overrideItem || state.overrideReasonDraft.trim().length < 4} onClick={() => overrideItem && dispatch({ type: "apply-override", actor: fixture.coach.name, exerciseName: overrideItem.catalogName, warning: overrideItem.reason })}>Override — keep warning</button></div>
  </section></div>;
}
