import fs from 'node:fs';
import crypto from 'node:crypto';
import got from 'got';

const repo = process.env.GITHUB_REPOSITORY || 'andykeppel/loon-plugins';
if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Invalid repository');
const base = 'https://raw.githubusercontent.com/' + repo + '/main';
const sourceURL = 'https://raw.githubusercontent.com/ddgksf2013/Rewrite/master/AdBlock/Applet.conf';
const busURL = 'https://raw.githubusercontent.com/ddgksf2013/Scripts/master/zhangshanggongjiao.js';
const appletURL = 'https://raw.githubusercontent.com/ddgksf2013/Scripts/master/applet.js';
const iconURL = 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/aa/4b/f3/aa4bf3ed-2e7b-f100-cf89-567db2bb53bb/AppIcon-0-0-1x_U007epad-0-1-0-sRGB-0-85-220.png/512x512bb.jpg';
const hash = x => crypto.createHash('sha256').update(x).digest('hex');

async function getText(url) {
  const r = await got(url, {throwHttpErrors:false, followRedirect:true, responseType:'text',
    timeout:{request:30000}, retry:{limit:2}, headers:{'User-Agent':'Loon-Plugin-Mirror'}});
  if (r.statusCode !== 200 || !r.body?.trim() || Buffer.byteLength(r.body)>200000 ||
      /<html|<!doctype/i.test(r.body.slice(0,300))) {
    throw new Error('Invalid upstream content: ' + url + ' (HTTP ' + r.statusCode + ')');
  }
  return r.body.replace(/\r\n/g, '\n');
}

function convert(qx) {
  const hostnameLine = qx.match(/^hostname\s*=\s*(.*)$/m)?.[1];
  if (!hostnameLine || !qx.includes('微信小程序去除广告')) {
    throw new Error('Original MoYu Applet.conf not recognized');
  }
  const hosts = [...new Set(hostnameLine.split(',').map(s => s.trim()).filter(Boolean))];
  if (hosts.length < 20 || !hosts.includes('mp.weixin.qq.com') ||
      !hosts.includes('wx.mygolbs.com')) throw new Error('Incomplete original MITM host coverage');

  const lines = qx.split('\n').map(s => s.trim()).filter(s => s.startsWith('^'));
  if (lines.length !== 5) throw new Error('Original rewrite count changed: ' + lines.length);

  const rewrites = [], scripts = [];
  for (const line of lines) {
    let m = line.match(/^(\S+)\s+url\s+reject-200$/i);
    if (m) { rewrites.push(m[1] + ' - reject-200'); continue; }
    m = line.match(/^(\S+)\s+url\s+response-body\s+(\S+)\s+response-body\s+(\S+)$/i);
    if (m) { rewrites.push(m[1] + ' response-body-replace-regex ' + m[2] + ' ' + m[3]); continue; }
    m = line.match(/^(\S+)\s+url\s+script-response-body\s+(\S+)$/i);
    if (m) {
      let file, tag;
      if (m[2] === busURL || m[2].endsWith('/zhangshanggongjiao.js')) {
        file = 'ZhangShangGongJiao.js'; tag = '掌上公交净化';
      } else if (m[2] === appletURL || m[2].endsWith('/applet.js')) {
        file = 'WeChatApplet.js'; tag = '微信小程序净化';
      } else throw new Error('Unexpected script reference in original source: ' + m[2]);
      scripts.push('http-response ' + m[1] + ' script-path=' + base +
        '/scripts/' + file + ', requires-body=true, timeout=30, tag=' + tag);
      continue;
    }
    throw new Error('Unsupported upstream entry: ' + line);
  }
  if (rewrites.length !== 3 || scripts.length !== 2 ||
      !rewrites[2].includes('response-body-replace-regex advertisement ddgksf2013')) {
    throw new Error('Original Applet rule inventory changed');
  }
  return [
    '#!name=微信小程序去广告',
    '#!desc=墨鱼原版：特定小程序去广告、隐藏内容净化；不含5秒开屏',
    '#!author=ddgksf2013',
    '#!homepage=https://github.com/ddgksf2013/Rewrite',
    '#!openUrl=https://apps.apple.com/cn/app/id414478124',
    '#!icon=' + iconURL,
    '#!tag=ddgksf2013',
    '',
    '# Original source: ' + sourceURL,
    '# Original response scripts mirrored in this repository.',
    '# 注意：仅适用于原作者列出的部分小程序，无法去除小程序5秒开屏广告。',
    '',
    '[Rewrite]',
    '# 便利蜂、顺丰广告屏蔽',
    ...rewrites.slice(0,2),
    '# 公众号文章广告字段替换（保留墨鱼原版语义）',
    rewrites[2],
    '',
    '[Script]',
    '# 掌上公交与部分 WordPress 小程序',
    ...scripts,
    '',
    '[MITM]',
    'hostname = ' + hosts.join(', '),
    ''
  ].join('\n');
}

try {
  const [source, originalApplet, bus] = await Promise.all(
    [sourceURL, appletURL, busURL].map(getText));
  if (!originalApplet.includes('excitationAd') || !originalApplet.includes('$done(e)') ||
      !bus.includes('Ad_ab') || !bus.includes('$done({ body })')) {
    throw new Error('Original JS scripts changed unexpectedly');
  }
  // Original QX source returns $done(e) as a string; Loon requires $done({body:...}).
  const applet = originalApplet.replace(/\$done\(e\)(?=\s*\}\s*$)/, '$done({body:e})');
  if (!applet.includes('$done({body:e})')) throw new Error('Loon response adapter failed');
  const plugin = convert(source);
  fs.mkdirSync('scripts', {recursive:true});
  fs.mkdirSync('reports', {recursive:true});
  fs.writeFileSync('scripts/WeChatApplet.js', applet);
  fs.writeFileSync('scripts/ZhangShangGongJiao.js', bus);
  fs.writeFileSync('WeChatApplet.plugin', plugin);
  const date = new Date().toISOString();
  fs.writeFileSync('.last-applet-sync.json', JSON.stringify({
    last_success:date, source_hash:hash(source), applet_hash:hash(originalApplet),
    bus_hash:hash(bus)
  }, null, 2) + '\n');
  fs.writeFileSync('reports/applet-metadata.json', JSON.stringify({
    lastCheck:date, source:sourceURL, appletSource:appletURL, busSource:busURL,
    sourceSha256:hash(source), pluginSha256:hash(plugin), appletSha256:hash(applet),
    busSha256:hash(bus), rewriteCount:3, scriptCount:2,
    note:'Original QX response-body rewrite adapted to Loon; QX $done(e) adapted to $done({body:e}).'
  }, null, 2) + '\n');
  console.log('PASS: MoYu WeChat Applet rules and two response scripts mirrored');
} catch (e) {
  console.error('Applet sync failed; do not commit partially generated files:', e.stack || e);
  process.exitCode = 1;
}
