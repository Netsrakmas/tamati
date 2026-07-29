// Capture one screenshot per idle behaviour plus the annoyed face, so the charm layer
// can be squint-tested on every change. The main harness screenshots greetings only.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, resolve } from 'node:path'
const ROOT = resolve(import.meta.dirname, '..', 'dist')
const SHOTS = resolve(import.meta.dirname, '..', 'artifacts')
const MIME={'.html':'text/html','.js':'text/javascript','.webmanifest':'application/manifest+json'}
const server = createServer(async (req,res)=>{
  const url=new URL(req.url,'http://x'); let p=join(ROOT,url.pathname==='/'?'index.html':url.pathname)
  const s=await stat(p).catch(()=>null); if(!s||s.isDirectory())p=join(ROOT,'index.html')
  res.writeHead(200,{'content-type':MIME[extname(p)]??'application/octet-stream'}); res.end(await readFile(p))
})
await new Promise(r=>server.listen(8142,'127.0.0.1',r))
const CH = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined
const b = await chromium.launch(CH?{executablePath:CH}:{})
const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true})
const p = await ctx.newPage()
await p.goto('http://127.0.0.1:8142/?debug')
await p.waitForFunction(()=>window.__tamati?.ready===true)
await p.waitForFunction(()=>window.__tamati.greetingActive===false,{timeout:8000})
const want = ['doze','sneeze','hiccup','chaseDust','lookAround','scratch']
const got = new Set()
for (let i=0;i<400 && got.size<want.length;i++){
  await p.waitForTimeout(120)
  const s = await p.evaluate(()=>({idle:window.__tamati.idle, face:window.__tamati.face}))
  if (s.idle && !got.has(s.idle)) { got.add(s.idle); await p.screenshot({path: join(SHOTS,`idle-${s.idle}.png`)}); console.log('captured', s.idle, 'face', s.face) }
}
// Poke it five times fast to catch the annoyed face.
const head = await p.evaluate(()=>window.__tamati.rig.find(q=>q.name==='head'))
for (let i=0;i<5;i++){ await p.mouse.click(Math.round(head.x), Math.round(head.y)); await p.waitForTimeout(90) }
await p.waitForTimeout(150)
console.log('after 5 taps: face', await p.evaluate(()=>window.__tamati.face), 'level', await p.evaluate(()=>window.__tamati.tapLevel))
await p.screenshot({path: join(SHOTS,'tapped-annoyed.png')})
await b.close(); server.close()
