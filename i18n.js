import { STORAGE_KEYS, DEFAULT_SETTINGS } from './lib.js';

const MESSAGES = {
  'zh-CN': {
    appName: 'API 余额监测', appNameShort: '余额监测', balance: '余额', refreshNow: '立即刷新', settings: '设置', allNormal: '全部正常',
    noSites: '还没有监控站点', addSite: '添加站点', notRefreshed: '尚未刷新', updatedAt: '更新于 {time}',
    unnamedSite: '未命名站点', waitingFirstRefresh: '等待首次刷新…', abnormal: '异常', requestFailed: '请求失败',
    available: '可用', unavailable: '不可用', normal: '正常', toppedUp: '充值余额', granted: '赠送余额', totalSpent: '累计消费', totalRequests: '总请求数', usedAmount: '已使用', totalAmount: '总额度',
    language: '语言', followBrowser: '跟随浏览器', chinese: '简体中文', english: 'English', githubRepo: '打开 GitHub 仓库', switchToDark: '切换到深色模式', switchToLight: '切换到明亮模式', switchToAuto: '切换到自动主题',
    monitorSettings: '监控设置', settingsDesc: '完全自定义余额查询，或从内置 Provider 模板开始配置。', refreshAll: '立即刷新全部',
    globalSettings: '全局设置', unsavedChanges: '有未保存的更改', refreshInterval: '刷新间隔（分钟）', badgeEnabled: '工具栏徽标显示余额', themeAuto: '自动跟随系统主题', themeAutoDesc: '打开后根据系统设置自动使用明亮或深色主题。手动切换主题会关闭此选项。', customColors: '自定义主题颜色', customColorsDesc: '配置界面主色和辅助色，深色模式会自动调整亮度。', primaryColor: '主色', secondaryColor: '辅助色', invalidHexColor: '请输入 3 位或 6 位 Hex 颜色，例如 #1A73E8。', githubToken: 'GitHub Auth Token', githubTokenPlaceholder: '仅用于更新检查，以提高 GitHub API 速率限制', resetGlobal: '重置', saveGlobal: '保存', saved: '已保存',
    exportConfig: '导出配置', importConfig: '导入配置', sites: '站点', noSitesAdded: '尚未添加站点。', configTransfer: '导入 / 导出', about: '关于', siteManagement: '站点管理', siteManagementDesc: '添加和管理 API 站点，支持拖拽排序。', emptySiteHint: '创建自定义 Provider，或从内置模板开始。', globalSettingsDesc: '控制刷新、工具栏徽标和界面行为。', badgeEnabledDesc: '具体显示哪个站点，请在站点管理中选择。', configTransferDesc: '在不同设备之间迁移加密的站点配置。', aboutDesc: '本地 API 余额监测扩展。', updateCheckingShort: '检查更新', updateNone: '无更新', updateFailedShort: '检查失败', updateAvailableShort: '新版本', updateAvailableLong: '发现新版本：{version}', updateFailed: '检查更新失败', tip: '提示', tipDrag: '拖动站点卡片左侧手柄即可排序。', tipCopy: '复制站点后，新副本默认停用。', tipBadge: '同一时间只能选择一个站点作为工具栏徽标来源。',
    securityNote: 'API Token 和 GitHub Auth Token 仅保存在当前 Chrome Profile 的 chrome.storage.local 中，不会同步到 Google 账户。此扩展不加载任何远程脚本。',
    addProvider: '添加站点', editProvider: '编辑站点', testConnection: '测试连接', cancel: '取消', save: '保存', confirm: '确认', close: '关闭', customProvider: '自定义 Provider', oneApiTemplate: 'NewAPI兼容 模板', deepSeekTemplate: 'DeepSeek 模板', volcArkTemplate: '火山方舟 Coding Plan', openCodeGoTemplate: 'OpenCode Go 订阅', accessKeyId: 'AccessKey ID（AK）', secretAccessKey: 'Secret AccessKey（SK）', scriptDefinedUrl: '脚本内定义查询地址', customIcon: '自定义图标（可选）', uploadIcon: '上传图片', invalidIcon: '图标地址需以 data:image/ 或 http(s):// 开头', primaryWindow: '余额显示窗口', windowMonthly: '月度窗口', windowWeekly: '周窗口', windowSession: '5 小时窗口',
    name: '名称', userInfoPath: '用户信息路径', bearerToken: 'Bearer Token', extraHeaderName: '额外 Header 名称（可留空）', extraHeaderValue: '额外 Header 值（可留空）',
    quotaPath: '余额字段路径', usedQuotaPath: '累计消费字段路径', requestCountPath: '请求数字段路径', quotaPerUnit: '1 个货币单位对应 quota', currencySymbol: '货币符号',
    lowBalance: '低余额提醒阈值（留空关闭）', enableSite: '启用此站点', balancePath: '余额路径', apiKey: 'API Key', preferredCurrency: '优先货币', accessToken: 'Access Token', userId: 'User ID', notUsedByTemplate: '此模板不使用该字段', timeoutSeconds: '超时时间（秒）', usageScript: '用量查询脚本', scriptConfigHint: 'request、extractor 与 display 均可编辑；内置模板只是预填配置。', scriptPlaceholders: '可用占位符：{{baseUrl}}、{{apiKey}}、{{accessToken}}、{{userId}}。extractor(response, meta, vars) 返回余额及自定义变量（vars 为站点变量对象）；display.fields 用 key 映射 1-3 个变量，用 label / labelEn 配置标签，缺少一种语言时复用唯一标签；display.progress 可用 enabled、totalKey、currentKey 控制单条进度条，progressList 数组可配置最多 3 条。meta 包含 status 与响应 headers。脚本内置 abm 工具：abm.sha256Hex(text)、abm.sha256(bytes)、abm.hmacHex(key, message)、abm.hmac(key, message)、abm.utf8Bytes(text)、abm.bytesToHex(bytes)。',
    dragSort: '拖拽排序', disable: '停用', enable: '启用', enabled: '已启用', disabled: '已停用', refreshSite: '刷新', badge: '徽标', currentBadge: '当前用于工具栏徽标', setBadge: '设为工具栏徽标余额来源', copy: '复制', edit: '编辑', delete: '删除', confirmDelete: '确认删除', copySuffix: ' - 副本',
    nameRequired: '名称不能为空', baseUrlRequired: 'Base URL 不能为空', endpointRequired: '接口路径不能为空', tokenRequired: 'Token / API Key 不能为空', scriptRequired: '用量查询脚本不能为空', invalidScript: '用量查询脚本无效',
    permissionDenied: '未授予该站点的访问权限', permissionDeniedSave: '未授予该站点的访问权限，无法保存', testing: '正在测试…', testFailed: '测试失败', connectedBalance: '连接成功，当前余额 {balance}',
    secureConfig: '安全配置', encryptedExport: '导出加密配置', encryptedImport: '导入加密配置', exportHint: '站点 Token/API Key 和 GitHub Auth Token 会随配置一起导出，因此配置文件必须使用密码加密。密码不会被保存，也无法找回。',
    importHint: '输入导出时设置的密码。密码仅用于本次解密，不会保存。', encryptionPassword: '加密密码', passwordPlaceholder: '至少 8 个字符', confirmPassword: '确认密码', confirmPlaceholder: '再次输入密码',
    importMode: '导入方式', mergeSites: '合并站点（保留当前全局设置）', replaceConfig: '覆盖当前配置', decryptImport: '解密并导入',
    unsupportedConfig: '不是受支持的 API Balance Monitor 加密配置文件', invalidKdf: '配置文件的密钥派生参数无效', badPassword: '密码错误，或配置文件已损坏', invalidPayload: '解密成功，但配置内容格式无效', invalidProvider: '配置中包含无效站点', incompleteProvider: '站点 {name} 的必要字段不完整', unknown: '未知',
    showSecret: '显示内容', hideSecret: '隐藏内容', passwordTooShort: '密码至少需要 8 个字符', passwordMismatch: '两次输入的密码不一致', passwordRequired: '请输入配置文件密码', importPermissionDenied: '未授予导入站点所需的访问权限，已取消导入', decrypting: '正在解密并导入…', encrypting: '正在加密并导出…', fileTooLarge: '配置文件过大', chooseEncryptedConfig: '请选择 API Balance Monitor 导出的加密配置文件'
  },
  en: {
    appName: 'API Balance Monitor', appNameShort: 'Balance Monitor', balance: 'Balance', refreshNow: 'Refresh now', settings: 'Settings', allNormal: 'All normal',
    noSites: 'No monitored sites yet', addSite: 'Add site', notRefreshed: 'Not refreshed yet', updatedAt: 'Updated at {time}',
    unnamedSite: 'Unnamed site', waitingFirstRefresh: 'Waiting for first refresh…', abnormal: 'Error', requestFailed: 'Request failed',
    available: 'Available', unavailable: 'Unavailable', normal: 'Normal', toppedUp: 'Topped up', granted: 'Granted', totalSpent: 'Total spent', totalRequests: 'Total requests', usedAmount: 'Used', totalAmount: 'Total',
    language: 'Language', followBrowser: 'Follow browser', chinese: '简体中文', english: 'English', githubRepo: 'Open GitHub repository', switchToDark: 'Switch to dark mode', switchToLight: 'Switch to light mode', switchToAuto: 'Switch to automatic theme',
    monitorSettings: 'Monitor Settings', settingsDesc: 'Create fully custom balance queries or start from a built-in provider template.', refreshAll: 'Refresh all now',
    globalSettings: 'Global Settings', unsavedChanges: 'Unsaved changes', refreshInterval: 'Refresh interval (minutes)', badgeEnabled: 'Show balance in toolbar badge', themeAuto: 'Follow system theme automatically', themeAutoDesc: 'Use the system light or dark theme. Manual theme switching turns this option off.', customColors: 'Custom theme colors', customColorsDesc: 'Set interface primary and secondary colors. Dark mode adjusts their brightness automatically.', primaryColor: 'Primary', secondaryColor: 'Secondary', invalidHexColor: 'Enter a 3- or 6-digit Hex color, such as #1A73E8.', githubToken: 'GitHub Auth Token', githubTokenPlaceholder: 'Used only for update checks to increase the GitHub API rate limit', resetGlobal: 'Reset', saveGlobal: 'Save', saved: 'Saved',
    exportConfig: 'Export config', importConfig: 'Import config', sites: 'Sites', noSitesAdded: 'No sites added.', configTransfer: 'Import & Export', about: 'About', siteManagement: 'Site Management', siteManagementDesc: 'Add and manage API sites. Drag cards to reorder them.', emptySiteHint: 'Create a custom provider or start from a built-in template.', globalSettingsDesc: 'Control refresh, toolbar badge and interface behavior.', badgeEnabledDesc: 'Choose the specific source site from Site Management.', configTransferDesc: 'Move encrypted site configuration between devices.', aboutDesc: 'A local API balance monitor.', updateCheckingShort: 'Check updates', updateNone: 'No updates', updateFailedShort: 'Check failed', updateAvailableShort: 'New version', updateAvailableLong: 'New version: {version}', updateFailed: 'Update check failed', tip: 'Tip', tipDrag: 'Drag the handle at the left of a site card to reorder.', tipCopy: 'Copied sites are disabled by default.', tipBadge: 'Only one site can be selected as the toolbar badge source.',
    securityNote: 'API tokens and the GitHub Auth Token are stored only in chrome.storage.local for the current Chrome profile. They are not synced to your Google account. This extension loads no remote scripts.',
    addProvider: 'Add Site', editProvider: 'Edit Site', testConnection: 'Test connection', cancel: 'Cancel', save: 'Save', confirm: 'Confirm', close: 'Close', customProvider: 'Custom Provider', oneApiTemplate: 'NewAPI-compatible Template', deepSeekTemplate: 'DeepSeek Template', volcArkTemplate: 'Volcengine Ark Coding Plan', openCodeGoTemplate: 'OpenCode Go Plan', accessKeyId: 'AccessKey ID (AK)', secretAccessKey: 'Secret AccessKey (SK)', scriptDefinedUrl: 'Query URL defined by script', customIcon: 'Custom icon (optional)', uploadIcon: 'Upload image', invalidIcon: 'Icon must be a data:image/ or http(s):// URL', primaryWindow: 'Balance display window', windowMonthly: 'Monthly window', windowWeekly: 'Weekly window', windowSession: '5-hour window',
    name: 'Name', userInfoPath: 'User info endpoint', bearerToken: 'Bearer Token', extraHeaderName: 'Extra header name (optional)', extraHeaderValue: 'Extra header value (optional)',
    quotaPath: 'Balance field path', usedQuotaPath: 'Used quota field path', requestCountPath: 'Request count field path', quotaPerUnit: 'Quota per currency unit', currencySymbol: 'Currency symbol',
    lowBalance: 'Low-balance alert threshold (blank to disable)', enableSite: 'Enable this site', balancePath: 'Balance endpoint', apiKey: 'API Key', preferredCurrency: 'Preferred currency', accessToken: 'Access Token', userId: 'User ID', notUsedByTemplate: 'This template does not use this field', timeoutSeconds: 'Timeout (seconds)', usageScript: 'Usage query script', scriptConfigHint: 'request, extractor and display are editable; built-in templates are prefilled configurations.', scriptPlaceholders: 'Placeholders: {{baseUrl}}, {{apiKey}}, {{accessToken}}, {{userId}}. extractor(response, meta, vars) returns the balance and custom variables (vars carries the provider variables). display.fields maps 1-3 variables by key and labels them with label / labelEn; when one language is omitted, the only label is reused. display.progress takes enabled, totalKey and currentKey for a single bar, or a progressList array for up to 3 bars. meta contains status and response headers. Built-in abm helpers are injectable in scripts: abm.sha256Hex(text), abm.sha256(bytes), abm.hmacHex(key, message), abm.hmac(key, message), abm.utf8Bytes(text), abm.bytesToHex(bytes).',
    dragSort: 'Drag to reorder', disable: 'Disable', enable: 'Enable', enabled: 'Enabled', disabled: 'Disabled', refreshSite: 'Refresh', badge: 'Badge', currentBadge: 'Current toolbar badge source', setBadge: 'Set as toolbar badge balance source', copy: 'Copy', edit: 'Edit', delete: 'Delete', confirmDelete: 'Confirm delete', copySuffix: ' - Copy',
    nameRequired: 'Name is required', baseUrlRequired: 'Base URL is required', endpointRequired: 'Endpoint is required', tokenRequired: 'Token / API Key is required', scriptRequired: 'Usage query script is required', invalidScript: 'Invalid usage query script',
    permissionDenied: 'Site access permission was not granted', permissionDeniedSave: 'Site access permission was not granted; cannot save', testing: 'Testing…', testFailed: 'Test failed', connectedBalance: 'Connected. Current balance: {balance}',
    secureConfig: 'Secure Config', encryptedExport: 'Export Encrypted Config', encryptedImport: 'Import Encrypted Config', exportHint: 'Site tokens/API keys and the GitHub Auth Token are included in the export, so the configuration file must be password-encrypted. The password is never saved and cannot be recovered.',
    importHint: 'Enter the password used when exporting. It is used only for this decryption and is not saved.', encryptionPassword: 'Encryption password', passwordPlaceholder: 'At least 8 characters', confirmPassword: 'Confirm password', confirmPlaceholder: 'Enter password again',
    importMode: 'Import mode', mergeSites: 'Merge sites (keep current global settings)', replaceConfig: 'Replace current configuration', decryptImport: 'Decrypt and import',
    unsupportedConfig: 'This is not a supported API Balance Monitor encrypted configuration file', invalidKdf: 'Invalid key-derivation parameters in configuration file', badPassword: 'Incorrect password or damaged configuration file', invalidPayload: 'Decryption succeeded, but configuration content is invalid', invalidProvider: 'Configuration contains an invalid site', incompleteProvider: 'Required fields are incomplete for site {name}', unknown: 'Unknown',
    showSecret: 'Show content', hideSecret: 'Hide content', passwordTooShort: 'Password must contain at least 8 characters', passwordMismatch: 'Passwords do not match', passwordRequired: 'Enter the configuration file password', importPermissionDenied: 'Required site permissions were not granted; import cancelled', decrypting: 'Decrypting and importing…', encrypting: 'Encrypting and exporting…', fileTooLarge: 'Configuration file is too large', chooseEncryptedConfig: 'Select an encrypted configuration exported by API Balance Monitor'
  }
};

export function browserLanguage() {
  const lang = (chrome.i18n?.getUILanguage?.() || navigator.language || 'en').toLowerCase();
  return lang.startsWith('zh') ? 'zh-CN' : 'en';
}

export async function getLanguagePreference() {
  const { settings = DEFAULT_SETTINGS } = await chrome.storage.local.get(STORAGE_KEYS.settings);
  return settings.language || 'auto';
}

export function resolveLanguage(pref = 'auto') {
  return pref === 'zh-CN' || pref === 'en' ? pref : browserLanguage();
}

export async function currentLanguage() {
  return resolveLanguage(await getLanguagePreference());
}

export function tFor(lang, key, vars = {}) {
  const table = MESSAGES[lang] || MESSAGES.en;
  let text = table[key] ?? MESSAGES.en[key] ?? key;
  for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
  return text;
}

export async function t(key, vars = {}) {
  return tFor(await currentLanguage(), key, vars);
}

export function applyStaticTranslations(root, lang) {
  root.documentElement.lang = lang;
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = tFor(lang, el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const value = tFor(lang, el.dataset.i18nTitle);
    el.title = value;
    if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', value);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = tFor(lang, el.dataset.i18nPlaceholder);
  });
}
