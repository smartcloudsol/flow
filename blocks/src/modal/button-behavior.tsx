import { createHigherOrderComponent } from "@wordpress/compose";
import {
  BlockControls,
  store as blockEditorStore,
} from "@wordpress/block-editor";
import { ToolbarDropdownMenu, ToolbarGroup } from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { useEffect } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { check, settings } from "@wordpress/icons";
import { addFilter } from "@wordpress/hooks";
import { TEXT_DOMAIN } from "..";
import {
  ACTION_BEHAVIOR_OPTIONS,
  getModalActionBehavior,
  isActionsSlotClassName,
  normalizeModalActionButtonClassName,
  type ModalActionBehavior,
} from "./action-behavior";

type CoreButtonAttributes = {
  className?: string;
  wpsFlowModalBehavior?: ModalActionBehavior;
};

type BlockInstance = {
  name: string;
  attributes: Record<string, unknown>;
};

function extendCoreButtonSettings(
  settings: Record<string, unknown>,
  name: string,
): Record<string, unknown> {
  if (name !== "core/button") {
    return settings;
  }

  const attributes =
    settings.attributes && typeof settings.attributes === "object"
      ? (settings.attributes as Record<string, unknown>)
      : {};

  return {
    ...settings,
    attributes: {
      ...attributes,
      wpsFlowModalBehavior: {
        type: "string",
      },
    },
  };
}

const withFlowModalButtonBehavior = createHigherOrderComponent((BlockEdit) => {
  return (props: {
    name: string;
    clientId: string;
    isSelected?: boolean;
    attributes: CoreButtonAttributes;
  }) => {
    if (props.name !== "core/button") {
      return <BlockEdit {...props} />;
    }

    const { updateBlock } = useDispatch(blockEditorStore) as unknown as {
      updateBlock: (
        blockClientId: string,
        block: { attributes: Record<string, unknown> },
      ) => void;
    };
    const isModalActionButton = useSelect(
      (select) => {
        const { getBlock, getBlockParents } = select(
          blockEditorStore,
        ) as unknown as {
          getBlock: (clientId: string) => BlockInstance | undefined;
          getBlockParents: (clientId: string) => string[];
        };
        const ancestors = getBlockParents(props.clientId)
          .map((ancestorId) => getBlock(ancestorId))
          .filter(Boolean) as BlockInstance[];

        const hasModalAncestor = ancestors.some(
          (ancestor) => ancestor.name === "smartcloud-flow/modal",
        );
        const hasActionsSlotAncestor = ancestors.some((ancestor) => {
          const className =
            typeof ancestor.attributes.className === "string"
              ? ancestor.attributes.className
              : "";

          return isActionsSlotClassName(className);
        });

        return hasModalAncestor && hasActionsSlotAncestor;
      },
      [props.clientId],
    );

    const currentClassName =
      typeof props.attributes.className === "string"
        ? props.attributes.className
        : "";
    const currentBehavior =
      props.attributes.wpsFlowModalBehavior ||
      getModalActionBehavior(currentClassName);

    useEffect(() => {
      if (!isModalActionButton) {
        return;
      }

      const normalizedClassName = normalizeModalActionButtonClassName(
        currentClassName,
        currentBehavior,
      );

      if (
        props.attributes.wpsFlowModalBehavior === currentBehavior &&
        currentClassName === normalizedClassName
      ) {
        return;
      }

      updateBlock(props.clientId, {
        attributes: {
          ...props.attributes,
          className: normalizedClassName,
          wpsFlowModalBehavior: currentBehavior,
        },
      });
    }, [
      currentBehavior,
      currentClassName,
      isModalActionButton,
      props.attributes,
      props.clientId,
      updateBlock,
    ]);

    return (
      <>
        <BlockEdit {...props} />
        {props.isSelected && isModalActionButton ? (
          <BlockControls>
            <ToolbarGroup>
              <ToolbarDropdownMenu
                icon={settings}
                label={__("Modal button behavior", TEXT_DOMAIN)}
                controls={ACTION_BEHAVIOR_OPTIONS.map((option) => ({
                  title: option.label,
                  icon: currentBehavior === option.value ? check : undefined,
                  isActive: currentBehavior === option.value,
                  onClick: () => {
                    const nextBehavior = option.value as ModalActionBehavior;

                    updateBlock(props.clientId, {
                      attributes: {
                        ...props.attributes,
                        className: normalizeModalActionButtonClassName(
                          currentClassName,
                          nextBehavior,
                        ),
                        wpsFlowModalBehavior: nextBehavior,
                      },
                    });
                  },
                }))}
              />
            </ToolbarGroup>
          </BlockControls>
        ) : null}
      </>
    );
  };
}, "withFlowModalButtonBehavior");

addFilter(
  "blocks.registerBlockType",
  "smartcloud-flow/modal-button-behavior/attribute",
  extendCoreButtonSettings,
);

addFilter(
  "editor.BlockEdit",
  "smartcloud-flow/modal-button-behavior/control",
  withFlowModalButtonBehavior,
);
