export function providerKind(provider = {}) {
  const kind = provider.templateType || provider.type;
  if (kind === "deepseek") return "deepseek";
  if (kind === "oneapi") return "oneapi";
  if (kind === "volcark") return "volcark";
  return "custom";
}

export function providerIconMarkup(provider = {}, className = "provider-brand-icon") {
  const kind = providerKind(provider);
  // 自定义图标（data URI / http(s) URL）：任意模板设置 provider.icon 后优先生效
  const rawIcon = String(provider.icon || "").trim();
  const safeIcon = /^(data:image\/[a-z0-9+.-]+|https?:\/\/)/i.test(rawIcon)
    ? rawIcon.replace(/"/g, "%22").replace(/</g, "%3C").replace(/>/g, "%3E")
    : "";
  if (safeIcon) {
    return `<span class="${className} custom-icon custom-icon-user" title="Custom icon"><img src="${safeIcon}" alt="" /></span>`;
  }
  if (kind === "deepseek") {
    return `<span class="${className} deepseek-icon" title="DeepSeek"><img src="icons/provider-deepseek.svg" alt="" /></span>`;
  }
  if (kind === "oneapi") {
    return `<span class="${className} newapi-icon" title="New API"><img src="icons/provider-newapi.svg" alt="" /></span>`;
  }
  if (kind === "volcark") {
    return `<span class="${className} volcark-icon" title="Volcengine Ark"><img src="icons/provider-volcark.svg" alt="" /></span>`;
  }
  return `<span class="${className} custom-icon" title="Custom Provider"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5v-13Z"/><path d="m9 9-2 3 2 3M15 9l2 3-2 3M13.5 7l-3 10"/></svg></span>`;
}
