export const CHAT_STORAGE_KEY = 'xiaoxue-chat:v1';
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  status: 'complete' | 'streaming' | 'interrupted' | 'stopped' | 'error';
};
export type ChatState = { version: 1; messages: ChatMessage[]; draft: string };
const freshState = (): ChatState => ({ version: 1, messages: [], draft: '' });
const statuses = new Set(['complete', 'streaming', 'interrupted', 'stopped', 'error']);
const MAX_OUTPUT = 64000;
const MAX_STATE = 128000;

export function restoreSession(raw: string | null): { state: ChatState; notice: string } {
  const state = freshState();
  if (raw === null) return { state, notice: '' };
  try {
    if (raw.length > 512000) throw new Error('oversized');
    const data = JSON.parse(raw);
    // Recover a usable draft independently of corrupt or outdated history.
    if (typeof data?.draft === 'string') state.draft = data.draft.slice(0, MAX_OUTPUT);
    if (data?.version !== 1 || typeof data.draft !== 'string' || data.draft.length > 4000 ||
        !Array.isArray(data.messages) || data.messages.length > 48 || data.messages.length % 2 !== 0) throw new Error('invalid');
    let total = state.draft.length;
    let interrupted = false;
    const messages: ChatMessage[] = data.messages.map((value: unknown, index: number) => {
      if (!value || typeof value !== 'object') throw new Error('invalid');
      const m = value as ChatMessage;
      if (m.role !== (index % 2 === 0 ? 'user' : 'assistant') || typeof m.content !== 'string' ||
          !statuses.has(m.status) || m.content.length > MAX_OUTPUT ||
          (m.role === 'user' && (m.status !== 'complete' || !m.content.trim() || m.content.length > 4000))) throw new Error('invalid');
      total += m.content.length;
      if (total > MAX_STATE) throw new Error('oversized');
      interrupted ||= m.status === 'streaming';
      // Only actual content is restored. Provider metadata is intentionally dropped.
      return { role: m.role, content: m.content, status: m.status === 'streaming' ? 'interrupted' : m.status };
    });
    state.messages = messages;
    return { state, notice: interrupted ? 'interrupted' : '' };
  } catch {
    return { state, notice: 'recovery' };
  }
}

export function saveSession(storage: Pick<Storage, 'setItem'> | undefined, state: ChatState): boolean {
  try {
    if (!storage) return false;
    const serialized = JSON.stringify({ version: 1, draft: state.draft,
      messages: state.messages.map(({ role, content, status }) => ({ role, content, status })) });
    if (serialized.length > 512000) return false;
    storage.setItem(CHAT_STORAGE_KEY, serialized);
    return true;
  } catch { return false; }
}

export class ChatSession {
  state: ChatState;
  private generation = 0;
  private active: number | null = null;
  constructor(state: ChatState = freshState()) { this.state = state; }
  get draft() { return this.state.draft; }
  set draft(value: string) { this.state.draft = value; }
  request(): { role: 'user' | 'assistant'; content: string }[] {
    const content = this.draft.trim();
    if (!content) throw new Error('empty');
    // Keep received partial answers. Without an answer, combine consecutive user text
    // into one bridge turn, preserving context and its required alternating roles.
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const message of [...this.state.messages, { role: 'user' as const, content }]) {
      if (!message.content.trim()) continue;
      const previous = messages.at(-1);
      if (message.role === 'user' && previous?.role === 'user') previous.content += `\n\n${message.content}`;
      else messages.push({ role: message.role, content: message.content });
    }
    if (this.state.messages.length >= 48 || messages.length > 24 || messages.some(m => m.content.length > 4000) ||
        messages.reduce((n, m) => n + m.content.length, 0) > 16000 ||
        new TextEncoder().encode(JSON.stringify({ messages })).length > 32768) throw new Error('long');
    return messages;
  }
  begin(): number {
    if (this.active !== null) throw new Error('busy');
    this.request();
    const user = { role: 'user' as const, content: this.draft.trim() };
    this.state.messages.push({ ...user, status: 'complete' }, { role: 'assistant', content: '', status: 'streaming' });
    this.draft = '';
    this.active = ++this.generation;
    return this.active;
  }
  append(turn: number, text: string): boolean {
    if (this.active !== turn) return false;
    const reply = this.state.messages[this.state.messages.length - 1]!;
    if (reply.content.length + text.length > MAX_OUTPUT) {
      reply.content += text.slice(0, MAX_OUTPUT - reply.content.length);
      throw new Error('long');
    }
    reply.content += text;
    return true;
  }
  finish(turn: number, status: ChatMessage['status']): boolean {
    if (this.active !== turn) return false;
    this.state.messages[this.state.messages.length - 1]!.status = status;
    this.active = null;
    return true;
  }
  reset(): void { this.generation++; this.active = null; this.state = freshState(); }
}
