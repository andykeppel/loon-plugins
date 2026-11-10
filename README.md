# Loon plugins · original-author sync

This repository hosts six Loon plugins adapted from public ddgksf2013 sources (including the large startup-ad collection). The conversion uses the pinned official Script Hub parser. The generated plugins keep the original author credit, functional rules and rewrite patterns. We customize display metadata (shorter names, the original author's profile, official App Store links and pinned official app icons). For Weibo, the script URL is rewritten to this repository's synchronized mirror to improve reliability.

## Plugin URLs

- YangJiBao: `https://raw.githubusercontent.com/andykeppel/loon-plugins/main/YangJiBao.plugin`
- Weibo Enhanced: `https://raw.githubusercontent.com/andykeppel/loon-plugins/main/WeiboEnhanced.plugin`
- BiliBili full: `https://raw.githubusercontent.com/andykeppel/loon-plugins/main/BiliBili.plugin`
- BiliBili Lite: `https://raw.githubusercontent.com/andykeppel/loon-plugins/main/BiliBiliLite.plugin`
- StartUpAds 2.0: `https://raw.githubusercontent.com/andykeppel/loon-plugins/main/StartUpAds.plugin`
- JiJianHuiLv (xCurrency): `https://raw.githubusercontent.com/andykeppel/loon-plugins/main/JiJianHuiLv.plugin`

All six URLs are live. App plugins include the official App Store links via `#!openUrl`. StartUpAds is a collection, not an App Store app; its `#!openUrl` leads to the original source. Full BiliBili and Lite share the same official Bilibili icon.

## Updates

- GitHub Actions wakes every 6 hours; the script fetches upstream only after 48 hours have elapsed since the last successful check (so the actual interval is 48–54 hours).
- Force-sync the first two under **Actions → Sync Loon plugins from original author → Run workflow**; force-sync the four new ones under **Actions → Sync extra Loon plugins → Run workflow**.
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

## Four additional plugins: provenance, maintenance and compatibility

- Their configuration sources are `https://ddgksf2013.top/rewrite/BiliBiliAds.conf`, `https://ddgksf2013.top/rewrite/BiliBiliAdsLite.conf`, `https://ddgksf2013.top/rewrite/StartUpAds.conf`, and `https://ddgksf2013.top/scripts/jijianhuilv.vip.js`. Names and icon URLs are customized; original contributor attribution is preserved.
- Full BiliBili is based on the full original rewrite; BiliBili Lite is the smaller original rewrite for the **same iOS app**, not a separate Lite app. Do not enable both simultaneously.
- BiliBili's common JS and JiJianHuiLv's JS are mirrored under `scripts/` (without modifying original JS). The StartUpAds collection intentionally retains its original external script URLs; only its plugin file is hosted locally.
- StartUpAds is extensive: 431 URL rewrites and 43 script rules at the first successful build. Some hostname/rules may overlap other app-specific or general adblock modules. Enable it separately and troubleshoot any conflicts by disabling overlapping modules rather than stacking duplicates.
- App Store icons are downloaded and stored as PNG files from Apple lookup results; the StartUpAds icon uses a fixed advertising-filter icon since no separate StartUpAds App Store app exists.
- This additional sync is gated by `.last-extra-sync.json` and wakes every 6 hours, checking upstream after 48 hours have elapsed; you can force refresh via the GitHub Actions manual workflow.
- `tools/verify-extra.mjs` rejects missing key rewrite/script coverage, malformed icons, incorrect author/links, and missing mirrors. It does not guarantee that all current app versions remain compatible; Loon MitM and a valid trusted CA certificate remain necessary.
