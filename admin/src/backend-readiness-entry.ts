import { registerBackendCheck } from "./backend-readiness";
import { getGateyPlugin } from "@smart-cloud/gatey-core";
import { getStore, getStoreSelect } from "@smart-cloud/flow-core";
import { getWpSuite } from "@smart-cloud/wpsuite-core";
import { registerBackendDetails } from "./backend-details";

const dependencies = {
  config: async () => getStoreSelect(await getStore()).getConfig(),
  gatey: () => getGateyPlugin()?.cognito,
  sessionAvailable: async () => {
    // Gatey main uses the shared vendor singleton; an admin bundle's private
    // Amplify instance has no Cognito configuration or authenticated session.
    const runtime = window as typeof window & {
      WpSuiteAmplify?: { fetchAuthSession?: () => Promise<{ tokens?: { accessToken?: unknown; idToken?: unknown } }> };
    };
    const session = await runtime.WpSuiteAmplify?.fetchAuthSession?.();
    return Boolean(session?.tokens?.accessToken && session.tokens?.idToken);
  },
  fetch: ((...args) => fetch(...args)) as typeof fetch,
  site: () => getWpSuite()?.siteSettings,
};
const gateyEndpoint = async (apiName: string) => {
  await getGateyPlugin()?.cognito.store;
  return getGateyPlugin()?.cognito.getAmplifyConfig().API?.REST?.[apiName]?.endpoint;
};
registerBackendCheck({
  ...dependencies,
  gateyApiConfigured: async (apiName) => Boolean(await gateyEndpoint(apiName)),
});
registerBackendDetails({ ...dependencies, gateyEndpoint });
