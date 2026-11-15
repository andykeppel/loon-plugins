# Loon Plugins · Independent GitHub Mirrors

Loon plugins hosted by **andykeppel**. Upstream authors retain attribution. These are third-party rewrites: updates can change behavior, and successful automated validation does not guarantee that all current iOS app versions are compatible.

## Loon plugin URLs

| Plugin | Original author | Raw URL |
| --- | --- | --- |
| 养基宝去广告 | ddgksf2013 | https://raw.githubusercontent.com/andykeppel/loon-plugins/main/YangJiBao.plugin |
| 微信小程序去广告 | ddgksf2013 | https://raw.githubusercontent.com/andykeppel/loon-plugins/main/WeChatApplet.plugin |
- **微博助手·完整净化**: one combined plugin with the original MoYu settings page and a Loon `[Argument]` switch named `自定义功能`. The switch defaults to off; off preserves the original MoYu behavior, while on enables the extra Messages → Activity timeline cleaner by reusing the mirrored `scripts/weibo_json.js`.
| 极简汇率 | ddgksf2013 | https://raw.githubusercontent.com/andykeppel/loon-plugins/main/JiJianHuiLv.plugin |
| 美团去广告 | ZenmoFeiShi (TG@ZenMoFiShi) | https://raw.githubusercontent.com/andykeppel/loon-plugins/main/MeiTuan.plugin |
| Localdevvpn 本机回环 | 本仓库维护（参考 Loon 官方文档） | https://raw.githubusercontent.com/andykeppel/loon-plugins/main/Localdevvpn.plugin |

**墨鱼去开屏 2.0（StartUpAds）和 BiliBili 完整版/Lite 已从本仓库删除，不再同步。**

**Localdevvpn**: 依照 [bb 的 dev-loopback 回环实现](https://github.com/ios151/Rewrite/blob/main/dev-loopback/modules/dev-loopback.lpx)，仅对 `10.7.0.1/32` 启用 `include-tun`，对 `10.7.0.1` 使用 `reflect`；同时设置 `ipv6-vif = off`。**此设置在插件启用期间关闭整个 Loon 的 IPv6 VIF（不是只关闭本机开发 App 的 IPv6），可能影响原生 IPv6 分流和 IPv6 TUN 流量；如需原有 IPv6 TUN 行为，请停用此插件。** 其余代理规则、DNS、脚本和 MitM 均不改动。需要 Loon 3.5.3(1007)+。**注意：启用期间所有 App 发往 10.7.0.1 的 IP 流量都会回环，不能按应用区分；若其他服务也使用此地址，可能冲突。** Loon 的 `[Argument]` 不能动态修改这两项地址；如需更改回环 IP，须修改插件源码。`#!source` 为可选元数据，此插件未声明，以避免从不同等效 GitHub URL 导入时出现来源警告。App Store: https://apps.apple.com/us/app/localdevvpn/id6755608044。

## Automatic source checks and manual update

**Unified upstream refresh:** GitHub Actions checks **every day at 04:00 Asia/Shanghai (20:00 UTC the previous day)**, without a rolling 24-hour cooldown. The single job handles YangJiBao, WeiboEnhanced, WeiboAds, WeiboCombined, JiJianHuiLv, Meituan and WeChatApplet sequentially to avoid concurrent pushes. Each independent plugin is staged only after conversion and verification succeeds. GitHub Actions scheduled jobs can occasionally start later than their cron time. This is GitHub's source mirroring schedule, **not an automatic on-device Loon subscription refresh**. The independent Localdevvpn plugin is not upstream-managed.

- [统一每日 04:00 同步（支持手动运行）](https://github.com/andykeppel/loon-plugins/actions/workflows/sync.yml)
- [单独手动同步极简汇率](https://github.com/andykeppel/loon-plugins/actions/workflows/sync-extra.yml)
- [单独手动同步美团（ZenmoFeiShi）](https://github.com/andykeppel/loon-plugins/actions/workflows/sync-meituan.yml)

Each workflow keeps previously published files if downloading, converting or validating the new version fails. In Loon, refresh the installed plugin to retrieve the new GitHub version.

## WeChat mini programs · MoYu

- Original Quantumult X source: https://raw.githubusercontent.com/ddgksf2013/Rewrite/master/AdBlock/Applet.conf
- Standalone Loon plugin: `WeChatApplet.plugin` with three URL rewrites, two response scripts mirrored at `scripts/WeChatApplet.js` and `scripts/ZhangShangGongJiao.js`, and the original MITM host set (deduplicated).
- The original Applet JavaScript used `$done(e)`, which has been adapted to the Loon-supported `$done({body:e})`; the source scripts otherwise preserve the original ad-cleaning behavior.
- Original author notes that this plugin only covers certain mini programs **and cannot remove their five-second splash advertisements**. Broad MITM entries can overlap with other WeChat ad-blockers; avoid enabling conflicting plugins together.
- Current icon uses Apple's official WeChat App Store artwork CDN; Loon App Store shortcut: https://apps.apple.com/cn/app/id414478124.

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

- **极简汇率**: mirrors the original script under `scripts/jijianhuilv.vip.js`.

The GitHub repository and associated workflows are independent of Script Hub's iPhone front-end module. Source auditing is static, and upstream authors may change their code over time.

- **微博助手功能增强**：仅同步墨鱼原版 WeiboEnhanced.conf，不再包含自定义开关或附加过滤脚本。
- **微博去广告**：独立同步墨鱼 WeiboAds.conf（微博与轻享版去广告），转换为 Loon 插件。两者可能有相同请求规则，建议单独测试。

### 微博三种独立插件
- 原版助手：WeiboEnhanced.plugin，仅同步墨鱼增强助手。
- 原版去广告：WeiboAds.plugin，独立使用墨鱼原始去广告脚本（不包含助手设置入口）。
- 历史合并版：WeiboCombined.plugin，保留自定义功能开关与附加消息动态过滤。

注意：原版助手和合并版存在相同设置端点，不应同时启用；去广告版与另两版部分请求重叠，建议单独测试。
