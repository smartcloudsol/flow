import {
  store as blockEditorStore,
  useBlockEditingMode,
} from "@wordpress/block-editor";
import { useDispatch, useSelect } from "@wordpress/data";
import { useEffect, useRef } from "@wordpress/element";

type BlockBinding = {
  source?: string;
  args?: Record<string, unknown>;
};

export type BlockMetadata = {
  name?: string;
  bindings?: Record<string, BlockBinding | undefined>;
};

type BlockEditorSelectors = {
  getBlockParentsByBlockName: (
    clientId: string,
    blockName: string | string[],
    ascending?: boolean,
  ) => string[];
  __unstableGetTemporarilyEditingAsBlocks?: () => string | undefined;
};

type BlockEditorDispatch = {
  __unstableSetTemporarilyEditingAsBlocks?: (clientId?: string | null) => void;
};

export function usePatternOverrideEditingSupport({
  clientId,
  isSelected,
  metadata,
}: {
  clientId: string;
  isSelected: boolean;
  metadata?: BlockMetadata;
}): void {
  const hasPatternOverrideBindings = Object.values(
    metadata?.bindings ?? {},
  ).some((binding) => binding?.source === "core/pattern-overrides");
  const isPatternOverrideInstance =
    typeof metadata?.name === "string" && metadata.name.length > 0;

  const { editedContentOnlySection, syncedPatternSectionClientId } = useSelect(
    (select) => {
      const blockEditorSelect = select(
        blockEditorStore,
      ) as unknown as BlockEditorSelectors;
      const syncedPatternParents = blockEditorSelect.getBlockParentsByBlockName(
        clientId,
        "core/block",
        true,
      );

      return {
        editedContentOnlySection:
          blockEditorSelect.__unstableGetTemporarilyEditingAsBlocks?.() ?? null,
        syncedPatternSectionClientId: syncedPatternParents[0] ?? null,
      };
    },
    [clientId],
  );

  const blockEditorDispatch = useDispatch(
    blockEditorStore,
  ) as unknown as BlockEditorDispatch;
  const wasSelectedRef = useRef(false);

  useBlockEditingMode(hasPatternOverrideBindings ? "default" : undefined);

  useEffect(() => {
    const didBecomeSelected = isSelected && !wasSelectedRef.current;
    wasSelectedRef.current = isSelected;

    if (
      !didBecomeSelected ||
      !isPatternOverrideInstance ||
      !hasPatternOverrideBindings ||
      !syncedPatternSectionClientId ||
      editedContentOnlySection === syncedPatternSectionClientId
    ) {
      return;
    }

    blockEditorDispatch.__unstableSetTemporarilyEditingAsBlocks?.(
      syncedPatternSectionClientId,
    );
  }, [
    blockEditorDispatch,
    editedContentOnlySection,
    hasPatternOverrideBindings,
    isPatternOverrideInstance,
    isSelected,
    syncedPatternSectionClientId,
  ]);
}
