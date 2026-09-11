import {test,expect} from 'bun:test';
import {spawnSync} from 'node:child_process';
test('bridge boundary and streaming suite runs on production Node runtime',()=>{
 const run=spawnSync('node',['--experimental-strip-types','--test','tests/hermes-chat.node.ts'],{encoding:'utf8'});
 if(run.status!==0) throw new Error(run.stdout+run.stderr);
 expect(run.status).toBe(0);
},15000);
