import {
  Button,
  Group,
  Progress,
  Stack,
  Stepper,
  Text,
  Title,
} from "@mantine/core";
import { I18n } from "aws-amplify/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import type { WizardContainerConfig } from "../../shared/types";
import { getRuntimeKey } from "../conditional-engine";
import { evaluateRule } from "../conditional-engine";
import { useFormPreview } from "../context/FormPreviewContext";
import { useFormRuntime } from "../hooks/useFormRuntime";
import { validateValues } from "../validation";
import { FieldRenderer } from "./field-renderers";
import "./WizardContainer.css";

function useRuntimeByKey(runtimeKey: string) {
  return useFormRuntime().fieldStates[runtimeKey];
}

function isHidden(runtime: ReturnType<typeof useRuntimeByKey>) {
  return runtime?.visible === false;
}

function isStepVisible(
  step: WizardContainerConfig["steps"][number],
  values: Record<string, unknown>,
) {
  let visible = !step.hidden;
  const logic = step.conditionalLogic;

  if (!logic?.enabled || !logic.rules?.length) {
    return visible;
  }

  for (const rule of logic.rules) {
    if (!evaluateRule(rule, values)) continue;
    if (rule.then.action === "show") visible = true;
    if (rule.then.action === "hide") visible = false;
  }

  return visible;
}

export function WizardContainer({
  field,
  runtimeKey,
  path,
}: {
  field: WizardContainerConfig;
  runtimeKey: string;
  path: number[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasMountedRef = useRef(false);
  const previousStepRef = useRef<number | null>(null);
  const runtime = useRuntimeByKey(runtimeKey);
  const preview = useFormPreview();
  const {
    evaluationValues,
    fieldStates,
    setErrors,
    emitFormEvent,
    formId,
    formReturnIntent,
    clearFormReturnIntent,
    allowDrafts,
    saveDraft,
    isPending,
  } = useFormRuntime();

  const {
    title,
    subtitle,
    steps = [],
    showProgress = true,
    progressType = "numbers",
    allowStepNavigation = false,
    nextButtonLabel,
    prevButtonLabel,
    gap = "md",
  } = field;

  const previewWizardPath = path.join(".");
  const isPreviewingThisWizard =
    preview.mode === "wizard-step" && preview.wizardPath === previewWizardPath;
  const previewStepIndex =
    isPreviewingThisWizard && typeof preview.stepIndex === "number"
      ? preview.stepIndex
      : -1;

  const visibleSteps = useMemo(
    () =>
      steps
        .map((step, index) => ({ step, index }))
        .filter(
          ({ step, index }) =>
            index === previewStepIndex || isStepVisible(step, evaluationValues),
        ),
    [evaluationValues, previewStepIndex, steps],
  );
  const previewedVisibleStep = useMemo(() => {
    if (previewStepIndex < 0) {
      return -1;
    }

    return visibleSteps.findIndex(({ index }) => index === previewStepIndex);
  }, [previewStepIndex, visibleSteps]);

  const [activeStep, setActiveStep] = useState(() => {
    if (previewedVisibleStep >= 0) {
      return previewedVisibleStep;
    }

    if (formReturnIntent === "last-step") {
      return Math.max(visibleSteps.length - 1, 0);
    }

    return 0;
  });
  const boundedActiveStep = Math.min(
    activeStep,
    Math.max(visibleSteps.length - 1, 0),
  );
  const currentActiveStep =
    previewedVisibleStep >= 0 ? previewedVisibleStep : boundedActiveStep;

  useEffect(() => {
    queueMicrotask(() => {
      if (visibleSteps.length === 0) {
        setActiveStep(0);
        return;
      }

      if (activeStep > visibleSteps.length - 1) {
        setActiveStep(visibleSteps.length - 1);
      }
    });
  }, [activeStep, visibleSteps]);

  useEffect(() => {
    if (formReturnIntent !== "last-step") {
      return;
    }

    clearFormReturnIntent();
  }, [clearFormReturnIntent, formReturnIntent]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    containerRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }, [currentActiveStep]);

  useEffect(() => {
    if (preview.mode !== "form") {
      previousStepRef.current = currentActiveStep;
      return;
    }

    if (previousStepRef.current === null) {
      previousStepRef.current = currentActiveStep;
      return;
    }

    if (previousStepRef.current === currentActiveStep) {
      return;
    }

    const previousStepEntry = visibleSteps[previousStepRef.current];
    const nextStepEntry = visibleSteps[currentActiveStep];

    emitFormEvent("smartcloud-flow:wizard-step-change", {
      action: "wizard-step-change",
      formId,
      wizardPath: previewWizardPath,
      wizardTitle: field.title,
      previousVisibleStepIndex: previousStepRef.current,
      previousStepIndex: previousStepEntry?.index,
      previousStepTitle: previousStepEntry?.step.title,
      stepIndex: nextStepEntry?.index,
      visibleStepIndex: currentActiveStep,
      stepTitle: nextStepEntry?.step.title,
      totalVisibleSteps: visibleSteps.length,
    });

    previousStepRef.current = currentActiveStep;
  }, [
    currentActiveStep,
    emitFormEvent,
    field.title,
    formId,
    previewWizardPath,
    preview.mode,
    visibleSteps,
  ]);

  if (isHidden(runtime)) return null;

  if (!Array.isArray(visibleSteps) || visibleSteps.length === 0) {
    return null;
  }

  const currentStepEntry = visibleSteps[currentActiveStep];
  const currentStepConfig = currentStepEntry?.step;
  const isFirstStep = currentActiveStep === 0;
  const isLastStep = currentActiveStep === visibleSteps.length - 1;

  // Validate current step fields only
  const validateCurrentStep = (): boolean => {
    if (!currentStepConfig) return false;
    const errors = validateValues(
      currentStepConfig.children,
      evaluationValues,
      fieldStates,
      [...path, currentStepEntry.index],
    );
    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return false;
    }
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep() && !isLastStep) {
      setActiveStep(currentActiveStep + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setActiveStep(currentActiveStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex === currentActiveStep) return;

    if (stepIndex < currentActiveStep) {
      setActiveStep(stepIndex);
      return;
    }

    if (stepIndex === currentActiveStep + 1) {
      if (validateCurrentStep()) {
        setActiveStep(stepIndex);
      }
      return;
    }

    if (!allowStepNavigation) return;

    // If trying to go forward, validate all steps up to the target
    if (stepIndex > currentActiveStep) {
      for (let i = currentActiveStep; i < stepIndex; i++) {
        const stepErrors = validateValues(
          visibleSteps[i].step.children,
          evaluationValues,
          fieldStates,
          [...path, visibleSteps[i].index],
        );
        if (Object.keys(stepErrors).length > 0) {
          setErrors(stepErrors);
          return; // Stop if any step has errors
        }
      }
    }

    setActiveStep(stepIndex);
  };

  const canClickStep = (stepIndex: number) => {
    if (stepIndex === currentActiveStep) return true;
    if (stepIndex < currentActiveStep) return true;
    if (stepIndex === currentActiveStep + 1) return true;
    return allowStepNavigation;
  };

  return (
    <div ref={containerRef}>
      <Stack gap={gap} className="flow-wizard-container">
        {/* Header */}
        {(title || subtitle) && (
          <div className="flow-wizard-header">
            {title && (
              <Title order={3} className="flow-wizard-title">
                {title}
              </Title>
            )}
            {subtitle && (
              <Text size="sm" c="dimmed" className="flow-wizard-subtitle">
                {subtitle}
              </Text>
            )}
          </div>
        )}

        {/* Progress indicator */}
        {showProgress && (
          <div className="flow-wizard-progress">
            {progressType === "bar" ? (
              <Progress
                value={((currentActiveStep + 1) / visibleSteps.length) * 100}
                size="sm"
                radius="xl"
                className="flow-wizard-progress-bar"
              />
            ) : progressType === "dots" ? (
              <Stepper
                active={currentActiveStep}
                onStepClick={handleStepClick}
                size="sm"
                className="flow-wizard-stepper"
              >
                {visibleSteps.map(({ step }, index) => (
                  <Stepper.Step
                    key={index}
                    label={step.title}
                    description={step.description}
                    allowStepSelect={
                      index !== currentActiveStep && canClickStep(index)
                    }
                  />
                ))}
              </Stepper>
            ) : (
              <Group
                justify="center"
                gap="xs"
                className="flow-wizard-step-numbers"
              >
                {visibleSteps.map((_, index) => (
                  <Button
                    key={index}
                    variant={index === currentActiveStep ? "filled" : "light"}
                    size="xs"
                    radius="xl"
                    onClick={
                      index === currentActiveStep
                        ? undefined
                        : () => handleStepClick(index)
                    }
                    disabled={
                      index === currentActiveStep || !canClickStep(index)
                    }
                    className={`flow-wizard-step-number ${
                      index === currentActiveStep
                        ? "flow-wizard-step-active"
                        : ""
                    }`}
                  >
                    {index + 1}
                  </Button>
                ))}
              </Group>
            )}
          </div>
        )}

        {/* Current step content */}
        {currentStepConfig && (
          <Stack gap={gap} className="flow-wizard-step-content">
            {currentStepConfig.title && (
              <Title order={4} className="flow-wizard-step-title">
                {currentStepConfig.title}
              </Title>
            )}
            {currentStepConfig.description && (
              <Text
                size="sm"
                c="dimmed"
                className="flow-wizard-step-description"
              >
                {currentStepConfig.description}
              </Text>
            )}
            <div className="flow-wizard-step-fields">
              {currentStepConfig.children.map((child, index) => {
                if (child.type === "submit" && !isLastStep) {
                  return null;
                }

                const childPath = [...path, currentStepEntry.index, index];

                return (
                  <FieldRenderer
                    key={getRuntimeKey(child, childPath)}
                    field={child}
                    path={childPath}
                  />
                );
              })}
            </div>
          </Stack>
        )}

        {/* Navigation controls */}
        <Group justify="space-between" className="flow-wizard-controls">
          <Button
            variant="default"
            onClick={handlePrev}
            disabled={isFirstStep}
            className="flow-wizard-prev-button flow-wizard-action-button"
          >
            {prevButtonLabel || I18n.get("Previous") || "Previous"}
          </Button>
          <Group gap="sm" className="flow-wizard-primary-actions">
            {allowDrafts && (
              <Button
                variant="outline"
                loading={isPending}
                onClick={() => void saveDraft()}
                className="flow-wizard-save-draft-button flow-wizard-action-button flow-action-button flow-action-button__save-draft"
              >
                {I18n.get("Save draft") || "Save draft"}
              </Button>
            )}
            {!isLastStep && (
              <Button
                onClick={handleNext}
                className="flow-wizard-next-button flow-wizard-action-button"
              >
                {nextButtonLabel || I18n.get("Next") || "Next"}
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </div>
  );
}
