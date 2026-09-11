import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const MAX_BODY = 32768;
export function validMessages(body) {
 if (!body || Object.keys(body).length !== 1 || !Array.isArray(body.messages)) return false;
 const m = body.messages;
 return m.length > 0 && m.length <= 24 && m.length % 2 === 1 && m.reduce((n, x) => n + (typeof x?.content === 'string' ? x.content.length : 16001), 0) <= 16000 && m.every((x, i) => x && Object.keys(x).length === 2 && x.role === (i % 2 ? 'assistant' : 'user') && typeof x.content === 'string' && x.content.trim().length > 0 && x.content.length <= 4000);
}

export function createChatServer({apiKey = process.env.HERMES_API_KEY, apiUrl = process.env.HERMES_API_URL || 'http://127.0.0.1:8642/v1/chat/completions', allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://siyuanxue.com,https://xuesiyuan.com').split(','), timeoutMs = 120000} = {}) {
 if (!apiKey?.trim()) throw new Error('HERMES_API_KEY is required');
 const endpoint = new URL(apiUrl);
 if (endpoint.protocol !== 'http:' || !['127.0.0.1', '[::1]', 'localhost'].includes(endpoint.hostname)) throw new Error('Hermes API must use loopback HTTP');
 const clients = new Map(); let active = 0;
 const server = createServer(async (req, res) => {
  const json = (status, error) => {if (!res.destroyed) {res.writeHead(status, {'Content-Type':'application/json', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...(status === 429 ? {'Retry-After':'60'} : {})});res.end(JSON.stringify(typeof error === 'string' ? {error} : error));}};
  if(req.url === '/chat-api/health' && req.method === 'GET') return json(200,{ok:true});
  if(req.url !== '/chat-api') return json(404,'not_found');
  if(req.method !== 'POST') return json(405,'method_not_allowed');
  if(req.headers.origin && !allowedOrigins.includes(req.headers.origin)) return json(403,'origin_denied');
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return json(415,'json_required');
  const now = Date.now();
  for(const [key,value] of clients) if(!value.active && now-value.last >= 60000) clients.delete(key);
  // The reverse proxy must overwrite X-Real-IP. Direct callers can only reach loopback.
  const ip = String(req.headers['x-real-ip'] || req.socket.remoteAddress).slice(0,128);
  let client = clients.get(ip);
  if(!client) {if(clients.size >= 10000) return json(429,'rate_limited');client={times:[],active:0,last:now};clients.set(ip,client);}
  client.times = client.times.filter(t=>now-t<60000);client.last=now;
  if(client.times.length>=6 || client.active>=2 || active>=4) return json(429,'rate_limited');
  client.times.push(now);client.active++;active++;
  const controller = new AbortController();
  const timer = setTimeout(()=>{controller.abort(); if(!res.headersSent) json(502,'upstream_unavailable'); else if(!res.destroyed) res.end('event: error\ndata: {"error":"stream_error"}\n\n'); req.destroy();},timeoutMs);
  res.on('close',()=>controller.abort());
  try {
   const chunks=[];let size=0;
   for await(const chunk of req) {size+=chunk.length;if(size>MAX_BODY){json(413,'body_too_large');return;}chunks.push(chunk);}
   let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return json(400,'invalid_request');}
   if(!validMessages(body)) return json(400,'invalid_request');
   if(controller.signal.aborted) return;
   const upstream = await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'hermes',stream:true,messages:body.messages,session_id:randomUUID()}),signal:controller.signal});
   if(!upstream.ok || !upstream.body) throw new Error('upstream');
   res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'});
   const decoder=new TextDecoder();let buffer='';let done=false;
   const write = async text => {if(res.destroyed || controller.signal.aborted) throw new Error('closed');if(!res.write(text)) await new Promise((resolve,reject)=>{const cleanup=()=>{res.off('drain',drain);res.off('close',close)};const drain=()=>{cleanup();resolve()};const close=()=>{cleanup();reject(new Error('closed'))};res.once('drain',drain);res.once('close',close);});};
   for await(const chunk of upstream.body) {
    buffer+=decoder.decode(chunk,{stream:true});
    if(buffer.length>262144) throw new Error('frame');
    let match;
    while((match=/\r?\n\r?\n/.exec(buffer))) {
     const frame=buffer.slice(0,match.index);buffer=buffer.slice(match.index+match[0].length);
     const data=frame.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');
     if(!data) continue;
     if(data==='[DONE]'){done=true;break;}
     const event=JSON.parse(data);
     if(event.error || /^event:\s*error\s*$/m.test(frame)) throw new Error('upstream');
     const content=event.choices?.[0]?.delta?.content;
     if(typeof content==='string' && content) await write(`data: ${JSON.stringify({choices:[{delta:{content}}]})}\n\n`);
    }
    if(done)break;
   }
   if(!done) throw new Error('incomplete');
   await write('data: [DONE]\n\n');res.end();
  } catch {if(!res.headersSent) json(502,'upstream_unavailable');else if(!res.destroyed && !res.writableEnded) res.end('event: error\ndata: {"error":"stream_error"}\n\n');}
  finally{clearTimeout(timer);controller.abort();client.active--;active--;}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;server.maxHeadersCount=30;
 return server;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
 const host=process.env.CHAT_HOST || '127.0.0.1';if(!['127.0.0.1','::1'].includes(host)) throw new Error('CHAT_HOST must be loopback');
 const server=createChatServer();server.listen(Number(process.env.CHAT_PORT || 8643),host);
 const stop=()=>{server.close();server.closeAllConnections();};process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
