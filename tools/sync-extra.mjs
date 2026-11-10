/**
 * Independently synchronizes StartUpAds and JiJianHuiLv into Loon.
 * Conversion uses the pinned Script Hub parser. Original contributors are credited.
 * Published files are only changed after all conversions and source checks pass.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import got from 'got';
const require=createRequire(import.meta.url);
const repo=process.env.GITHUB_REPOSITORY;
if(!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo))throw new Error('GITHUB_REPOSITORY missing');
const base='https://raw.githubusercontent.com/'+repo+'/main';
const parserCommit='bc1b8b05138adead482d87b284c58a34d8470503';
const parserUrl='https://raw.githubusercontent.com/Script-Hub-Org/Script-Hub/'+parserCommit+'/Rewrite-Parser.js';
const statePath='.last-extra-sync.json';
const state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath,'utf8')):{};
const force=process.env.FORCE_SYNC==='true';
const checkedAt=new Date();
const delay=48*60*60*1000;
if(!force && state.last_success && checkedAt-new Date(state.last_success)<delay){
  console.log('Skip: most recent successful extra-plugin sync was less than 48 hours ago.');
  process.exit(0);
}

const specs=[
  {file:'StartUpAds.plugin',short:'墨鱼去开屏',name:'墨鱼去开屏 2.0',desc:'墨鱼多应用开屏广告净化合集',
    url:'https://ddgksf2013.top/rewrite/StartUpAds.conf',sourceName:'StartUpAds.conf',
    icon:'StartUpAds.png',minRewrite:300,minScript:30,kind:'qx'},
  {file:'JiJianHuiLv.plugin',short:'极简汇率',name:'极简汇率',desc:'墨鱼极简汇率 Pro 脚本',
    url:'https://ddgksf2013.top/scripts/jijianhuilv.vip.js',sourceName:'jijianhuilv.vip.js',
    icon:'JiJianHuiLv.png',appId:851033695,minRewrite:0,minScript:1,kind:'js'},
];
const sha256=s=>crypto.createHash('sha256').update(s).digest('hex');
const prefix='https://ddgksf2013.top/scripts/';
const moneyScriptPath='scripts/jijianhuilv.vip.js';

async function getText(url,max=1024*1024){
  const r=await got(url,{headers:{'User-Agent':'Surge'},followRedirect:true,throwHttpErrors:false,
    timeout:{request:35000},retry:{limit:1},responseType:'text'});
  if(r.statusCode!==200)throw new Error('HTTP '+r.statusCode+' from '+url);
  const body=r.body;
  if(!body.trim() || Buffer.byteLength(body)>max || /<!doctype|<html|<body|<head/i.test(body.slice(0,1200))){
    throw new Error('Source invalid, HTML, or oversized: '+url);
  }
  return body;
}
function localURL(spec,content){
  const n=encodeURIComponent(spec.short+'@ddgksf2013')+'+'+encodeURIComponent(spec.desc);
  const qs=['type=qx-rewrite','n='+n,'headers=User-Agent:surge',
    'del=true','jqEnabled=true','target=loon-plugin','category=ddgksf2013','localtext='+encodeURIComponent(content)].join('&');
  return 'http://script.hub/file/_start_/http://local.text/_end_/'+spec.sourceName+'.sgmodule?'+qs;
}
function runParser(parser,spec,content){
  return new Promise((resolve,reject)=>{
    let finished=false;
    const timer=setTimeout(()=>{if(!finished){finished=true;reject(new Error('Script Hub timeout: '+spec.file));}},90000);
    function capture(value){
      if(finished)return;
      finished=true;clearTimeout(timer);
      const data=value?.response||value;
      if(data?.status!==200 || typeof data?.body!=='string')return reject(new Error('Bad conversion for '+spec.file+': '+JSON.stringify(data).slice(0,500)));
      resolve(data.body);
    }
    const context={require,module:{exports:{}},process,Buffer,console,setTimeout,clearTimeout,
      $request:{url:localURL(spec,content)},$argument:'Notify=关闭通知',__captureScriptHub:capture};
    try{vm.runInNewContext(parser,context,{filename:'Rewrite-Parser.js'});}
    catch(e){if(!finished){finished=true;clearTimeout(timer);reject(e);}}
  });
}
function makeHeader(spec){
  const lines=[
    '#!name='+spec.name,
    '#!desc='+spec.desc,
    '#!author=ddgksf2013',
    '#!homepage=https://github.com/ddgksf2013',
    '#!icon='+base+'/icons/'+spec.icon+'?v=official-20261110',
    '#!tag=ddgksf2013',
  ];
  if(spec.appId)lines.splice(4,0,'#!openUrl=https://apps.apple.com/cn/app/id'+spec.appId);
  else lines.splice(4,0,'#!openUrl='+spec.url);
  return lines.join('\n');
}
function metadata(spec,converted){
  const lines=converted.replace(/\r\n/g,'\n').split('\n');
  const firstSection=lines.findIndex(line=>/^\s*\[[A-Za-z][^\]]*\]\s*$/.test(line));
  if(firstSection<0)throw new Error('No Loon sections: '+spec.file);
  const h=lines.slice(0,firstSection);
  if(!h.some(line=>/ddgksf2013/i.test(line)))throw new Error('Missing upstream credit in '+spec.file);
  const others=h.filter(line=>/^#!\w+=/.test(line)&&!/^#!(?:name|desc|icon|tag|author|homepage|openUrl)\s*=/i.test(line));
  return makeHeader(spec)+'\n'+others.join('\n')+'\n\n'+lines.slice(firstSection).join('\n').replace(/\n*$/,'\n');
}
function validate(spec,body){
  if(spec.kind==='qx'){
    if(!/hostname\s*=/i.test(body)||!/url\s+(?:reject|script|jsonjq)/i.test(body)){
      throw new Error('Not a complete QX rewrite: '+spec.url);
    }
    if(spec.file==='StartUpAds.plugin'&&body.length<40000)throw new Error('Startup source truncated');
  } else {
    if(!body.includes('$response.body')||!body.includes('$done('))throw new Error('Missing JS response logic: '+spec.url);
  }
}
function checkPlugin(spec,plugin){
  const arr=plugin.split('\n');
  const rewrite=arr.filter(x=>/^\^/.test(x)).length;
  const script=arr.filter(x=>/^http-(request|response)\s/.test(x)).length;
  const mitm=arr.find(x=>/^\s*hostname\s*=/.test(x));
  if(rewrite<spec.minRewrite||script<spec.minScript||!mitm){
    throw new Error('Potential incomplete conversion '+spec.file+': rewrite='+rewrite+', scripts='+script+', mitm='+Boolean(mitm));
  }
  const paths=[...plugin.matchAll(/script-path\s*=\s*(https?:\/\/[^,\s]+)/g)].map(m=>m[1]);
  return {rewrite,script,mitmHosts:mitm.slice(0,160),scriptPaths:[...new Set(paths)]};
}
function makeJSPlugin(spec,source){
  if(!source.includes('vipStatus')||!source.includes('$done('))throw new Error('Extreme currency JS format changed');
  return makeHeader(spec)+'\n\n[Script]\n'+
    'http-response ^https?:\\/\\/explorer\\.tratao\\.com\\/api\\/client\\/xtool\\/vip(?:[/?#]|$) '+
    'script-path='+base+'/'+moneyScriptPath+', requires-body=true, timeout=60, tag=jijianhuilv.vip\n\n'+
    '[MITM]\nhostname = explorer.tratao.com\n';
}
async function appIcon(id){
  const r=await got('https://itunes.apple.com/lookup',{searchParams:{id,country:'cn'},
    timeout:{request:25000},retry:{limit:1},responseType:'json'});
  const item=r.body.results?.find(x=>Number(x.trackId)===Number(id));
  if(!item?.artworkUrl512 && !item?.artworkUrl100)throw new Error('App Store icon unavailable: '+id);
  const raw=item.artworkUrl512||item.artworkUrl100;
  const url=raw.replace(/\/\d+x\d+bb\.(jpg|jpeg|png)(\?.*)?$/i,'/512x512bb.png');
  const png=await got(url,{responseType:'buffer',timeout:{request:25000},retry:{limit:1}});
  if(png.rawBody.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('App Store icon is not PNG: '+id);
  const width=png.rawBody.readUInt32BE(16),height=png.rawBody.readUInt32BE(20);
  if(width<128||width!==height||png.rawBody.length<4000)throw new Error('App Store icon failed validation: '+id);
  console.log('App Store icon '+id+': '+item.trackName+' '+width+'px');
  return png.rawBody;
}
try{
  const inputs=new Map();
  for(const spec of specs){
    const body=await getText(spec.url,1.5*1024*1024);
    validate(spec,body);
    inputs.set(spec.file,body);
    console.log('Fetched '+spec.file+', bytes='+Buffer.byteLength(body));
  }
  const parserOriginal=await getText(parserUrl,500000);
  const exit='case"Node.js":process.exit(1)';
  if(!parserOriginal.includes(exit))throw new Error('Pinned Script Hub runtime changed');
  const parser=parserOriginal.replace(exit,'case"Node.js":globalThis.__captureScriptHub(t)');
  const output=new Map();
  const audits={time:checkedAt.toISOString(),converter:parserCommit,plugins:{}};
  for(const spec of specs){
    const raw=inputs.get(spec.file);
    let built;
    if(spec.kind==='qx'){
      const converted=await runParser(parser,spec,raw);
      built=metadata(spec,converted);
    }else built=makeJSPlugin(spec,raw);
    const counts=checkPlugin(spec,built);
    output.set(spec.file,built);
    audits.plugins[spec.file]={source:spec.url,sourceSHA256:sha256(raw),pluginSHA256:sha256(built),...counts};
    console.log('OK '+spec.file+', rewrites='+counts.rewrite+', scripts='+counts.script);
  }

  const images=new Map();
  images.set('icons/JiJianHuiLv.png',await appIcon(851033695));
  // StartUpAds is a rule collection, not an App Store application.
  // The fixed, community-used Fastfish icon is checked into icons/StartUpAds.png.
  // Keep it unchanged on subsequent upstream syncs.
  if(!fs.existsSync('icons/StartUpAds.png'))throw new Error('Missing pinned StartUpAds icon');

  // All reads, conversions, content checks and icon checks complete.
  fs.mkdirSync('icons',{recursive:true});
  fs.mkdirSync('scripts',{recursive:true});
  fs.mkdirSync('reports',{recursive:true});
  for(const [file,body] of output)fs.writeFileSync(file,body,'utf8');
  fs.writeFileSync(moneyScriptPath,inputs.get('JiJianHuiLv.plugin'));
  for(const [file,body] of images)fs.writeFileSync(file,body);
  fs.writeFileSync('reports/extra-metadata.json',JSON.stringify(audits,null,2)+'\n');
  fs.writeFileSync(statePath,JSON.stringify({last_success:checkedAt.toISOString(),sources:Object.fromEntries(specs.map(s=>[s.file,sha256(inputs.get(s.file))]))},null,2)+'\n');
  console.log('SUCCESS: 2 extra Loon plugins generated and validated.');
}catch(e){
  console.error('SYNC FAILED; published plugins were not replaced: '+(e.stack||e));
  process.exitCode=1;
}
