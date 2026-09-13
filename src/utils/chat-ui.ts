import { readChatStream, shouldSubmit } from './chat';
import { CHAT_STORAGE_KEY, ChatSession, restoreSession, saveSession, type ChatMessage } from './chat-session';
import { copyChatText, renderChatMarkdown } from './chat-markdown';

export type ChatFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type Environment = {
  window: Window;
  fetch: ChatFetch;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  clipboard?: Pick<Clipboard, 'writeText'>;
};

export function mountChat(root: HTMLElement, env: Environment): void {
  const doc = root.ownerDocument;
  const copy: Record<string, string> = JSON.parse(root.dataset.copy!);
  const form = root.querySelector('form')!;
  const input = root.querySelector('textarea')!;
  const list = root.querySelector<HTMLOListElement>('[data-messages]')!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;
  const storageStatus = root.querySelector<HTMLElement>('[data-storage-status]')!;
  const welcome = root.querySelector<HTMLElement>('[data-welcome]')!;
  const prompts = root.querySelector<HTMLElement>('[data-prompts]')!;
  const send = root.querySelector<HTMLButtonElement>('[data-send]')!;
  const stop = root.querySelector<HTMLButtonElement>('[data-stop]')!;
  const fresh = root.querySelector<HTMLButtonElement>('[data-new]')!;
  let raw: string | null = null;
  try { raw = env.storage?.getItem(CHAT_STORAGE_KEY) ?? null; }
  catch { storageStatus.textContent = copy.storage!; }
  const restored = restoreSession(raw);
  const session = new ChatSession(restored.state);
  let active: { turn: number; controller: AbortController } | null = null;
  let renderTimer: ReturnType<typeof setTimeout> | undefined;
  const persist = () => { storageStatus.textContent = saveSession(env.storage, session.state) ? '' : copy.storage!; };
  const grow = () => { input.style.height = 'auto'; input.style.height = `${Math.min(220, Math.max(64, input.scrollHeight))}px`; };
  function controls() {
    send.disabled = active !== null || !input.value.trim();
    send.hidden = active !== null;
    stop.hidden = active === null;
    stop.disabled = active === null;
    root.dataset.state = session.state.messages.length ? 'conversation' : 'welcome';
    welcome.hidden = prompts.hidden = session.state.messages.length > 0;
    fresh.hidden = session.state.messages.length === 0 && !session.draft;
  }
  function nearBottom() { return doc.documentElement.scrollHeight - env.window.innerHeight - env.window.scrollY < 120; }
  function follow(needed: boolean) { if (needed) env.window.scrollTo?.({ top: doc.documentElement.scrollHeight, behavior: 'instant' }); }
  function renderMessage(message: ChatMessage, index: number): HTMLLIElement {
    const li = doc.createElement('li'); li.className = `chat-message chat-message--${message.role}`;
    li.dataset.index = String(index);
    const label = doc.createElement('span'); label.className = 'chat-sr-only'; label.textContent = `${message.role === 'user' ? copy.you : copy.name}: `;
    const body = doc.createElement('div'); body.className = 'chat-message-content';
    if (message.role === 'user') body.textContent = message.content;
    else if (message.content) renderChatMarkdown(body, message.content, { codeCopy: copy.codeCopy! });
    else if (message.status === 'streaming') { body.classList.add('chat-waiting'); body.textContent = '···'; body.setAttribute('aria-hidden', 'true'); }
    li.append(label, body);
    if (message.role === 'assistant') {
      const note = doc.createElement('p'); note.className = 'chat-message-note';
      if (message.status !== 'complete' && message.status !== 'streaming') note.textContent = copy[message.status] ?? copy.error!;
      li.appendChild(note);
      if (message.content && message.status !== 'streaming') {
        const button = doc.createElement('button'); button.type = 'button'; button.dataset.answerCopy = '';
        button.className = 'chat-copy-answer'; button.setAttribute('aria-label', copy.copy!); button.title = copy.copy!;
        const template = root.querySelector<HTMLTemplateElement>('[data-copy-icon]');
        if (template) button.appendChild(template.content.cloneNode(true)); else button.textContent = copy.copy!;
        li.appendChild(button);
      }
    }
    return li;
  }
  function renderAll() { list.replaceChildren(...session.state.messages.map(renderMessage)); controls(); }
  function renderLast() {
    clearTimeout(renderTimer); renderTimer = undefined;
    const shouldFollow = nearBottom();
    const index = session.state.messages.length - 1;
    const message = session.state.messages[index];
    if (message) list.lastElementChild?.replaceWith(renderMessage(message, index));
    follow(shouldFollow);
  }
  function finish(turn: number, result: ChatMessage['status'], notice: string) {
    if (!session.finish(turn, result)) return;
    active = null;
    renderLast(); controls(); persist(); status.textContent = notice;
  }
  function cancel(result: 'stopped' | 'interrupted') {
    if (!active) return;
    const { turn, controller } = active;
    // Fence callbacks immediately, even if a network implementation delays abort rejection.
    finish(turn, result, copy[result]!);
    controller.abort();
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (active || !input.value.trim()) return;
    session.draft = input.value;
    let messages;
    let turn: number;
    try { messages = session.request(); turn = session.begin(); }
    catch { status.textContent = copy.long!; persist(); return; }
    const controller = new AbortController(); active = { turn, controller };
    const followAfterSend = nearBottom();
    input.value = ''; grow(); renderAll(); persist(); controls();
    status.textContent = copy.busy!;
    input.focus({ preventScroll: true }); follow(followAfterSend);
    try {
      const response = await env.fetch('/chat-api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }), signal: controller.signal });
      if (active?.turn !== turn) { await response.body?.cancel().catch(() => {}); return; }
      if (!response.ok || !response.body) throw new Error(response.status === 429 ? 'limit' : 'error');
      await readChatStream(response.body, chunk => {
        if (session.append(turn, chunk)) {
          // Save partial content promptly; limit Markdown work to one render per animation-sized interval.
          persist();
          if (!renderTimer) renderTimer = setTimeout(renderLast, 50);
        }
      });
      if (active?.turn !== turn) return;
      if (!session.state.messages.at(-1)?.content.trim()) throw new Error('error');
      finish(turn, 'complete', copy.ready!);
    } catch (error) {
      if (active?.turn !== turn) return;
      const kind = error instanceof Error && ['limit', 'long'].includes(error.message) ? error.message : 'error';
      finish(turn, 'error', copy[kind]!);
      controller.abort();
    }
  });
  input.addEventListener('input', () => { session.draft = input.value; grow(); controls(); persist(); });
  input.addEventListener('keydown', event => { if (shouldSubmit(event)) { event.preventDefault(); form.requestSubmit(); } });
  stop.addEventListener('click', () => { cancel('stopped'); input.focus({ preventScroll: true }); });
  fresh.addEventListener('click', () => {
    const previous = active;
    active = null; session.reset(); clearTimeout(renderTimer); renderTimer = undefined;
    previous?.controller.abort();
    input.value = ''; status.textContent = ''; renderAll(); grow(); persist(); input.focus({ preventScroll: true });
  });
  prompts.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-prompt]');
    if (!button) return;
    input.value = button.dataset.prompt!; session.draft = input.value; grow(); controls(); persist(); input.focus({ preventScroll: true });
  });
  list.addEventListener('click', async event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-answer-copy], [data-code-copy]');
    if (!button) return;
    const text = button.hasAttribute('data-code-copy') ? button.parentElement?.querySelector('code')?.textContent : session.state.messages[Number(button.closest<HTMLElement>('[data-index]')?.dataset.index)]?.content;
    if (typeof text !== 'string') return;
    const copied = await copyChatText(text, env.clipboard);
    status.textContent = copied ? copy.copied! : copy.copyFailed!;
    button.title = copied ? copy.copied! : copy.copyFailed!;
  });
  env.window.addEventListener('pagehide', () => { cancel('interrupted'); persist(); });
  input.value = session.draft; renderAll(); grow();
  status.textContent = copy[restored.notice] ?? '';
  persist();
}
