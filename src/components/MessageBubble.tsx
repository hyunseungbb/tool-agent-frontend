import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../types';
import LoadingIndicator from './LoadingIndicator';
import './MessageBubble.css';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isLoading = message.content === '__loading__';

  return (
    <div className={`message-row message-row--${message.role}`}>
      <div
        className={`message-bubble message-bubble--${message.role} ${
          message.isStreaming && !isLoading ? 'streaming-cursor' : ''
        }`}
      >
        {isUser ? (
          <span>{message.content}</span>
        ) : isLoading ? (
          <LoadingIndicator />
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

