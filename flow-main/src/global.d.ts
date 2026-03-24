declare global {
  interface Window {
    WpSuite: {
      plugins: {
        flow?: import("@smart-cloud/flow-core").FlowPlugin;
      };
      siteSettings: {
        accountId?: string;
        siteId?: string;
        siteKey?: string;
        lastUpdate?: number;
        subscriber?: boolean;
      };
    };
  }
}

export {};
