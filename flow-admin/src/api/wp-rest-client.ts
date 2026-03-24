import { FlowSettings } from "@smart-cloud/flow-core";
import type { BootConfig } from "./types";

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }

  return (text ? JSON.parse(text) : undefined) as T;
}

export class FlowWpRestClient {
  constructor(private readonly boot: BootConfig) {}

  private get headers() {
    return {
      "Content-Type": "application/json",
      "X-WP-Nonce": this.boot.nonce ?? "",
    };
  }

  async getSettings(): Promise<FlowSettings> {
    return parse(
      await fetch(`${this.boot.restUrl}admin-settings`, {
        headers: this.headers,
      }),
    );
  }

  async updateSettings(settings: FlowSettings) {
    return parse<{ success: boolean; settings: FlowSettings }>(
      await fetch(`${this.boot.restUrl}/admin-settings`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(settings),
      }),
    );
  }

  async getSiteContext() {
    return parse<Record<string, unknown>>(
      await fetch(`${this.boot.restUrl}site-context`, {
        headers: this.headers,
      }),
    );
  }
}
