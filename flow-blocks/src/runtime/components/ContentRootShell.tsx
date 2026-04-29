import { DirectionProvider, Stack } from "@mantine/core";
import { getStoreSelect, type Store } from "@smart-cloud/flow-core";
import { useSelect } from "@wordpress/data";
import { I18n } from "aws-amplify/utils";
import { useMemo, type ComponentProps } from "react";
import type { FieldConfig, FormAttributes } from "../../shared/types";
import { buildRuntimeFieldStates } from "../conditional-engine";
import { FormActionsProvider } from "../context/FormActionsContext";
import { FormAttributesProvider } from "../context/FormAttributesContext";
import { FormPreviewProvider } from "../context/FormPreviewContext";
import { FormStateProvider } from "../context/FormStateContext";
import { getInitialValues, type FormRuntimeState } from "../reducer";
import { FieldRenderer } from "./field-renderers";

interface ContentRootShellProps {
  rootAttributes: FormAttributes;
  fields: FieldConfig[];
  store: Store;
}

type ContentRootActions = ComponentProps<typeof FormActionsProvider>["value"];

export function ContentRootShell({
  rootAttributes,
  fields,
  store,
}: ContentRootShellProps) {
  const languageInStore = useSelect(
    () => getStoreSelect(store).getLanguage(),
    [store],
  );
  const directionInStore = useSelect(
    () => getStoreSelect(store).getDirection(),
    [store],
  );
  const customTranslations = useSelect(
    () => getStoreSelect(store).getCustomTranslations(),
    [store],
  );

  const currentLanguage = useMemo(() => {
    if (customTranslations) {
      I18n.putVocabularies(customTranslations);
    }
    const lang = rootAttributes.language || languageInStore;
    if (!lang || lang === "system") {
      I18n.setLanguage("");
      return undefined;
    }
    I18n.setLanguage(lang);
    return lang;
  }, [rootAttributes.language, languageInStore, customTranslations]);

  const currentDirection = useMemo(() => {
    const dir = rootAttributes.direction || directionInStore;
    if (!dir || dir === "auto") {
      return currentLanguage === "ar" || currentLanguage === "he"
        ? "rtl"
        : "ltr";
    }
    return dir as "ltr" | "rtl";
  }, [rootAttributes.direction, currentLanguage, directionInStore]);

  const state = useMemo<FormRuntimeState>(() => {
    const values = getInitialValues(fields);

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
  }, [fields]);

  const actions = useMemo<ContentRootActions>(
    () => ({
      form: rootAttributes,
      fields,
      emitFormEvent: () => undefined,
      formReturnIntent: null,
      clearFormReturnIntent: () => undefined,
      requestViewScrollReset: () => undefined,
      setValue: () => undefined,
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
    <DirectionProvider
      initialDirection={currentDirection || "ltr"}
      detectDirection={false}
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
              </Stack>
            </FormActionsProvider>
          </FormStateProvider>
        </FormAttributesProvider>
      </FormPreviewProvider>
    </DirectionProvider>
  );
}
