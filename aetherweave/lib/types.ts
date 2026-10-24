export interface ChaosProfile {
  latencyMs: number;     // 0-5000ms artificial delay
  dropProb: number;      // 0.0-1.0 probability of dropping the event
  duplicate: boolean;    // fire payload twice in rapid succession
  scramble: boolean;     // if multiple events arrive concurrently, reorder them
}

export const DEFAULT_CHAOS_PROFILE: ChaosProfile = {
  latencyMs: 0,
  dropProb: 0,
  duplicate: false,
  scramble: false,
};

export interface WebhookEndpointRow {
  id: string;
  name: string;
  slug: string;
  targetUrl: string;
  chaosProfile: ChaosProfile;
  createdAt: string;
  updatedAt: string;
}

export interface EventPayloadRow {
  id: string;
  endpointId: string;
  headers: Record<string, string>;
  body: string;
  receivedAt: string;
  attempts: DeliveryAttemptRow[];
}

export interface DeliveryAttemptRow {
  id: string;
  payloadId: string;
  status: "pending" | "success" | "failed" | "dropped";
  latencyMs: number;
  duplicate: boolean;
  scrambled: boolean;
  createdAt: string;
  completedAt: string | null;
}
