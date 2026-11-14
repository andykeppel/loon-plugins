/* Message > Activity: targeted filter verified against user-supplied Loon capture.
 * Only process /2/messageflow/notice; preserve all non-message fields and fail open.
 * The native Loon [Argument] custom switch controls whether this script runs.
 */
(function () {
  try {
    if (typeof $response === 'undefined' || typeof $response.body !== 'string') return $done({});
    const payload = JSON.parse($response.body);
    if (!payload || !Array.isArray(payload.messages)) return $done({});
    const before = payload.messages.length;
    payload.messages = payload.messages.filter(function (msg) {
      return !(msg && msg.type === 47 && msg.sub_type === 65 && msg.isrecommend === true);
    });
    $done(payload.messages.length === before ? {} : {body: JSON.stringify(payload)});
  } catch (e) {
    $done({});
  }
})();
