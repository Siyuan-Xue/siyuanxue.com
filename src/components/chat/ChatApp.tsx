import { useChat } from '@ai-sdk/react';
import type { ChatStatus, UIMessage } from 'ai';
import { Baby, Check, Copy, CornerDownLeft, Home, Moon, Plus, RefreshCcw, Square, Sun, X } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { ThinkingIndicator } from './ThinkingIndicator';
import { chatChrome } from './chat-chrome';
import { site } from '../../data/site';
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
const textAnimations = {
  en: { animation: 'fadeIn', duration: 220, easing: 'ease-out', sep: 'word' },
  zh: { animation: 'fadeIn', duration: 220, easing: 'ease-out', sep: 'char' },
} as const;

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
  const [multiline, setMultiline] = useState(false);
  const [statuses, setStatuses] = useState<MessageStatuses>({});
  const [notice, setNotice] = useState<'' | 'interrupted' | 'recovery' | 'stopped'>('');
  const [errorCode, setErrorCode] = useState<ChatErrorCode>();
  const [storageFailed, setStorageFailed] = useState(false);
  const [readyToPersist, setReadyToPersist] = useState(false);
  const [copyResult, setCopyResult] = useState<{ id: string; ok: boolean }>();
  const stopReason = useRef<'stopped' | 'interrupted'>('stopped');
  const messagesRef = useRef<UIMessage[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composeRef = useRef<HTMLDivElement>(null);
  const welcomeComposeRect = useRef<DOMRect | null>(null);
  const isMobile = useMedia('(max-width: 600px), (pointer: coarse)');
  const reduceMotion = useMedia('(prefers-reduced-motion: reduce)');
  const chrome = chatChrome[locale];
  const streamTranslations = useMemo(() => ({ copyCode: copy.codeCopy, copied: copy.copied }), [copy.codeCopy, copy.copied]);

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
  const hasConversation = messages.length > 0;
  messagesRef.current = messages;

  useEffect(() => {
    if (!copyResult) return;
    const timer = setTimeout(() => setCopyResult(undefined), 1800);
    return () => clearTimeout(timer);
  }, [copyResult]);

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

  useLayoutEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    const resize = () => {
      const formStyle = getComputedStyle(textarea.form!);
      const columns = formStyle.gridTemplateColumns.split(' ').map(Number.parseFloat);
      // Decide compact mode at its actual available width, avoiding wrap/un-wrap loops.
      const compactWidth = textarea.form!.clientWidth - Number.parseFloat(formStyle.paddingLeft) - Number.parseFloat(formStyle.paddingRight)
        - columns[0]! - columns.at(-1)! - 2 * Number.parseFloat(formStyle.columnGap);
      const textStyle = getComputedStyle(textarea);
      const singleLineHeight = Number.parseFloat(textStyle.lineHeight) + Number.parseFloat(textStyle.paddingTop) + Number.parseFloat(textStyle.paddingBottom);
      if (compactWidth > 0) {
        textarea.style.width = `${compactWidth}px`;
        textarea.style.height = 'auto';
        setMultiline(textarea.scrollHeight > singleLineHeight + 1);
        textarea.style.width = '';
      }
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(220, Math.max(32, textarea.scrollHeight))}px`;
    };
    resize();
    let lastWidth = textarea.clientWidth;
    const observer = new ResizeObserver(() => {
      if (textarea.clientWidth === lastWidth) return;
      lastWidth = textarea.clientWidth;
      resize();
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [input, hasConversation]);

  useLayoutEffect(() => {
    const area = composeRef.current;
    const previous = welcomeComposeRect.current;
    welcomeComposeRect.current = null;
    if (!hasConversation || !area || !previous || reduceMotion || !area.animate) return;
    const current = area.getBoundingClientRect();
    // Move the same composer from the welcome position before the first token.
    const animation = area.animate([
      { transform: `translateY(${previous.top - current.top}px)`, width: `${previous.width}px` },
      { transform: 'translateY(0)', width: `${current.width}px` },
    ], { duration: 280, easing: 'cubic-bezier(.2, 0, 0, 1)' });
    return () => animation.cancel();
  }, [hasConversation, reduceMotion]);

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
    if (!messages.length) welcomeComposeRect.current = composeRef.current?.getBoundingClientRect() ?? null;
    setErrorCode(undefined); setNotice(''); clearError(); setInput('');
    inputRef.current?.focus({ preventScroll: true });
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
      await navigator.clipboard.writeText(getMessageText(message)); setCopyResult({ id: message.id, ok: true });
    } catch { setCopyResult({ id: message.id, ok: false }); }
  }, []);

  const newChat = useCallback(async () => {
    if (busy) await stop();
    setMessages([]); setStatuses({}); setInput(''); setNotice(''); setErrorCode(undefined); setCopyResult(undefined); clearError();
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }, [busy, clearError, setMessages, stop]);

  const currentError = errorCode ? copy.errors[errorCode] : undefined;
  const retryMessage = messages.at(-1);
  return (
    <section aria-label={copy.title} className="xue-chat" data-chat-state={hasConversation ? 'conversation' : 'welcome'}>
      <a className="xue-skip-link" href="#xue-chat-message">{copy.label}</a>
      <div className="xue-chat-workspace">
      <header className="header xue-chat-header">
        <div className="container cc-narrow header-inner">
          <a className="header-name-link" href="/"><span className="header-name">{site.name[locale]}</span></a>
          <div className="header-controls">
            <a aria-label={chrome.home} className="header-control-button header-home-link" href="/" title={chrome.home}><Home aria-hidden="true" size={18} strokeWidth={1.8} /></a>
            <button aria-label={chrome.newChat} className="header-control-button" onClick={newChat} title={chrome.newChat} type="button"><Plus aria-hidden="true" size={18} strokeWidth={1.8} /></button>
            <button aria-label={chrome.dark} aria-pressed="false" className="header-control-button xue-theme-toggle" data-theme-toggle="" data-label-dark={chrome.dark} data-label-light={chrome.light} title={chrome.dark} type="button"><Sun aria-hidden="true" className="xue-theme-sun" size={18} strokeWidth={1.8} /><Moon aria-hidden="true" className="xue-theme-moon" size={18} strokeWidth={1.8} /></button>
          </div>
        </div>
      </header>
      <div className="xue-chat-main" data-chat-state={hasConversation ? 'conversation' : 'welcome'}>
      <Conversation className="xue-chat-log" reduceMotion={reduceMotion}>
        <ConversationContent>
          {!hasConversation && <div className="xue-welcome">
            <div className="xue-welcome-heading"><Baby aria-hidden="true" className="xue-welcome-icon" size={34} strokeWidth={1.5} /><h1>{copy.welcome}</h1></div>
            <p className="xue-sr-only">{copy.intro}</p>
          </div>}
          {messages.map((message, index) => {
            const savedStatus = messageStatus(message, index, messages, status, statuses);
            const text = getMessageText(message);
            if (message.role === 'assistant' && !text.trim()) return null;
            const result = copyResult?.id === message.id ? copyResult : undefined;
            const CopyIcon = result ? result.ok ? Check : X : Copy;
            return <Message from={message.role} key={message.id}>
              <span className="xue-sr-only">{message.role === 'user' ? copy.you : copy.name}: </span>
              <MessageContent>{message.role === 'assistant'
                ? <MessageResponse animated={reduceMotion ? false : textAnimations[locale]} isAnimating={savedStatus === 'streaming'} mode={savedStatus === 'streaming' ? 'streaming' : 'static'} translations={streamTranslations}>{text}</MessageResponse>
                : <span className="xue-user-text">{text}</span>}</MessageContent>
              {message.role === 'assistant' && savedStatus !== 'streaming' && text && <MessageActions>
                <MessageAction label={result ? result.ok ? copy.copied : copy.copyFailed : copy.copy} onClick={() => copyAnswer(message)}><CopyIcon aria-hidden="true" size={16} strokeWidth={1.8} /></MessageAction>
                {savedStatus !== 'error' && index === messages.length - 1 && <MessageAction label={copy.retry} onClick={() => retry(message.id)}><RefreshCcw aria-hidden="true" size={16} strokeWidth={1.8} /></MessageAction>}
              </MessageActions>}
            </Message>;
          })}
          {busy && <ThinkingIndicator label={copy.busy} reduceMotion={reduceMotion} />}
        </ConversationContent>
        <ConversationScrollButton label={copy.returnToBottom} reduceMotion={reduceMotion} />
      </Conversation>
      <div className="xue-compose-area" ref={composeRef}>
        {currentError && <div className="xue-error-card" role="alert"><div><strong>{currentError.title}</strong><p>{currentError.detail}</p></div>
          {retryable.has(errorCode!) && retryMessage && <button onClick={() => retry(retryMessage.id)} type="button" aria-label={copy.retry} title={copy.retry}><RefreshCcw aria-hidden="true" size={18} /></button>}
        </div>}
        <form className="xue-composer" data-multiline={multiline} onSubmit={submit}>
          <details className="xue-starters-menu">
            <summary aria-label={chrome.starters} title={chrome.starters}><Plus aria-hidden="true" size={22} strokeWidth={1.5} /></summary>
            <div className="xue-starters-popover">{prompts.map(prompt => <button key={prompt.text} type="button" onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); setInput(prompt.text); inputRef.current?.focus(); }}>{prompt.label}</button>)}</div>
          </details>
          <label className="xue-sr-only" htmlFor="xue-chat-message">{copy.label}</label>
          <textarea aria-describedby="xue-chat-input-hint" autoComplete="off" id="xue-chat-message" maxLength={4000}
            onChange={event => setInput(event.currentTarget.value)}
            onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => { if (shouldSubmitChat(event.nativeEvent, isMobile)) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}
            placeholder={copy.placeholder} ref={inputRef} rows={1} value={input} />
          {!hasConversation && <span className="xue-identity xue-composer-identity"><Baby aria-hidden="true" size={18} strokeWidth={1.7} /><strong>{copy.name}</strong><span>{chrome.assistant}</span></span>}
          <div className="xue-composer-toolbar">
            {busy ? <button aria-label={copy.stop} className="xue-send xue-stop" key="stop" onClick={stopReply} title={copy.stop} type="button"><Square aria-hidden="true" size={15} strokeWidth={2} /></button>
              : <button aria-label={copy.send} className="xue-send" disabled={!input.trim()} key="send" title={copy.send} type="submit"><CornerDownLeft aria-hidden="true" size={20} strokeWidth={1.8} /></button>}
          </div>
        </form>
        {hasConversation && <div className="xue-composer-footer"><p>{chrome.disclaimer}</p><span className="xue-identity"><Baby aria-hidden="true" size={18} strokeWidth={1.7} /><strong>{copy.name}</strong><span>{chrome.assistant}</span></span></div>}
        <p className="xue-sr-only" id="xue-chat-input-hint">{isMobile ? copy.mobileInputHint : copy.inputHint}</p>
        {!hasConversation && <div aria-label={chrome.starters} className="xue-prompts">
          {prompts.map(prompt => <button key={prompt.text} onClick={() => { setInput(prompt.text); inputRef.current?.focus(); }} type="button">{prompt.label}</button>)}
        </div>}
        {storageFailed && <p className="xue-storage-note" role="status">{copy.storage}</p>}
        {notice === 'recovery' && <p className="xue-storage-note" role="alert">{copy.recovery}</p>}
      </div>
      </div>
      </div>
      {(notice === 'stopped' || notice === 'interrupted') && <span className="xue-sr-only" role="status">{copy[notice]}</span>}
    </section>
  );
}
