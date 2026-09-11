export function shouldSubmit(e: {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  keyCode: number;
}): boolean {
  return (
    e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229
  );
}
export async function readChatStream(
  stream: ReadableStream<Uint8Array>,
  onText: (text: string) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) throw new Error('incomplete');
      buffer += decoder.decode(value, { stream: true });
      if (buffer.length > 262144) throw new Error('invalid_stream');
      let match;
      while ((match = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);
        const data = frame
          .split(/\r?\n/)
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trimStart())
          .join('\n');
        if (!data) continue;
        if (data === '[DONE]') return;
        const parsed = JSON.parse(data);
        if (parsed.error) throw new Error('stream_error');
        const text = parsed.choices?.[0]?.delta?.content;
        if (typeof text === 'string') onText(text);
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
