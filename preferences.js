import { STORAGE_KEYS, DEFAULT_SETTINGS } from "./lib.js";
import { tFor } from "./i18n.js";

const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

export function resolveTheme(preference = "auto") {
  if (preference === "light" || preference === "dark") return preference;
  return colorSchemeQuery.matches ? "dark" : "light";
}

export function applyTheme(preference = "auto") {
  const theme = resolveTheme(preference);
  document.documentElement.dataset.theme = theme;
  return theme;
}

function validColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
}

function mixColor(color, target, targetWeight) {
  const channels = (value) => value.match(/[0-9a-f]{2}/gi).map((part) => Number.parseInt(part, 16));
  const [r1, g1, b1] = channels(color);
  const [r2, g2, b2] = channels(target);
  const mixed = [r1, g1, b1].map((channel, index) => Math.round(channel * (1 - targetWeight) + [r2, g2, b2][index] * targetWeight));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function contrastText(color) {
  const [r, g, b] = color.match(/[0-9a-f]{2}/gi).map((part) => Number.parseInt(part, 16) / 255);
  const luminance = [r, g, b]
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.48 ? "#191c20" : "#ffffff";
}

export function applyCustomColors(primaryColor, secondaryColor) {
  const root = document.documentElement;
  const legacyDefaults = String(primaryColor).toLowerCase() === "#415f91" && String(secondaryColor).toLowerCase() === "#6750a4";
  const primarySeed = validColor(legacyDefaults ? DEFAULT_SETTINGS.primaryColor : primaryColor, DEFAULT_SETTINGS.primaryColor);
  const secondarySeed = validColor(legacyDefaults ? DEFAULT_SETTINGS.secondaryColor : secondaryColor, DEFAULT_SETTINGS.secondaryColor);
  const dark = root.dataset.theme === "dark";
  const primary = dark ? mixColor(primarySeed, "#ffffff", 0.45) : primarySeed;
  const secondary = dark ? mixColor(secondarySeed, "#ffffff", 0.45) : secondarySeed;
  root.style.setProperty("--primary-seed", primarySeed);
  root.style.setProperty("--secondary-seed", secondarySeed);
  root.style.setProperty("--accent", primary);
  root.style.setProperty("--accent-2", mixColor(primary, "#000000", dark ? 0.12 : 0.18));
  root.style.setProperty("--accent-soft", `color-mix(in srgb, ${primary} ${dark ? 24 : 16}%, var(--panel))`);
  root.style.setProperty("--on-primary", contrastText(primary));
  root.style.setProperty("--purple", secondary);
  root.style.setProperty("--purple-soft", `color-mix(in srgb, ${secondary} ${dark ? 24 : 16}%, var(--panel))`);
}

async function getSettings() {
  const { settings = DEFAULT_SETTINGS } = await chrome.storage.local.get(STORAGE_KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...settings };
}

async function patchSettings(patch) {
  const settings = await getSettings();
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: { ...settings, ...patch } });
}

export function syncPreferenceControls({ languagePreference, resolvedLanguage, themePreference, primaryColor, secondaryColor }) {
  const resolvedTheme = applyTheme(themePreference);
  applyCustomColors(primaryColor, secondaryColor);
  document.querySelectorAll("[data-language-code]").forEach((element) => {
    element.textContent = resolvedLanguage === "zh-CN" ? "CN" : "EN";
  });
  document.querySelectorAll("[data-language-option]").forEach((button) => {
    const selected = button.dataset.languageOption === languagePreference;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-checked", String(selected));
  });
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    const title = tFor(resolvedLanguage, resolvedTheme === "dark" ? "switchToLight" : "switchToDark");
    button.title = title;
    button.setAttribute("aria-label", title);
    button.dataset.resolvedTheme = resolvedTheme;
    button.dataset.themePreference = themePreference;
  });
  document.querySelectorAll("[data-language-trigger]").forEach((button) => {
    const title = tFor(resolvedLanguage, "language");
    button.title = title;
    button.setAttribute("aria-label", title);
  });
}

export function bindPreferenceControls(onPreferenceChanged) {
  document.querySelectorAll("[data-language-trigger]").forEach((trigger) => {
    const control = trigger.closest(".language-control");
    const menu = control?.querySelector(".language-menu");
    if (!menu) return;
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const opening = menu.classList.contains("hidden");
      document.querySelectorAll(".language-menu").forEach((item) => item.classList.add("hidden"));
      menu.classList.toggle("hidden", !opening);
      trigger.setAttribute("aria-expanded", String(opening));
    });
    menu.addEventListener("click", async (event) => {
      const option = event.target.closest("[data-language-option]");
      if (!option) return;
      await patchSettings({ language: option.dataset.languageOption });
      menu.classList.add("hidden");
      trigger.setAttribute("aria-expanded", "false");
      await onPreferenceChanged();
    });
  });

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", async () => {
      const settings = await getSettings();
      const current = resolveTheme(settings.theme);
      const nextTheme = current === "dark" ? "light" : "dark";
      await patchSettings({ theme: nextTheme });
      await onPreferenceChanged();
    });
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest(".language-control")) return;
    document.querySelectorAll(".language-menu").forEach((menu) => menu.classList.add("hidden"));
    document.querySelectorAll("[data-language-trigger]").forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    document.querySelectorAll(".language-menu").forEach((menu) => menu.classList.add("hidden"));
    document.querySelectorAll("[data-language-trigger]").forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
  });

  colorSchemeQuery.addEventListener("change", async () => {
    const settings = await getSettings();
    if (settings.theme === "auto") await onPreferenceChanged();
  });
  window.addEventListener("languagechange", async () => {
    const settings = await getSettings();
    if (settings.language === "auto") await onPreferenceChanged();
  });
}
