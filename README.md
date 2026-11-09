# Loon plugins · original-author sync

This repository hosts two Loon conversions of the public sources by **ddgksf2013**. The conversion uses the pinned official Script Hub parser. The generated plugins keep the original author credit, functional rules and rewrite patterns. We customize display metadata (shorter names, the original author's profile, official App Store links and pinned official app icons). For Weibo, the script URL is rewritten to this repository's synchronized mirror to improve reliability.

## Plugin URLs

- YangJiBao: `https://raw.githubusercontent.com/andykeppel/loon-plugins/main/YangJiBao.plugin`
- Weibo Enhanced: `https://raw.githubusercontent.com/andykeppel/loon-plugins/main/WeiboEnhanced.plugin`

Both URLs are live. The official App Store links are included as `#!openUrl` metadata inside the plugins.

## Updates

- GitHub Actions wakes every 6 hours; the script fetches upstream only after 48 hours have elapsed since the last successful check (so the actual interval is 48–54 hours).
- To force an immediate check, open **Actions → Sync Loon plugins from original author → Run workflow**.
- In Loon, refresh the plugin to download the latest copy from this repository.
- On an invalid source, missing Weibo settings handler, or failed conversion, no published plugin/script is overwritten.
- The workflow uses the repository's `GITHUB_TOKEN` with `contents: write`; no personal token or external secret is needed.

## Source and security notes

- Original configuration sources: `https://ddgksf2013.top/scripts/yangjibao.vip.js` and `https://ddgksf2013.top/rewrite/WeiboEnhanced.conf`.
- Original Weibo settings script: `https://ddgksf2013.top/scripts/weibo_json.js`, mirrored to `scripts/weibo_json.js` whenever the update workflow successfully checks upstream.
- Converter: `Script-Hub-Org/Script-Hub/Rewrite-Parser.js`, pinned to commit `bc1b8b05138adead482d87b284c58a34d8470503`.
- The Script Hub Loon front-end plugin is not installed or required here. This repository runs the converter in GitHub Actions and hosts only the generated Loon files.
- `reports/metadata.json` records source/plugin hashes and statically visible remote URLs, hostnames, and selected code indicators. Static inspection cannot guarantee remote scripts are safe.
- Weibo uses `https://raw.githubusercontent.com/andykeppel/loon-plugins/main/scripts/weibo_json.js`. The code remains the original author's code and is only refreshed after a successful 48–54-hour upstream check or a manual force-run. No manual rewriting of the author's JavaScript is performed. This resolves the upstream script-host dependency but is not a guarantee against conflicts with other Loon plugins or with the host app.
- The Weibo settings script is obfuscated upstream. It was syntax-checked and tested in a simulated Loon runtime for its settings-page HTTP 200/HTML response, but not tested on the user's physical iPhone.
