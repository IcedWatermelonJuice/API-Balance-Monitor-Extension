import { STORAGE_KEYS, formatMoney, escapeHtml, DEFAULT_SETTINGS } from "./lib.js";
import { resolveLanguage, tFor, applyStaticTranslations } from "./i18n.js";
import { bindPreferenceControls, syncPreferenceControls } from "./preferences.js";
import { providerIconMarkup, providerKind } from "./provider-icons.js";

const providersEl = document.querySelector("#providers");
const emptyEl = document.querySelector("#emptyState");
const lastUpdatedEl = document.querySelector("#lastUpdated");
const statusTextEl = document.querySelector("#statusText");
const refreshBtn = document.querySelector("#refreshBtn");
const refreshWide = document.querySelector("#refreshWide");
let lang = "zh-CN";
let languagePref = "auto";
let themePref = "auto";

function tr(key, vars = {}) { return tFor(lang, key, vars); }
function locale() { return lang === "zh-CN" ? "zh-CN" : "en-US"; }
function formatTime(ts) {
  if (!ts) return tr("notRefreshed");
  return tr("updatedAt", { time: new Date(ts).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit", second: "2-digit" }) });
}

function displayProgress(result) {
  const configured = result.display?.progress;
  if (configured?.enabled !== true) return null;
  const total = Number(configured.totalValue);
  const current = Number(configured.currentValue);
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null;
  return {
    remaining: Math.max(0, Math.min(100, current / total * 100)),
    used: Math.max(0, Math.min(100, (total - current) / total * 100))
  };
}

function formatResultValue(value, result) {
  if (!Number.isFinite(Number(value))) return "—";
  const suffix = result.unitSuffix ? ` ${result.unitSuffix}` : "";
  if (Number.isInteger(result.precision)) return `${result.symbol || ""}${Number(value).toFixed(result.precision)}${suffix}`;
  return `${formatMoney(value, result.symbol || "")}${suffix}`;
}

function metricValue(field, result) {
  if (field?.value == null) return "—";
  if (typeof field.value === "number") return formatResultValue(field.value, result);
  return String(field.value);
}

function displayFields(result) {
  return Array.isArray(result.display?.fields) && result.display.fields.length === 2
    ? result.display.fields
    : [{ label: "—", labelEn: "—", value: null }, { label: "—", labelEn: "—", value: null }];
}

function renderCard(provider, result, index) {
  const name = escapeHtml(provider.name || tr("unnamedSite"));
  const providerIcon = providerIconMarkup(provider, "provider-dot-icon");
  const kind = providerKind(provider);
  const cardClass = kind === "deepseek" ? "deepseek" : kind === "oneapi" ? "newapi" : "custom";
  const delay = Math.min(index * 45, 220);
  if (!result) {
    return `<article class="balance-card ${cardClass}" style="animation-delay:${delay}ms"><div class="balance-card-head"><div class="balance-card-name">${providerIcon}${name}</div><span class="card-status good">${tr("normal")}</span></div><div class="error-text">${tr("waitingFirstRefresh")}</div></article>`;
  }
  if (!result.ok) {
    return `<article class="balance-card ${cardClass} error-card" style="animation-delay:${delay}ms"><div class="balance-card-head"><div class="balance-card-name">${providerIcon}${name}</div><span class="card-status bad">${tr("abnormal")}</span></div><div class="error-text">${escapeHtml(result.error || tr("requestFailed"))}</div></article>`;
  }

  const balance = formatResultValue(result.balance, result);
  const fields = displayFields(result);
  const progress = displayProgress(result);
  const progressHtml = progress ? `<div class="progress-wrap"><div class="progress-track"><div class="progress-fill" style="width:${progress.remaining.toFixed(1)}%"></div></div><div class="progress-meta"><span>${lang === "zh-CN" ? "剩余额度" : "Remaining"} <strong>${progress.remaining.toFixed(1)}%</strong></span><span>${lang === "zh-CN" ? "已用" : "Used"} ${progress.used.toFixed(1)}%</span></div></div>` : "";
  const planName = /^default$/i.test(String(result.planName || "").trim()) ? "" : result.planName;
  const extra = /^Requests:\s*[\d,.]+$/i.test(String(result.extra || "").trim()) ? "" : result.extra;
  const detailHtml = planName || extra
    ? `<div class="provider-extra">${planName ? `<strong>${escapeHtml(planName)}</strong>` : ""}${extra ? `<span>${escapeHtml(extra)}</span>` : ""}</div>`
    : "";
  const healthy = result.available !== false;
  return `<article class="balance-card ${cardClass}" style="animation-delay:${delay}ms">
    <div class="balance-card-head"><div class="balance-card-name">${providerIcon}${name}</div><span class="card-status ${healthy ? "good" : "bad"}">${healthy ? tr("normal") : tr("unavailable")}</span></div>
    <div class="balance-value">${escapeHtml(balance)}</div><div class="balance-caption">${tr("balance")}</div>
    <div class="balance-metrics">${fields.map((field) => `<div class="balance-metric"><span>${escapeHtml(lang === "zh-CN" ? field.label : (field.labelEn || field.label))}</span><strong>${escapeHtml(metricValue(field, result))}</strong></div>`).join("")}</div>
    ${detailHtml}${progressHtml}
  </article>`;
}

async function render() {
  const { providers = [], balances = {}, settings = DEFAULT_SETTINGS } = await chrome.storage.local.get([STORAGE_KEYS.providers, STORAGE_KEYS.balances, STORAGE_KEYS.settings]);
  const resolvedSettings = { ...DEFAULT_SETTINGS, ...settings };
  languagePref = resolvedSettings.language;
  themePref = resolvedSettings.theme;
  lang = resolveLanguage(languagePref);
  applyStaticTranslations(document, lang);
  syncPreferenceControls({
    languagePreference: languagePref,
    resolvedLanguage: lang,
    themePreference: themePref,
    primaryColor: resolvedSettings.primaryColor,
    secondaryColor: resolvedSettings.secondaryColor
  });

  const enabled = providers.filter((p) => p.enabled);
  providersEl.innerHTML = enabled.map((p, i) => renderCard(p, balances[p.id], i)).join("");
  emptyEl.classList.toggle("hidden", enabled.length > 0);
  providersEl.classList.toggle("hidden", enabled.length === 0);
  refreshWide.classList.toggle("hidden", enabled.length === 0);

  const latest = enabled.map((p) => balances[p.id]?.updatedAt || 0).reduce((a, b) => Math.max(a, b), 0);
  const errors = enabled.filter((p) => balances[p.id] && !balances[p.id].ok).length;
  lastUpdatedEl.textContent = formatTime(latest);
  statusTextEl.textContent = errors ? `${errors} ${lang === "zh-CN" ? "个站点异常" : "site error(s)"}` : tr("allNormal");
  document.querySelector(".health-dot").style.background = errors ? "var(--bad)" : "var(--good)";
}

async function refresh() {
  for (const btn of [refreshBtn, refreshWide]) btn.disabled = true;
  refreshBtn.classList.add("spinning");
  refreshWide.querySelector(".refresh-glyph")?.classList.add("spinning");
  try {
    await chrome.runtime.sendMessage({ type: "refresh" });
    await render();
  } finally {
    for (const btn of [refreshBtn, refreshWide]) btn.disabled = false;
    refreshBtn.classList.remove("spinning");
    refreshWide.querySelector(".refresh-glyph")?.classList.remove("spinning");
  }
}

bindPreferenceControls(render);
refreshBtn.addEventListener("click", refresh);
refreshWide.addEventListener("click", refresh);
document.querySelector("#openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.querySelector("#openOptionsEmpty").addEventListener("click", () => chrome.runtime.openOptionsPage());
chrome.storage.onChanged.addListener((_c, area) => { if (area === "local") render(); });
render();
