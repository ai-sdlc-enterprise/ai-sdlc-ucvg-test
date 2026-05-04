/**
 * Public surface for the operator TUI data sources (RFC-0023 Phase 2 /
 * AISDLC-178.2).
 *
 * Each source module exposes a pure fetcher (testable without React) and
 * a React hook (`useEvents`, `useGhPrs`, `useDepSnapshot`,
 * `useOrchestratorStatus`, `useBacklogTasks`) consumer panes (Phases 3-6)
 * import directly. The uniform `SourceState<T>` shape lives in `./types.js`.
 */

export {
  EVENTS_BUFFER_CAP,
  EVENTS_POLL_INTERVAL_MS,
  readEventsTail,
  useEvents,
  type EventsTailReadResult,
  type ReadEventsTailOpts,
  type UseEventsOpts,
} from './events-tail.js';

export {
  fetchGhPrs,
  GH_PR_CACHE_TTL_MS,
  GH_PR_JSON_FIELDS,
  GH_PR_POLL_INTERVAL_MS,
  isFresh,
  makeEmptyCache,
  useGhPrs,
  type FetchGhPrsOpts,
  type FetchGhPrsResult,
  type GhPrCache,
  type GhPrSummary,
  type GhRunner,
  type UseGhPrsOpts,
  type UseGhPrsState,
} from './gh-pr-cache.js';

export {
  readLatestDepSnapshot,
  useDepSnapshot,
  type DepSnapshot,
  type ReadLatestDepSnapshotOpts,
  type ReadLatestDepSnapshotResult,
  type UseDepSnapshotOpts,
  type UseDepSnapshotState,
} from './dep-snapshot-reader.js';

export {
  fetchOrchestratorStatus,
  ORCHESTRATOR_STATUS_POLL_INTERVAL_MS,
  useOrchestratorStatus,
  type FetchOrchestratorStatusOpts,
  type FetchOrchestratorStatusResult,
  type UseOrchestratorStatusOpts,
} from './orchestrator-status.js';

export {
  BACKLOG_WALKER_POLL_INTERVAL_MS,
  parseTaskFrontmatter,
  readBacklogTasks,
  useBacklogTasks,
  type BacklogTask,
  type ReadBacklogTasksOpts,
  type ReadBacklogTasksResult,
  type UseBacklogTasksOpts,
} from './backlog-walker.js';

export {
  classifyFsError,
  resolveArtifactsDir,
  type SourceErrorKind,
  type SourceState,
} from './types.js';
