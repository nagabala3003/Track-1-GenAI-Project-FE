export type ResponseMode = "summary" | "qa" | "key_points";
export type ToneOption = "formal" | "casual";
export type ModePreference = "auto" | "key_points";

export interface ActionResult {
  output: string;
  mode: ResponseMode;
  source: "ask-api" | "generate-api" | "smart-fallback" | "mock";
}

export interface HistoryItem {
  id: string;
  context: string;
  question?: string;
  output: string;
  mode: ResponseMode;
  tone: ToneOption;
  createdAt: string;
}
