import { createContext, useContext } from "react";

// Dialogs must escape transformed/scrolling modal content without escaping the
// Operations ShadowRoot, whose styles are not available in document.body.
export const OperationsPortalTargetContext = createContext<
  HTMLElement | undefined
>(undefined);

export function useOperationsDialogPortalProps() {
  const target = useContext(OperationsPortalTargetContext);
  return { withinPortal: true, portalProps: target ? { target } : undefined };
}

function stopScrollPropagation(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

export function useOperationsComboboxProps(zIndex = 100001) {
  return {
    withinPortal: false,
    zIndex,
    style: {
      overscrollBehavior: "contain",
    },
    onWheelCapture: stopScrollPropagation,
    onTouchMoveCapture: stopScrollPropagation,
  };
}

export function useOperationsPopoverProps(zIndex = 100001) {
  return {
    withinPortal: false,
    zIndex,
  };
}
