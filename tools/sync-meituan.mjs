/**
 * Original author: ZenmoFeiShi (TG@ZenMoFiShi)
 * Source: https://github.com/ZenmoFeiShi/Qx/blob/main/MT.snippet
 * Convert the author's specific Meituan Quantumult X snippet into Loon.
 * No Script Hub and no unrelated all-app StartUpAds.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import got from 'got';

const repo=process.env.GITHUB_REPOSITORY || 'andykeppel/loon-plugins';
const base='https://raw.githubusercontent.com/'+repo+'/main';
const upstream='https://raw.githubusercontent.com/ZenmoFeiShi/Qx/main/';
const stateFile='.last-meituan-sync.json';
const sourceSnippet='MT.snippet';
const sourceScript='MT.js';
const pluginFile='MeiTuan.plugin';
const scriptFile='scripts/MeiTuan.js';
const iconFile='icons/MeiTuan.png';
const now=new Date();
const force=process.env.FORCE_SYNC==='true';
const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{};
if(!force && state.last_success && now-new Date(state.last_success)<48*60*60*1000){
 console.log('Meituan: skipped; checked upstream less than 48h ago.');
 process.exit(0);
}
const sha256=data=>crypto.createHash('sha256').update(data).digest('hex');

async function getText(url) {
 const r=await got(url,{throwHttpErrors:false,followRedirect:true,timeout:{request:30000},retry:{limit:2},responseType:'text'});
 if(r.statusCode!==200||!r.body?.trim()||r.body.length>150000||/<html|<!doctype/i.test(r.body.slice(0,500)))
   throw new Error('Invalid response from '+url+': HTTP '+r.statusCode);
 return r.body.replace(/\r\n/g,'\n');
}
async function officialIcon(id){
 const lookup=await got('https://itunes.apple.com/lookup',{searchParams:{id,country:'cn'},responseType:'json',timeout:{request:30000}});
 const a=lookup.body.results?.find(x=>Number(x.trackId)===id);
 if(!a?.artworkUrl512 && !a?.artworkUrl100)throw new Error('Official Meituan App icon missing from App Store');
 const url=(a.artworkUrl512||a.artworkUrl100).replace(/\/\d+x\d+bb\.(png|jpg|jpeg)(\?.*)?$/i,'/512x512bb.png');
 const resp=await got(url,{responseType:'buffer',timeout:{request:30000},retry:{limit:2}});
 const buf=resp.rawBody;
 if(buf.length<5000||buf.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||buf.readUInt32BE(16)<128)
  throw new Error('Official icon download is not valid PNG');
 console.log('Official Meituan App Store icon:',a.trackName,buf.readUInt32BE(16)+'px');
 return buf;
}
function convert(snippet, script) {
 if(!snippet.includes('TG@ZenMoFiShi')||!snippet.includes('MT.js')||!snippet.includes('hostname ='))
   throw new Error('The author source no longer matches the known Meituan QX structure');
 if(!script.includes('mtqxTab')||!script.includes('mtqxFeed')||!script.includes('$done('))
   throw new Error('The upstream Meituan response script lost expected handlers');
 const rules=[],rewrites=[],scripts=[];
 let mitm;
 for(const rawLine of snippet.split('\n')){
  const line=rawLine.trim();
  if(!line||line.startsWith('#'))continue;
  const domain=line.match(/^(host|host-wildcard|ip-cidr|ip6-cidr),\s*([^,]+),\s*reject\s*$/i);
  if(domain){
   const types={'host':'DOMAIN','host-wildcard':'DOMAIN-WILDCARD','ip-cidr':'IP-CIDR','ip6-cidr':'IP-CIDR6'};
   const t=types[domain[1].toLowerCase()];
   rules.push(t+','+domain[2].trim()+',REJECT'+(t.startsWith('IP-')?',no-resolve':''));
   continue;
  }
  if(line.startsWith('hostname =')){mitm=line;continue;}
  if(line.startsWith('^')){
   const m=line.match(/^(\S+)\s+url\s+(reject|script-response-body)(?:\s+(\S+))?\s*$/i);
   if(!m)throw new Error('Unsupported original QX rewrite line: '+line);
   if(m[2].toLowerCase()==='reject'){
    rewrites.push(m[1]+' - reject');
   }else {
    if(!m[3]?.endsWith('/MT.js'))throw new Error('Unexpected third-party script in upstream Meituan snippet: '+line);
    scripts.push('http-response '+m[1]+' script-path='+base+'/'+scriptFile+'?v=diagnostic-20261110, requires-body=true, timeout=10, tag=美团净化');
   }
   continue;
  }
  if(/^#!/.test(line))continue;
  throw new Error('Unrecognized QX line: '+line);
 }
 if(rules.length<35||rewrites.length!==2||scripts.length!==8||!mitm)
   throw new Error('Incomplete original rules: rules='+rules.length+', rewrites='+rewrites.length+', scripts='+scripts.length);
 if(!rules.some(x=>x.startsWith('DOMAIN-WILDCARD,mquic-*.meituan.com,REJECT')))
   throw new Error('Missing original QUIC rule');
 const hostnames=mitm.replace(/^hostname\s*=\s*/,'');
 if(hostnames.split(',').length<7)throw new Error('Unexpected MITM host list');
 // Rule, URL Rewrite and Script scopes are intentionally only the Meituan author’s entries.
 const plugin=[
  '#!name=美团去广告',
  '#!desc=美团应用净化：底栏、推荐流、搜索热词及开屏广告',
  '#!author=ZenmoFeiShi',
  '#!homepage=https://github.com/ZenmoFeiShi/Qx',
  '#!openUrl=https://apps.apple.com/cn/app/id423084029',
  '#!icon='+base+'/'+iconFile+'?v=official-meituan-20261110',
  '#!tag=ZenmoFeiShi',
  '',
  '# Original author: TG@ZenMoFiShi',
  '# Original QX source: '+upstream+sourceSnippet,
  '# Source version: '+(snippet.match(/#!update\s*=\s*([^\n]+)/)?.[1]?.trim()||'upstream'),
  '# Converted for Loon; response script logic unchanged.',
  '',
  '[Rule]', ...rules,
  '',
  '[Rewrite]', ...rewrites,
  '',
  '[Script]', ...scripts,
  '',
  '[MITM]','hostname = '+hostnames,
  '',
 ].join('\n');
 return {plugin,counts:{rules:rules.length,rewrites:rewrites.length,scripts:scripts.length,mitmHosts:hostnames.split(',').length}};
}
function addMinimalDiagnostics(source) {
 const anchor='const mtqxHideTabs =';
 if(!source.includes(anchor))throw new Error('Meituan logging injection anchor missing');
 const end='  if (changed) $done({ body: JSON.stringify(obj) });\n  else $done({});';
 if(!source.includes(end))throw new Error('Meituan result handler has changed upstream; refusing to overwrite');
 const startLog='console.log("[美团净化] 脚本命中：" + mtqxUrl.split("?")[0]);\n';
 const updated=source.replace(anchor,startLog+anchor)
   .replace(end,'  console.log("[美团净化] "+(changed?"已修改：":"命中但未修改：")+mtqxUrl.split("?")[0]);\n'+end);
 return updated;
}
try{
 const [snippet,script,icon]=await Promise.all([getText(upstream+sourceSnippet),getText(upstream+sourceScript),officialIcon(423084029)]);
 const {plugin,counts}=convert(snippet,script);
 const instrumented=addMinimalDiagnostics(script);
 console.log('Meituan converted:',JSON.stringify(counts));
 fs.mkdirSync('scripts',{recursive:true});
 fs.mkdirSync('icons',{recursive:true});
 fs.mkdirSync('reports',{recursive:true});
 fs.writeFileSync(pluginFile,plugin);
 fs.writeFileSync(scriptFile,instrumented);
 fs.writeFileSync(iconFile,icon);
 fs.writeFileSync('reports/meituan-metadata.json',JSON.stringify({lastCheck:now.toISOString(),source:upstream+sourceSnippet,scriptSource:upstream+sourceScript,sourceHash:sha256(snippet),scriptHash:sha256(script),mirroredScriptHash:sha256(instrumented),pluginHash:sha256(plugin),...counts},null,2)+'\n');
 fs.writeFileSync(stateFile,JSON.stringify({last_success:now.toISOString(),source_hash:sha256(snippet),script_hash:sha256(script)},null,2)+'\n');
 console.log('SUCCESS: ZenmoFeiShi Meituan original rules mirrored and converted.');
}catch(e){console.error('Meituan sync failed, previous published plugin not overwritten:',e.stack||e);process.exitCode=1;}
