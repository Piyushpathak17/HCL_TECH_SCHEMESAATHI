// TypeScript mirror of backend/app/models.py (the API contract) plus the shapes of the
// other endpoints the UI consumes. Keep these in sync with the Pydantic models.

export type Lang = "hi" | "en" | "kn" | "ta" | "hinglish";
export type ReplyLang = "hi" | "en" | "kn" | "ta";

export type IntentType =
  | "discovery"
  | "eligibility_check"
  | "documents"
  | "status_deadline"
  | "service_visit"
  | "application_draft"
  | "grievance"
  | "fraud_report"
  | "out_of_scope";

export type AnswerType =
  | "answered"
  | "clarification_needed"
  | "confirmation_needed"
  | "action_completed"
  | "referred"
  | "not_found"
  | "refused"
  | "out_of_scope";

export type Verdict = "appears_eligible" | "not_eligible" | "need_more_information" | "verify_with_officer";

// ---------------------------------------------------------------- requests
export interface AskRequest {
  message: string;
  conversation_id?: string | null;
  channel?: string | null;
  language?: ReplyLang | null;
  as_of_date?: string | null;
}

export interface EligibilityAttributes {
  age?: number;
  annual_household_income?: number;
  land_holding_acres?: number;
  gender?: "female" | "male" | "other";
  category?: "general" | "obc" | "sc" | "st";
  district?: string;
  residence_type?: "rural" | "urban";
  is_disabled?: "Y" | "N";
  disability_percent?: number;
  occupation?: string;
}

export interface EligibilityRequest {
  attributes: EligibilityAttributes;
  scheme_ids?: string[] | null;
  as_of_date?: string | null;
}

// ---------------------------------------------------------------- shared pieces
export interface IntentOut {
  type: IntentType;
  language: Lang;
  script: "devanagari" | "kannada" | "tamil" | "latin" | "mixed";
  urgency: "low" | "normal" | "high" | "urgent";
  sentiment: "positive" | "neutral" | "negative" | "frustrated" | "distressed";
  attributes_mentioned: Record<string, unknown>;
  scheme_ids: string[];
  subject: "self" | "other";
  pii_detected: boolean;
  tools_needed: string[];
  confidence: number;
  flags: string[];
}

export interface Citation {
  source_id: string;
  doc_type: string;
  title: string;
  section: string;
  scheme_id?: string | null;
  language: string;
  effective_from?: string | null;
  last_updated?: string | null;
  label: string;
}

export interface RuleResult {
  rule_id: string;
  attribute: string;
  operator: string;
  expected: string;
  actual?: unknown;
  result: "passed" | "failed" | "unknown";
  rule_group: string;
  source_id: string;
  source_section: string;
}

export interface SchemeVerdict {
  scheme_id: string;
  scheme_name: string;
  scheme_names: Record<string, string>;
  verdict: Verdict;
  rules: RuleResult[];
  unknown: string[];
  failed: string[];
  scheme_status: string;
  can_apply_now: boolean;
  apply_until?: string | null;
  conflicts: Record<string, unknown>[];
  upcoming_changes: Record<string, unknown>[];
}

export interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
  ok: boolean;
  latency_ms: number;
}

export type ActionType = "draft_application" | "book_appointment" | "cancel_appointment" | "set_reminder";

export interface PendingAction {
  action_id: string;
  action_type: ActionType;
  summary: string;
  reminder?: string | null;
  tier: number;
  expires_at: string;
  status: string;
  payload: Record<string, unknown>;
  missing_fields: string[];
}

export interface CriticOut {
  groundedness: number;
  coverage: "complete" | "partial" | "missing";
  language_fidelity: "good" | "poor";
  pii_risk: "none" | "low" | "high";
  promise_risk: "none" | "low" | "high";
  decision: "answer" | "revise" | "refer";
  revisions: number;
  issues: string[];
}

export interface Question {
  attribute: string;
  text: string;
  reason: string;
}

export interface AskResponse {
  trace_id: string;
  conversation_id: string;
  answer_type: AnswerType;
  language: Lang;
  answer: string;
  intent?: IntentOut | null;
  citations: Citation[];
  tools_invoked: ToolCall[];
  eligibility: SchemeVerdict[];
  questions: Question[];
  pending_action?: PendingAction | null;
  critic?: CriticOut | null;
  conflicts_detected: Record<string, unknown>[];
  referral_id?: string | null;
  referral?: ReferralBundle | null;
  as_of_date: string;
}

// ---------------------------------------------------------------- actions
export interface ConfirmResponse {
  trace_id: string;
  answer_type: "action_completed";
  language: Lang;
  answer: string;
  action: PendingAction;
  result: Record<string, unknown>;
  verified: boolean;
}

export interface CancelResponse {
  trace_id: string;
  answer_type: "answered";
  language: Lang;
  answer: string;
  action: PendingAction;
}

// ---------------------------------------------------------------- eligibility
export interface EligibilityResponse {
  as_of_date: string;
  results: SchemeVerdict[];
}

// ---------------------------------------------------------------- schemes
export interface SchemeDocument {
  document_name: string;
  mandatory: "Y" | "N" | string;
  notes?: string | null;
}

export interface Scheme {
  scheme_id: string;
  name_en: string;
  name_hi?: string | null;
  name_kn?: string | null;
  name_ta?: string | null;
  department: string;
  benefit_type: string;
  benefit_summary: string;
  benefit_summary_hi?: string | null;
  benefit_summary_kn?: string | null;
  benefit_summary_ta?: string | null;
  status: "open" | "closed" | "upcoming" | string;
  apply_from?: string | null;
  apply_until?: string | null;
  source_id?: string | null;
  notes: string[];
  documents: SchemeDocument[];
}

// ---------------------------------------------------------------- sources
export interface SourceRow {
  source_id: string;
  doc_type: string;
  title: string;
  language: string;
  authority_level: number | string;
  scheme_id?: string | null;
  last_updated?: string | null;
  effective_from?: string | null;
  valid_until?: string | null;
  supersedes?: string | null;
  provenance?: string | null;
  synthetic?: string | null;
}

export interface SourceDetail extends SourceRow {
  content: string;
}

// ---------------------------------------------------------------- referrals (Annex D)
export interface ReferralBundle {
  queue?: string;
  priority?: string;
  intent?: string;
  urgency?: string;
  sentiment?: string;
  referral_reasons?: string[];
  citizen_summary?: string;
  evidence?: unknown[];
  attempted_answer?: string;
  unresolved_questions?: string[];
  pii_redacted?: boolean;
  [key: string]: unknown;
}

export interface ReferralRecord {
  referral_id: string;
  conversation_id: string;
  queue: string;
  priority: string;
  created_at: string;
  bundle: ReferralBundle;
}

// ---------------------------------------------------------------- conversations, health, citizens
export interface ConversationMessage {
  role: "user" | "assistant" | string;
  text: string;
  answer_type?: AnswerType | null;
  trace_id?: string | null;
  created_at: string;
}

export interface Conversation {
  conversation_id: string;
  citizen_id: string;
  messages: ConversationMessage[];
}

export interface HealthComponent {
  ok: boolean;
  [key: string]: unknown;
}

export interface HealthResponse {
  status: string;
  components: {
    api?: HealthComponent;
    sqlite?: HealthComponent;
    vector_store?: HealthComponent & { chunks?: number };
    llm?: HealthComponent & { mode?: string; model?: string };
    [key: string]: HealthComponent | undefined;
  };
}

export interface DemoCitizen {
  citizen_id: string;
  district: string;
  residence_type: string;
  preferred_language: string;
  consent_given: "Y" | "N" | string;
}

export interface IngestMetadata {
  source_id: string;
  doc_type: string;
  title: string;
  language: string;
  authority_level: number;
  scheme_id: string;
  last_updated: string;
  effective_from: string;
  valid_until: string;
  supersedes: string;
  provenance: string;
  synthetic: "Y" | "N";
}

export interface IngestResponse {
  source_id: string;
  chunks: number;
  effects: unknown[];
}

export interface AdminLoadResponse {
  loaded: Record<string, number>;
  errors: string[];
}

export type AuditRecord = Record<string, unknown>;
