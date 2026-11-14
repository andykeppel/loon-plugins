/*
 * Extra Weibo Messages > Activity cleaner.
 * Independent of the original MoYu assistant; enabled only by the Loon
 * plugin's native "自定义功能" switch. Fails open for unknown responses.
 */
(function () {
  const LABELS = new Set(['广告', '廣告', '荐读', '薦讀', '热推', '熱推', '商业推广', '商業推廣', '推广', '推廣', '赞助', '贊助']);
  const AD_KEYS = ['mblogtypename', 'card_type_name', 'label', 'tag', 'tag_name', 'title_type'];
  const AD_FLAGS = ['is_ad', 'isAd', 'is_ads', 'is_ads_card', 'is_advertisement', 'is_promoted', 'is_promote'];
  const TOP_LEVEL_AD_KEYS = ['ad', 'advertises', 'ads', 'ad_cards'];
  const lists = new Set(['statuses', 'cards', 'card_group', 'items', 'list', 'feed', 'feeds', 'data_list']);

  function marked(node) {
    if (!node || typeof node !== 'object') return false;
    for (const key of AD_FLAGS) if (node[key] === true || node[key] === 1 || node[key] === '1') return true;
    for (const key of AD_KEYS) {
      if (typeof node[key] === 'string' && LABELS.has(node[key].trim())) return true;
    }
    if (typeof node.content_auth_info?.content_auth_title === 'string' &&
        LABELS.has(node.content_auth_info.content_auth_title.trim())) return true;
    if (node.promotion?.type === 'ad' || node.page_info?.actionlog?.source === 'ad') return true;
    if (node.ad_type === 'ad' || node.adType === 'ad' || node.card_type === 'ad') return true;
    if (node.card_type === 9 && node.is_ad === true) return true;
    if (Array.isArray(node.buttons) && node.buttons.some(button => button?.type === 'ad')) return true;
    return false;
  }

  function isPromoted(item) {
    if (!item || typeof item !== 'object') return false;
    return marked(item) || marked(item.mblog) || marked(item.status) ||
      marked(item.data?.mblog) || marked(item.card) ||
      (Array.isArray(item.card_group) && item.card_group.length > 0 &&
       item.card_group.every(isPromoted));
  }

  function clean(node, depth) {
    if (!node || typeof node !== 'object' || depth > 9) return false;
    let changed = false;
    if (Array.isArray(node)) {
      for (const item of node) changed = clean(item, depth + 1) || changed;
      return changed;
    }
    for (const key of TOP_LEVEL_AD_KEYS) {
      if (Object.prototype.hasOwnProperty.call(node, key)) {
        delete node[key]; changed = true;
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (Array.isArray(value) && lists.has(key)) {
        const filtered = value.filter(item => !isPromoted(item));
        if (filtered.length !== value.length) {
          node[key] = filtered;
          changed = true;
        }
        for (const item of node[key]) changed = clean(item, depth + 1) || changed;
      } else if (value && typeof value === 'object') {
        changed = clean(value, depth + 1) || changed;
      }
    }
    return changed;
  }

  try {
    const body = typeof $response === 'undefined' ? null : $response.body;
    if (typeof body !== 'string' || !body.trim()) return $done({});
    const json = JSON.parse(body);
    const changed = clean(json, 0);
    $done(changed ? {body: JSON.stringify(json)} : {});
  } catch (_) {
    $done({});
  }
})();
