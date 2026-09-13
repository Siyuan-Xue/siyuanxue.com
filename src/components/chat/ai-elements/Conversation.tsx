/*
 * Adapted from Vercel AI Elements, Apache-2.0.
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/conversation.tsx
 */
import { ArrowDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useCallback } from 'react';
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom';

type ConversationProps = ComponentProps<typeof StickToBottom> & { reduceMotion?: boolean };

export function Conversation({ className = '', reduceMotion = false, ...props }: ConversationProps) {
  return (
    <StickToBottom
      className={`xue-conversation ${className}`.trim()}
      initial={reduceMotion ? 'instant' : 'smooth'}
      resize={reduceMotion ? 'instant' : 'smooth'}
      role="log"
      {...props}
    />
  );
}

export function ConversationContent({ className = '', ...props }: ComponentProps<typeof StickToBottom.Content>) {
  return <StickToBottom.Content className={`xue-conversation-content ${className}`.trim()} {...props} />;
}

type ScrollButtonProps = ComponentProps<'button'> & { label: string; reduceMotion?: boolean };

export function ConversationScrollButton({ className = '', label, reduceMotion = false, ...props }: ScrollButtonProps) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  const handleClick = useCallback(() => scrollToBottom({ animation: reduceMotion ? 'instant' : 'smooth' }), [reduceMotion, scrollToBottom]);
  if (isAtBottom) return null;
  return (
    <button aria-label={label} className={`xue-scroll-latest ${className}`.trim()} onClick={handleClick} title={label} type="button" {...props}>
      <ArrowDown aria-hidden="true" size={18} strokeWidth={1.8} />
    </button>
  );
}
