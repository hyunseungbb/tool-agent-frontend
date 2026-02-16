/* ===== SSE Event Types ===== */

export type PolicyAction = 'CALL_TOOL' | 'WRITE_NOTE' | 'SYNTHESIZE' | 'STOP';

export interface PolicyStep {
  type: 'policy';
  cursor: number;
  action: PolicyAction;
  tool?: string;
}

export interface ToolExecutorStep {
  type: 'tool_executor';
  cursor: number;
  summary: string;
}

export interface WriteNoteStep {
  type: 'write_note';
  cursor: number;
  summary: string;
}

export type StepEvent = PolicyStep | ToolExecutorStep | WriteNoteStep;

export interface TokenEvent {
  text: string;
}

export interface DoneEvent {
  run_id: string;
  status: string;
}

export interface ErrorEvent {
  message: string;
}

/* ===== Chat Message Types ===== */

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  isStreaming?: boolean;
  steps?: StepEvent[];
}

/* ===== Agent SSE State ===== */

export type SSEStatus = 'idle' | 'connecting' | 'streaming_steps' | 'streaming_tokens' | 'done' | 'error';

export interface AgentSSEState {
  status: SSEStatus;
  steps: StepEvent[];
  streamingText: string;
  error: string | null;
  runId: string | null;
}

