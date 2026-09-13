/*
 * Adapted from Vercel AI Elements, Apache-2.0.
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/message.tsx
 */
import { cjk } from '@streamdown/cjk';
import type { UIMessage } from 'ai';
import type { ComponentProps, HTMLAttributes } from 'react';
import { memo } from 'react';
import { Streamdown } from 'streamdown';

export type MessageProps = HTMLAttributes<HTMLElement> & { from: UIMessage['role'] };
export function Message({ className = '', from, ...props }: MessageProps) {
  return <article className={`xue-message is-${from} ${className}`.trim()} data-role={from} {...props} />;
}
export function MessageContent({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`xue-message-content ${className}`.trim()} {...props} />;
}
export function MessageActions({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`xue-message-actions ${className}`.trim()} {...props} />;
}

type MessageActionProps = ComponentProps<'button'> & { label: string };
export function MessageAction({ className = '', label, children, ...props }: MessageActionProps) {
  return (
    <button aria-label={label} className={`xue-message-action ${className}`.trim()} title={label} type="button" {...props}>
      {children}<span className="xue-sr-only">{label}</span>
    </button>
  );
}

export type MessageResponseProps = ComponentProps<typeof Streamdown>;
const plugins = { cjk };
export const MessageResponse = memo(({ className = '', ...props }: MessageResponseProps) => (
  <Streamdown className={`xue-message-response ${className}`.trim()} controls={{ code: { copy: true, download: false }, table: false, mermaid: false }} dir="auto" parseIncompleteMarkdown plugins={plugins} {...props} />
), (previous, next) => previous.children === next.children && previous.isAnimating === next.isAnimating);
MessageResponse.displayName = 'MessageResponse';
