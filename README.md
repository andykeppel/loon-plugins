# Loon plugins · original-author sync

This repository hosts two Loon conversions of the public sources by **ddgksf2013**. The conversion uses the pinned official Script Hub parser. The generated plugin is changed only at the `#!icon` metadata line; author attribution, rewrite rules, scripts, URLs, and other plugin content are preserved.

## Plugin URLs

- YangJiBao: `https://raw.githubusercontent.com/andykeppel/loon-plugins/main/YangJiBao.plugin`
- Weibo Enhanced: `https://raw.githubusercontent.com/andykeppel/loon-plugins/main/WeiboEnhanced.plugin`

These URLs become available after the first successful GitHub Actions run.

## Updates

- GitHub Actions wakes every 6 hours; the script fetches upstream only after 48 hours have elapsed since the last successful check (so the actual interval is 48–54 hours).
- To force an immediate check, open **Actions → Sync Loon plugins from original author → Run workflow**.
- In Loon, refresh the plugin to download the latest copy from this repository.
- If either source or conversion fails, neither published plugin is overwritten.
- The workflow uses the repository's `GITHUB_TOKEN` with `contents: write`; no personal token or external secret is needed.

## Source and security notes

- Original sources: `https://ddgksf2013.top/scripts/yangjibao.vip.js` and `https://ddgksf2013.top/rewrite/WeiboEnhanced.conf`.
- Converter: `Script-Hub-Org/Script-Hub/Rewrite-Parser.js`, pinned to commit `bc1b8b05138adead482d87b284c58a34d8470503`.
- The Script Hub Loon front-end plugin is not installed or required here. This repository runs the converter in GitHub Actions and hosts only the generated Loon files.
- `reports/metadata.json` records source/plugin hashes and statically visible remote URLs, hostnames, and selected code indicators. Static inspection cannot guarantee remote scripts are safe.
- The Weibo plugin intentionally keeps the original `https://ddgksf2013.top/scripts/weibo_json.js` script URL. That remote script is fetched by Loon directly and can change independently of this repository's 48–54-hour plugin-config sync.
