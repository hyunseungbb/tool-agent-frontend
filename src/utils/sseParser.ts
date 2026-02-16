export interface ParsedSSEEvent {
  event: string;
  data: string;
}

/**
 * SSE 텍스트 버퍼에서 완성된 이벤트들을 파싱합니다.
 * 남은 불완전한 버퍼를 함께 반환합니다.
 */
export function parseSSEBuffer(buffer: string): {
  events: ParsedSSEEvent[];
  remaining: string;
} {
  const events: ParsedSSEEvent[] = [];
  const blocks = buffer.split('\n\n');
  const remaining = blocks.pop() || '';

  for (const block of blocks) {
    if (!block.trim()) continue;

    let eventType = '';
    let data = '';

    const lines = block.split('\n');
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        data = line.substring(5).trim();
      }
    }

    if (eventType && data) {
      events.push({ event: eventType, data });
    }
  }

  return { events, remaining };
}

