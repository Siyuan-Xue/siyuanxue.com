import { expect, test } from 'bun:test';
import { ChatSession, restoreSession, saveSession } from '../src/utils/chat-session';

const saved = (messages: unknown[], draft = '') => JSON.stringify({version: 1, messages, draft});
test('restores content and draft, turns streaming into interrupted, ignores provider extras', () => {
 const result = restoreSession(saved([{role:'user',content:'Hi',status:'complete'}, {role:'assistant',content:'Hello',status:'streaming',reasoning:'private',tool_calls:[{arguments:'secret'}]}], 'next question'));
 expect(result.state.draft).toBe('next question');
 expect(result.state.messages).toEqual([{role:'user',content:'Hi',status:'complete'}, {role:'assistant',content:'Hello',status:'interrupted'}]);
 expect(result.notice).toBe('interrupted');
});
test('rejects malformed state without losing a recoverable draft', () => {
 for(const raw of ['{', saved([{role:'system',content:'bad',status:'complete'}], 'keep this'), saved([{role:'assistant',content:12,status:'complete'}], 'keep this')]) {
  const result=restoreSession(raw);
  expect(result.state.messages).toEqual([]);
  expect(result.notice).toBe('recovery');
  if(raw!=='{') expect(result.state.draft).toBe('keep this');
 }
 expect(restoreSession(JSON.stringify({version:2,messages:[],draft:'future draft'})).state.draft).toBe('future draft');
});
test('denied and quota-limited persistence leave in-memory draft and partial content intact', () => {
 const chat=new ChatSession(); chat.draft='Hello'; const turn=chat.begin(); chat.append(turn,'Partial'); chat.draft='Next';
 const before=JSON.stringify(chat.state);
 expect(saveSession({setItem(){throw new Error('quota')}},chat.state)).toBe(false);
 expect(JSON.stringify(chat.state)).toBe(before);
 expect(saveSession(undefined,chat.state)).toBe(false);
});
test('stop keeps partial content in the next request; empty failures merge unanswered user text into the next valid turn', () => {
 const chat=new ChatSession(); chat.draft='Question'; const turn=chat.begin(); chat.append(turn,'Part'); chat.finish(turn,'stopped'); chat.draft='Continue';
 expect(chat.request()).toEqual([{role:'user',content:'Question'},{role:'assistant',content:'Part'},{role:'user',content:'Continue'}]);
 const second=new ChatSession(); second.draft='Question'; const failed=second.begin(); second.finish(failed,'error'); second.draft='Try again';
 expect(second.request()).toEqual([{role:'user',content:'Question\n\nTry again'}]);
});
test('late stream chunks and completion cannot mutate a reset or newer conversation', () => {
 const chat=new ChatSession(); chat.draft='Old'; const old=chat.begin(); chat.reset(); chat.draft='New'; const fresh=chat.begin();
 expect(chat.append(old,'stale')).toBe(false); expect(chat.finish(old,'complete')).toBe(false);
 chat.append(fresh,'new answer');
 expect(chat.state.messages.map(m=>m.content)).toEqual(['New','new answer']);
});
test('request limits preserve the current draft and block oversized history, totals, and UTF-8 bodies', () => {
 const chat=new ChatSession(); chat.draft='a'.repeat(4001); expect(()=>chat.begin()).toThrow('long'); expect(chat.draft.length).toBe(4001);
 chat.draft='Hi'; const turn=chat.begin(); chat.append(turn,'x'.repeat(4001)); chat.finish(turn,'complete'); chat.draft='Continue'; expect(()=>chat.request()).toThrow('long');
 for(const [count,content] of [[24,'x'],[6,'x'.repeat(3000)],[4,'中'.repeat(3000)]] as const) {
  const state=restoreSession(saved(Array.from({length:count},(_,i)=>({role:i%2?'assistant':'user',content,status:'complete'})))).state;
  const limited=new ChatSession(state); limited.draft='Next'; expect(()=>limited.request()).toThrow('long');
 }
});
test('bounds streamed output and invalid saved sizes without silently truncating drafts', () => {
 const chat=new ChatSession(); chat.draft='Hi'; const turn=chat.begin(); expect(()=>chat.append(turn,'x'.repeat(64001))).toThrow('long');
 const result=restoreSession(saved(Array.from({length:60},()=>({role:'user',content:'x',status:'complete'})), 'recover me'));
 expect(result.state.draft).toBe('recover me'); expect(result.state.messages).toEqual([]);
});

test('invalid role order in storage cannot produce invalid bridge history', () => {
 const restored=restoreSession(saved([{role:'assistant',content:'orphan',status:'complete'}], 'draft'));
 expect(restored.state.messages).toEqual([]); expect(restored.state.draft).toBe('draft'); expect(restored.notice).toBe('recovery');
});
