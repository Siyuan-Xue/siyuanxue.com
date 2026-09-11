import {test,expect} from 'bun:test';
import {rejects} from 'node:assert/strict';
import {readChatStream,shouldSubmit} from '../src/utils/chat';
test('handles split UTF-8/SSE, suppresses arbitrary metadata and requires DONE',async()=>{
 const wire=new TextEncoder().encode('data: {"choices":[{"delta":{"content":"你好<script>"}}]}\r\n\r\ndata: [DONE]\n\n');
 const stream=new ReadableStream<Uint8Array>({start(c){for(const b of wire)c.enqueue(new Uint8Array([b]));c.close()}});let text='';await readChatStream(stream,x=>text+=x);expect(text).toBe('你好<script>');
 await rejects(readChatStream(new ReadableStream({start(c){c.close()}}),()=>{}));
});
test('error events fail safely and keyboard respects IME and Shift',async()=>{
 await rejects(readChatStream(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('event: error\ndata: {"error":"stream_error"}\n\n'));c.close()}}),()=>{}));
 expect(shouldSubmit({key:'Enter',shiftKey:false,isComposing:false,keyCode:13})).toBe(true);
 expect(shouldSubmit({key:'Enter',shiftKey:false,isComposing:true,keyCode:13})).toBe(false);
 expect(shouldSubmit({key:'Enter',shiftKey:true,isComposing:false,keyCode:13})).toBe(false);
 expect(shouldSubmit({key:'Enter',shiftKey:false,isComposing:false,keyCode:229})).toBe(false);
});
