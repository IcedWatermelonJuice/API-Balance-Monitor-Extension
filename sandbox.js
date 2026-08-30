function workerSource() {
  return `
    // 内置工具集：注入到用户脚本的 abm 参数中（沙箱页非安全上下文，crypto.subtle 不可用，故为纯 JS 实现）
    var ABM = (function () {
      var textEncoder = new TextEncoder();
      var SHA_K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
      function toHex(bytes) {
        var out = "";
        for (var i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
        return out;
      }
      function asBytes(value) {
        if (value && typeof value === "object" && typeof value.length === "number" && !(typeof value === "string")) return value;
        return textEncoder.encode(String(value));
      }
      function concatBytes(a, b) {
        var out = new Uint8Array(a.length + b.length);
        out.set(a);
        out.set(b, a.length);
        return out;
      }
      function sha256Bytes(bytes) {
        var l = bytes.length;
        var total = (((l + 8) >> 6) + 1) << 6;
        var m = new Uint8Array(total);
        m.set(bytes);
        m[l] = 0x80;
        var bitLenHi = Math.floor(l / 0x20000000);
        var bitLenLo = (l << 3) >>> 0;
        m[total - 8] = (bitLenHi >>> 24) & 0xff;
        m[total - 7] = (bitLenHi >>> 16) & 0xff;
        m[total - 6] = (bitLenHi >>> 8) & 0xff;
        m[total - 5] = bitLenHi & 0xff;
        m[total - 4] = (bitLenLo >>> 24) & 0xff;
        m[total - 3] = (bitLenLo >>> 16) & 0xff;
        m[total - 2] = (bitLenLo >>> 8) & 0xff;
        m[total - 1] = bitLenLo & 0xff;
        var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
        var w = new Array(64);
        function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
        for (var off = 0; off < total; off += 64) {
          for (var i = 0; i < 16; i++) {
            var j = off + i * 4;
            w[i] = ((m[j] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3]) >>> 0;
          }
          for (var t = 16; t < 64; t++) {
            var s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
            var s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
            w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
          }
          var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
          for (var t2 = 0; t2 < 64; t2++) {
            var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            var ch = (e & f) ^ (~e & g);
            var temp1 = (h + S1 + ch + SHA_K[t2] + w[t2]) >>> 0;
            var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            var maj = (a & b) ^ (a & c) ^ (b & c);
            var temp2 = (S0 + maj) >>> 0;
            h = g; g = f; f = e;
            e = (d + temp1) >>> 0;
            d = c; c = b; b = a;
            a = (temp1 + temp2) >>> 0;
          }
          H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
          H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
        }
        var out = new Uint8Array(32);
        for (var oi = 0; oi < 8; oi++) {
          out[oi * 4] = (H[oi] >>> 24) & 0xff;
          out[oi * 4 + 1] = (H[oi] >>> 16) & 0xff;
          out[oi * 4 + 2] = (H[oi] >>> 8) & 0xff;
          out[oi * 4 + 3] = H[oi] & 0xff;
        }
        return out;
      }
      function hmacSha256Bytes(keyBytes, messageBytes) {
        var k = keyBytes.length > 64 ? sha256Bytes(keyBytes) : keyBytes;
        var ipad = new Uint8Array(64), opad = new Uint8Array(64);
        for (var i = 0; i < 64; i++) {
          var b = i < k.length ? k[i] : 0;
          ipad[i] = b ^ 0x36;
          opad[i] = b ^ 0x5c;
        }
        return sha256Bytes(concatBytes(opad, sha256Bytes(concatBytes(ipad, messageBytes))));
      }
      return {
        utf8Bytes: function (value) { return textEncoder.encode(String(value)); },
        bytesToHex: toHex,
        sha256: function (value) { return sha256Bytes(asBytes(value)); },
        sha256Hex: function (value) { return toHex(sha256Bytes(asBytes(value))); },
        hmac: function (key, message) { return hmacSha256Bytes(asBytes(key), asBytes(message)); },
        hmacHex: function (key, message) { return toHex(hmacSha256Bytes(asBytes(key), asBytes(message))); },
        concatBytes: concatBytes
      };
    })();
    function loadConfig(script) {
      var source = String(script || "").trim();
      try { return Function('abm', '"use strict"; return (' + source + ');')(ABM); }
      catch (expressionError) {
        try { return Function('abm', '"use strict"; ' + source)(ABM); }
        catch (statementError) { throw new Error(statementError.message || expressionError.message); }
      }
    }
    self.onmessage = async function(event) {
      try {
        var action = event.data.action;
        var payload = event.data.payload || {};
        var config = loadConfig(payload.script);
        if (!config || typeof config !== 'object') throw new Error('脚本必须返回配置对象');
        if (action === 'prepare') {
          if (typeof config.buildRequest === 'function') {
            var built = await config.buildRequest(payload.variables || {});
            if (!built || typeof built !== 'object' || Array.isArray(built)) throw new Error('buildRequest 必须返回 request 对象');
            self.postMessage({ ok: true, result: built });
            return;
          }
          if (!config.request || typeof config.request !== 'object') throw new Error('脚本缺少 request 对象');
          self.postMessage({ ok: true, result: config.request });
          return;
        }
        if (action === 'extract') {
          if (typeof config.extractor !== 'function') throw new Error('脚本缺少 extractor 函数');
          var extracted = await config.extractor(payload.response, payload.meta || {}, payload.variables || {});
          self.postMessage({ ok: true, result: { extracted: extracted, display: config.display || null } });
          return;
        }
        throw new Error('未知脚本操作');
      } catch (error) {
        self.postMessage({ ok: false, error: error && error.message ? error.message : String(error) });
      }
    };
  `;
}

window.addEventListener("message", (event) => {
  if (event.source === parent && event.data?.channel === "abm-sandbox-ping") {
    parent.postMessage({ channel: "abm-sandbox-ready" }, "*");
    return;
  }
  if (event.source !== parent || event.data?.channel !== "abm-sandbox") return;
  const { id, action, payload } = event.data;
  const blob = new Blob([workerSource()], { type: "text/javascript" });
  const workerUrl = URL.createObjectURL(blob);
  const worker = new Worker(workerUrl);
  let finished = false;
  const finish = (result) => {
    if (finished) return;
    finished = true;
    worker.terminate();
    URL.revokeObjectURL(workerUrl);
    parent.postMessage({ channel: "abm-sandbox-result", id, ...result }, "*");
  };
  const timeout = setTimeout(() => finish({ ok: false, error: "脚本执行超过 2 秒，已终止" }), 2000);
  worker.onmessage = (workerEvent) => {
    clearTimeout(timeout);
    finish(workerEvent.data);
  };
  worker.onerror = (error) => {
    clearTimeout(timeout);
    finish({ ok: false, error: error.message || "脚本执行失败" });
  };
  worker.postMessage({ action, payload });
});

parent.postMessage({ channel: "abm-sandbox-ready" }, "*");
