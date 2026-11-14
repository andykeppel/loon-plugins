/*
 * 微博消息页“动态”信息流广告过滤
 * Adapted from ddgksf2013/Rewrite/AdBlock/WeiboAds.conf.
 * Only removes posts carrying explicit ad markers; ordinary posts pass through.
 */
function isWeiboAd(post) {
  return !!post && (
    post.mblogtypename === "广告" ||
    post.mblogtypename === "热推" ||
    post.promotion?.type === "ad" ||
    post.page_info?.actionlog?.source === "ad" ||
    post.content_auth_info?.content_auth_title === "广告"
  );
}

function filterStatuses(container) {
  if (!container || typeof container !== "object" || !Array.isArray(container.statuses)) return false;
  const before = container.statuses.length;
  container.statuses = container.statuses.filter(post => !isWeiboAd(post));
  return container.statuses.length !== before;
}

const responseBody = typeof $response === "undefined" ? undefined : $response?.body;
if (typeof responseBody !== "string" || responseBody.length === 0) {
  $done({});
} else {
  try {
    const data = JSON.parse(responseBody);
    const rootChanged = filterStatuses(data);
    const nestedChanged = filterStatuses(data?.data);
    $done(rootChanged || nestedChanged ? {body: JSON.stringify(data)} : {});
  } catch (_) {
    $done({});
  }
}
