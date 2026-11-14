import fs from 'node:fs';
import vm from 'node:vm';

for (const [filename, name, appId] of [
  ['YangJiBao.plugin', '养基宝去广告', 'id1597754877'],
  ['WeiboEnhanced.plugin', '微博助手功能增强', 'id350962117'],
  ['WeiboAds.plugin', '微博去广告', 'id350962117'],
  ['WeiboCombined.plugin', '微博助手合并版', 'id350962117']
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

// Check YangJiBao rewrite scope so upstream syncing cannot restore the old,
// too-narrow ad matcher or the unrelated-host vip_info matcher.
const yjb = fs.readFileSync('YangJiBao.plugin', 'utf8');
const rewriteLines = yjb.split('\n').filter(line => line.includes('response-body-json-jq '));
if (rewriteLines.length !== 2) throw new Error('Unexpected YangJiBao rewrite rule count: ' + rewriteLines.length);
const findRewrite = token => {
  const line = rewriteLines.find(line => line.includes(token));
  if (!line) throw new Error('Missing YangJiBao rewrite: ' + token);
  return new RegExp(line.split(' response-body-json-jq ')[0]);
};
const adRegex = findRewrite('unify_ad');
const accountRegex = findRewrite('vip_info');
const expectMatch = (re, url, expected) => {
  if (re.test(url) !== expected) throw new Error('YangJiBao matcher mistake: ' + url + ' (' + re + ')');
};
[
  'https://api.yangjibao.com/unify_ad',
  'https://api.yangjibao.com/api/unify_ad',
  'https://a.b.yangjibao.com/v2/unify_ad?client=ios',
  'https://yangjibao.com/unify_ad',
].forEach(url => expectMatch(adRegex, url, true));
[
  'https://api.notyangjibao.com/unify_ad',
  'https://other.example.com/unify_ad',
  'https://api.yangjibao.com/unify_ads',
].forEach(url => expectMatch(adRegex, url, false));
[
  'https://api.yangjibao.com/wxapi/account',
  'https://api.yangjibao.com/vip_info',
].forEach(url => expectMatch(accountRegex, url, true));
[
  'https://someapp.example.com/vip_info',
  'https://api.yangjibao.com/vip_information',
].forEach(url => expectMatch(accountRegex, url, false));
if (!yjb.includes('hostname = yangjibao.com, *.yangjibao.com')) {
  throw new Error('YangJiBao apex hostname missing from MITM');
}

const plugin = fs.readFileSync('WeiboEnhanced.plugin', 'utf8');
const mirrored = 'script-path=https://raw.githubusercontent.com/andykeppel/loon-plugins/main/scripts/weibo_json.js';
const occurrences = plugin.split(mirrored).length - 1;
if (occurrences < 3 || plugin.includes('script-path=https://ddgksf2013.top/')) {
  throw new Error('Weibo script URLs not properly self-hosted: ' + occurrences);
}

if (plugin.includes('自定义功能') || plugin.includes('weibo_message_ads')) throw new Error('Original Weibo assistant still contains custom ad patch');
const ads = fs.readFileSync('WeiboAds.plugin','utf8');
if (!ads.includes('[Script]') || !ads.includes('[MITM]')) throw new Error('Separate Weibo ad plugin is incomplete');
if (!ads.includes('friends')) throw new Error('Separate Weibo ad plugin is missing timeline coverage');

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

const originalAds = fs.readFileSync('scripts/weibo_ads_original.js','utf8');
const adsPlugin = fs.readFileSync('WeiboAds.plugin','utf8');
const combinedPlugin = fs.readFileSync('WeiboCombined.plugin','utf8');
if (originalAds.includes('createSettingsHandler')) throw new Error('Ads-only script includes assistant');
if (!adsPlugin.includes('scripts/weibo_ads_original.js') || adsPlugin.includes('scripts/weibo_json.js')) throw new Error('Ads plugin uses assistant script');
if (!combinedPlugin.includes('tag=weibo_message_ads, enable={custom}') || !combinedPlugin.includes('tag=自定义功能')) throw new Error('Combined switch missing');
if (fs.readFileSync('WeiboEnhanced.plugin','utf8').includes('tag=自定义功能')) throw new Error('Original assistant has custom switch');
