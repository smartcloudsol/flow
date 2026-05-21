interface CursorPaginationControlsProps {
    loadedCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    isLoading?: boolean;
    onPreviousPage: () => void;
    onNextPage: () => void;
}
export declare function CursorPaginationControls({ loadedCount, hasPreviousPage, hasNextPage, isLoading, onPreviousPage, onNextPage, }: CursorPaginationControlsProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=CursorPagination.d.ts.map