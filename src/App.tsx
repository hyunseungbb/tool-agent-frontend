import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message } from './types';
import { useAgentSSE } from './hooks/useAgentSSE';
import ChatArea from './components/ChatArea';
import InputBar from './components/InputBar';
import StateGraph from './components/StateGraph';
import './App.css';

let messageIdCounter = 0;
function generateId(): string {
  return `msg-${Date.now()}-${++messageIdCounter}`;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { state: sseState, send } = useAgentSSE();

  // 그래프 패널: step이 한 번이라도 오면 표시, 이후 계속 유지
  const [hasSteps, setHasSteps] = useState(false);
  // 접기/펼치기 토글
  const [graphCollapsed, setGraphCollapsed] = useState(false);

  // 현재 AI 메시지 ID 추적
  const assistantMsgIdRef = useRef<string | null>(null);

  const isProcessing =
    sseState.status === 'connecting' ||
    sseState.status === 'streaming_steps' ||
    sseState.status === 'streaming_tokens';

  // 메시지 전송 핸들러
  const handleSend = useCallback(
    (text: string) => {
      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: text,
      };
      const assistantId = generateId();
      assistantMsgIdRef.current = assistantId;
      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        steps: [],
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      send(text);
    },
    [send],
  );

  // SSE 상태 변화 → 메시지 업데이트
  useEffect(() => {
    const id = assistantMsgIdRef.current;
    if (!id) return;

    // step이 처음 도착하면 패널 표시 & 펼침
    if (sseState.steps.length > 0 && !hasSteps) {
      setHasSteps(true);
      setGraphCollapsed(false);
    }

    // 메시지 업데이트
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== id) return msg;
        return {
          ...msg,
          content: sseState.streamingText,
          isStreaming: sseState.status === 'streaming_tokens',
          steps: sseState.steps,
        };
      }),
    );
  }, [sseState.steps, sseState.streamingText, sseState.status, hasSteps]);

  // 완료/에러 시 스트리밍 상태 해제
  useEffect(() => {
    const id = assistantMsgIdRef.current;
    if (!id) return;

    if (sseState.status === 'done' || sseState.status === 'error') {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== id) return msg;
          return { ...msg, isStreaming: false };
        }),
      );
      if (sseState.status === 'error' && sseState.error) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== id) return msg;
            return {
              ...msg,
              content: msg.content || `오류가 발생했습니다: ${sseState.error}`,
            };
          }),
        );
      }
      assistantMsgIdRef.current = null;
    }
  }, [sseState.status, sseState.error]);

  // 로딩 인디케이터를 포함한 메시지 배열
  const displayMessages = messages.map((msg) => {
    if (
      msg.id === assistantMsgIdRef.current &&
      msg.role === 'assistant' &&
      !msg.content &&
      sseState.status !== 'streaming_tokens'
    ) {
      return { ...msg, content: '__loading__' };
    }
    return msg;
  });

  return (
    <div className="app">
      <div className="app__main">
        <div className="app__chat-wrapper">
          <ChatArea messages={displayMessages} />
        </div>

        {hasSteps && (
          <StateGraph
            steps={sseState.steps}
            isActive={sseState.status === 'streaming_steps'}
            collapsed={graphCollapsed}
            onToggleCollapse={() => setGraphCollapsed((prev) => !prev)}
          />
        )}
      </div>

      <div className="app__bottom">
        <InputBar onSend={handleSend} disabled={isProcessing} />
      </div>

      {sseState.status === 'error' && sseState.error && (
        <div className="app__error-toast">{sseState.error}</div>
      )}
    </div>
  );
}
