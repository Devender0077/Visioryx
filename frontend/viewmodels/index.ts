/**
 * MVVM — ViewModels.
 *
 * A ViewModel is a React hook that:
 *  - Owns the *state* of one screen / feature (useState / useReducer).
 *  - Calls into Repositories for data.
 *  - Exposes pure, named actions and derived values for the View.
 *
 * Views (screens) never call repositories directly. They consume a single
 * `useXyzViewModel()` hook.
 */
export * from './useLoginViewModel';
export * from './useDashboardViewModel';
export * from './useAlertsViewModel';
