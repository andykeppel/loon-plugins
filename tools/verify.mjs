import fs from 'node:fs';
import vm from 'node:vm';

for (const [filename, name, appId] of [
  ['YangJiBao.plugin', '养基宝去广告', 'id1597754877'],
  ['WeiboEnhanced.plugin', '微博助手·完整净化', 'id350962117']
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

const argumentBlock = plugin.match(/^\[Argument\]\s*\n([\s\S]*?)(?=^\[)/m)?.[1] || '';
if (!/^custom\s*=\s*switch,false,type=boolean,tag=自定义功能,/m.test(argumentBlock)) {
  throw new Error('Weibo custom feature switch missing or default is not off');
}
const messageRule = plugin.split('\n').find(line => line.includes('tag=weibo_message_ads'));
if (!messageRule) throw new Error('Weibo message timeline ad rule missing');
if (!messageRule.includes('scripts/weibo_activity_clean.js')) throw new Error('Message timeline must use the independent cleaner');
if (!messageRule.includes('enable={custom}')) throw new Error('Message timeline cleaner is not controlled by the custom switch');
const messagePattern = messageRule.match(/^http-response\s+(.+?)\s+script-path=/)?.[1];
if (!messagePattern) throw new Error('Weibo message timeline URL matcher missing');
const messageRegex = new RegExp(messagePattern);
for (const url of [
  'https://api.weibo.cn/2/statuses/friends/timeline?since_id=1',
  'https://mapi.weibo.cn/2/statuses/unread_friends_timeline?since_id=1',
  'https://api.weibo.com/2/statuses/friends_timeline',
  'https://mapi.weibo.com/2/statuses/unread_friends/timeline'
]) if (!messageRegex.test(url)) throw new Error('Weibo message timeline matcher missed: ' + url);
if (messageRegex.test('https://example.com/2/statuses/friends/timeline')) throw new Error('Weibo message matcher is too broad');
const mitm = plugin.match(/^hostname\s*=.*$/mi)?.[0] || '';
for (const host of ['api.weibo.cn','mapi.weibo.cn','api.weibo.com','mapi.weibo.com']) {
  if (!mitm.includes(host)) throw new Error('Weibo MITM host missing: ' + host);
}


const customCleaner = fs.readFileSync('scripts/weibo_activity_clean.js', 'utf8');
function testActivity(input) {
  let response;
  vm.runInNewContext(customCleaner, {
    $response: {body: JSON.stringify(input)},
    $done(result) { response = result; }
  }, {timeout: 2000});
  return response.body ? JSON.parse(response.body) : input;
}
const sampleActivity = {data: {statuses: [
  {id: 1, mblogtypename: '广告'},
  {id: 2, mblogtypename: '荐读'},
  {id: 3, mblogtypename: '热推'},
  {id: 4, text: '正常关注用户微博'},
  {id: 5, mblog: {content_auth_info: {content_auth_title: '广告'}}}
], cards: [
  {id: 6, card_group: [{id: 7, mblogtypename: '荐读'}]},
  {id: 8, mblog: {text: '普通动态'}}
], advertises: [{id: 9}]}};
const resultActivity = testActivity(sampleActivity);
if (JSON.stringify(resultActivity.data.statuses.map(x => x.id)) !== '[4]' ||
    JSON.stringify(resultActivity.data.cards.map(x => x.id)) !== '[8]' ||
    Object.prototype.hasOwnProperty.call(resultActivity.data, 'advertises')) {
  throw new Error('Activity cleaner failed ad/recommendation test');
}
const normalActivity = {data: {statuses: [{id: 1, text: '普通微博'}]}};
if (JSON.stringify(testActivity(normalActivity)) !== JSON.stringify(normalActivity)) {
  throw new Error('Activity cleaner changed an ordinary timeline');
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
