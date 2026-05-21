import { WpSuitePluginBase } from "@smart-cloud/wpsuite-core";
import type { Flow } from "./types";
export type FlowReadyEvent = "wpsuite:flow:ready";
export type FlowErrorEvent = "wpsuite:flow:error";
export type FlowPlugin = WpSuitePluginBase & Flow;
export declare function getFlowPlugin(): FlowPlugin | undefined;
export declare function waitForFlowReady(timeoutMs?: number): Promise<void>;
export declare function getStore(timeoutMs?: number): Promise<import("./store").Store>;
