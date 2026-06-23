import { useCallback } from "react";

/**
 * Keyboard navigation for a vertical column/grid of result inputs
 * (e.g. the lab / pathology result-entry rows).
 *
 * Behaviour:
 *  - Enter / ArrowDown → focus the next field (down the column)
 *  - ArrowUp           → focus the previous field
 *  - ArrowLeft         → move the text cursor; only jump to the previous
 *                        field when the caret is already at the very start
 *  - ArrowRight        → move the text cursor; only jump to the next field
 *                        when the caret is already at the very end
 *  - Tab / Shift+Tab   → untouched (native browser behaviour)
 *
 * Disabled / read-only inputs are skipped. Navigation stops at the first /
 * last field (no wrap). Enter never submits the form — on the last field it
 * simply does nothing. On a successful jump the destination text is selected
 * so the user can overtype immediately.
 *
 * Usage: give every navigable input both `data-gridnav` and an `onKeyDown`
 * bound to the returned handler, and wrap them all in a common ancestor that
 * carries `data-gridnav-scope`. Fields are visited in DOM (top-to-bottom)
 * order, so it works across several tables inside the same scope.
 */
export function useGridNav() {
  return useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Leave modified key combos (Ctrl/Alt/Meta + key) to the browser.
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    const key = e.key;
    const target = e.currentTarget;

    // Work out which direction (if any) this keypress should move focus.
    let dir = 0;
    if (key === "Enter" || key === "ArrowDown") {
      dir = 1;
    } else if (key === "ArrowUp") {
      dir = -1;
    } else if (key === "ArrowLeft") {
      // Only navigate when the caret sits at the very start with no selection.
      const atStart = target.selectionStart === 0 && target.selectionEnd === 0;
      if (!atStart) return;
      dir = -1;
    } else if (key === "ArrowRight") {
      // Only navigate when the caret sits at the very end with no selection.
      const len = target.value.length;
      const atEnd = target.selectionStart === len && target.selectionEnd === len;
      if (!atEnd) return;
      dir = 1;
    } else {
      return;
    }

    const scope = target.closest<HTMLElement>("[data-gridnav-scope]");
    if (!scope) return;

    const fields = Array.from(
      scope.querySelectorAll<HTMLInputElement>("input[data-gridnav]")
    ).filter((el) => !el.disabled && !el.readOnly);

    const idx = fields.indexOf(target);
    if (idx === -1) return;

    const next = fields[idx + dir];

    if (!next) {
      // No neighbour: stop (don't wrap). Still block Enter from submitting.
      if (key === "Enter") e.preventDefault();
      return;
    }

    e.preventDefault();
    next.focus();
    next.select();
  }, []);
}
