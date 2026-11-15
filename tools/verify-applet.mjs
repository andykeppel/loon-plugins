import fs from 'node:fs';
import vm from 'node:vm';

const plugin = fs.readFileSync('WeChatApplet.plugin', 'utf8');
const applet = fs.readFileSync('scripts/WeChatApplet.js', 'utf8');
const bus = fs.readFileSync('scripts/ZhangShangGongJiao.js', 'utf8');
const required = [
  '#!name=微信小程序去广告',
  '#!author=ddgksf2013',
  '#!openUrl=https://apps.apple.com/cn/app/id414478124',
  '#!icon=https://is1-ssl.mzstatic.com/image/thumb/',
  '[Rewrite]', '[Script]', '[MITM]',
  'hostname = api.blibee.com',
  'hostname = api.blibee.com, ucmp.sf-express.com',
  'response-body-replace-regex advertisement ddgksf2013',
  'scripts/WeChatApplet.js',
  'scripts/ZhangShangGongJiao.js'
];
for (const s of required) if (!plugin.includes(s)) throw new Error('Applet plugin missing '+s);
const rewritten = plugin.split('\n').filter(line => line.startsWith('^'));
const scriptLines = plugin.split('\n').filter(line => line.startsWith('http-response '));
if (rewritten.length !== 3 || scriptLines.length !== 2 ||
    scriptLines.some(line => !line.includes('requires-body=true') ||
      !line.includes('https://raw.githubusercontent.com/andykeppel/loon-plugins/main/scripts/'))) {
  throw new Error('Unexpected Applet rewrite/script structure');
}
const hosts = plugin.match(/^hostname\s*=\s*(.+)$/m)?.[1].split(',').map(s=>s.trim());
if (!hosts || hosts.length<20 || hosts.length!==new Set(hosts).size) throw new Error('Invalid MITM list');

function testJS(source, body) {
  let result, doneCount=0;
  vm.runInNewContext(source, {
    $response:{body}, $request:{url:'https://example.com/'},
    $done:function(value){result=value;doneCount++;}
  }, {timeout:1000});
  if (doneCount!==1 || typeof result?.body!=='string') throw new Error('Response script did not return Loon body object');
  return result.body;
}
const sample = '{"excitationAd":"1","Ad":"1","ad":true,"AdId":"abc","adid":"123","fr_videp_if":"1","adunit":"x"}';
const cleaned = testJS(applet, sample);
for(const x of ['"excitationAd":"0"','"ad":false','"AdId":""','"adid":""','"fr_videp_if":"0"']) {
  if (!cleaned.includes(x)) throw new Error('Applet response fixture failed: '+x);
}
const cleanBus = testJS(bus, '{"Ad":1,"Ad_ab":1,"safe":true}');
if (!cleanBus.includes('"Ad":0') || !cleanBus.includes('"Ad_ab":0') ||
    !cleanBus.includes('"safe":true')) throw new Error('Bus response fixture failed');
const pattern1 = new RegExp(scriptLines[0].split(' script-path=')[0].slice('http-response '.length));
const pattern2 = new RegExp(scriptLines[1].split(' script-path=')[0].slice('http-response '.length));
if (!pattern1.test('https://wx.mygolbs.com/WxBusServer/ApiData.do') ||
    pattern1.test('https://api.example.com/anything') ||
    !pattern2.test('https://blog.example.com/wp-json/demo/v1/posts') ||
    pattern2.test('https://blog.example.com/other/path')) throw new Error('Applet URL matcher fixture failed');
console.log('PASS: 3 rewrites, 2 Loon response scripts, source attribution, MITM list and script body fixtures');
