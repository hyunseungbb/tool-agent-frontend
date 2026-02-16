# POST `/agent/run` 엔드포인트 명세서

## 기본 정보

- **Method**: `POST`
- **Path**: `/agent/run`
- **Content-Type**: `application/json`
- **Response Type**: `text/event-stream` (SSE - Server-Sent Events)
- **설명**: Tool Agent Loop를 실행하고 SSE 스트리밍 방식으로 진행 상황과 최종 답변을 실시간 전달

---

## 요청 형식

### Request Body

```json
{
  "message": "사용자 질문 또는 요청"
}
```

**필드:**
- `message` (string, required): 사용자 질문/요청

### 예시

```bash
curl -X POST http://localhost:8000/agent/run \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"message": "오늘 서울 날씨는 어때?"}'
```

---

## 응답 형식 (SSE 이벤트)

SSE 이벤트는 다음 형식으로 전송됩니다:

```
event: {event_type}
data: {json_data}

```

### 이벤트 타입

1. **`step`** - 그래프 루프 진행 상황 (Policy 결정, Tool 실행 등)
2. **`token`** - Synthesizer의 최종 답변 텍스트 청크
3. **`done`** - 완료 신호 (run_id, status 포함)
4. **`error`** - 오류 발생

---

## 케이스별 상세 명세

### 케이스 1: 정상 실행 (Tool 실행 → Synthesizer)

가장 일반적인 케이스입니다. Policy가 Tool을 실행하고, 충분한 정보를 수집한 후 Synthesizer로 최종 답변을 생성합니다.

#### 이벤트 순서

1. `step` (policy) - Policy가 Action 결정
2. `step` (tool_executor) - Tool 실행 완료
3. `step` (policy) - 다음 Action 결정 (반복 가능)
4. `token` - Synthesizer 답변 청크 (여러 개)
5. `done` - 완료

#### 예시 응답

```
event: step
data: {"type": "policy", "cursor": 0, "action": "CALL_TOOL", "tool": "web_search"}

event: step
data: {"type": "tool_executor", "cursor": 1, "summary": "web_search: 5건 검색됨 - Welcome to Python.org"}

event: step
data: {"type": "policy", "cursor": 1, "action": "SYNTHESIZE"}

event: token
data: {"text": "## 오늘 서울 날씨 정보\n\n"}

event: token
data: {"text": "수집된 관측 기록을 분석한 결과..."}

event: token
data: {"text": "..."}

event: done
data: {"run_id": "78a7f860e938", "status": "DONE"}
```

#### step 이벤트 상세

**Policy Step:**
```json
{
  "type": "policy",
  "cursor": 0,
  "action": "CALL_TOOL" | "WRITE_NOTE" | "SYNTHESIZE" | "STOP",
  "tool": "web_search" | "vector_search"  // action이 CALL_TOOL일 때만 존재
}
```

**Tool Executor Step:**
```json
{
  "type": "tool_executor",
  "cursor": 1,
  "summary": "Tool 실행 결과 요약 (최대 200자)"
}
```

**Write Note Step:**
```json
{
  "type": "write_note",
  "cursor": 1,
  "summary": "노트 내용 (최대 200자)"
}
```

**Token 이벤트:**
```json
{
  "text": "텍스트 청크"
}
```

**Done 이벤트:**
```json
{
  "run_id": "78a7f860e938",
  "status": "DONE"
}
```

---

### 케이스 2: STOP 액션 (즉시 종료)

Policy가 STOP Action을 결정하면 Tool 실행 없이 즉시 종료합니다.

#### 이벤트 순서

1. `step` (policy) - STOP 결정
2. `token` - STOP 메시지 (1개)
3. `done` - 완료

#### 예시 응답

```
event: step
data: {"type": "policy", "cursor": 0, "action": "STOP"}

event: token
data: {"text": "에이전트가 중단되었습니다."}

event: done
data: {"run_id": "abc123def456", "status": "DONE"}
```

---

### 케이스 3: 예산 초과 (강제 Synthesizer)

`max_steps`(기본값: 5)에 도달하면 강제로 Synthesizer를 호출합니다.

#### 이벤트 순서

1. `step` (policy) - 여러 번 반복
2. `step` (tool_executor) - 여러 번 반복
3. `step` (policy) - 마지막 Action 결정
4. `token` - Synthesizer 답변 청크 (여러 개)
5. `done` - 완료

#### 예시 응답

```
event: step
data: {"type": "policy", "cursor": 0, "action": "CALL_TOOL", "tool": "web_search"}

event: step
data: {"type": "tool_executor", "cursor": 1, "summary": "..."}

event: step
data: {"type": "policy", "cursor": 1, "action": "CALL_TOOL", "tool": "web_search"}

... (cursor가 5에 도달할 때까지 반복)

event: step
data: {"type": "policy", "cursor": 5, "action": "CALL_TOOL", "tool": "web_search"}

event: step
data: {"type": "tool_executor", "cursor": 5, "summary": "..."}

event: token
data: {"text": "예산 초과로 인해..."}

event: done
data: {"run_id": "xyz789", "status": "DONE"}
```

---

### 케이스 4: 오류 발생

실행 중 예외가 발생하면 `error` 이벤트를 전송하고 스트림을 종료합니다.

#### 이벤트 순서

1. `step` 이벤트들 (오류 발생 전까지)
2. `error` - 오류 메시지
3. 스트림 종료

#### 예시 응답

```
event: step
data: {"type": "policy", "cursor": 0, "action": "CALL_TOOL", "tool": "vector_search"}

event: error
data: {"message": "Fail connecting to server on 127.0.0.1:19530"}
```

**Error 이벤트:**
```json
{
  "message": "오류 메시지"
}
```

---

## HTTP 헤더

### 요청 헤더

- `Content-Type: application/json` (필수)
- `Accept: text/event-stream` (권장)

### 응답 헤더

```
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

---

## 클라이언트 구현 예시

### JavaScript (EventSource)

```javascript
// EventSource는 GET만 지원하므로 fetch API 사용
const response = await fetch('http://localhost:8000/agent/run', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream'
  },
  body: JSON.stringify({ message: '오늘 날씨는?' })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  let eventType = '';
  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventType = line.substring(6).trim();
    } else if (line.startsWith('data:')) {
      const data = JSON.parse(line.substring(5).trim());
      if (eventType === 'token') {
        document.getElementById('answer').innerText += data.text;
      } else if (eventType === 'done') {
        console.log('완료:', data.run_id);
      } else if (eventType === 'error') {
        console.error('오류:', data.message);
      }
    }
  }
}
```

### Python (requests)

```python
import requests
import json

response = requests.post(
    'http://localhost:8000/agent/run',
    json={'message': '오늘 날씨는?'},
    headers={'Accept': 'text/event-stream'},
    stream=True
)

event_type = None
for line in response.iter_lines():
    if line:
        decoded = line.decode('utf-8')
        if decoded.startswith('event:'):
            event_type = decoded.split(':', 1)[1].strip()
        elif decoded.startswith('data:'):
            data = json.loads(decoded.split(':', 1)[1].strip())
            if event_type == 'token':
                print(data['text'], end='', flush=True)
            elif event_type == 'done':
                print(f"\n완료: {data['run_id']}")
                break
            elif event_type == 'error':
                print(f"\n오류: {data['message']}")
                break
```

### cURL

```bash
curl -X POST http://localhost:8000/agent/run \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"message": "오늘 날씨는?"}' \
  --no-buffer
```

---

## 상태 저장

완료된 실행은 `_state_store`에 저장되며, `GET /agent/state/{run_id}` 엔드포인트로 조회할 수 있습니다.

**상태 조회 예시:**
```bash
curl http://localhost:8000/agent/state/78a7f860e938
```

**응답:**
```json
{
  "run_id": "78a7f860e938",
  "goal": "오늘 서울 날씨는 어때?",
  "cursor": 2,
  "max_steps": 5,
  "status": "DONE",
  "observations": [...],
  "final_answer": "## 오늘 서울 날씨 정보\n\n..."
}
```

---

## 주의사항

1. **SSE 연결은 단방향입니다**: 서버 → 클라이언트 방향으로만 데이터가 전송됩니다.
2. **타임아웃**: 긴 실행 시간이 예상되는 경우 클라이언트에서 타임아웃 설정을 충분히 늘려야 합니다.
3. **재연결**: 연결이 끊어진 경우 `run_id`를 사용하여 상태를 조회할 수 있습니다.
4. **인코딩**: 모든 데이터는 UTF-8로 인코딩됩니다 (`ensure_ascii=False`).

---

## Action 타입 상세

### CALL_TOOL

Tool을 실행합니다. `tool_name`과 `tool_args`가 포함됩니다.

**가능한 Tool:**
- `vector_search`: Milvus 벡터DB 검색
- `web_search`: DuckDuckGo 웹 검색

### WRITE_NOTE

중간 요약/정리 메모를 Observation에 기록합니다. `note` 필드에 내용이 포함됩니다.

### SYNTHESIZE

충분한 정보가 모였다고 판단하여 최종 답변 생성을 요청합니다. 이후 Synthesizer가 스트리밍으로 답변을 생성합니다.

### STOP

더 이상 진행할 수 없거나 의미가 없을 때 중단합니다. `note` 필드에 이유가 포함됩니다.

---

## 예산(Budget) 제어

- **기본값**: `max_steps = 5`
- **설정**: `.env` 파일의 `MAX_STEPS` 환경변수로 변경 가능
- **동작**: `cursor >= max_steps`에 도달하면 자동으로 Synthesizer를 호출하여 종료

---

## 관련 엔드포인트

- **GET `/agent/state/{run_id}`**: 실행 상태 조회
- **GET `/health`**: 헬스 체크

