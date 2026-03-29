import { useState, useCallback, useRef } from 'react';
import type {
  AgentSSEState,
  StepEvent,
  TokenEvent,
  DoneEvent,
  ErrorEvent,
} from '../types';
import { parseSSEBuffer } from '../utils/sseParser';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const initialState: AgentSSEState = {
  status: 'idle',
  steps: [],
  streamingText: '',
  error: null,
  runId: null,
};

export function useAgentSSE(token: string | null = null) {
  const [state, setState] = useState<AgentSSEState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const send = useCallback(async (message: string) => {
    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setState({
      status: 'connecting',
      steps: [],
      streamingText: '',
      error: null,
      runId: null,
    });

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      };
      if (tokenRef.current) {
        headers['Authorization'] = `Bearer ${tokenRef.current}`;
      }

      const response = await fetch(`${API_BASE_URL}/agent/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message }),
        signal: abortController.signal,
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.reload();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream을 사용할 수 없습니다.');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      setState((prev) => ({ ...prev, status: 'streaming_steps' }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { events, remaining } = parseSSEBuffer(buffer);
        buffer = remaining;

        for (const sseEvent of events) {
          switch (sseEvent.event) {
            case 'step': {
              const stepData = JSON.parse(sseEvent.data) as StepEvent;
              setState((prev) => ({
                ...prev,
                status: 'streaming_steps',
                steps: [...prev.steps, stepData],
              }));
              break;
            }
            case 'token': {
              const tokenData = JSON.parse(sseEvent.data) as TokenEvent;
              setState((prev) => ({
                ...prev,
                status: 'streaming_tokens',
                streamingText: prev.streamingText + tokenData.text,
              }));
              break;
            }
            case 'done': {
              const doneData = JSON.parse(sseEvent.data) as DoneEvent;
              setState((prev) => ({
                ...prev,
                status: 'done',
                runId: doneData.run_id,
              }));
              break;
            }
            case 'error': {
              const errorData = JSON.parse(sseEvent.data) as ErrorEvent;
              setState((prev) => ({
                ...prev,
                status: 'error',
                error: errorData.message,
              }));
              break;
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return; // 사용자가 취소한 경우 무시
      }
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
      }));
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({ ...prev, status: 'done' }));
  }, []);

  return { state, send, cancel, reset };
}

