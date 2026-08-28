import {
  getGateyPlugin,
  resolveGateyTarget,
  waitForGateyReady,
} from "@smart-cloud/gatey-core";

export type DiscussionAuthMode = "anonymous" | "optional" | "required";

export interface DiscussionAuthState {
  loaded: boolean;
  authenticated: boolean;
  canComment: boolean;
}

function normalizedGroups(value: string[] | undefined): string[] {
  return Array.from(
    new Set(
      (value ?? []).map((group) => group.trim()).filter(Boolean),
    ),
  );
}

export function resolveDiscussionSignInUrl(): string | undefined {
  const signInUrl = resolveGateyTarget(getGateyPlugin()?.settings?.signInPage);
  if (!signInUrl) return undefined;
  try {
    const target = new URL(signInUrl, window.location.href);
    target.searchParams.set("redirect_to", window.location.href);
    return target.toString();
  } catch {
    return signInUrl;
  }
}

export async function resolveDiscussionAuthState(input: {
  mode?: DiscussionAuthMode;
  allowedGroups?: string[];
  requireIdentity?: boolean;
}): Promise<DiscussionAuthState> {
  const mode = input.mode || "anonymous";
  const allowedGroups = normalizedGroups(input.allowedGroups);
  if (mode === "anonymous" && !input.requireIdentity) {
    return {
      loaded: true,
      authenticated: false,
      canComment: allowedGroups.length === 0,
    };
  }

  try {
    await waitForGateyReady();
    const cognito = getGateyPlugin()?.cognito;
    const authenticated = Boolean(
      cognito?.isAuthenticated && (await cognito.isAuthenticated()),
    );
    if (!authenticated) {
      return {
        loaded: true,
        authenticated: false,
        canComment:
          !input.requireIdentity &&
          mode !== "required" &&
          allowedGroups.length === 0,
      };
    }
    const groups = cognito?.getGroups ? (await cognito.getGroups()) ?? [] : [];
    const groupAllowed =
      allowedGroups.length === 0 ||
      groups.some((group) => allowedGroups.includes(group));
    return {
      loaded: true,
      authenticated: true,
      canComment: groupAllowed,
    };
  } catch {
    return {
      loaded: true,
      authenticated: false,
      canComment:
        !input.requireIdentity &&
        mode !== "required" &&
        allowedGroups.length === 0,
    };
  }
}
