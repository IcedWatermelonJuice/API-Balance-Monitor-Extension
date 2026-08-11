import {
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  DEFAULT_CUSTOM,
  CUSTOM_USAGE_SCRIPT,
  ONEAPI_USAGE_SCRIPT,
  DEEPSEEK_USAGE_SCRIPT,
  makeId,
  originPattern,
  escapeHtml
} from "./lib.js";
import { resolveLanguage, tFor, applyStaticTranslations } from "./i18n.js";
import { bindPreferenceControls, resolveTheme, syncPreferenceControls } from "./preferences.js";
import { providerIconMarkup, providerKind } from "./provider-icons.js";

const dialog = document.querySelector("#providerDialog");
const fields = document.querySelector("#providerFields");
const list = document.querySelector("#providerList");
const noProviders = document.querySelector("#noProviders");
const testMsg = document.querySelector("#testMsg");
let editingType = "custom";
let draggedId = null;
const transferDialog = document.querySelector("#transferDialog");
const transferTitle = document.querySelector("#transferTitle");
const transferHint = document.querySelector("#transferHint");
const transferPassword = document.querySelector("#transferPassword");
const transferPasswordConfirm = document.querySelector("#transferPasswordConfirm");
const confirmPasswordLabel = document.querySelector("#confirmPasswordLabel");
const importModeField = document.querySelector("#importModeField");
const transferMsg = document.querySelector("#transferMsg");
const confirmTransfer = document.querySelector("#confirmTransfer");
const importFile = document.querySelector("#importFile");
let transferMode = "export";
let pendingImportEnvelope = null;
let lang = "zh-CN";
let languagePreference = "auto";
let themePreference = "auto";
let displayedUpdateState = null;
let aboutUpdateChipTimer = null;
let aboutUpdateFeedbackActive = false;
const tr = (key, vars = {}) => tFor(lang, key, vars);

const extensionVersion = chrome.runtime.getManifest().version;
document.querySelectorAll("[data-extension-version]").forEach((element) => {
  element.textContent = `v${extensionVersion}`;
});

const CONFIG_FORMAT = "api-balance-monitor-encrypted";
const CONFIG_VERSION = 2;
const RELEASE_LATEST_URL = "https://github.com/IcedWatermelonJuice/API-Balance-Monitor-Extension/releases/latest";
const PBKDF2_ITERATIONS = 310000;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const EYE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/></svg>`;
const EYE_OFF_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17.8 17.8 0 0 1-2.5 3.2M6.2 6.3C3.8 8.1 2.5 12 2.5 12s3.5 6 9.5 6c1.4 0 2.7-.3 3.8-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>`;
const EDIT_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>`;
const COPY_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>`;
const DELETE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m7 7 1 13h8l1-13"/><path d="M10 11v5M14 11v5"/></svg>`;
const BADGE_ICON = `<svg class="badge-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.03l-5.5 2.89 1.05-6.12L3.1 9.47l6.15-.9L12 3Z"/></svg>`;
const REFRESH_ICON = `<svg class="refresh-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6v5h-5"/><path d="M18.2 16.8A8 8 0 1 1 20 11"/></svg>`;
const UPDATE_STATUS_ICONS = {
  checking: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 8.2A7 7 0 0 1 18.7 9M17.9 15.8A7 7 0 0 1 5.3 15"/></svg>`,
  current: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16.5 9"/></svg>`,
  error: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>`,
  available: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13V9l11-4v12L4 13Z"/><path d="M15 9.5c2 .5 3 1.3 3 1.5s-1 1-3 1.5M6.5 13l1.2 5h3.1l-1.2-4"/></svg>`
};

const field = (id, label, value = "", type = "text", extra = "") => `
  <label class="field-label"><span>${label}</span><input id="${id}" type="${type}" value="${escapeHtml(value)}" ${extra} /></label>`;

const secretField = (id, label, value = "", extra = "") => `
  <label class="field-label"><span>${label}</span><span class="secret-input-wrap"><input id="${id}" type="password" value="${escapeHtml(value)}" ${extra} /><button type="button" class="secret-toggle" data-reveal-target="${id}" title="${escapeHtml(tr("showSecret"))}" aria-label="${escapeHtml(tr("showSecret"))}" ${/\bdisabled\b/.test(extra) ? 'disabled tabindex="-1"' : ""}>${EYE_OFF_ICON}</button></span></label>`;

const textAreaField = (id, label, value = "", rows = 13) => `
  <label class="field-label full-span"><span>${label}</span><textarea id="${id}" rows="${rows}" spellcheck="false">${escapeHtml(value)}</textarea></label>`;

function scriptFields(p) {
  const templateLabel = p.templateType === "deepseek"
    ? tr("deepSeekTemplate")
    : p.templateType === "oneapi" ? tr("oneApiTemplate") : tr("customProvider");
  const deepSeekUnused = p.templateType === "deepseek"
    ? `disabled aria-disabled="true" title="${escapeHtml(tr("notUsedByTemplate"))}"`
    : "";
  return `
    <div class="template-note full-span"><strong>${escapeHtml(templateLabel)}</strong><span>${tr("scriptConfigHint")}</span></div>
    ${field("name", tr("name"), p.name)}
    ${field("baseUrl", "Base URL", p.baseUrl, "url", 'placeholder="https://example.com"')}
    ${secretField("apiKey", tr("apiKey"), p.apiKey, 'autocomplete="off" placeholder="{{apiKey}}"')}
    ${secretField("accessToken", tr("accessToken"), p.accessToken, `autocomplete="off" placeholder="{{accessToken}}" ${deepSeekUnused}`)}
    ${secretField("userId", tr("userId"), p.userId, `autocomplete="off" placeholder="{{userId}}" ${deepSeekUnused}`)}
    ${field("timeoutSeconds", tr("timeoutSeconds"), p.timeoutSeconds, "number", 'min="1" max="120" step="1"')}
    ${textAreaField("usageScript", tr("usageScript"), p.usageScript)}
    <div class="script-help full-span">${tr("scriptPlaceholders")}</div>
    ${field("lowBalance", tr("lowBalance"), p.lowBalance, "number", 'min="0" step="any"')}
    <label class="checkbox-label"><input id="enabled" type="checkbox" ${p.enabled ? "checked" : ""} /> ${tr("enableSite")}</label>`;
}

function providerFromTemplate(templateType) {
  const names = {
    custom: lang === "zh-CN" ? "自定义 Provider" : "Custom Provider",
    oneapi: lang === "zh-CN" ? "NewAPI 兼容" : "NewAPI Compatible",
    deepseek: lang === "zh-CN" ? "DeepSeek 官方" : "DeepSeek Official"
  };
  const scripts = {
    custom: CUSTOM_USAGE_SCRIPT,
    oneapi: ONEAPI_USAGE_SCRIPT,
    deepseek: DEEPSEEK_USAGE_SCRIPT
  };
  return {
    ...DEFAULT_CUSTOM,
    id: makeId(),
    templateType,
    name: names[templateType],
    baseUrl: templateType === "deepseek" ? "https://api.deepseek.com" : "",
    usageScript: scripts[templateType]
  };
}

function asScriptProvider(provider) {
  return { ...DEFAULT_CUSTOM, ...provider, type: "script", templateType: provider.templateType || "custom" };
}

async function getSettings() {
  const { settings = DEFAULT_SETTINGS } = await chrome.storage.local.get(STORAGE_KEYS.settings);
  const resolved = { ...DEFAULT_SETTINGS, ...settings };
  if (resolved.primaryColor?.toLowerCase() === "#415f91" && resolved.secondaryColor?.toLowerCase() === "#6750a4") {
    resolved.primaryColor = DEFAULT_SETTINGS.primaryColor;
    resolved.secondaryColor = DEFAULT_SETTINGS.secondaryColor;
  }
  return resolved;
}

function normalizeHexColor(value) {
  const raw = String(value || "").trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(raw)) return `#${[...raw].map((character) => character.repeat(2)).join("")}`.toUpperCase();
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw}`.toUpperCase();
  return null;
}

function setColorControls(name, value) {
  const normalized = normalizeHexColor(value) || DEFAULT_SETTINGS[`${name}Color`].toUpperCase();
  document.querySelector(`#${name}Color`).value = normalized;
  document.querySelector(`#${name}ColorHex`).value = normalized;
}

function readColorControl(name) {
  const input = document.querySelector(`#${name}ColorHex`);
  const normalized = normalizeHexColor(input.value);
  input.setCustomValidity(normalized ? "" : tr("invalidHexColor"));
  if (!normalized) {
    input.reportValidity();
    return null;
  }
  setColorControls(name, normalized);
  return normalized.toLowerCase();
}

function bindColorControl(name) {
  const picker = document.querySelector(`#${name}Color`);
  const hex = document.querySelector(`#${name}ColorHex`);
  picker.addEventListener("input", () => {
    hex.value = picker.value.toUpperCase();
    hex.setCustomValidity("");
  });
  hex.addEventListener("input", () => {
    const normalized = normalizeHexColor(hex.value);
    hex.setCustomValidity("");
    if (normalized) picker.value = normalized;
  });
  hex.addEventListener("blur", () => {
    const normalized = normalizeHexColor(hex.value);
    if (normalized) hex.value = normalized;
  });
}

function applySettingsPreferences(settings) {
  const previousLanguage = lang;
  const previousLanguagePreference = languagePreference;
  languagePreference = settings.language || "auto";
  themePreference = settings.theme || "auto";
  lang = resolveLanguage(languagePreference);
  applyStaticTranslations(document, lang);
  syncPreferenceControls({
    languagePreference,
    resolvedLanguage: lang,
    themePreference,
    primaryColor: settings.primaryColor,
    secondaryColor: settings.secondaryColor
  });
  const themeAuto = document.querySelector("#themeAuto");
  if (themeAuto) themeAuto.checked = themePreference === "auto";
  if (displayedUpdateState) renderUpdateState(displayedUpdateState);
  return {
    languageChanged: previousLanguage !== lang || previousLanguagePreference !== languagePreference
  };
}

async function loadSettings() {
  const settings = await getSettings();
  document.querySelector("#refreshMinutes").value = settings.refreshMinutes ?? 10;
  document.querySelector("#badgeEnabled").checked = settings.badgeEnabled !== false;
  document.querySelector("#themeAuto").checked = settings.theme === "auto";
  const githubToken = document.querySelector("#githubToken");
  githubToken.value = settings.githubToken || "";
  resetSecretInput(githubToken);
  setColorControls("primary", settings.primaryColor);
  setColorControls("secondary", settings.secondaryColor);
  applySettingsPreferences(settings);
  markGlobalSettingsDirty(false);
  document.querySelectorAll(".secret-toggle").forEach((button) => { if (!button.innerHTML.trim()) button.innerHTML = EYE_OFF_ICON; });
}

function markGlobalSettingsDirty(dirty = true) {
  document.querySelector("#globalUnsaved")?.classList.toggle("hidden", !dirty);
  document.querySelector("#cancelGlobalChanges")?.classList.toggle("hidden", !dirty);
}

async function syncSettingsPreferences() {
  const settings = await getSettings();
  const { languageChanged } = applySettingsPreferences(settings);
  if (languageChanged) await renderProviders();
}

async function saveSettings() {
  const previous = await getSettings();
  const primaryColor = readColorControl("primary");
  const secondaryColor = readColorControl("secondary");
  if (!primaryColor || !secondaryColor) return;
  const settings = {
    ...previous,
    refreshMinutes: Math.max(1, Number(document.querySelector("#refreshMinutes").value) || 10),
    badgeEnabled: document.querySelector("#badgeEnabled").checked,
    githubToken: document.querySelector("#githubToken").value.trim(),
    primaryColor,
    secondaryColor,
    theme: document.querySelector("#themeAuto").checked
      ? "auto"
      : previous.theme === "auto" ? resolveTheme("auto") : previous.theme
  };
  const githubTokenChanged = settings.githubToken !== previous.githubToken;
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });
  if (githubTokenChanged) await chrome.storage.local.remove(STORAGE_KEYS.updateState);
  applySettingsPreferences(settings);
  markGlobalSettingsDirty(false);
  await renderProviders();
  const msg = document.querySelector("#settingsMsg");
  msg.textContent = tr("saved");
  msg.classList.add("flash-in");
  setTimeout(() => { msg.textContent = ""; msg.classList.remove("flash-in"); }, 1500);
  if (githubTokenChanged) checkUpdateOnOpen();
  await chrome.runtime.sendMessage({ type: "refresh" });
}

function trustedReleaseUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:"
      && url.hostname === "github.com"
      && url.pathname.startsWith("/IcedWatermelonJuice/API-Balance-Monitor-Extension/releases/")
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function hideAboutUpdateChip(delay = 0) {
  clearTimeout(aboutUpdateChipTimer);
  const chip = document.querySelector("#aboutUpdateChip");
  aboutUpdateChipTimer = setTimeout(() => {
    chip.classList.add("is-hiding");
    aboutUpdateChipTimer = setTimeout(() => {
      chip.classList.add("hidden");
      chip.classList.remove("is-hiding");
    }, 180);
  }, delay);
}

function showAboutUpdateChip(state, latestVersion = "", autoHide = false) {
  clearTimeout(aboutUpdateChipTimer);
  const chip = document.querySelector("#aboutUpdateChip");
  const icon = document.querySelector("#aboutUpdateChipIcon");
  const shortText = document.querySelector("#aboutUpdateChipShort");
  const longText = document.querySelector("#aboutUpdateChipLong");
  chip.dataset.state = state;
  chip.classList.remove("hidden", "is-hiding");
  chip.removeAttribute("href");
  chip.removeAttribute("title");
  icon.innerHTML = UPDATE_STATUS_ICONS[state];
  longText.textContent = "";

  if (state === "checking") shortText.textContent = tr("updateCheckingShort");
  if (state === "current") shortText.textContent = tr("updateNone");
  if (state === "error") shortText.textContent = tr("updateFailedShort");
  if (state === "available") {
    shortText.textContent = tr("updateAvailableShort");
    longText.textContent = tr("updateAvailableLong", { version: latestVersion });
    chip.href = trustedReleaseUrl(RELEASE_LATEST_URL);
    chip.title = longText.textContent;
  }
  if (autoHide) hideAboutUpdateChip(3000);
}

function renderUpdateState(state, { feedback = false } = {}) {
  displayedUpdateState = state || null;
  if (!state) {
    if (feedback) showAboutUpdateChip("checking");
    else hideAboutUpdateChip();
    return;
  }

  if (state.status === "update-available") {
    showAboutUpdateChip("available", state.latestVersion || "");
  } else if (state.status === "up-to-date") {
    if (feedback) showAboutUpdateChip("current", "", true);
    else hideAboutUpdateChip();
  } else {
    if (feedback) showAboutUpdateChip("error", "", true);
    else hideAboutUpdateChip();
  }
}

async function checkUpdateOnOpen(mode = "auto", feedback = false) {
  const startedAt = performance.now();
  if (feedback) {
    aboutUpdateFeedbackActive = true;
    showAboutUpdateChip("checking");
  } else if (!displayedUpdateState) {
    renderUpdateState(null);
  }
  try {
    const response = await chrome.runtime.sendMessage({ type: "checkUpdate", mode });
    if (feedback) {
      const remaining = 520 - (performance.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    if (response?.state) renderUpdateState(response.state, { feedback });
    else renderUpdateState({ status: "error", error: response?.error || tr("updateFailed") }, { feedback });
  } catch (error) {
    renderUpdateState({ status: "error", error: error.message }, { feedback });
  } finally {
    if (feedback) aboutUpdateFeedbackActive = false;
  }
}

async function getProviders() {
  const { providers = [] } = await chrome.storage.local.get(STORAGE_KEYS.providers);
  return providers;
}

function providerResultTime(result) {
  if (!result?.updatedAt) return tr("notRefreshed");
  return tr("updatedAt", {
    time: new Date(result.updatedAt).toLocaleTimeString(lang === "zh-CN" ? "zh-CN" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
  });
}

function providerQueryInfoMarkup(result) {
  return `<div class="provider-query-info"><span>${escapeHtml(providerResultTime(result))}</span></div>`;
}

function providerRow(p, badgeProviderId, result) {
  const kind = providerKind(p);
  const isDeepSeek = kind === "deepseek";
  const isCustom = kind === "custom";
  const isBadge = badgeProviderId === p.id;
  const urlText = p.baseUrl || (isDeepSeek ? "https://api.deepseek.com" : isCustom ? tr("scriptDefinedUrl") : "NewAPI Compatible");
  return `
    <article class="provider-row provider-${kind} ${p.enabled ? "" : "is-disabled"}" data-id="${escapeHtml(p.id)}">
      <button class="drag-handle" draggable="true" title="${escapeHtml(tr("dragSort"))}" aria-label="${escapeHtml(tr("dragSort"))}">⋮⋮</button>
      <div class="provider-main">
        <div class="provider-title-line">
          ${providerIconMarkup(p, "provider-list-icon")}
          <div class="provider-name">${escapeHtml(p.name)}</div>
          <span class="provider-status-chip ${p.enabled ? "" : "off"}">${p.enabled ? tr("enabled") : tr("disabled")}</span>
        </div>
        <div class="provider-url">${escapeHtml(urlText)}</div>
        ${providerQueryInfoMarkup(result)}
      </div>
      <div class="provider-actions">
        <button class="toggle-btn ${p.enabled ? "is-on" : "is-off"}" data-action="toggle" aria-pressed="${p.enabled}" title="${escapeHtml(p.enabled ? tr("disable") : tr("enable"))}">${p.enabled ? tr("disable") : tr("enable")}</button>
        <button class="action-icon-btn provider-action-btn refresh-provider-btn" data-action="refresh" title="${escapeHtml(tr("refreshSite"))}" aria-label="${escapeHtml(tr("refreshSite"))}" ${p.enabled ? "" : "disabled"}>${REFRESH_ICON}<span class="action-label">${escapeHtml(tr("refreshSite"))}</span></button>
        <button class="badge-source-btn provider-action-btn ${isBadge ? "selected" : ""}" data-action="badge" aria-pressed="${isBadge}" title="${escapeHtml(isBadge ? tr("currentBadge") : tr("setBadge"))}" aria-label="${escapeHtml(tr("badge"))}">${BADGE_ICON}<span class="action-label">${escapeHtml(tr("badge"))}</span></button>
        <button class="action-icon-btn provider-action-btn copy-btn" data-action="copy" title="${escapeHtml(tr("copy"))}" aria-label="${escapeHtml(tr("copy"))}">${COPY_ICON}<span class="action-label">${escapeHtml(tr("copy"))}</span></button>
        <button class="action-icon-btn provider-action-btn edit-btn" data-action="edit" title="${escapeHtml(tr("edit"))}" aria-label="${escapeHtml(tr("edit"))}">${EDIT_ICON}<span class="action-label">${escapeHtml(tr("edit"))}</span></button>
        <span class="delete-action-wrap">
          <button class="action-icon-btn provider-action-btn delete-btn" data-action="delete" title="${escapeHtml(tr("delete"))}" aria-label="${escapeHtml(tr("delete"))}">${DELETE_ICON}<span class="action-label">${escapeHtml(tr("delete"))}</span></button>
          <span class="delete-confirm-actions hidden">
            <button class="inline-cancel-delete" data-action="cancel-delete">${escapeHtml(tr("cancel"))}</button>
            <button class="inline-confirm-delete" data-action="confirm-delete">${escapeHtml(tr("confirmDelete"))}</button>
          </span>
        </span>
      </div>
    </article>`;
}

async function renderProviders() {
  const [providers, settings, balanceStore] = await Promise.all([
    getProviders(),
    getSettings(),
    chrome.storage.local.get(STORAGE_KEYS.balances)
  ]);
  const balances = balanceStore[STORAGE_KEYS.balances] || {};
  noProviders.classList.toggle("hidden", providers.length > 0);
  list.innerHTML = providers.map((p) => providerRow(p, settings.badgeProviderId, balances[p.id])).join("");
}

function updateProviderQueryInfo(providerId, result) {
  const row = list.querySelector(`[data-id="${CSS.escape(providerId)}"]`);
  const current = row?.querySelector(".provider-query-info");
  if (current) current.outerHTML = providerQueryInfoMarkup(result);
}

function updateAllProviderQueryInfo(balances = {}) {
  list.querySelectorAll(".provider-row").forEach((row) => updateProviderQueryInfo(row.dataset.id, balances[row.dataset.id]));
}

function openDialog(type, provider = null) {
  editingType = type;
  const p = provider ? asScriptProvider(provider) : providerFromTemplate(type);
  editingType = p.templateType || "custom";
  document.querySelector("#providerId").value = p.id;
  document.querySelector("#dialogTitle").textContent = provider ? tr("editProvider") : tr("addProvider");
  fields.innerHTML = scriptFields(p);
  testMsg.textContent = "";
  testMsg.className = "test-msg";
  dialog.showModal();
}

function readProvider() {
  const provider = {
    id: document.querySelector("#providerId").value,
    type: "script",
    templateType: editingType,
    name: document.querySelector("#name").value.trim(),
    baseUrl: document.querySelector("#baseUrl").value.trim(),
    apiKey: document.querySelector("#apiKey").value,
    accessToken: document.querySelector("#accessToken").value,
    userId: document.querySelector("#userId").value,
    usageScript: document.querySelector("#usageScript").value.trim(),
    timeoutSeconds: Math.min(120, Math.max(1, Number(document.querySelector("#timeoutSeconds").value) || 10)),
    lowBalance: document.querySelector("#lowBalance").value.trim(),
    enabled: document.querySelector("#enabled").checked
  };
  if (!provider.name) throw new Error(tr("nameRequired"));
  if (!provider.usageScript) throw new Error(tr("scriptRequired"));
  if (provider.baseUrl) new URL(provider.baseUrl);
  return provider;
}

async function requestSitePermission(provider) {
  const prepared = await chrome.runtime.sendMessage({ type: "prepareProvider", provider });
  if (!prepared?.ok) throw new Error(prepared?.error || tr("invalidScript"));
  const patterns = [...new Set([provider.baseUrl, prepared.request?.url].filter(Boolean).map(originPattern))];
  const granted = await chrome.permissions.contains({ origins: patterns });
  if (granted) return true;
  return chrome.permissions.request({ origins: patterns });
}

async function testProvider() {
  try {
    const provider = readProvider();
    const granted = await requestSitePermission(provider);
    if (!granted) throw new Error(tr("permissionDenied"));
    testMsg.textContent = tr("testing");
    testMsg.className = "test-msg pulse-text";
    const response = await chrome.runtime.sendMessage({ type: "testProvider", provider: { ...provider, enabled: true } });
    if (!response?.ok) throw new Error(response?.error || tr("testFailed"));
    const r = response.result;
    const precision = Number.isInteger(r.precision) ? r.precision : 2;
    testMsg.textContent = tr("connectedBalance", { balance: `${r.symbol || ""}${Number(r.balance).toFixed(precision)}${r.unitSuffix ? ` ${r.unitSuffix}` : ""}` });
    testMsg.className = "test-msg success flash-in";
  } catch (error) {
    testMsg.textContent = error.message;
    testMsg.className = "test-msg error flash-in";
  }
}

async function saveProvider() {
  try {
    const provider = readProvider();
    const granted = await requestSitePermission(provider);
    if (!granted) throw new Error(tr("permissionDeniedSave"));
    const providers = await getProviders();
    const index = providers.findIndex((p) => p.id === provider.id);
    if (index >= 0) providers[index] = provider;
    else providers.push(provider);
    await chrome.storage.local.set({ [STORAGE_KEYS.providers]: providers });
    dialog.close();
    await renderProviders();
    await chrome.runtime.sendMessage({ type: "refresh" });
  } catch (error) {
    testMsg.textContent = error.message;
    testMsg.className = "test-msg error flash-in";
  }
}

async function persistProviders(providers, refresh = true) {
  await chrome.storage.local.set({ [STORAGE_KEYS.providers]: providers });
  await renderProviders();
  if (refresh) await chrome.runtime.sendMessage({ type: "refresh" });
}

function updateProviderEnabledState(provider) {
  const row = list.querySelector(`[data-id="${CSS.escape(provider.id)}"]`);
  if (!row) return;
  row.classList.toggle("is-disabled", !provider.enabled);
  const status = row.querySelector(".provider-status-chip");
  status?.classList.toggle("off", !provider.enabled);
  if (status) status.textContent = provider.enabled ? tr("enabled") : tr("disabled");
  const toggle = row.querySelector('[data-action="toggle"]');
  toggle?.classList.toggle("is-on", provider.enabled);
  toggle?.classList.toggle("is-off", !provider.enabled);
  toggle?.setAttribute("aria-pressed", String(provider.enabled));
  if (toggle) {
    toggle.title = provider.enabled ? tr("disable") : tr("enable");
    toggle.textContent = provider.enabled ? tr("disable") : tr("enable");
  }
  const refresh = row.querySelector('[data-action="refresh"]');
  if (refresh) refresh.disabled = !provider.enabled;
}

function updateBadgeSelection(providerId) {
  list.querySelectorAll(".provider-row").forEach((row) => {
    const selected = row.dataset.id === providerId;
    const button = row.querySelector('[data-action="badge"]');
    if (!button) return;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.title = selected ? tr("currentBadge") : tr("setBadge");
    button.innerHTML = `${BADGE_ICON}<span class="action-label">${escapeHtml(tr("badge"))}</span>`;
  });
}

async function toggleProvider(provider, button) {
  if (!provider.enabled) {
    const granted = await requestSitePermission(provider);
    if (!granted) return;
  }
  button.classList.add("button-pop");
  const providers = await getProviders();
  const index = providers.findIndex((p) => p.id === provider.id);
  if (index < 0) return;
  providers[index] = { ...providers[index], enabled: !providers[index].enabled };
  await chrome.storage.local.set({ [STORAGE_KEYS.providers]: providers });
  updateProviderEnabledState(providers[index]);
  setTimeout(() => button.classList.remove("button-pop"), 220);
  await chrome.runtime.sendMessage({ type: "refresh" });
}

async function chooseBadgeProvider(provider) {
  const settings = await getSettings();
  const nextId = settings.badgeProviderId === provider.id ? "" : provider.id;
  await chrome.storage.local.set({
    [STORAGE_KEYS.settings]: { ...settings, badgeProviderId: nextId }
  });
  updateBadgeSelection(nextId);
  await chrome.runtime.sendMessage({ type: "refresh" });
}

async function refreshProvider(provider, button) {
  if (!provider.enabled || button.disabled) return;
  button.disabled = true;
  button.classList.add("refreshing");
  try {
    const response = await chrome.runtime.sendMessage({ type: "refreshProvider", providerId: provider.id });
    if (response?.result) updateProviderQueryInfo(provider.id, response.result);
  } finally {
    button.classList.remove("refreshing");
    button.disabled = false;
  }
}

async function duplicateProvider(provider) {
  const providers = await getProviders();
  const index = providers.findIndex((p) => p.id === provider.id);
  if (index < 0) return;
  const clone = {
    ...provider,
    id: makeId(),
    name: `${provider.name}${tr("copySuffix")}`,
    enabled: false
  };
  providers.splice(index + 1, 0, clone);
  await persistProviders(providers, false);
  const row = list.querySelector(`[data-id="${CSS.escape(clone.id)}"]`);
  row?.classList.add("newly-added");
}

async function deleteProvider(provider) {
  const [providers, settings] = await Promise.all([getProviders(), getSettings()]);
  const next = providers.filter((p) => p.id !== provider.id);
  const nextSettings = settings.badgeProviderId === provider.id
    ? { ...settings, badgeProviderId: "" }
    : settings;
  await chrome.storage.local.set({
    [STORAGE_KEYS.providers]: next,
    [STORAGE_KEYS.settings]: nextSettings
  });
  await renderProviders();
  await chrome.runtime.sendMessage({ type: "refresh" });
}

function closeDeleteConfirmation(row) {
  const wrap = row?.querySelector(".delete-action-wrap");
  if (!wrap) return;
  wrap.classList.remove("is-confirming");
  wrap.querySelector('[data-action="delete"]')?.classList.remove("hidden");
  wrap.querySelector(".delete-confirm-actions")?.classList.add("hidden");
}

function showDeleteConfirmation(row) {
  list.querySelectorAll(".provider-row").forEach((item) => {
    if (item !== row) closeDeleteConfirmation(item);
  });
  const wrap = row.querySelector(".delete-action-wrap");
  wrap.classList.add("is-confirming");
  wrap.querySelector('[data-action="delete"]')?.classList.add("hidden");
  const actions = wrap.querySelector(".delete-confirm-actions");
  actions.classList.remove("hidden");
  actions.querySelector('[data-action="confirm-delete"]')?.focus({ preventScroll: true });
}

async function reorderProviders(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;
  const providers = await getProviders();
  const sourceIndex = providers.findIndex((p) => p.id === sourceId);
  const targetIndex = providers.findIndex((p) => p.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const [moved] = providers.splice(sourceIndex, 1);
  providers.splice(targetIndex, 0, moved);
  await persistProviders(providers, false);
}


function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveConfigKey(password, salt, iterations) {
  const material = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptConfiguration(payload, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveConfigKey(password, salt, PBKDF2_ITERATIONS);
  const plaintext = textEncoder.encode(JSON.stringify(payload));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
  return {
    format: CONFIG_FORMAT,
    version: CONFIG_VERSION,
    cipher: "AES-256-GCM",
    kdf: "PBKDF2-SHA-256",
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(ciphertext)
  };
}

async function decryptConfiguration(envelope, password) {
  if (!envelope || envelope.format !== CONFIG_FORMAT || Number(envelope.version) !== CONFIG_VERSION) {
    throw new Error(tr("unsupportedConfig"));
  }
  const iterations = Number(envelope.iterations);
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 2000000) {
    throw new Error(tr("invalidKdf"));
  }
  try {
    const salt = base64ToBytes(envelope.salt);
    const iv = base64ToBytes(envelope.iv);
    const ciphertext = base64ToBytes(envelope.data);
    if (salt.length < 16 || iv.length !== 12 || ciphertext.length < 16) throw new Error("invalid envelope");
    const key = await deriveConfigKey(password, salt, iterations);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return JSON.parse(textDecoder.decode(plaintext));
  } catch {
    throw new Error(tr("badPassword"));
  }
}

function validateImportedPayload(payload) {
  if (!payload || payload.schema !== 2 || !Array.isArray(payload.providers) || typeof payload.settings !== "object" || !payload.settings) {
    throw new Error(tr("invalidPayload"));
  }
  for (const provider of payload.providers) {
    if (!provider || typeof provider !== "object" || provider.type !== "script") {
      throw new Error(tr("invalidProvider"));
    }
    if (!provider.id || !provider.name || !provider.usageScript) {
      throw new Error(tr("incompleteProvider", { name: provider?.name || tr("unknown") }));
    }
    if (provider.baseUrl) originPattern(provider.baseUrl);
  }
  return payload;
}

function openTransferDialog(mode) {
  transferMode = mode;
  transferMsg.textContent = "";
  transferMsg.className = "test-msg";
  transferPassword.value = "";
  transferPasswordConfirm.value = "";
  transferPassword.type = "password";
  transferPasswordConfirm.type = "password";
  document.querySelectorAll("#transferDialog .secret-toggle").forEach((button) => {
    button.classList.remove("is-visible");
    button.innerHTML = EYE_OFF_ICON;
    button.title = tr("showSecret");
    button.setAttribute("aria-label", tr("showSecret"));
  });
  const importing = mode === "import";
  transferTitle.textContent = importing ? tr("encryptedImport") : tr("encryptedExport");
  transferHint.textContent = importing
    ? tr("importHint")
    : tr("exportHint");
  confirmPasswordLabel.classList.toggle("hidden", importing);
  importModeField.classList.toggle("hidden", !importing);
  confirmTransfer.textContent = importing ? tr("decryptImport") : tr("encryptedExport");
  transferDialog.showModal();
  setTimeout(() => transferPassword.focus(), 0);
}

async function exportConfiguration() {
  const password = transferPassword.value;
  const confirmation = transferPasswordConfirm.value;
  if (password.length < 8) throw new Error(tr("passwordTooShort"));
  if (password !== confirmation) throw new Error(tr("passwordMismatch"));
  const [providers, settings] = await Promise.all([getProviders(), getSettings()]);
  const payload = {
    schema: 2,
    exportedAt: new Date().toISOString(),
    settings,
    providers
  };
  const envelope = await encryptConfiguration(payload, password);
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  a.href = url;
  a.download = `api-balance-monitor-${stamp}.abm`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  transferDialog.close();
}

async function requestImportedPermissions(providers) {
  const prepared = await Promise.all(providers.map(async (provider) => {
    const response = await chrome.runtime.sendMessage({ type: "prepareProvider", provider });
    if (!response?.ok) throw new Error(response?.error || tr("invalidScript"));
    return response.request?.url;
  }));
  const origins = [...new Set(providers.flatMap((provider, index) => [provider.baseUrl, prepared[index]]).filter(Boolean).map(originPattern))];
  if (!origins.length) return true;
  const already = await chrome.permissions.contains({ origins });
  if (already) return true;
  return chrome.permissions.request({ origins });
}

function mergeImportedProviders(currentProviders, importedProviders) {
  const existingIds = new Set(currentProviders.map((provider) => provider.id));
  const idMap = new Map();
  const appended = importedProviders.map((provider) => {
    let id = provider.id;
    if (existingIds.has(id)) id = makeId();
    existingIds.add(id);
    idMap.set(provider.id, id);
    return { ...provider, id };
  });
  return { providers: [...currentProviders, ...appended], idMap };
}

async function importConfiguration() {
  const password = transferPassword.value;
  if (!password) throw new Error(tr("passwordRequired"));
  const payload = validateImportedPayload(await decryptConfiguration(pendingImportEnvelope, password));
  const mode = document.querySelector('input[name="importMode"]:checked')?.value || "merge";
  const permitted = await requestImportedPermissions(payload.providers);
  if (!permitted) throw new Error(tr("importPermissionDenied"));

  if (mode === "replace") {
    await chrome.storage.local.set({
      [STORAGE_KEYS.providers]: payload.providers,
      [STORAGE_KEYS.settings]: { ...DEFAULT_SETTINGS, ...payload.settings }
    });
  } else {
    const currentProviders = await getProviders();
    const { providers } = mergeImportedProviders(currentProviders, payload.providers);
    await chrome.storage.local.set({ [STORAGE_KEYS.providers]: providers });
  }

  transferDialog.close();
  pendingImportEnvelope = null;
  await loadSettings();
  await renderProviders();
  await chrome.runtime.sendMessage({ type: "refresh" });
}

async function handleTransferConfirm() {
  confirmTransfer.disabled = true;
  transferMsg.textContent = transferMode === "import" ? tr("decrypting") : tr("encrypting");
  transferMsg.className = "test-msg pulse-text";
  try {
    if (transferMode === "import") await importConfiguration();
    else await exportConfiguration();
  } catch (error) {
    transferMsg.textContent = error.message;
    transferMsg.className = "test-msg error flash-in";
  } finally {
    confirmTransfer.disabled = false;
  }
}

function toggleSecretVisibility(button) {
  const targetId = button.dataset.revealTarget;
  const input = document.getElementById(targetId);
  if (!input) return;
  const willShow = input.type === "password";
  input.type = willShow ? "text" : "password";
  button.classList.toggle("is-visible", willShow);
  button.innerHTML = willShow ? EYE_ICON : EYE_OFF_ICON;
  const label = willShow ? tr("hideSecret") : tr("showSecret");
  button.title = label;
  button.setAttribute("aria-label", label);
  input.focus({ preventScroll: true });
  const length = input.value.length;
  input.setSelectionRange?.(length, length);
}

function resetSecretInput(input) {
  if (!input) return;
  input.type = "password";
  const button = document.querySelector(`.secret-toggle[data-reveal-target="${input.id}"]`);
  if (!button) return;
  button.classList.remove("is-visible");
  button.innerHTML = EYE_OFF_ICON;
  const label = tr("showSecret");
  button.title = label;
  button.setAttribute("aria-label", label);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest(".secret-toggle");
  if (button) toggleSecretVisibility(button);
});

document.querySelector("#addCustom").addEventListener("click", () => openDialog("custom"));
document.querySelector("#addOneApi").addEventListener("click", () => openDialog("oneapi"));
document.querySelector("#addDeepSeek").addEventListener("click", () => openDialog("deepseek"));
document.querySelector("#saveSettings").addEventListener("click", saveSettings);
document.querySelector("#globalSection .settings-grid").addEventListener("input", () => markGlobalSettingsDirty());
document.querySelector("#cancelGlobalChanges").addEventListener("click", async () => {
  await loadSettings();
  const msg = document.querySelector("#settingsMsg");
  msg.textContent = "";
  msg.classList.remove("flash-in");
});
document.querySelector("#resetGlobalSettings").addEventListener("click", () => {
  document.querySelector("#refreshMinutes").value = DEFAULT_SETTINGS.refreshMinutes;
  document.querySelector("#badgeEnabled").checked = DEFAULT_SETTINGS.badgeEnabled;
  document.querySelector("#themeAuto").checked = DEFAULT_SETTINGS.theme === "auto";
  const githubToken = document.querySelector("#githubToken");
  githubToken.value = DEFAULT_SETTINGS.githubToken;
  resetSecretInput(githubToken);
  setColorControls("primary", DEFAULT_SETTINGS.primaryColor);
  setColorControls("secondary", DEFAULT_SETTINGS.secondaryColor);
  markGlobalSettingsDirty();
});
bindColorControl("primary");
bindColorControl("secondary");
bindPreferenceControls(syncSettingsPreferences);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes[STORAGE_KEYS.settings]) syncSettingsPreferences();
  if (changes[STORAGE_KEYS.balances]) updateAllProviderQueryInfo(changes[STORAGE_KEYS.balances].newValue || {});
  if (changes[STORAGE_KEYS.updateState]) {
    const nextState = changes[STORAGE_KEYS.updateState].newValue || null;
    if (aboutUpdateFeedbackActive) displayedUpdateState = nextState;
    else renderUpdateState(nextState);
  }
});

document.querySelector("#testProvider").addEventListener("click", testProvider);
document.querySelector("#saveProvider").addEventListener("click", saveProvider);
document.querySelector("#exportConfig").addEventListener("click", () => openTransferDialog("export"));
document.querySelector("#importConfig").addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  importFile.value = "";
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error(tr("fileTooLarge"));
    const parsed = JSON.parse(await file.text());
    if (parsed?.format !== CONFIG_FORMAT) throw new Error(tr("chooseEncryptedConfig"));
    pendingImportEnvelope = parsed;
    openTransferDialog("import");
  } catch (error) {
    alert(error.message);
  }
});
confirmTransfer.addEventListener("click", handleTransferConfirm);
transferPassword.addEventListener("keydown", (event) => {
  if (event.key === "Enter") { event.preventDefault(); handleTransferConfirm(); }
});
transferPasswordConfirm.addEventListener("keydown", (event) => {
  if (event.key === "Enter") { event.preventDefault(); handleTransferConfirm(); }
});

document.querySelector("#refreshAll").addEventListener("click", async () => {
  const btn = document.querySelector("#refreshAll");
  btn.disabled = true;
  btn.classList.add("refreshing");
  try { await chrome.runtime.sendMessage({ type: "refresh" }); }
  finally { btn.disabled = false; btn.classList.remove("refreshing"); }
});

list.addEventListener("click", async (event) => {
  const row = event.target.closest(".provider-row");
  if (!row) return;
  const providers = await getProviders();
  const provider = providers.find((p) => p.id === row.dataset.id);
  if (!provider) return;
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "delete") {
    showDeleteConfirmation(row);
    return;
  }
  if (action === "cancel-delete") {
    closeDeleteConfirmation(row);
    return;
  }
  if (action === "confirm-delete") {
    const button = event.target.closest("button");
    button.disabled = true;
    await deleteProvider(provider);
    return;
  }
  if (action === "toggle") await toggleProvider(provider, event.target.closest("button"));
  if (action === "refresh") await refreshProvider(provider, event.target.closest("button"));
  if (action === "badge") await chooseBadgeProvider(provider);
  if (action === "copy") await duplicateProvider(provider);
  if (action === "edit") openDialog(provider.type, provider);
});

list.addEventListener("dragstart", (event) => {
  const handle = event.target.closest(".drag-handle");
  if (!handle) {
    event.preventDefault();
    return;
  }
  const row = event.target.closest(".provider-row");
  if (!row) return;
  draggedId = row.dataset.id;
  row.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedId);
});

list.addEventListener("dragover", (event) => {
  event.preventDefault();
  const row = event.target.closest(".provider-row");
  if (!row || row.dataset.id === draggedId) return;
  list.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
  row.classList.add("drag-over");
  event.dataTransfer.dropEffect = "move";
});

list.addEventListener("drop", async (event) => {
  event.preventDefault();
  const row = event.target.closest(".provider-row");
  const targetId = row?.dataset.id;
  list.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
  if (targetId) await reorderProviders(draggedId, targetId);
  draggedId = null;
});

list.addEventListener("dragend", () => {
  list.querySelectorAll(".dragging,.drag-over").forEach((el) => el.classList.remove("dragging", "drag-over"));
  draggedId = null;
});

const settingsMain = document.querySelector(".settings-main");
const navItems = [...document.querySelectorAll(".nav-item")];
function syncActiveNavigation() {
  const marker = settingsMain.scrollTop + 54;
  let activeId = navItems[0]?.getAttribute("href");
  for (const item of navItems) {
    const section = document.querySelector(item.getAttribute("href"));
    if (section && section.offsetTop <= marker) activeId = item.getAttribute("href");
  }
  navItems.forEach((item) => item.classList.toggle("active", item.getAttribute("href") === activeId));
}
settingsMain.addEventListener("scroll", syncActiveNavigation, { passive: true });
navItems.forEach((item) => item.addEventListener("click", () => {
  navItems.forEach((navItem) => navItem.classList.toggle("active", navItem === item));
}));

const aboutSection = document.querySelector("#aboutSection");
aboutSection.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (link?.hasAttribute("href")) return;
  checkUpdateOnOpen("about", true);
});

await loadSettings();
await renderProviders();
syncActiveNavigation();
checkUpdateOnOpen();
