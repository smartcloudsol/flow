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
