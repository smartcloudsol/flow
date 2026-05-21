import { useState } from "react";

interface CursorPaginationState {
  resetKey: unknown;
  currentCursor?: string;
  history: Array<string | null>;
}

function createCursorPaginationState(resetKey: unknown): CursorPaginationState {
  return {
    resetKey,
    currentCursor: undefined,
    history: [],
  };
}

function matchesResetKey(
  currentResetKey: unknown,
  nextResetKey: unknown,
): boolean {
  return Object.is(currentResetKey, nextResetKey);
}

export function useCursorPagination(resetKey: unknown) {
  const [state, setState] = useState<CursorPaginationState>(() =>
    createCursorPaginationState(resetKey),
  );

  const effectiveState = matchesResetKey(state.resetKey, resetKey)
    ? state
    : createCursorPaginationState(resetKey);

  return {
    currentCursor: effectiveState.currentCursor,
    hasPreviousPage: effectiveState.history.length > 0,
    goToNextPage(nextCursor?: string | null) {
      if (!nextCursor) {
        return;
      }

      setState((current) => {
        const currentState = matchesResetKey(current.resetKey, resetKey)
          ? current
          : createCursorPaginationState(resetKey);

        return {
          resetKey,
          currentCursor: nextCursor,
          history: [
            ...currentState.history,
            currentState.currentCursor ?? null,
          ],
        };
      });
    },
    goToPreviousPage() {
      setState((current) => {
        const currentState = matchesResetKey(current.resetKey, resetKey)
          ? current
          : createCursorPaginationState(resetKey);

        if (currentState.history.length === 0) {
          return currentState;
        }

        const previousCursor =
          currentState.history[currentState.history.length - 1];
        return {
          resetKey,
          currentCursor: previousCursor ?? undefined,
          history: currentState.history.slice(0, -1),
        };
      });
    },
  };
}
