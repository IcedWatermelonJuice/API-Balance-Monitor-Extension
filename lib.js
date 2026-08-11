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

export const DEFAULT_CUSTOM = {
  type: "script",
  templateType: "custom",
  name: "Custom Provider",
  baseUrl: "",
  apiKey: "",
  accessToken: "",
  userId: "",
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
