import fs from 'node:fs';
import vm from 'node:vm';
const plugin=fs.readFileSync('MeiTuan.plugin','utf8');
const script=fs.readFileSync('scripts/MeiTuan.js','utf8');
const icon=fs.readFileSync('icons/MeiTuan.png');
for(const expected of [
 '#!name=美团去广告',
 '#!author=ZenmoFeiShi',
 '#!openUrl=https://apps.apple.com/cn/app/id423084029',
 '#!icon=https://raw.githubusercontent.com/andykeppel/loon-plugins/main/icons/MeiTuan.png',
 'DOMAIN-WILDCARD,mquic-*.meituan.com,REJECT',
 'hostname = apimobile.meituan.com'
])if(!plugin.includes(expected))throw new Error('Missing: '+expected);
const sections=['[Rule]','[Rewrite]','[Script]','[MITM]'];
for(const section of sections)if(!plugin.includes(section))throw new Error('Missing '+section);
const lines=plugin.split('\n');
const rules=lines.filter(x=>/^(DOMAIN|DOMAIN-WILDCARD|IP-CIDR|IP-CIDR6),/.test(x));
const rewrites=lines.filter(x=>/^\^/.test(x));
const scripts=lines.filter(x=>/^http-response\s/.test(x));
if(rules.length<35||rewrites.length!==2||scripts.length!==8)throw new Error('Converted rule coverage changed: '+rules.length+','+rewrites.length+','+scripts.length);
if(!scripts.every(x=>x.includes('scripts/MeiTuan.js')&&x.includes('requires-body=true')))
 throw new Error('Missing mirrored script / body handling');
if(icon.length<5000||icon.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Not an official PNG icon');
function run(url,obj){
 let result=null;
 const sandbox={
   $request:{url},
   $response:{body:JSON.stringify(obj)},
   $done:x=>{result=x;},
   console:{log:()=>{}}
 };
 vm.runInNewContext(script,sandbox,{timeout:2000});
 return result;
}
const tab=run('https://apimobile.meituan.com/aggroup/indexTab',{
 data:{resource:{tabArea:[{tabName:'homepage'},{tabName:'video'},{tabName:'mine'}]}}
});
if(!tab?.body)throw new Error('Meituan tab cleaner did not return a modified body');
const tabs=JSON.parse(tab.body).data.resource.tabArea.map(x=>x.tabName);
if(tabs.includes('video')||!tabs.includes('homepage')||!tabs.includes('mine'))throw new Error('Meituan tabs incorrectly filtered: '+tabs);
const feed=run('https://feedguess.meituan.com/lycoris/scene/gwc_feed1_2265',{data:[{id:1}]});
if(!feed?.body||JSON.parse(feed.body).data.length!==0)throw new Error('Meituan feed filter did not remove ads');
const unmodified=run('https://apimobile.meituan.com/other',{data:{ok:1}});
if(!unmodified||Object.keys(unmodified).length!==0)throw new Error('Unrelated request was modified');
console.log('PASS: ZenmoFeiShi source conversion, official icon, 8 script hooks, 2 rejects and JS fixture tests');
