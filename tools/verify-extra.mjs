import fs from 'node:fs';
const specs=[
  ['JiJianHuiLv.plugin','极简汇率',1,0,851033695,'icons/JiJianHuiLv.png'],
];
for(const [file,name,minScript,minRewrite,appId,icon] of specs){
  const content=fs.readFileSync(file,'utf8');
  if(!content.includes('#!name='+name)||!content.includes('#!author=ddgksf2013'))throw new Error(file+': header mismatch');
  if(appId&&!content.includes('#!openUrl=https://apps.apple.com/cn/app/id'+appId))throw new Error(file+': App Store metadata missing');
  if(!content.includes('#!icon=https://raw.githubusercontent.com/andykeppel/loon-plugins/main/'+icon))throw new Error(file+': icon mismatch');
  if(content.includes('icon not found')||content.includes('script.hub/file/_start_/'))throw new Error(file+': converter artifact detected');
  const scripts=content.split('\n').filter(x=>/^http-(response|request)\s/.test(x)).length;
  const rewrites=content.split('\n').filter(x=>/^\^/.test(x)).length;
  if(scripts<minScript||rewrites<minRewrite||!/\[MITM\]/i.test(content))throw new Error(file+': rule count mismatch '+scripts+','+rewrites);
  const img=fs.readFileSync(icon);
  if(img.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error(icon+': not PNG');
  console.log(file+': scripts='+scripts+', rewrites='+rewrites+', icon='+img.length+'B');
}
const fx=fs.readFileSync('JiJianHuiLv.plugin','utf8');
if(!fx.includes('script-path=https://raw.githubusercontent.com/andykeppel/loon-plugins/main/scripts/jijianhuilv.vip.js'))throw new Error('Currency script is not mirrored');
console.log('PASS: currency plugin format, rule coverage and icons validated.');
