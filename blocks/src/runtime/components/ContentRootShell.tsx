import { LocaleDirectionProvider } from "../LocaleDirectionProvider";
import { Stack } from "@mantine/core";
import { getStoreSelect, type Store } from "@smart-cloud/flow-core";
import { useSelect } from "@wordpress/data";
import { getLocaleDirection } from "@smart-cloud/wpsuite-core";
import { FlowLocaleProvider } from "../locale";
import { useFlowI18n } from "../locale-context";
import { useMemo, type ComponentProps } from "react";
import type { FieldConfig, FormAttributes } from "../../shared/types";
import { buildRuntimeFieldStates } from "../conditional-engine";
import { FormActionsProvider } from "../context/FormActionsContext";
import { FormAttributesProvider } from "../context/FormAttributesContext";
import { FormPreviewProvider } from "../context/FormPreviewContext";
import { FormStateProvider } from "../context/FormStateContext";
import { getInitialValues, type FormRuntimeState } from "../reducer";
import { FlowPoweredBy } from "./FlowPoweredBy";
import { FieldRenderer } from "./field-renderers";

interface ContentRootShellProps {
  rootAttributes: FormAttributes;
  fields: FieldConfig[];
  store: Store;
  isEditorPreview?: boolean;
}

type ContentRootActions = ComponentProps<typeof FormActionsProvider>["value"];

export function ContentRootShell(props: ContentRootShellProps) {
  return <FlowLocaleProvider language={props.rootAttributes.language} store={props.store}><ContentRootShellContent {...props} /></FlowLocaleProvider>;
}

function ContentRootShellContent({
  rootAttributes,
  fields,
  store,
  isEditorPreview = false,
}: ContentRootShellProps) {
  const I18n = useFlowI18n();
  const directionInStore = useSelect(
    () => getStoreSelect(store).getDirection(),
    [store],
  );
  const currentLanguage = I18n.language;

  const currentDirection = useMemo(() => {
    const dir = rootAttributes.direction || directionInStore;
    if (!dir || dir === "auto") {
      return getLocaleDirection(currentLanguage);
    }
    return dir as "ltr" | "rtl";
  }, [rootAttributes.direction, currentLanguage, directionInStore]);

  const state = useMemo<FormRuntimeState>(() => {
    const values = getInitialValues(fields, rootAttributes.wpContext);

    return {
      status: "idle",
      values,
      evaluationValues: values,
      errors: {},
      fields,
      submitCount: 0,
      touched: new Set<string>(),
      fieldStates: buildRuntimeFieldStates(fields, values),
      aiSuggestions: {
        status: "idle",
        suggestions: [],
      },
    };
  }, [fields, rootAttributes.wpContext]);

  const actions = useMemo<ContentRootActions>(
    () => ({
      form: rootAttributes,
      fields,
      emitFormEvent: () => undefined,
      formReturnIntent: null,
      clearFormReturnIntent: () => undefined,
      requestViewScrollReset: () => undefined,
      setValue: () => undefined,
      setInitialValue: () => undefined,
      setErrors: () => undefined,
      validateField: () => undefined,
      submit: async () => undefined,
      saveDraft: async () => undefined,
      loadDraft: async () => undefined,
      deleteDraft: async () => undefined,
      startNewForm: () => undefined,
      reset: () => undefined,
      runAiSuggestions: async () => undefined,
      resetAiSuggestions: () => undefined,
      acceptAiSuggestion: () => undefined,
      rejectAiSuggestions: () => undefined,
    }),
    [fields, rootAttributes],
  );

  return (
    <LocaleDirectionProvider
      initialDirection={currentDirection || "ltr"}
    >
      <FormPreviewProvider>
        <FormAttributesProvider value={rootAttributes}>
          <FormStateProvider value={state}>
            <FormActionsProvider value={actions}>
              <Stack gap="md" data-smartcloud-flow-view="content-root">
                {fields.map((field, index) => (
                  <FieldRenderer
                    key={`${field.type}-${index}`}
                    field={field}
                    path={[index]}
                  />
                ))}
                {!isEditorPreview ? <FlowPoweredBy /> : null}
              </Stack>
            </FormActionsProvider>
          </FormStateProvider>
        </FormAttributesProvider>
      </FormPreviewProvider>
    </LocaleDirectionProvider>
  );
}
