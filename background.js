import {
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  asNumber,
  currencySymbol,
  originPattern,
  interpolateTemplate
} from "./lib.js";

const ALARM_NAME = "refresh-balances";
const UPDATE_CHECK_INTERVAL_MS = 3 * 60 * 60 * 1000;
const ABOUT_CHECK_INTERVAL_MS = 3 * 60 * 1000;
const RELEASE_API_URL = "https://api.github.com/repos/IcedWatermelonJuice/API-Balance-Monitor-Extension/releases/latest";
const RELEASE_PROXY_URL = "https://gh-proxy.org/https://api.github.com/repos/IcedWatermelonJuice/API-Balance-Monitor-Extension/releases/latest";
const RELEASE_PAGE_URL = "https://github.com/IcedWatermelonJuice/API-Balance-Monitor-Extension/releases/latest";
let updateCheckPromise = null;

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
  await ensureAlarm();
  await refreshAll();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureDefaults();
  await ensureAlarm();
  await refreshAll();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) await refreshAll();
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local") return;
  if (changes[STORAGE_KEYS.settings]) await ensureAlarm();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "refresh") {
    refreshAll().then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "refreshProvider") {
    refreshProvider(message.providerId).then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "testProvider") {
    fetchProvider(message.provider)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "prepareProvider") {
    prepareProviderRequest(message.provider)
      .then((request) => sendResponse({ ok: true, request: { url: request.url, method: request.method } }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "checkUpdate") {
    const intervalMs = message.mode === "about" ? ABOUT_CHECK_INTERVAL_MS : UPDATE_CHECK_INTERVAL_MS;
    requestUpdateCheck(intervalMs)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});

function requestUpdateCheck(intervalMs = UPDATE_CHECK_INTERVAL_MS) {
  if (updateCheckPromise) return updateCheckPromise;
  updateCheckPromise = checkForUpdates(intervalMs).finally(() => { updateCheckPromise = null; });
  return updateCheckPromise;
}

function versionParts(value) {
  const match = String(value || "").trim().match(/^v?(\d+(?:\.\d+){0,3})(?:[-+].*)?$/i);
  return match ? match[1].split(".").map(Number) : null;
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  if (!a || !b) throw new Error("版本号格式无效");
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (a[index] || 0) - (b[index] || 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

function releasePageUrl(value) {
  const url = new URL(String(value || ""));
  const prefix = "/IcedWatermelonJuice/API-Balance-Monitor-Extension/releases/";
  if (url.protocol !== "https:" || url.hostname !== "github.com" || !url.pathname.startsWith(prefix)) {
    throw new Error("发布页地址无效");
  }
  return url.href;
}

async function fetchReleaseMetadata(url, token = "") {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, { headers, cache: "no-store" });
  } catch {
    throw new Error("网络请求失败");
  }

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`HTTP ${response.status}：响应不是有效 JSON`);
  }

  const apiMessage = typeof payload?.message === "string" ? payload.message : "";
  if (!response.ok || /rate limit exceeded/i.test(apiMessage)) {
    const detail = apiMessage ? `：${apiMessage.slice(0, 180)}` : "";
    throw new Error(`HTTP ${response.status}${detail}`);
  }
  if (!payload?.tag_name) throw new Error("响应缺少 tag_name");

  releasePageUrl(payload.html_url);

  return {
    latestVersion: String(payload.tag_name),
    releaseName: String(payload.name || payload.tag_name),
    releaseUrl: RELEASE_PAGE_URL,
    publishedAt: payload.published_at ? String(payload.published_at) : ""
  };
}

async function checkForUpdates(intervalMs = UPDATE_CHECK_INTERVAL_MS) {
  const now = Date.now();
  const stored = await chrome.storage.local.get([STORAGE_KEYS.settings, STORAGE_KEYS.updateState]);
  const settings = { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEYS.settings] || {}) };
  const cached = stored[STORAGE_KEYS.updateState];
  if (cached?.lastCheckedAt && now - cached.lastCheckedAt < intervalMs) {
    return { ok: cached.status !== "error", skipped: true, state: cached };
  }

  let metadata;
  let source = "github";
  let directError = "";
  try {
    metadata = await fetchReleaseMetadata(RELEASE_API_URL, String(settings.githubToken || "").trim());
  } catch (error) {
    directError = error.message;
    source = "proxy";
    try {
      // Authentication is deliberately never forwarded to the third-party proxy.
      metadata = await fetchReleaseMetadata(RELEASE_PROXY_URL);
    } catch (proxyError) {
      const state = {
        lastCheckedAt: now,
        status: "error",
        error: `GitHub：${directError}；代理：${proxyError.message}`.slice(0, 420)
      };
      await chrome.storage.local.set({ [STORAGE_KEYS.updateState]: state });
      return { ok: false, skipped: false, state };
    }
  }

  let updateAvailable;
  try {
    updateAvailable = compareVersions(metadata.latestVersion, chrome.runtime.getManifest().version) > 0;
  } catch (error) {
    const state = { lastCheckedAt: now, status: "error", error: error.message };
    await chrome.storage.local.set({ [STORAGE_KEYS.updateState]: state });
    return { ok: false, skipped: false, state };
  }

  const state = {
    ...metadata,
    lastCheckedAt: now,
    source,
    status: updateAvailable ? "update-available" : "up-to-date",
    error: ""
  };
  await chrome.storage.local.set({ [STORAGE_KEYS.updateState]: state });
  return { ok: true, skipped: false, state };
}

let offscreenCreation = null;

async function ensureExtractorDocument() {
  const offscreenUrl = chrome.runtime.getURL("offscreen.html");
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl]
  });
  if (contexts.length) return;
  if (!offscreenCreation) {
    offscreenCreation = chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["IFRAME_SCRIPTING", "WORKERS"],
      justification: "Run user-authored balance extractors in an isolated sandbox"
    }).finally(() => { offscreenCreation = null; });
  }
  await offscreenCreation;
}

async function runUsageScript(action, payload) {
  await ensureExtractorDocument();
  const response = await chrome.runtime.sendMessage({
    target: "offscreen-extractor",
    action,
    payload
  });
  if (!response?.ok) throw new Error(response?.error || "用量查询脚本执行失败");
  return response.result;
}

function interpolateValue(value, variables) {
  if (typeof value === "string") return interpolateTemplate(value, variables);
  if (Array.isArray(value)) return value.map((item) => interpolateValue(item, variables));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, interpolateValue(item, variables)]));
  }
  return value;
}

async function prepareProviderRequest(provider) {
  if (provider?.type !== "script") throw new Error("仅支持 script Provider 配置");
  if (!provider.usageScript?.trim()) throw new Error("用量查询脚本不能为空");
  const variables = {
    baseUrl: String(provider.baseUrl || "").replace(/\/+$/, ""),
    apiKey: provider.apiKey || "",
    accessToken: provider.accessToken || "",
    userId: provider.userId || ""
  };
  const raw = await runUsageScript("prepare", { script: provider.usageScript });
  const request = interpolateValue(raw, variables);
  if (!request || typeof request !== "object") throw new Error("脚本未返回 request 配置");
  const url = new URL(String(request.url || ""));
  if (!/^https?:$/.test(url.protocol)) throw new Error("查询地址仅支持 HTTP/HTTPS");
  const method = String(request.method || "GET").toUpperCase();
  if (!new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]).has(method)) throw new Error(`不支持的请求方法：${method}`);
  if (request.headers != null && (Array.isArray(request.headers) || typeof request.headers !== "object")) {
    throw new Error("request.headers 必须是对象");
  }
  return { url: url.href, method, headers: request.headers || {}, body: request.body };
}

async function ensureDefaults() {
  const current = await chrome.storage.local.get([STORAGE_KEYS.providers, STORAGE_KEYS.settings]);
  const updates = {};
  if (!Array.isArray(current[STORAGE_KEYS.providers])) updates[STORAGE_KEYS.providers] = [];
  if (!current[STORAGE_KEYS.settings]) updates[STORAGE_KEYS.settings] = DEFAULT_SETTINGS;
  if (Object.keys(updates).length) await chrome.storage.local.set(updates);
}

async function ensureAlarm() {
  const { settings = DEFAULT_SETTINGS } = await chrome.storage.local.get(STORAGE_KEYS.settings);
  const minutes = Math.max(1, Number(settings.refreshMinutes) || 10);
  const alarm = await chrome.alarms.get(ALARM_NAME);
  if (!alarm || Math.abs((alarm.periodInMinutes || 0) - minutes) > 0.001) {
    await chrome.alarms.clear(ALARM_NAME);
    await chrome.alarms.create(ALARM_NAME, { delayInMinutes: 0.1, periodInMinutes: minutes });
  }
}

function displayValueByKey(extracted, key) {
  const parts = String(key || "").split(".").filter(Boolean);
  let value = extracted;
  for (const part of parts) {
    if (value == null || typeof value !== "object" || !Object.prototype.hasOwnProperty.call(value, part)) {
      return { found: false, value: null };
    }
    value = value[part];
  }
  return { found: parts.length > 0, value };
}

function displayLabel(field, key) {
  const source = field?.label;
  if (source && typeof source === "object" && !Array.isArray(source)) {
    const label = String(source["zh-CN"] || source.zh || source.en || key).slice(0, 80);
    const labelEn = String(source.en || field.labelEn || label).slice(0, 80);
    return { label, labelEn };
  }
  const label = String(source || field?.labelEn || key).slice(0, 80);
  return { label, labelEn: String(field?.labelEn || label).slice(0, 80) };
}

function normalizeDisplayProgress(progress, extracted) {
  if (!progress || progress.enabled !== true) return { enabled: false };
  const totalKey = String(progress.totalKey || "").trim();
  const currentKey = String(progress.currentKey || "").trim();
  if (!totalKey || !currentKey) throw new Error("display.progress 需要 totalKey 和 currentKey");
  const total = displayValueByKey(extracted, totalKey);
  const current = displayValueByKey(extracted, currentKey);
  if (!total.found) throw new Error(`进度条总长度字段 ${totalKey} 未在 extractor 返回值中找到`);
  if (!current.found) throw new Error(`进度条当前值字段 ${currentKey} 未在 extractor 返回值中找到`);
  const totalValue = asNumber(total.value, `display.progress.${totalKey}`);
  const currentValue = asNumber(current.value, `display.progress.${currentKey}`);
  return { enabled: true, totalKey, currentKey, totalValue, currentValue };
}

function normalizeDisplay(display, extracted) {
  if (display == null) throw new Error("脚本缺少 display 配置");
  if (!display || typeof display !== "object" || !Array.isArray(display.fields) || display.fields.length !== 2) {
    throw new Error("display.fields 必须包含两个展示字段");
  }
  return {
    fields: display.fields.map((field, index) => {
      if (!field || typeof field !== "object") throw new Error(`display.fields[${index}] 必须是对象`);
      const key = String(field.key || "").trim();
      if (!key) throw new Error(`display.fields[${index}].key 不能为空`);
      const resolved = displayValueByKey(extracted, key);
      if (!resolved.found) throw new Error(`display 字段 ${key} 未在 extractor 返回值中找到`);
      const value = resolved.value;
      if (typeof value === "number" && !Number.isFinite(value)) throw new Error(`display 字段 ${key} 不是有效数字`);
      if (value != null && !["string", "number", "boolean"].includes(typeof value)) {
        throw new Error(`display 字段 ${key} 只能是字符串、数字或空值`);
      }
      return { key, ...displayLabel(field, key), value };
    }),
    progress: normalizeDisplayProgress(display.progress, extracted)
  };
}

async function fetchScriptProvider(provider) {
  const request = await prepareProviderRequest(provider);
  const pattern = originPattern(request.url);
  const hasPermission = await chrome.permissions.contains({ origins: [pattern] });
  if (!hasPermission) throw new Error(`缺少站点访问权限：${new URL(request.url).origin}`);

  const controller = new AbortController();
  const timeoutSeconds = Math.min(120, Math.max(1, Number(provider.timeoutSeconds) || 10));
  const timeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
  let response;
  try {
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers || {})) headers.set(name, String(value ?? ""));
    const options = {
      method: request.method,
      headers,
      cache: "no-store",
      signal: controller.signal
    };
    if (!["GET", "HEAD"].includes(request.method) && request.body != null && request.body !== "") {
      if (typeof request.body === "string") options.body = request.body;
      else {
        options.body = JSON.stringify(request.body);
        if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      }
    }
    response = await fetch(request.url, options);
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(`查询超时（${timeoutSeconds} 秒）`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let responseValue = text;
  try { responseValue = text ? JSON.parse(text) : {}; } catch { /* Extractors may intentionally consume plain text. */ }
  const responseHeaders = Object.fromEntries([...response.headers.entries()].map(([name, value]) => [name.toLowerCase(), value]));
  if (!response.ok) {
    const message = responseValue?.message || responseValue?.error?.message || responseValue?.error || response.statusText;
    throw new Error(`HTTP ${response.status}${message ? `：${message}` : ""}`);
  }

  const execution = await runUsageScript("extract", {
    script: provider.usageScript,
    response: responseValue,
    meta: { status: response.status, headers: responseHeaders }
  });
  const extracted = execution?.extracted ?? execution;
  if (!extracted || typeof extracted !== "object") throw new Error("extractor 必须返回对象");
  const display = normalizeDisplay(execution?.display, extracted);
  if (extracted.isValid === false) throw new Error(String(extracted.invalidMessage || "Provider 返回无效状态"));

  const used = extracted.used == null ? null : asNumber(extracted.used, "used");
  const total = extracted.total == null ? null : asNumber(extracted.total, "total");
  let remaining = extracted.remaining == null ? null : asNumber(extracted.remaining, "remaining");
  if (remaining == null && used != null && total != null) remaining = total - used;
  if (remaining == null) throw new Error("extractor 未返回有效的 remaining，且无法由 total - used 推导");
  const unit = String(extracted.unit || "");
  const currencyUnit = unit === "CNY" || unit === "USD";
  const precision = extracted.precision == null ? null : Math.min(8, Math.max(0, Number(extracted.precision) || 0));

  return {
    providerId: provider.id,
    type: provider.templateType || "custom",
    name: provider.name,
    ok: true,
    available: true,
    currency: unit,
    symbol: currencyUnit ? currencySymbol(unit) : "",
    unitSuffix: currencyUnit ? "" : unit,
    balance: remaining,
    remaining,
    used,
    total,
    planName: extracted.planName == null ? "" : String(extracted.planName),
    extra: extracted.extra == null ? "" : String(extracted.extra),
    display,
    precision,
    updatedAt: Date.now()
  };
}

async function fetchProvider(provider) {
  if (!provider?.enabled) throw new Error("站点未启用");
  if (provider.type !== "script") throw new Error("仅支持 script Provider 配置");
  return fetchScriptProvider(provider);
}

async function refreshAll() {
  const { providers = [], balances = {}, settings = DEFAULT_SETTINGS, alertState = {} } =
    await chrome.storage.local.get([
      STORAGE_KEYS.providers,
      STORAGE_KEYS.balances,
      STORAGE_KEYS.settings,
      STORAGE_KEYS.alertState
    ]);

  const nextBalances = { ...balances };
  const nextAlertState = { ...alertState };
  const enabled = providers.filter((p) => p.enabled);

  await Promise.all(
    enabled.map(async (provider) => {
      try {
        const result = await fetchProvider(provider);
        nextBalances[provider.id] = result;
        await handleLowBalance(provider, result, nextAlertState);
      } catch (error) {
        nextBalances[provider.id] = {
          providerId: provider.id,
          type: provider.type,
          name: provider.name,
          ok: false,
          error: error.message,
          updatedAt: Date.now()
        };
      }
    })
  );

  for (const id of Object.keys(nextBalances)) {
    if (!providers.some((p) => p.id === id)) delete nextBalances[id];
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.balances]: nextBalances,
    [STORAGE_KEYS.alertState]: nextAlertState
  });

  await updateBadge(enabled, nextBalances, settings);
  return { ok: true, balances: nextBalances };
}

async function refreshProvider(providerId) {
  const { providers = [], balances = {}, settings = DEFAULT_SETTINGS, alertState = {} } =
    await chrome.storage.local.get([
      STORAGE_KEYS.providers,
      STORAGE_KEYS.balances,
      STORAGE_KEYS.settings,
      STORAGE_KEYS.alertState
    ]);
  const provider = providers.find((item) => item.id === providerId);
  if (!provider) throw new Error("Provider not found");
  if (!provider.enabled) throw new Error("Provider is disabled");

  const nextBalances = { ...balances };
  const nextAlertState = { ...alertState };
  try {
    const result = await fetchProvider(provider);
    nextBalances[provider.id] = result;
    await handleLowBalance(provider, result, nextAlertState);
  } catch (error) {
    nextBalances[provider.id] = {
      providerId: provider.id,
      type: provider.type,
      name: provider.name,
      ok: false,
      error: error.message,
      updatedAt: Date.now()
    };
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.balances]: nextBalances,
    [STORAGE_KEYS.alertState]: nextAlertState
  });
  await updateBadge(providers.filter((item) => item.enabled), nextBalances, settings);
  return { ok: nextBalances[provider.id].ok, result: nextBalances[provider.id] };
}

async function handleLowBalance(provider, result, state) {
  const threshold = Number(provider.lowBalance);
  if (!Number.isFinite(threshold) || provider.lowBalance === "") {
    delete state[provider.id];
    return;
  }

  const isLow = result.balance < threshold;
  const wasLow = Boolean(state[provider.id]);
  if (isLow && !wasLow) {
    const suffix = result.unitSuffix ? ` ${result.unitSuffix}` : "";
    await chrome.notifications.create(`low-${provider.id}`, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: `${provider.name} 余额较低`,
      message: `当前余额 ${result.symbol || ""}${result.balance.toFixed(2)}${suffix}，已低于阈值 ${result.symbol || ""}${threshold.toFixed(2)}${suffix}。`
    });
  }
  state[provider.id] = isLow;
}

async function updateBadge(enabledProviders, balances, settings) {
  if (!settings.badgeEnabled) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }

  // Badge is an explicit opt-in per provider. When the global badge switch is on
  // but no enabled provider has been selected as the badge source, show "X" as
  // a clear placeholder instead of silently falling back to the first provider.
  const selected = settings.badgeProviderId
    ? enabledProviders.find((p) => p.id === settings.badgeProviderId)
    : null;

  if (!selected) {
    await chrome.action.setBadgeText({ text: "X" });
    return;
  }

  const selectedBalance = balances[selected.id];
  if (!selectedBalance?.ok) {
    await chrome.action.setBadgeText({ text: "!" });
    return;
  }

  const value = selectedBalance.balance;
  const text = value >= 1000 ? `${Math.floor(value / 1000)}k` : value >= 100 ? `${Math.floor(value)}` : value >= 10 ? value.toFixed(0) : value.toFixed(1);
  await chrome.action.setBadgeText({ text });
}
