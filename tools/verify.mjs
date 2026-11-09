import fs from 'node:fs';
import vm from 'node:vm';

for (const [filename, name, appId] of [
  ['YangJiBao.plugin', '养基宝去广告', 'id1597754877'],
  ['WeiboEnhanced.plugin', '微博助手功能增强', 'id350962117']
]) {
  const content = fs.readFileSync(filename, 'utf8');
  const checks = [
    '#!name=' + name,
    '#!author=ddgksf2013',
    '#!openUrl=https://apps.apple.com/cn/app/' + appId,
    '#!icon=https://raw.githubusercontent.com/andykeppel/loon-plugins/main/icons/'
  ];
  for (const x of checks) if (!content.includes(x)) throw new Error(filename + ' missing ' + x);
}

const plugin = fs.readFileSync('WeiboEnhanced.plugin', 'utf8');
const mirrored = 'script-path=https://raw.githubusercontent.com/andykeppel/loon-plugins/main/scripts/weibo_json.js';
const occurrences = plugin.split(mirrored).length - 1;
if (occurrences < 3 || plugin.includes('script-path=https://ddgksf2013.top/')) {
  throw new Error('Weibo script URLs not properly self-hosted: ' + occurrences);
}

const source = fs.readFileSync('scripts/weibo_json.js', 'utf8');
if (source.length < 30000) throw new Error('Weibo script is unexpectedly small');
let output;
const sandbox = {
  module: {exports: {}},
  console: {log() {}, warn() {}, error() {}},
  setTimeout, clearTimeout, URL, URLSearchParams, TextEncoder, TextDecoder,
  $loon: {},
  $persistentStore: {read() {return null;}, write() {return true;}},
  $request: {url: 'https://api.weibo.cn/__qx_weibo_settings__/',method:'GET',headers:{}},
  $done(value) {output=value;}
};
vm.runInNewContext(source, sandbox, {timeout: 8000});
if (output?.response?.status !== 200 || !output?.response?.body?.includes('<html')) {
  throw new Error('Weibo Loon settings page did not return HTTP 200 HTML');
}
console.log('PASS: names, author, official App Store URLs, GitHub mirror and Loon settings HTML response');
