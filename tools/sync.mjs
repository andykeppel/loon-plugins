/**
 * Loon plugin mirror. Only the icon metadata is changed after Script Hub conversion.
 * Original author and all generated rules/scripts remain untouched.
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
const state = fs.existsSync(STATE_PATH) ? JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) : {};
const now = new Date();

if (process.env.FORCE_SYNC !== 'true' && state.last_success && now - new Date(state.last_success) < 48 * 60 * 60 * 1000) {
  console.log('Skipped: last successful upstream check was less than 48 hours ago.');
  process.exit(0);
}

const specs = [
  {
    filename: 'YangJiBao.plugin',
    outputName: 'yangjibao.vip.sgmodule',
    icon: 'YangJiBao.png',
    source: 'https://ddgksf2013.top/scripts/yangjibao.vip.js',
    nameArg: '养基宝去广告@ddgksf2013+全面净化',
    category: 'ddgksf2013',
    stripLeadingBlockComment: true,
  },
  {
    filename: 'WeiboEnhanced.plugin',
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

function replaceIconOnly(plugin, spec) {
  if (!/^\s*#!name\s*=/mi.test(plugin)) throw new Error(`Converted output has no Loon plugin name: ${spec.filename}`);
  const header = plugin.split(/\n\s*\[/, 1)[0];
  if (!/ddgksf2013/i.test(header)) throw new Error(`Converted header does not preserve the original ddgksf2013 attribution: ${spec.filename}`);
  if (!/^\s*\[(?:Script|Rewrite|URL Rewrite|Rule)\]/mi.test(plugin)) throw new Error(`Converted output has no recognizable Loon sections: ${spec.filename}; preview=${plugin.slice(0, 900).replace(/\\s+/g, ' ')}`);
  if (/Script Hub 重写转换.*❌|#!error\s*=/i.test(plugin)) throw new Error(`Converter returned an error for ${spec.filename}`);

  const lines = plugin.replace(/\r\n/g, '\n').split('\n');
  const iconLine = `#!icon=${BASE}/icons/${spec.icon}`;
  let found = false;
  for (let index = 0; index < lines.length; index++) {
    if (/^\s*#!icon\s*=/i.test(lines[index])) {
      if (!found) {
        lines[index] = iconLine;
        found = true;
      } else {
        lines[index] = '';
      }
    }
  }
  if (!found) lines.unshift(iconLine);
  // No author, rules, scripts, URLs, or other plugin metadata are rewritten.
  return lines.join('\n').replace(/\n*$/, '\n');
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

  console.log(`Fetching pinned official Script Hub parser: ${PARSER_COMMIT}`);
  let parser = await getText(PARSER_URL, {'User-Agent': 'UNIONFUSION-GitHub-Actions'}, 400 * 1024);
  const nodeExit = 'case"Node.js":process.exit(1)';
  if (!parser.includes(nodeExit)) throw new Error('Pinned Script Hub parser changed unexpectedly; refusing to patch an unknown runtime.');
  parser = parser.replace(nodeExit, 'case"Node.js":globalThis.__captureScriptHub(t)');

  const generated = new Map();
  const auditReport = {checkedAt: now.toISOString(), converter: 'Script-Hub-Org/Script-Hub', parserCommit: PARSER_COMMIT, plugins: {}};
  for (const spec of specs) {
    const converted = await convertWithScriptHub(parser, spec, sourceBodies.get(spec.filename));
    const plugin = replaceIconOnly(converted, spec);
    generated.set(spec.filename, plugin);
    auditReport.plugins[spec.filename] = audit(spec, sourceBodies.get(spec.filename), plugin);
    console.log(`Converted and validated: ${spec.filename} (${Buffer.byteLength(plugin)} bytes)`);
  }

  // Write only after BOTH conversions and validations succeeded.
  for (const [filename, content] of generated) fs.writeFileSync(filename, content, 'utf8');
  fs.mkdirSync('reports', {recursive: true});
  fs.writeFileSync('reports/metadata.json', JSON.stringify(auditReport, null, 2) + '\n');
  fs.writeFileSync(STATE_PATH, JSON.stringify({
    last_success: now.toISOString(),
    sources: Object.fromEntries(specs.map(spec => [spec.filename, sha256(sourceBodies.get(spec.filename))])),
  }, null, 2) + '\n');
  console.log('SUCCESS: both plugins are ready; only #!icon metadata was changed.');
} catch (error) {
  console.error(`SYNC FAILED; existing published plugins were not overwritten.\n${error.stack || error}`);
  process.exitCode = 1;
}
