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
import { useState } from "react";
import type { WizardContainerConfig } from "../../shared/types";
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

export function WizardContainer({
  field,
  runtimeKey,
  path,
}: {
  field: WizardContainerConfig;
  runtimeKey: string;
  path: number[];
}) {
  const [activeStep, setActiveStep] = useState(0);
  const runtime = useRuntimeByKey(runtimeKey);
  const { values, fieldStates, setErrors } = useFormRuntime();

  if (isHidden(runtime)) return null;

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

  if (!Array.isArray(steps) || steps.length === 0) {
    return null;
  }

  const currentStepConfig = steps[activeStep];
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === steps.length - 1;

  // Validate current step fields only
  const validateCurrentStep = (): boolean => {
    if (!currentStepConfig) return false;
    const errors = validateValues(
      currentStepConfig.children,
      values,
      fieldStates,
    );
    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return false;
    }
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep() && !isLastStep) {
      setActiveStep((current) => current + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setActiveStep((current) => current - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (!allowStepNavigation) return;

    // If trying to go forward, validate all steps up to the target
    if (stepIndex > activeStep) {
      for (let i = activeStep; i < stepIndex; i++) {
        const stepErrors = validateValues(
          steps[i].children,
          values,
          fieldStates,
        );
        if (Object.keys(stepErrors).length > 0) {
          setErrors(stepErrors);
          return; // Stop if any step has errors
        }
      }
    }

    setActiveStep(stepIndex);
  };

  return (
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
              value={((activeStep + 1) / steps.length) * 100}
              size="sm"
              radius="xl"
              className="flow-wizard-progress-bar"
            />
          ) : progressType === "dots" ? (
            <Stepper
              active={activeStep}
              onStepClick={allowStepNavigation ? handleStepClick : undefined}
              size="sm"
              className="flow-wizard-stepper"
            >
              {steps.map((step, index) => (
                <Stepper.Step
                  key={index}
                  label={step.title}
                  description={step.description}
                />
              ))}
            </Stepper>
          ) : (
            <Group
              justify="center"
              gap="xs"
              className="flow-wizard-step-numbers"
            >
              {steps.map((_, index) => (
                <Button
                  key={index}
                  variant={index === activeStep ? "filled" : "light"}
                  size="xs"
                  radius="xl"
                  onClick={() => handleStepClick(index)}
                  disabled={!allowStepNavigation}
                  className={`flow-wizard-step-number ${
                    index === activeStep ? "flow-wizard-step-active" : ""
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
            <Text size="sm" c="dimmed" className="flow-wizard-step-description">
              {currentStepConfig.description}
            </Text>
          )}
          <div className="flow-wizard-step-fields">
            {currentStepConfig.children.map((child, index) => {
              if (child.type === "submit" && !isLastStep) {
                return null;
              }

              return (
                <FieldRenderer
                  key={index}
                  field={child}
                  path={[...path, activeStep, index]}
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
          className="flow-wizard-prev-button"
        >
          {prevButtonLabel || I18n.get("Previous") || "Previous"}
        </Button>
        {!isLastStep && (
          <Button onClick={handleNext} className="flow-wizard-next-button">
            {nextButtonLabel || I18n.get("Next") || "Next"}
          </Button>
        )}
      </Group>
    </Stack>
  );
}
