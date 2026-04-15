declare function stopScrollPropagation(event: {
    stopPropagation: () => void;
}): void;
export declare function useOperationsComboboxProps(zIndex?: number): {
    withinPortal: boolean;
    zIndex: number;
    style: {
        overscrollBehavior: string;
    };
    onWheelCapture: typeof stopScrollPropagation;
    onTouchMoveCapture: typeof stopScrollPropagation;
};
export declare function useOperationsPopoverProps(zIndex?: number): {
    withinPortal: boolean;
    zIndex: number;
};
export {};
//# sourceMappingURL=OperationsPortalContext.d.ts.map