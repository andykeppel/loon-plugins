/**
 * Loon plugin mirror. Display name, author, App Store link and icon are customized.
 * Original author and all generated rules remain untouched.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import got from 'got';

const require = createRequire(import.meta.url);
const repo = process.env.GITHUB_REPOSITORY;
if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('GITHUB_REPOSITORY is required');

const BASE = `https://raw.githubusercontent.com/${repo}/main`;
const PARSER_COMMIT = 'bc1b8b05138adead482d87b284c58a34d8470503';
const PARSER_URL = `https://raw.githubusercontent.com/Script-Hub-Org/Script-Hub/${PARSER_COMMIT}/Rewrite-Parser.js`;
const STATE_PATH = '.last-sync.json';
const WEIBO_SCRIPT_SOURCE = 'https://ddgksf2013.top/scripts/weibo_json.js';
const WEIBO_SCRIPT_LOCAL = 'scripts/weibo_json.js';
const state = fs.existsSync(STATE_PATH) ? JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) : {};
const now = new Date();

if (process.env.FORCE_SYNC !== 'true' && state.last_success && now - new Date(state.last_success) < 48 * 60 * 60 * 1000) {
  console.log('Skipped: last successful upstream check was less than 48 hours ago.');
  process.exit(0);
}

const specs = [
  {
    filename: 'YangJiBao.plugin',
    displayName: '养基宝去广告',
    appStoreUrl: 'https://apps.apple.com/cn/app/id1597754877',
    outputName: 'yangjibao.vip.sgmodule',
    icon: 'YangJiBao.png',
    source: 'https://ddgksf2013.top/scripts/yangjibao.vip.js',
    nameArg: '养基宝去广告@ddgksf2013+全面净化',
    category: 'ddgksf2013',
    stripLeadingBlockComment: true,
  },
  {
    filename: 'WeiboEnhanced.plugin',
    displayName: '微博助手功能增强',
    appStoreUrl: 'https://apps.apple.com/cn/app/id350962117',
    outputName: 'WeiboEnhanced.sgmodule',
    icon: 'WeiboEnhanced.png',
    source: 'https://ddgksf2013.top/rewrite/WeiboEnhanced.conf',
    nameArg: '微博助手功能增强@ddgksf2013+全面自定义',
    category: 'ddgksf2013',
  },
];

async function getText(url, headers = {}, maxBytes = 1024 * 1024) {
  const response = await got(url, {
    followRedirect: true,
    headers: {'User-Agent': 'Surge', ...headers},
    throwHttpErrors: false,
    timeout: {request: 30000},
    retry: {limit: 1},
    responseType: 'text',
  });
  if (response.statusCode !== 200) throw new Error(`Upstream HTTP ${response.statusCode}: ${url}`);
  if (Buffer.byteLength(response.body, 'utf8') > maxBytes) throw new Error(`Upstream response too large: ${url}`);
  if (/<html|<!doctype|<head|<body/i.test(response.body.slice(0, 2048))) throw new Error(`Upstream returned HTML instead of source: ${url}`);
  if (!response.body.trim()) throw new Error(`Upstream returned an empty response: ${url}`);
  return response.body;
}

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function validateSource(body, spec) {
  if (!/^\s*hostname\s*=/mi.test(body) || !/\surl\s+(?:jsonjq-|script-)/i.test(body)) {
    throw new Error(`Expected the original rewrite snippet, not an error page: ${spec.source}`);
  }
}

function buildLocalTextUrl(spec, source) {
  // Script Hub strips a leading block comment incorrectly, discarding the rules after it.
  // Remove only YangJiBao's descriptive header comment; keep every functional rule intact.
  const localSource = spec.stripLeadingBlockComment
    ? source.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '')
    : source;
  const n = spec.nameArg.split('+').map(encodeURIComponent).join('+');
  const query = [
    'type=qx-rewrite',
    `n=${n}`,
    'headers=User-Agent:surge',
    'del=true',
    'jqEnabled=true',
    'target=loon-plugin',
    `category=${encodeURIComponent(spec.category)}`,
    `localtext=${encodeURIComponent(localSource)}`,
  ].join('&');
  return `http://script.hub/file/_start_/http://local.text/_end_/${spec.outputName}?${query}`;
}

function convertWithScriptHub(parser, spec, source) {
  return new Promise((resolve, reject) => {
    let completed = false;
    const timeout = setTimeout(() => {
      if (!completed) {
        completed = true;
        reject(new Error(`Script Hub conversion timed out: ${spec.filename}`));
      }
    }, 90000);
    const capture = output => {
      if (completed) return;
      completed = true;
      clearTimeout(timeout);
      const response = output?.response || output;
      if (response?.status !== 200 || typeof response?.body !== 'string') {
        reject(new Error(`Script Hub conversion failed: ${JSON.stringify(response).slice(0, 600)}`));
        return;
      }
      resolve(response.body);
    };
    const context = {
      require, module: {exports: {}}, process, Buffer, console, setTimeout, clearTimeout,
      $request: {url: buildLocalTextUrl(spec, source)}, $argument: 'Notify=关闭通知',
      __captureScriptHub: capture,
    };
    try {
      vm.runInNewContext(parser, context, {filename: 'Rewrite-Parser.js'});
    } catch (error) {
      completed = true;
      clearTimeout(timeout);
      reject(error);
    }
  });
}

function customizePlugin(plugin, spec) {
  if (!/^\s*#!name\s*=/mi.test(plugin)) throw new Error('Missing plugin name: ' + spec.filename);
  const lines = plugin.replace(/\r\n/g, '\n').split('\n');
  const firstSection = lines.findIndex(line => /^\s*\[[A-Za-z][^\]]*\]\s*$/.test(line));
  if (firstSection < 0) throw new Error('Missing Loon configuration sections: ' + spec.filename);
  const sourceHeader = lines.slice(0, firstSection);
  if (!sourceHeader.some(line => /ddgksf2013/i.test(line))) throw new Error('Original author attribution missing: ' + spec.filename);
  const originalDesc = sourceHeader.find(line => /^\s*#!desc\s*=/i.test(line))?.replace(/^\s*#!desc\s*=/i, '').trim() || '全面净化';
  const recognized = new Set(['name', 'desc', 'author', 'homepage', 'openurl', 'icon', 'tag']);
  const preserved = sourceHeader.filter(line => {
    const match = line.match(/^\s*#!([\w]+)\s*=/);
    return match && !recognized.has(match[1].toLowerCase());
  });
  const header = [
    '#!name=' + spec.displayName,
    '#!desc=' + originalDesc,
    '#!author=ddgksf2013',
    '#!homepage=https://github.com/ddgksf2013',
    '#!openUrl=' + spec.appStoreUrl,
    '#!icon=' + BASE + '/icons/' + spec.icon + '?v=official-20261110',
    '#!tag=ddgksf2013',
    ...preserved,
    '',
  ];
  const output = [...header, ...lines.slice(firstSection)].join('\n').replace(/\n*$/, '\n');
  if (!output.includes('https://apps.apple.com/cn/app/')) throw new Error('App Store URL missing');
  return output;
}

function patchYangJiBaoPlugin(plugin) {
  // Keep original JSON mutations. Fix only URL matches and apex-domain MitM.
  // Stop the sync when the upstream rule format changes.
  const oldAccount = String.raw`^https?:\/\/.*yangjibao\.com\/.*\/account|vip_info`;
  const oldAd = String.raw`^https?:\/\/.*yangjibao.com\/unify_ad`;
  const domain = String.raw`(?:[A-Za-z0-9-]+\.)*yangjibao\.com`;
  const newAccount = String.raw`^https?:\/\/${domain}\/(?:[^?#]*\/)?(?:account|vip_info)(?:[/?#]|$)`;
  const newAd = String.raw`^https?:\/\/${domain}\/(?:[^?#]*\/)?unify_ad(?:[/?#]|$)`;
  let accountHits = 0, adHits = 0;
  const updated = plugin.split('\n').map(line => {
    if (line.startsWith(oldAccount + ' ') && line.includes('response-body-json-jq ') && line.includes('.data.vip_label=true')) {
      accountHits++;
      return newAccount + line.slice(oldAccount.length);
    }
    if (line.startsWith(oldAd + ' ') && line.includes("response-body-json-jq '.data=null'")) {
      adHits++;
      return newAd + line.slice(oldAd.length);
    }
    if (/^\s*hostname\s*=/.test(line) && line.includes('*.yangjibao.com')) {
      return line.replace('hostname = *.yangjibao.com','hostname = yangjibao.com, *.yangjibao.com');
    }
    return line;
  }).join('\n');
  if (accountHits !== 1 || adHits !== 1 || !updated.includes('hostname = yangjibao.com, *.yangjibao.com')) {
    throw new Error('YangJiBao source rewrite format changed; preserve previous published version');
  }
  return updated;
}

function audit(spec, source, plugin) {
  const urls = [...new Set((plugin.match(/https?:\/\/[^\s,;"'<>]+/g) || []).map(url => url.replace(/[)\]]$/, '')))];
  const scriptUrls = [...new Set((plugin.match(/script-path\s*=\s*https?:\/\/[^,\s]+/gi) || []).map(value => value.replace(/^script-path\s*=\s*/i, '')))];
  const hostnames = [...new Set(plugin.match(/^\s*hostname\s*=.*$/gim) || [])];
  const indicators = [
    ['eval()', /\beval\s*\(/], ['new Function()', /\bnew\s+Function\s*\(/],
    ['fetch()', /\bfetch\s*\(/], ['XMLHttpRequest', /\bXMLHttpRequest\b/],
    ['$httpClient.post', /\$httpClient\.post\b/], ['$task.fetch', /\$task\.fetch\b/],
    ['base64 decode', /\batob\s*\(/],
  ].filter(([, pattern]) => pattern.test(source)).map(([name]) => name);
  return {
    source: spec.source, sourceSha256: sha256(source), pluginSha256: sha256(plugin),
    remoteScriptUrls: scriptUrls, hostnames, referencedUrls: urls, sourceIndicators: indicators,
    note: 'Static inspection only. Remote scripts can change independently; this is not a malware guarantee.',
  };
}

try {
  console.log('Fetching and validating both original sources...');
  const sourceBodies = new Map();
  for (const spec of specs) {
    const body = await getText(spec.source);
    validateSource(body, spec);
    sourceBodies.set(spec.filename, body);
    console.log(`Source OK: ${spec.filename} (${Buffer.byteLength(body)} bytes)`);
  }

  // Keep the actual assistant JS in the same GitHub repository so Loon does
  // not depend on the original host being accessible at import/runtime.
  const weiboScript = await getText(WEIBO_SCRIPT_SOURCE, {'User-Agent':'Surge'}, 2 * 1024 * 1024);
  if (Buffer.byteLength(weiboScript, 'utf8') < 30000 ||
      !weiboScript.includes('createSettingsHandler') ||
      !weiboScript.includes('SETTINGS_PAGE')) {
    throw new Error('Original Weibo script lacks its expected assistant settings implementation; preserving previous version');
  }
  console.log('Weibo settings script fetched: ' + Buffer.byteLength(weiboScript) + ' bytes');

  console.log(`Fetching pinned official Script Hub parser: ${PARSER_COMMIT}`);
  let parser = await getText(PARSER_URL, {'User-Agent': 'UNIONFUSION-GitHub-Actions'}, 400 * 1024);
  const nodeExit = 'case"Node.js":process.exit(1)';
  if (!parser.includes(nodeExit)) throw new Error('Pinned Script Hub parser changed unexpectedly; refusing to patch an unknown runtime.');
  parser = parser.replace(nodeExit, 'case"Node.js":globalThis.__captureScriptHub(t)');

  const generated = new Map();
  const auditReport = {checkedAt: now.toISOString(), converter: 'Script-Hub-Org/Script-Hub', parserCommit: PARSER_COMMIT, plugins: {}};
  for (const spec of specs) {
    const converted = await convertWithScriptHub(parser, spec, sourceBodies.get(spec.filename));
    let plugin = customizePlugin(converted, spec);
    if (spec.filename === 'YangJiBao.plugin') {
      plugin = patchYangJiBaoPlugin(plugin);
    }
    if (spec.filename === 'WeiboEnhanced.plugin') {
      const originalPath = 'script-path=' + WEIBO_SCRIPT_SOURCE;
      const occurrences = plugin.split(originalPath).length - 1;
      if (occurrences < 3) throw new Error('Expected Weibo script rules are missing; refusing incomplete conversion');
      plugin = plugin.split(originalPath).join('script-path=' + BASE + '/' + WEIBO_SCRIPT_LOCAL);
    }
    generated.set(spec.filename, plugin);
    auditReport.plugins[spec.filename] = audit(spec, sourceBodies.get(spec.filename), plugin);
    if (spec.filename === 'WeiboEnhanced.plugin') {
      auditReport.plugins[spec.filename].originalScript = WEIBO_SCRIPT_SOURCE;
      auditReport.plugins[spec.filename].originalScriptSha256 = sha256(weiboScript);
      auditReport.plugins[spec.filename].mirroredScript = BASE + '/' + WEIBO_SCRIPT_LOCAL;
    }
    console.log(`Converted and validated: ${spec.filename} (${Buffer.byteLength(plugin)} bytes)`);
  }

  // Write only after BOTH conversions and validations succeeded.
  for (const [filename, content] of generated) fs.writeFileSync(filename, content, 'utf8');
  fs.mkdirSync('scripts', {recursive: true});
  fs.writeFileSync(WEIBO_SCRIPT_LOCAL, weiboScript, 'utf8');
  fs.mkdirSync('reports', {recursive: true});
  fs.writeFileSync('reports/metadata.json', JSON.stringify(auditReport, null, 2) + '\n');
  fs.writeFileSync(STATE_PATH, JSON.stringify({
    last_success: now.toISOString(),
    sources: Object.fromEntries(specs.map(spec => [spec.filename, sha256(sourceBodies.get(spec.filename))])),
  }, null, 2) + '\n');
  console.log('SUCCESS: both plugins and mirrored Weibo assistant script are ready; Loon display metadata updated.');
} catch (error) {
  console.error(`SYNC FAILED; existing published plugins were not overwritten.\n${error.stack || error}`);
  process.exitCode = 1;
}
