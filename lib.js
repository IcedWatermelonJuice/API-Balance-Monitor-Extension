export const STORAGE_KEYS = {
  providers: "providers",
  settings: "settings",
  balances: "balances",
  alertState: "alertState",
  updateState: "updateState"
};

export const DEFAULT_SETTINGS = {
  refreshMinutes: 10,
  badgeEnabled: true,
  badgeProviderId: "",
  language: "auto",
  theme: "auto",
  primaryColor: "#1a73e8",
  secondaryColor: "#5f6368",
  githubToken: ""
};

export const CUSTOM_USAGE_SCRIPT = `({
  request: {
    url: "{{baseUrl}}/user/balance",
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": "Bearer {{apiKey}}"
    }
  },
  extractor: function(response) {
    return {
      isValid: response.is_active !== false,
      invalidMessage: response.message || "",
      remaining: Number(response.balance),
      used: response.used == null ? null : Number(response.used),
      total: response.total == null ? null : Number(response.total),
      unit: response.currency || "USD",
      planName: response.plan_name || "",
      extra: response.extra || ""
    };
  },
  display: {
    fields: [
      { key: "used", label: "已使用", labelEn: "Used" },
      { key: "total", label: "总额度", labelEn: "Total" }
    ],
    progress: { enabled: true, totalKey: "total", currentKey: "remaining" }
  }
})`;

export const ONEAPI_USAGE_SCRIPT = `({
  request: {
    url: "{{baseUrl}}/api/user/self",
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": "Bearer {{accessToken}}",
      "X-Api-User": "{{userId}}"
    }
  },
  extractor: function(response) {
    if (response.success === false || !response.data) {
      return { isValid: false, invalidMessage: response.message || "Query failed" };
    }
    var quota = Number(response.data.quota) / 500000;
    var used = Number(response.data.used_quota || 0) / 500000;
    return {
      isValid: true,
      remaining: quota,
      used: used,
      total: quota + used,
      unit: "USD"
    };
  },
  display: {
    fields: [
      { key: "used", label: "已使用", labelEn: "Used" },
      { key: "total", label: "总额度", labelEn: "Total" }
    ],
    progress: { enabled: true, totalKey: "total", currentKey: "remaining" }
  }
})`;

export const DEEPSEEK_USAGE_SCRIPT = `({
  request: {
    url: "{{baseUrl}}/user/balance",
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": "Bearer {{apiKey}}"
    }
  },
  extractor: function(response) {
    var items = Array.isArray(response.balance_infos) ? response.balance_infos : [];
    var item = items.find(function(value) { return value.currency === "CNY"; }) || items[0];
    if (!item) return { isValid: false, invalidMessage: "balance_infos is empty" };
    return {
      isValid: response.is_available !== false,
      invalidMessage: response.is_available === false ? "Account unavailable" : "",
      remaining: Number(item.total_balance),
      toppedUp: Number(item.topped_up_balance),
      granted: Number(item.granted_balance),
      unit: item.currency || "CNY"
    };
  },
  display: {
    fields: [
      { key: "toppedUp", label: "充值余额", labelEn: "Topped up" },
      { key: "granted", label: "赠送余额", labelEn: "Granted" }
    ],
    progress: { enabled: false }
  }
})`;

export const VOLCARK_USAGE_SCRIPT = `({
  request: {
    url: "{{baseUrl}}/?Action=GetCodingPlanUsage&Region=cn-beijing&Version=2024-01-01",
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" }
  },
  buildRequest: async function (variables) {
    var ak = String(variables.apiKey || "").trim();
    var sk = String(variables.accessToken || "").trim();
    if (!ak) throw new Error("缺少 AccessKey ID（AK），请在「AccessKey ID」字段填写");
    if (!sk) throw new Error("缺少 Secret AccessKey（SK），请在「Secret AccessKey」字段填写");

    var host = "open.volcengineapi.com";
    var region = "cn-beijing";
    var service = "ark";
    var contentType = "application/json; charset=utf-8";

    function enc(value) {
      return String(value).replace(/[^A-Za-z0-9_.~-]/g, function (ch) {
        return "%" + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
      });
    }
    var canonicalQuery = "Action=GetCodingPlanUsage&Region=" + enc(region) + "&Version=2024-01-01";

    var now = new Date();
    function pad(n) { return n < 10 ? "0" + n : String(n); }
    var xDate = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) +
      "T" + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + "Z";
    var shortDate = xDate.slice(0, 8);

    var body = "";
    var xContentSha256 = abm.sha256Hex(body);

    var canonicalHeaders =
      "host:" + host + "\\n" +
      "x-date:" + xDate + "\\n" +
      "x-content-sha256:" + xContentSha256 + "\\n" +
      "content-type:" + contentType + "\\n";
    var signedHeaders = "host;x-date;x-content-sha256;content-type";
    var canonicalRequest = ["POST", "/", canonicalQuery, canonicalHeaders, signedHeaders, xContentSha256].join("\\n");

    var credentialScope = shortDate + "/" + region + "/" + service + "/request";
    var stringToSign = "HMAC-SHA256\\n" + xDate + "\\n" + credentialScope + "\\n" + abm.sha256Hex(canonicalRequest);

    var kDate = abm.hmac(abm.utf8Bytes(sk), shortDate);
    var kRegion = abm.hmac(kDate, region);
    var kService = abm.hmac(kRegion, service);
    var kSigning = abm.hmac(kService, "request");
    var signature = abm.hmacHex(kSigning, stringToSign);

    return {
      url: "https://" + host + "/?" + canonicalQuery,
      method: "POST",
      headers: {
        "X-Date": xDate,
        "X-Content-Sha256": xContentSha256,
        "Content-Type": contentType,
        "Authorization": "HMAC-SHA256 Credential=" + ak + "/" + credentialScope +
          ", SignedHeaders=" + signedHeaders + ", Signature=" + signature
      },
      body: ""
    };
  },
  extractor: function (response, meta, vars) {
    function pad(n) { return n < 10 ? "0" + n : String(n); }
    function toNum(v) { var n = Number(v); return isFinite(n) ? n : null; }

    var err = response && response.ResponseMetadata && response.ResponseMetadata.Error;
    if (err && (err.Code || err.Message)) {
      return { isValid: false, invalidMessage: "火山方舟 OpenAPI 错误 " + (err.Code || "") + "：" + (err.Message || "") };
    }

    var result = (response && response.Result) || response || {};
    var list = Array.isArray(result.QuotaUsage) ? result.QuotaUsage
      : Array.isArray(result.Usages) ? result.Usages
      : Array.isArray(result.Details) ? result.Details : [];
    if (!list.length) {
      return { isValid: false, invalidMessage: "未检测到 Coding Plan 订阅（QuotaUsage 为空）。Agent Plan 订阅暂不在本模板支持范围。" };
    }

    var windows = {};
    for (var i = 0; i < list.length; i++) {
      var item = list[i] || {};
      var level = String(item.Level || item.Type || item.Period || item.Label || item.Window || "").toLowerCase();
      if (level !== "session" && level !== "weekly" && level !== "monthly") continue;
      var p = toNum(item.Percent != null ? item.Percent
        : item.UsedPercent != null ? item.UsedPercent
        : item.UsagePercent);
      if (p == null) continue;
      var raw = toNum(item.ResetTime != null ? item.ResetTime : item.ResetTimestamp);
      var resetDate = raw != null && raw > 0 ? new Date(raw * 1000) : null; // -1/0 = 无活跃窗口
      windows[level] = {
        used: p,
        remaining: Math.max(0, 100 - p),
        resetText: resetDate ? pad(resetDate.getMonth() + 1) + "-" + pad(resetDate.getDate()) + " " +
          pad(resetDate.getHours()) + ":" + pad(resetDate.getMinutes()) : null
      };
    }

    var pref = String((vars && vars.primaryWindow) || "monthly").toLowerCase();
    if (pref !== "session" && pref !== "weekly" && pref !== "monthly") pref = "monthly";
    var primary = windows[pref] || windows.monthly || windows.weekly || windows.session;
    if (!primary) {
      return { isValid: false, invalidMessage: "Coding Plan 响应中没有可识别的额度窗口（session/weekly/monthly）。" };
    }

    function w(name) {
      var win = windows[name];
      return {
        used: win ? win.used : 0,
        remaining: win ? win.remaining : 100,
        reset: win ? win.resetText : null
      };
    }
    var s = w("session"), wk = w("weekly"), mo = w("monthly");

    return {
      isValid: true,
      invalidMessage: "",
      remaining: Number(primary.remaining.toFixed(2)),
      used: Number(primary.used.toFixed(2)),
      total: 100,
      unit: "%",
      precision: 2,
      planName: "",
      extra: "",
      sessionUsed: Number(s.used.toFixed(2)), weeklyUsed: Number(wk.used.toFixed(2)), monthlyUsed: Number(mo.used.toFixed(2)),
      sessionRemaining: Number(s.remaining.toFixed(2)), weeklyRemaining: Number(wk.remaining.toFixed(2)), monthlyRemaining: Number(mo.remaining.toFixed(2)),
      sessionReset: s.reset, weeklyReset: wk.reset, monthlyReset: mo.reset
    };
  },
  display: {
    fields: [
      { key: "sessionReset", label: "5H重置", labelEn: "5h reset" },
      { key: "weeklyReset", label: "周重置", labelEn: "Weekly reset" },
      { key: "monthlyReset", label: "月度重置", labelEn: "Monthly reset" }
    ],
    progressList: [
      { label: "5 小时", labelEn: "5h", totalKey: "total", currentKey: "sessionRemaining" },
      { label: "本周", labelEn: "Weekly", totalKey: "total", currentKey: "weeklyRemaining" },
      { label: "本月", labelEn: "Monthly", totalKey: "total", currentKey: "monthlyRemaining" }
    ],
    progress: { enabled: false }
  }
})`;

export const DEFAULT_CUSTOM = {
  type: "script",
  templateType: "custom",
  name: "Custom Provider",
  baseUrl: "",
  apiKey: "",
  accessToken: "",
  userId: "",
  icon: "",
  primaryWindow: "monthly",
  usageScript: CUSTOM_USAGE_SCRIPT,
  timeoutSeconds: 10,
  lowBalance: "",
  enabled: true
};

export function makeId() {
  return crypto.randomUUID();
}

export function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

export function originPattern(baseUrl) {
  const url = new URL(normalizeBaseUrl(baseUrl));
  if (!/^https?:$/.test(url.protocol)) throw new Error("仅支持 HTTP/HTTPS 地址");
  return `${url.origin}/*`;
}

export function interpolateTemplate(value, variables = {}) {
  return String(value ?? "").replace(/\{\{\s*([a-zA-Z][\w]*)\s*\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name] ?? "") : match
  );
}

export function asNumber(value, fieldName) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${fieldName} 不是有效数字`);
  return n;
}

export function formatMoney(value, symbol = "$") {
  if (!Number.isFinite(Number(value))) return "—";
  return `${symbol}${Number(value).toFixed(2)}`;
}

export function currencySymbol(currency) {
  if (currency === "CNY") return "¥";
  if (currency === "USD") return "$";
  return currency ? `${currency} ` : "";
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
