import type { FormStatus } from "../shared/types";

export function shouldRenderFormFields(
  status: FormStatus,
  hideFormOnSuccess?: boolean,
): boolean {
  return status !== "success" || hideFormOnSuccess !== true;
}

export function shouldShowFormAgainButton(input: {
  status: FormStatus;
  hideFormOnSuccess?: boolean;
  label?: string;
}): boolean {
  return (
    input.status === "success" &&
    input.hideFormOnSuccess === true &&
    Boolean(input.label?.trim())
  );
}
