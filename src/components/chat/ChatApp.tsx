import { useChat } from '@ai-sdk/react';
import type { ChatStatus, UIMessage } from 'ai';
import { ArrowUp, Baby, Copy, RefreshCcw, Square } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChatInputError,
  type ChatFetch,
  type ChatErrorCode,
  classifyChatError,
  createXueChatTransport,
  getMessageText,
  normalizeBridgeMessages,
  shouldSubmitChat,
} from '../../utils/chat-client';
import {
  type MessageStatuses,
  type PersistedMessageStatus,
  loadChatSession,
  persistChatSession,
} from '../../utils/chat-persistence';
import { Conversation, ConversationContent, ConversationScrollButton } from './ai-elements/Conversation';
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse } from './ai-elements/Message';
import './chat.css';

type ErrorCopy = Record<ChatErrorCode, { title: string; detail: string }>;
export type ChatCopy = {
  title: string; name: string; welcome: string; intro: string; label: string; placeholder: string;
  identity: string; send: string; stop: string; busy: string; you: string;
  copy: string; codeCopy: string; copied: string; copyFailed: string; retry: string; returnToBottom: string;
  inputHint: string; mobileInputHint: string; stopped: string; interrupted: string; recovery: string; storage: string;
  errors: ErrorCopy;
};
type ChatAppProps = { copy: ChatCopy; prompts: { label: string; text: string }[]; locale: 'en' | 'zh'; fetcher?: ChatFetch };

const retryable = new Set<ChatErrorCode>(['timeout', 'upstream_unavailable', 'interrupted', 'stream_error']);
const activeStatuses = new Set<ChatStatus>(['submitted', 'streaming']);

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, [query]);
  return matches;
}

function lastAssistant(messages: UIMessage[]): UIMessage | undefined {
  return [...messages].reverse().find(message => message.role === 'assistant');
}

function messageStatus(message: UIMessage, index: number, messages: UIMessage[], chatStatus: ChatStatus, statuses: MessageStatuses): PersistedMessageStatus {
  if (message.role === 'assistant' && index === messages.length - 1 && activeStatuses.has(chatStatus)) return 'streaming';
  return statuses[message.id] ?? 'complete';
}

export function ChatApp({ copy, prompts, locale, fetcher = globalThis.fetch.bind(globalThis) }: ChatAppProps) {
  const transport = useMemo(() => createXueChatTransport(fetcher), [fetcher]);
  const [input, setInput] = useState('');
  const [statuses, setStatuses] = useState<MessageStatuses>({});
  const [notice, setNotice] = useState<'' | 'interrupted' | 'recovery' | 'stopped'>('');
  const [errorCode, setErrorCode] = useState<ChatErrorCode>();
  const [storageFailed, setStorageFailed] = useState(false);
  const [readyToPersist, setReadyToPersist] = useState(false);
  const [copyNotice, setCopyNotice] = useState('');
  const stopReason = useRef<'stopped' | 'interrupted'>('stopped');
  const messagesRef = useRef<UIMessage[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useMedia('(max-width: 600px), (pointer: coarse)');
  const reduceMotion = useMedia('(prefers-reduced-motion: reduce)');

  const { messages, sendMessage, regenerate, stop, status, clearError, setMessages } = useChat({
    transport,
    experimental_throttle: 50,
    onError: error => setErrorCode(classifyChatError(error)),
    onFinish: ({ message, messages: finishedMessages, isAbort, isError, isDisconnect }) => {
      if (finishedMessages.some(candidate => candidate.id === message.id)) {
        setStatuses(current => ({ ...current, [message.id]: isAbort ? stopReason.current : isError ? 'error' : 'complete' }));
      }
      if (isAbort) setNotice(stopReason.current);
      if (isDisconnect) setErrorCode('upstream_unavailable');
    },
  });
  const busy = activeStatuses.has(status);
  messagesRef.current = messages;

  useEffect(() => {
    let storage: Storage | undefined;
    try { storage = window.sessionStorage; } catch { setStorageFailed(true); }
    const restored = loadChatSession(storage);
    setMessages(restored.messages);
    setStatuses(restored.statuses);
    setInput(restored.draft);
    setNotice(restored.notice);
    setErrorCode(restored.errorCode);
    setReadyToPersist(true);
  }, [setMessages]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    const update = () => root.style.setProperty('--xue-viewport-height', `${viewport?.height ?? window.innerHeight}px`);
    update();
    viewport?.addEventListener('resize', update);
    return () => viewport?.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!readyToPersist) return;
    let storage: Storage | undefined;
    try { storage = window.sessionStorage; } catch { setStorageFailed(true); return; }
    const effectiveStatuses = { ...statuses };
    messages.forEach((message, index) => { effectiveStatuses[message.id] = messageStatus(message, index, messages, status, statuses); });
    setStorageFailed(!persistChatSession(storage, { draft: input, errorCode, messages, statuses: effectiveStatuses }));
  }, [errorCode, input, messages, readyToPersist, status, statuses]);

  useEffect(() => {
    const handlePageHide = () => {
      if (!activeStatuses.has(status)) return;
      stopReason.current = 'interrupted';
      const assistant = lastAssistant(messagesRef.current);
      const interrupted = assistant ? { ...statuses, [assistant.id]: 'interrupted' as const } : statuses;
      try { persistChatSession(window.sessionStorage, { draft: input, errorCode: 'interrupted', messages: messagesRef.current, statuses: interrupted }); } catch {}
      void stop();
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [input, status, statuses, stop]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(220, Math.max(56, textarea.scrollHeight))}px`;
  }, [input]);

  const submit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const stopped = notice === 'stopped' || notice === 'interrupted';
    const last = messages.at(-1);
    const stoppedTurnStart = stopped && last?.role === 'user'
      ? messages.length - 1
      : stopped && last?.role === 'assistant' && !getMessageText(last).trim() && messages.at(-2)?.role === 'user'
        ? messages.length - 2
        : -1;
    const failedUnanswered = errorCode && last?.role === 'user' ? last : undefined;
    const candidate = stoppedTurnStart >= 0
      ? messages.slice(0, stoppedTurnStart)
      : failedUnanswered ? messages.slice(0, -1) : messages;
    try { normalizeBridgeMessages([...candidate, { id: 'pending-user', role: 'user', parts: [{ type: 'text', text }] }]); }
    catch (error) { setErrorCode(error instanceof ChatInputError ? error.code : 'invalid_request'); return; }
    setErrorCode(undefined); setNotice(''); clearError(); setInput('');
    if (stoppedTurnStart >= 0) {
      setMessages(candidate);
      await sendMessage({ text });
    } else {
      await sendMessage(failedUnanswered ? { text, messageId: failedUnanswered.id } : { text });
    }
  }, [busy, clearError, errorCode, input, messages, notice, sendMessage, setMessages]);

  const retry = useCallback(async (messageId?: string) => {
    if (busy || !messages.length) return;
    setErrorCode(undefined); setNotice(''); clearError();
    const target = messageId ? messages.find(message => message.id === messageId) : messages.at(-1);
    await regenerate(target ? { messageId: target.id } : undefined);
  }, [busy, clearError, messages, regenerate]);

  const stopReply = useCallback(async () => {
    stopReason.current = 'stopped';
    await stop();
    inputRef.current?.focus({ preventScroll: true });
  }, [stop]);

  const copyAnswer = useCallback(async (message: UIMessage) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('unavailable');
      await navigator.clipboard.writeText(getMessageText(message)); setCopyNotice(copy.copied);
    } catch { setCopyNotice(copy.copyFailed); }
  }, [copy.copied, copy.copyFailed]);

  const hasConversation = messages.length > 0;
  const currentError = errorCode ? copy.errors[errorCode] : undefined;
  const retryMessage = messages.at(-1);
  const statusText = busy ? copy.busy : copyNotice || (notice === 'recovery' ? copy.recovery : notice === 'interrupted' ? copy.interrupted : notice === 'stopped' ? copy.stopped : '');
  return (
    <section aria-label={copy.title} className="xue-chat" data-chat-state={hasConversation ? 'conversation' : 'welcome'}>
      <Conversation className="xue-chat-log" reduceMotion={reduceMotion}>
        <ConversationContent>
          {!hasConversation && <div className="xue-welcome">
            <Baby aria-hidden="true" className="xue-welcome-icon" size={58} strokeWidth={1.5} />
            <h1>{copy.welcome}</h1><p>{copy.intro}</p>
            <div aria-label={locale === 'zh' ? '从这里开始聊' : 'Conversation starters'} className="xue-prompts">
              {prompts.map(prompt => <button key={prompt.text} onClick={() => { setInput(prompt.text); inputRef.current?.focus(); }} type="button">{prompt.label}</button>)}
            </div>
          </div>}
          {messages.map((message, index) => {
            const savedStatus = messageStatus(message, index, messages, status, statuses);
            const text = getMessageText(message);
            return <Message from={message.role} key={message.id}>
              <span className="xue-sr-only">{message.role === 'user' ? copy.you : copy.name}: </span>
              <MessageContent>{message.role === 'assistant'
                ? text ? <MessageResponse isAnimating={savedStatus === 'streaming'} mode={savedStatus === 'streaming' ? 'streaming' : 'static'} translations={{ copyCode: copy.codeCopy, copied: copy.copied }}>{text}</MessageResponse> : <span aria-hidden="true" className="xue-thinking">···</span>
                : <span className="xue-user-text">{text}</span>}</MessageContent>
              {message.role === 'assistant' && savedStatus !== 'streaming' && text && <MessageActions>
                <MessageAction label={copy.copy} onClick={() => copyAnswer(message)}><Copy aria-hidden="true" size={16} strokeWidth={1.8} /></MessageAction>
                {savedStatus !== 'error' && index === messages.length - 1 && <MessageAction label={copy.retry} onClick={() => retry(message.id)}><RefreshCcw aria-hidden="true" size={16} strokeWidth={1.8} /></MessageAction>}
              </MessageActions>}
              {message.role === 'assistant' && (savedStatus === 'stopped' || savedStatus === 'interrupted') && <p className="xue-message-note">{copy[savedStatus]}</p>}
            </Message>;
          })}
        </ConversationContent>
        <ConversationScrollButton label={copy.returnToBottom} reduceMotion={reduceMotion} />
      </Conversation>
      <div className="xue-compose-area">
        {statusText && <div aria-atomic="true" aria-live="polite" className="xue-chat-status" role="status">{statusText}</div>}
        {currentError && <div className="xue-error-card" role="alert"><div><strong>{currentError.title}</strong><p>{currentError.detail}</p></div>
          {retryable.has(errorCode!) && retryMessage && <button onClick={() => retry(retryMessage.id)} type="button" aria-label={copy.retry} title={copy.retry}><RefreshCcw aria-hidden="true" size={18} /></button>}
        </div>}
        <form className="xue-composer" onSubmit={submit}>
          <label className="xue-sr-only" htmlFor="xue-chat-message">{copy.label}</label>
          <textarea aria-describedby="xue-chat-input-hint" autoComplete="off" id="xue-chat-message" maxLength={4000}
            onChange={event => { setInput(event.currentTarget.value); setCopyNotice(''); }}
            onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => { if (shouldSubmitChat(event.nativeEvent, isMobile)) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}
            placeholder={copy.placeholder} ref={inputRef} rows={1} value={input} />
          <div className="xue-composer-toolbar"><span className="xue-identity"><Baby aria-hidden="true" size={18} strokeWidth={1.7} />{copy.identity}</span>
            {busy ? <button aria-label={copy.stop} className="xue-send xue-stop" onClick={stopReply} title={copy.stop} type="button"><Square aria-hidden="true" size={15} strokeWidth={2} /></button>
              : <button aria-label={copy.send} className="xue-send" disabled={!input.trim()} title={copy.send} type="submit"><ArrowUp aria-hidden="true" size={20} strokeWidth={2} /></button>}
          </div>
        </form>
        <p className="xue-input-hint" id="xue-chat-input-hint">{isMobile ? copy.mobileInputHint : copy.inputHint}</p>
        {storageFailed && <p className="xue-storage-note" role="status">{copy.storage}</p>}
      </div>
    </section>
  );
}
