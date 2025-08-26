export type StepGoto = { action: "goto"; target: string };
export type StepFill = { action: "fill"; target: string; data: string };
export type StepClick = { action: "click"; target: string };
export type StepExpect = {
  action: "expect";
  target: string;
};
export type Step = StepGoto | StepFill | StepClick | StepExpect;

export interface CaseIR {
  id: string;
  name: string;
  steps: Step[];
}

export interface SuiteIR {
  suiteId: string;
  cases: CaseIR[];
}

export interface CompileOptions {
  emitPageObjects?: boolean;
  selectorStrategy?: "role-first" | "css";
  fileName?: string;
  suiteId?: string;
  runId?: string;
}
