import { store as blockEditorStore } from "@wordpress/block-editor";
import { useSelect } from "@wordpress/data";

type BlockEditorSelectors = {
  getBlockParents: (clientId: string, ascending?: boolean) => string[];
  getBlock: (clientId: string) => { name?: string } | undefined;
};

export const CONTENT_ROOT_CHILD_BLOCKS = [
  "smartcloud-flow/title",
  "smartcloud-flow/blockquote",
  "smartcloud-flow/mark",
  "smartcloud-flow/badge",
  "smartcloud-flow/highlight",
  "smartcloud-flow/code",
  "smartcloud-flow/number-formatter",
  "smartcloud-flow/spoiler",
  "smartcloud-flow/image",
  "smartcloud-flow/text",
  "smartcloud-flow/list",
  "smartcloud-flow/table",
  "smartcloud-flow/timeline",
  "smartcloud-flow/overflow-list",
  "smartcloud-flow/divider",
  "smartcloud-flow/visually-hidden",
  "smartcloud-flow/stack",
  "smartcloud-flow/group",
  "smartcloud-flow/grid",
  "smartcloud-flow/fieldset",
  "smartcloud-flow/collapse",
] as const;

export const LIST_CHILD_BLOCKS = ["smartcloud-flow/list-item"] as const;

export const LIST_ITEM_CHILD_BLOCKS = CONTENT_ROOT_CHILD_BLOCKS;

export const TABLE_CHILD_BLOCKS = ["smartcloud-flow/table-tr"] as const;

export const TABLE_ROW_CHILD_BLOCKS = [
  "smartcloud-flow/table-th",
  "smartcloud-flow/table-td",
] as const;

export const TABLE_CELL_CHILD_BLOCKS = CONTENT_ROOT_CHILD_BLOCKS;

export const TIMELINE_CHILD_BLOCKS = ["smartcloud-flow/timeline-item"] as const;

export const TIMELINE_ITEM_CHILD_BLOCKS = CONTENT_ROOT_CHILD_BLOCKS;

export const OVERFLOW_LIST_CHILD_BLOCKS = [
  "smartcloud-flow/overflow-list-item",
] as const;

export const OVERFLOW_LIST_ITEM_CHILD_BLOCKS = CONTENT_ROOT_CHILD_BLOCKS;

export const FORM_CHILD_BLOCKS = [
  ...CONTENT_ROOT_CHILD_BLOCKS,
  "smartcloud-flow/text-field",
  "smartcloud-flow/textarea-field",
  "smartcloud-flow/select-field",
  "smartcloud-flow/checkbox-field",
  "smartcloud-flow/checkbox-group-field",
  "smartcloud-flow/date-field",
  "smartcloud-flow/switch-field",
  "smartcloud-flow/number-field",
  "smartcloud-flow/radio-field",
  "smartcloud-flow/password-field",
  "smartcloud-flow/pin-field",
  "smartcloud-flow/color-field",
  "smartcloud-flow/file-field",
  "smartcloud-flow/slider-field",
  "smartcloud-flow/range-slider-field",
  "smartcloud-flow/tags-field",
  "smartcloud-flow/rating-field",
  "smartcloud-flow/hidden-field",
  "smartcloud-flow/save-draft-button",
  "smartcloud-flow/ai-suggestions",
  "smartcloud-flow/submit-button",
  "smartcloud-flow/fieldset",
  "smartcloud-flow/collapse",
  "smartcloud-flow/divider",
  "smartcloud-flow/visually-hidden",
  "smartcloud-flow/stack",
  "smartcloud-flow/group",
  "smartcloud-flow/grid",
  "smartcloud-flow/wizard",
] as const;

export function useNestedFlowChildBlocks(clientId: string) {
  const isInsideContentRoot = useSelect(
    (select) => {
      const editor = select(
        blockEditorStore,
      ) as unknown as BlockEditorSelectors;
      return editor
        .getBlockParents(clientId, true)
        .some(
          (parentId) =>
            editor.getBlock(parentId)?.name === "smartcloud-flow/content-root",
        );
    },
    [clientId],
  );

  return isInsideContentRoot ? CONTENT_ROOT_CHILD_BLOCKS : FORM_CHILD_BLOCKS;
}
