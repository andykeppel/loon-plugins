# Loon Plugins · Independent GitHub Mirrors

Loon plugins hosted by **andykeppel**. Upstream authors retain attribution. These are third-party rewrites: updates can change behavior, and successful automated validation does not guarantee that all current iOS app versions are compatible.

## Loon plugin URLs

| Plugin | Original author | Raw URL |
| --- | --- | --- |
| 养基宝去广告 | ddgksf2013 | https://raw.githubusercontent.com/andykeppel/loon-plugins/main/YangJiBao.plugin |
| 微博助手功能增强 | ddgksf2013 | https://raw.githubusercontent.com/andykeppel/loon-plugins/main/WeiboEnhanced.plugin |
| 极简汇率 | ddgksf2013 | https://raw.githubusercontent.com/andykeppel/loon-plugins/main/JiJianHuiLv.plugin |
| 美团去广告 | ZenmoFeiShi (TG@ZenMoFiShi) | https://raw.githubusercontent.com/andykeppel/loon-plugins/main/MeiTuan.plugin |
| Localdevvpn 本机回环 | 本仓库维护（参考 Loon 官方文档） | https://raw.githubusercontent.com/andykeppel/loon-plugins/main/Localdevvpn.plugin |

**墨鱼去开屏 2.0（StartUpAds）和 BiliBili 完整版/Lite 已从本仓库删除，不再同步。**

**Localdevvpn**: 仅对 `10.7.0.1/32` 启用 `include-tun`，对 `10.7.0.1` 使用 `reflect`；不设置 `ipv6-vif`，不修改其他代理规则、DNS、脚本或 MitM。需要 Loon 3.5.3(1007)+。**注意：启用期间所有 App 发往 10.7.0.1 的 IP 流量都会回环，不能按应用区分；若其他服务也使用此地址，可能冲突。** Loon 的 `[Argument]` 不能动态修改这两项地址；如需更改回环 IP，须修改插件源码。`#!source` 为可选元数据，此插件未声明，以避免从不同等效 GitHub URL 导入时出现来源警告。App Store: https://apps.apple.com/us/app/localdevvpn/id6755608044。

## Automatic source checks and manual update

All workflows wake every 6 hours, fetch upstream only if 48 hours have elapsed since the previous successful check (usually a 48–54-hour interval), and allow a manual **Run workflow** action with forced refresh.

- [同步养基宝与微博助手](https://github.com/andykeppel/loon-plugins/actions/workflows/sync.yml)
- [同步极简汇率](https://github.com/andykeppel/loon-plugins/actions/workflows/sync-extra.yml)
- [同步美团（ZenmoFeiShi）](https://github.com/andykeppel/loon-plugins/actions/workflows/sync-meituan.yml)

Each workflow keeps previously published files if downloading, converting or validating the new version fails. In Loon, refresh the installed plugin to retrieve the new GitHub version.

## Meituan · ZenmoFeiShi

- Original configuration: https://raw.githubusercontent.com/ZenmoFeiShi/Qx/main/MT.snippet
- Original response script: https://raw.githubusercontent.com/ZenmoFeiShi/Qx/main/MT.js
- First imported source declared update date: 2026-10-25.
- Source is converted to Loon `[Rule]`, `[Rewrite]`, `[Script]`, and `[MITM]` sections. QX domain/IPv4/IPv6 reject entries are preserved with Loon rule types, with `no-resolve` on IP rules. The same eight original response-script hooks and two URL reject entries are retained.
- The original JavaScript is mirrored as `scripts/MeiTuan.js` and is not modified. The App Store icon for `id423084029` is cached as `icons/MeiTuan.png`.
- The original QX domain, DNS/HTTPDNS, QUIC and IP blocking rules may interact with network behavior. If Meituan loads slowly or reports network errors, test temporarily disabling this plugin; do not combine it with broad Meituan rewrites from other modules.
- The GitHub Actions verifier checks the plugin structure and selected sample response transformations, but cannot certify effects on a physical iPhone.

## Other plugin notes

- **养基宝**: URL matching fixes for nested `unify_ad` endpoints are applied locally after Script Hub conversion.
- **微博助手**: its original author script is mirrored as `scripts/weibo_json.js` and serves a settings page. If the app's assistant panel cannot open, check Loon MITM and other script conflicts.
- **极简汇率**: mirrors the original script under `scripts/jijianhuilv.vip.js`.

The GitHub repository and associated workflows are independent of Script Hub's iPhone front-end module. Source auditing is static, and upstream authors may change their code over time.
