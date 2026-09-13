import {expect,test} from 'bun:test';
import {parseHTML} from 'linkedom';
import {mountChat, type ChatFetch} from '../src/utils/chat-ui';
import {CHAT_STORAGE_KEY} from '../src/utils/chat-session';
const copy={you:'You',name:'xue',long:'Start a new conversation.',ready:'Reply complete.',busy:'Replying',error:'Retry',limit:'Wait',stopped:'Reply stopped.',interrupted:'Reply interrupted.',copy:'Copy answer',codeCopy:'Copy code',copied:'Copied',copyFailed:'Copy failed',recovery:'Recovered draft',storage:'Cannot save'};
function setup(fetcher:ChatFetch,raw:string|null=null){
 const {document,window}=parseHTML('<html><body><section data-chat><div data-welcome></div><div data-prompts><button data-prompt="Hello">Hello</button></div><ol data-messages></ol><p data-status role="status"></p><p data-storage-status></p><form><textarea></textarea><button data-send></button><button data-stop></button></form><button data-new></button></section></body></html>');
 const root=document.querySelector<HTMLElement>('[data-chat]')!; root.dataset.copy=JSON.stringify(copy);
 const data=new Map<string,string>(); if(raw)data.set(CHAT_STORAGE_KEY,raw);
 const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value)},removeItem:(key:string)=>{data.delete(key)}};
 mountChat(root,{window:window as unknown as Window,fetch:fetcher,storage,clipboard:undefined});
 const input=root.querySelector('textarea')!; const send=(text:string)=>{input.value=text; input.dispatchEvent(new window.Event('input')); root.querySelector('form')!.dispatchEvent(new window.Event('submit',{cancelable:true}));};
 return {root,input,send,window,data};
}
const tick=()=>new Promise(r=>setTimeout(r,10));
const wire=(text:string,done=true)=>`data: ${JSON.stringify({choices:[{delta:{content:text}}]})}\n\n${done?'data: [DONE]\n\n':''}`;
test('oversized completed answer blocks continuation without losing draft and new chat clears it',async()=>{
 let requests=0; const ui=setup((async()=>{requests++; return new Response(wire('x'.repeat(4001)));}) as ChatFetch);
 ui.send('Hi'); await tick(); expect(ui.root.querySelector('[data-status]')!.textContent).toBe('Reply complete.'); expect(ui.root.querySelector('ol')!.textContent).toContain('x'.repeat(4001));
 ui.send('Continue'); await tick(); expect(requests).toBe(1); expect(ui.input.value).toBe('Continue'); expect(ui.root.querySelector('[data-status]')!.textContent).toBe('Start a new conversation.');
 ui.root.querySelector('[data-new]')!.dispatchEvent(new ui.window.Event('click')); ui.send('New'); await tick(); expect(requests).toBe(2);
});
test('restores interrupted output and draft without resubmitting',()=>{
 let requests=0;const ui=setup((async()=>{requests++;return new Response()}) as ChatFetch,JSON.stringify({version:1,draft:'Keep typing',messages:[{role:'user',content:'Hi',status:'complete'},{role:'assistant',content:'Partial',status:'streaming'}]}));
 expect(requests).toBe(0); expect(ui.input.value).toBe('Keep typing'); expect(ui.root.querySelector('ol')!.textContent).toContain('Partial'); expect(ui.root.querySelector('[data-status]')!.textContent).toBe('Reply interrupted.');
});
test('new conversation aborts pending fetch and fences a late server result',async()=>{
 let resolve!:(r:Response)=>void; let signal:AbortSignal|undefined; const ui=setup((async(_url,options)=>{signal=options?.signal as AbortSignal; return await new Promise<Response>(r=>{resolve=r})}) as ChatFetch);
 ui.send('Old'); ui.root.querySelector('[data-new]')!.dispatchEvent(new ui.window.Event('click')); expect(signal?.aborted).toBe(true);
 resolve(new Response(wire('STALE'))); await tick(); expect(ui.root.querySelector('ol')!.textContent).toBe(''); expect(ui.root.querySelector('[data-status]')!.textContent).toBe('');
});
test('stop persists partial reply and a newer draft; continuing sends only visible content',async()=>{
 let streamController!:ReadableStreamDefaultController<Uint8Array>; const bodies:string[]=[];
 const ui=setup((async(_url,options)=>{bodies.push(String(options?.body)); if(bodies.length>1)return new Response(wire('Continued'));return new Response(new ReadableStream({start(c){streamController=c; c.enqueue(new TextEncoder().encode(wire('Partial',false)))}}));}) as ChatFetch);
 ui.send('Question'); await tick(); ui.input.value='Continue'; ui.input.dispatchEvent(new ui.window.Event('input')); ui.root.querySelector('[data-stop]')!.dispatchEvent(new ui.window.Event('click')); await tick();
 expect(ui.input.value).toBe('Continue'); expect(ui.root.querySelector('ol')!.textContent).toContain('Partial'); expect(JSON.parse(ui.data.get(CHAT_STORAGE_KEY)!).messages[1].status).toBe('stopped');
 ui.send('Continue'); await tick(); expect(JSON.parse(bodies[1]!)).toEqual({messages:[{role:'user',content:'Question'},{role:'assistant',content:'Partial'},{role:'user',content:'Continue'}]});
 // A fetch implementation that ignores abort must still be fenced.
 try {streamController.enqueue(new TextEncoder().encode(wire('Late')))}catch{}
 await tick(); expect(ui.root.querySelector('ol')!.textContent).not.toContain('Late');
});
test('copy failures are visible and user HTML is plain text',async()=>{
 const ui=setup((async()=>new Response(wire('Answer'))) as ChatFetch); ui.send('<img src=x onerror=alert(1)>'); await tick(); expect(ui.root.querySelector('img')).toBeNull(); expect(ui.root.querySelector('ol')!.textContent).toContain('<img src=x onerror=alert(1)>');
 ui.root.querySelector('[data-answer-copy]')!.dispatchEvent(new ui.window.Event('click',{bubbles:true})); await tick(); expect(ui.root.querySelector('[data-status]')!.textContent).toBe('Copy failed');
});

test('unloading aborts generation and persists an interrupted response plus the current draft',async()=>{
 let signal:AbortSignal|undefined;
 const ui=setup((async(_url,options)=>{signal=options?.signal as AbortSignal; return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(wire('Received',false)))}}))}) as ChatFetch);
 ui.send('Question'); await tick(); ui.input.value='Unsent'; ui.input.dispatchEvent(new ui.window.Event('input'));
 ui.window.dispatchEvent(new ui.window.Event('pagehide'));
 expect(signal?.aborted).toBe(true);
 const state=JSON.parse(ui.data.get(CHAT_STORAGE_KEY)!);
 expect(state.draft).toBe('Unsent'); expect(state.messages[1]).toEqual({role:'assistant',content:'Received',status:'interrupted'});
});

test('an empty failed reply can be retried through the alternating-role bridge',async()=>{
 const bodies:unknown[]=[];
 const ui=setup((async(_url,options)=>{bodies.push(JSON.parse(String(options?.body))); return bodies.length===1?new Response('Unavailable',{status:503}):new Response(wire('Answered'))}) as ChatFetch);
 ui.send('Original question'); await tick(); ui.send('Please try again'); await tick();
 expect(bodies[1]).toEqual({messages:[{role:'user',content:'Original question\n\nPlease try again'}]});
 expect(ui.root.querySelectorAll('.chat-message--user')[1]?.textContent).toBe('You: Please try again');
 expect(ui.root.querySelector('[data-status]')!.textContent).toBe('Reply complete.');
});
