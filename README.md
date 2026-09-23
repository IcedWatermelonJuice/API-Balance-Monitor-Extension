# API Balance Monitor / API 余额监测

API Balance Monitor 是一款本地运行的 Chrome Manifest V3 扩展，用于在一个 Popup 中统一查看多个 API Provider 的余额、额度与套餐用量。

项目主页：[API-Balance-Monitor-Extension](https://github.com/IcedWatermelonJuice/API-Balance-Monitor-Extension)  
最新版本：[GitHub Releases](https://github.com/IcedWatermelonJuice/API-Balance-Monitor-Extension/releases/latest)

## 功能亮点

- 支持任意数量的自定义 Provider，不绑定特定平台。
- 内置 **DeepSeek 官方**、**NewAPI 兼容**、**火山方舟 Coding Plan** 与 **OpenCode Go** 四个可编辑模板。
- 自定义请求 URL、Method、Headers、Body、响应提取逻辑及 Popup 展示字段。
- 支持余额、总额度、已用额度、Token Plan、Coding Plan 等不同数据形式。
- 可配置 1-3 个明细字段、双语标签、单条或多条进度条及百分比计算变量。
- Popup 中置顶站点的余额数字以高亮色显示。
- 支持定时刷新、单站点刷新、全部刷新和低余额系统通知。
- 可指定一个站点作为 Chrome 工具栏 Badge 的余额来源。
- 支持简体中文、English 及跟随浏览器语言。
- 支持明亮、深色、跟随系统主题及自定义主题颜色。
- 支持站点拖拽排序、复制、启用/停用、编辑和二次确认删除。
- 自定义 Provider 支持自定义图标（data URI、图片链接或本地上传，本地上传会自动缩放为 base64 存储）。
- 支持使用密码加密导出配置，并在其他设备合并或覆盖导入。
- 支持自动检查 GitHub Releases 更新。

## 运行要求

- Chrome 120 或更高版本。
- Provider 必须提供可通过 HTTP/HTTPS 访问的余额或用量查询接口。

## 安装与更新

### 安装

1. 在 [GitHub Releases](https://github.com/IcedWatermelonJuice/API-Balance-Monitor-Extension/releases/latest) 下载最新的 **Source code (zip)**，也可以直接克隆本仓库。
2. 将源代码解压到一个固定目录；安装后不要随意移动或删除该目录。
3. 在浏览器地址栏打开 `chrome://extensions/`。
4. 开启右上角的“开发者模式”。
5. 点击“加载已解压的扩展程序”。
6. 选择实际包含 `manifest.json` 的目录。

安装完成后，可将扩展固定到工具栏，点击图标并进入设置页添加站点。

### 更新扩展

扩展内的更新检查只负责提示新版本，不会自动下载或安装：

1. 建议先通过“导入 / 导出”功能备份配置。
2. 从 Releases 下载新版 **Source code (zip)** 并解压。
3. 使用新版文件覆盖原安装目录中的文件，保持原目录路径不变。
4. 回到 `chrome://extensions/`，点击该扩展卡片上的刷新按钮。

不要将每个版本分别加载为新的扩展目录，否则 Chrome 可能生成不同的扩展 ID，原扩展的本地配置也不会自动迁移。

## 快速开始

1. 打开 Popup，点击设置按钮。
2. 选择“DeepSeek 模板”“NewAPI兼容 模板”“火山方舟 Coding Plan 模板”“OpenCode Go 订阅”或“自定义 Provider”。
3. 填写站点名称、接口地址和所需凭据。
4. 根据接口响应调整 `request`、`extractor` 与 `display`。
5. 点击“测试连接”；成功后点击“确认”。
6. 返回 Popup 刷新，即可查看余额或额度。

首次访问某个 Provider 域名时，扩展会请求该域名的访问权限。只有授权后才能进行查询。

## 内置模板

### DeepSeek 官方

通常只需要填写 API Key。默认查询：

```text
GET https://api.deepseek.com/user/balance
Authorization: Bearer <API Key>
```

模板读取 `balance_infos` 中的余额信息，Popup 默认显示“充值余额”和“赠送余额”，不启用进度条。DeepSeek 模板不需要的 Access Token 与 User ID 字段会被禁用。

### NewAPI 兼容

默认查询：

```text
GET <Base URL>/api/user/self
Authorization: Bearer <Access Token>
X-Api-User: <User ID>
```

Popup 默认显示“已使用”和“总额度”，并显示剩余额度进度条。不同 NewAPI 部署可能修改接口路径、鉴权 Header 或 JSON 字段；“兼容”表示模板可以编辑，并不保证所有分支都使用完全相同的接口。

### 火山方舟 Coding Plan

查询火山方舟 Coding Plan 订阅的额度用量（5 小时 / 本周 / 本月三个时间窗口），数据与火山方舟控制台“我的套餐”一致。

凭据填写（注意：与推理 API Key 是**两套凭据**，`ark-` 开头的推理 Key 不能用于本模板）：

1. **AccessKey ID（AK）**：填写到 API Key 字段。
2. **Secret AccessKey（SK）**：填写到 Access Token 字段。

两者在火山引擎控制台的「API 访问密钥」页面获取。首次查询会请求 `open.volcengineapi.com` 的访问权限。

Popup 的余额大数字显示**所选窗口的剩余百分比**（例如 `73.25 %`），三条进度条分别显示 5 小时、本周、本月窗口的剩余比例，三个小字段显示各窗口的重置时间；低余额阈值同样按百分比理解（例如填 `20` 表示所选窗口剩余不足 20% 时提醒）。「余额显示窗口」用于选择大数字采用的窗口（默认月度）；工具栏徽标显示同一数值，仅采用自己的四舍五入规则。仅支持个人版 Coding Plan；Agent Plan 与团队席位暂不支持。

### OpenCode Go

查询 [OpenCode Go](https://opencode.ai/docs/go/) 订阅（$10/月）的套餐用量，数据为 5 小时 / 本周 / 本月三个窗口的**已用百分比**。

凭据填写：**API Key** 填 Zen 控制台（[console.opencode.ai](https://console.opencode.ai)）订阅 Go 后复制的 OpenCode API Key。模板不需要 Access Token 与 User ID，这两个字段会被禁用。首次查询会请求 `opencode.ai` 的访问权限。

Popup 的余额大数字显示**所选窗口的剩余百分比**（例如 `87.00 %`），三条进度条分别显示 5 小时、本周、本月窗口的剩余比例，三个小字段显示各窗口的重置时间；低余额阈值按剩余百分比理解（例如填 `20` 表示所选窗口剩余不足 20% 时提醒）。「余额显示窗口」用于选择大数字采用的窗口（默认月度）；工具栏徽标显示同一数值，仅采用自己的四舍五入规则。

注意：该查询接口并非官方公开文档，OpenCode 官方只在控制台内展示用量；接口字段如发生变化，模板可能需要跟随调整（`extractor` 已对缺失字段做了降级处理）。

## 自定义 Provider

Provider 脚本由 `request`（或可选的 `buildRequest`）、`extractor` 和 `display` 组成：

```js
({
  request: {
    url: "{{baseUrl}}/user/balance",
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": "Bearer {{apiKey}}"
    }
  },
  extractor: function(response, meta) {
    return {
      isValid: response.success !== false,
      invalidMessage: response.message || "",
      remaining: Number(response.data.remaining),
      used: Number(response.data.used),
      total: Number(response.data.total),
      unit: response.data.currency || "USD",
      planName: response.data.plan || ""
    };
  },
  display: {
    fields: [
      { key: "used", label: "已使用", labelEn: "Used" },
      { key: "total", label: "总额度", labelEn: "Total" }
    ],
    progress: {
      enabled: true,
      totalKey: "total",
      currentKey: "remaining"
    }
  }
})
```

### 自定义图标

自定义 Provider 可以在「自定义图标」中配置站点图标，支持三种来源：

- `data:image/...` Base64 数据 URI；
- `https://` 或 `http://` 图片链接；
- 点击「上传图片」选择本地图片，会自动缩放（最长边 96px）并转为 Base64 存储。

图标只保存在 `chrome.storage.local`，随配置加密导出；不建议使用过大的图片链接。

### Request

- `url`：完整查询地址，仅支持 HTTP/HTTPS。
- `method`：支持 `GET`、`POST`、`PUT`、`PATCH`、`DELETE` 和 `HEAD`。
- `headers`：任意请求 Header。
- `body`：可选；可以是字符串或对象。对象会自动序列化为 JSON。

以下占位符会在请求前替换：

- `{{baseUrl}}`
- `{{apiKey}}`
- `{{accessToken}}`
- `{{userId}}`

#### 可选的 buildRequest

需要为每次请求动态计算请求参数（如 API 签名）时，可以在脚本中导出 `async buildRequest(variables)`：它接收与占位符相同的变量对象，返回与 `request` 相同结构的 `{ url, method, headers, body }` 对象；存在时优先于静态 `request`。后台仍会对返回值做协议与方法校验。内置火山方舟模板即通过它计算火山引擎 V4 签名。

脚本内还可以使用内置工具对象 `abm`（沙箱中不可用 Web Crypto，因此由插件注入纯 JS 实现）：

- `abm.sha256Hex(text | bytes)`：SHA-256 摘要（十六进制字符串）
- `abm.sha256(text | bytes)`：SHA-256 摘要（`Uint8Array`）
- `abm.hmacHex(key, message)` / `abm.hmac(key, message)`：HMAC-SHA256，key 与 message 支持字符串（按 UTF-8 编码）或 `Uint8Array`
- `abm.utf8Bytes(text)`、`abm.bytesToHex(bytes)`、`abm.concatBytes(a, b)`

### Extractor

`extractor(response, meta, vars)` 用于将接口响应转换为 Popup 可使用的数据：

- JSON 响应会自动解析为对象；非 JSON 响应以字符串传入。
- `meta.status` 是 HTTP 状态码，`meta.headers` 是响应 Header。
- `vars` 是站点配置变量对象（含 `baseUrl`、`apiKey`、`accessToken`、`userId` 及模板自定义的键）。
- 必须返回有效的 `remaining`；也可以同时返回 `used` 与 `total`，此时缺少 `remaining` 时会尝试使用 `total - used` 推导。
- `isValid: false` 可将本次查询标记为无效，`invalidMessage` 用于说明原因。
- `unit` 支持 `CNY`、`USD` 或任意自定义单位。
- 可选字段包括 `planName`、`extra`、`precision`，也可以返回供 `display` 使用的任意自定义变量。

### Display

- `display.fields` 包含 1-3 个展示字段，顺序即 Popup 中从左到右的顺序。
- 每个 `key` 必须对应 `extractor` 返回值中的变量，顺序决定 Popup 的左右位置。
- 同时配置 `label` 与 `labelEn` 时分别用于中文和英文；只配置其中一个时，两种语言都会使用该标签。
- `display.progress.enabled` 控制是否显示进度条。
- 开启进度条时，`totalKey` 表示总长度，`currentKey` 表示当前剩余量。
- 可选的 `display.progressList` 用于同时显示多条进度条（例如按时间窗口拆分的套餐用量）。数组每项包含可选的 `label` / `labelEn` 以及 `totalKey`、`currentKey`，最多 4 条；`progressList` 存在且非空时优先于单条 `progress`，两者不要同时启用。
- Popup 使用 `currentKey / totalKey` 计算“剩余额度”，其余部分显示为“已用”。百分比会限制在 `0%–100%`；例如当前值超过总长度时会显示剩余 `100%`、已用 `0%`。

请只使用自己编写或来自可信来源的 Provider 配置。导入配置中的提取器属于可执行脚本，虽然它在隔离环境中运行，仍不建议导入来源不明的配置文件。

## 站点管理

- 点击开关可启用或停用站点。
- 点击刷新图标只更新当前站点。
- 点击徽标图标可将该站点设为工具栏 Badge 来源；同一时间只能选择一个。
- 从卡片左侧拖拽手柄可调整顺序，Popup 会使用相同顺序。
- 复制后的站点默认停用，避免立即产生重复请求。
- 删除需要在原位置再次确认，防止误操作。
- 设置页显示每个站点的最近更新时间，Popup 显示详细余额与状态。

## 全局设置

- **刷新间隔**：控制后台自动查询频率。
- **工具栏徽标**：启用后显示指定站点的余额；没有可用来源时显示 `X`。
- **自动主题**：跟随系统明亮/深色偏好。手动点击主题按钮会关闭自动模式。
- **自定义主题颜色**：支持颜色选择器和 Hex 数值输入。
- **GitHub Auth Token**：可选，仅用于提高更新检查访问 GitHub API 时的速率限制。

全局设置修改后不会立即生效。请点击“保存”；点击“取消”可放弃尚未保存的修改，“重置”会先将表单恢复为默认值，仍需保存才会生效。

## 配置导入与导出

导出的 `.abm` 文件包含 Provider 凭据和全局设置，因此必须使用至少 8 个字符的密码进行加密。

- **合并站点**：保留当前全局设置，将导入的站点追加到现有列表。
- **覆盖当前配置**：用导入文件中的设置和站点替换当前配置。
- 导入完成后，扩展会重新请求相关 Provider 域名的访问权限。
- 当前只支持配置格式 v2，不导入旧格式备份。
- 余额缓存、低余额通知状态和导出密码不会写入备份。

加密完全使用浏览器原生 Web Crypto API：

- PBKDF2-HMAC-SHA-256，310,000 次迭代
- 16-byte 随机 Salt
- AES-256-GCM
- 12-byte 随机 IV

密码不会保存到扩展、Chrome Storage 或导出文件中，也无法找回。请妥善保管密码。

## 更新检查

- 打开设置页时会自动检查更新；距离上次自动检查不足 3 小时则使用缓存。
- 点击“关于”卡片可手动检查；3 分钟内重复点击不会再次请求网络。
- 发现新版本后，版本号旁会显示提示，点击可前往固定的 [Releases Latest](https://github.com/IcedWatermelonJuice/API-Balance-Monitor-Extension/releases/latest) 页面。
- 更新提示不会自动下载或安装文件，用户需要在 Releases 页面下载新版源代码并按上述步骤手动升级。
- 如果 GitHub API 频繁触发速率限制，可在全局设置中填写个人 GitHub Auth Token。

## 安全与隐私

- Provider 凭据和 GitHub Auth Token 只保存在 `chrome.storage.local`，不会通过 `chrome.storage.sync` 同步到 Google 账户。
- Provider 查询由扩展直接发送到用户配置的地址；扩展按域名申请可选访问权限，不默认获取全部网站访问权。
- GitHub Auth Token 只发送到 `api.github.com`，不会发送到更新检查的代理回退地址。
- 扩展不加载第三方 JavaScript 库或远程代码。
- 自定义脚本在独立 sandbox 页面中的可终止 Web Worker 内执行，不能直接调用扩展 API，也不能自行发起网络请求；执行超时会被终止。
- 火山方舟模板使用的 AccessKey ID / Secret AccessKey 是账户级凭据，权限大于推理 API Key。它们同样只保存在 `chrome.storage.local`，不会写入日志或错误消息；请确保浏览器环境可信，并按需在火山引擎控制台轮换或收窄权限。
- 本地存储不是系统级密码保险箱。如果电脑或 Chrome Profile 已被攻陷，本地保存的凭据仍可能泄漏。

## 常见问题

### 测试连接失败

检查 Base URL、接口路径、Token/API Key、User ID、请求 Header 及返回字段。还应确认已经授予对应域名的访问权限。

### 火山方舟模板返回签名或授权错误

依次检查：

1. AccessKey ID（AK）与 Secret AccessKey（SK）是否填反；推理 API Key（`ark-` 开头）不能用于本模板。
2. 本机系统时间是否准确——签名基于本机 UTC 时间，时间偏差过大将被网关拒绝。
3. 是否已授予 `open.volcengineapi.com` 的访问权限。

### Popup 显示的字段不正确

检查 `extractor` 返回的变量，以及 `display.fields` 中的 `key`。扩展不会根据 Provider 名称猜测“已使用”“总额度”等业务含义。

### 进度条比例不符合预期

确认 `totalKey` 是总长度，`currentKey` 是当前剩余值。两者可以指向任意数值变量；你也可以使用固定总额，例如将最大预算设为 `100`。

### Badge 显示 X

请确认已在全局设置中启用工具栏徽标，并在站点管理中选择一个已启用、查询成功的站点作为徽标来源。

### 忘记导出密码

导出密码不会保存，也没有恢复入口。只能重新从原浏览器导出一份新配置。

## 反馈与贡献

如遇到问题或希望增加功能，请前往 [GitHub Issues](https://github.com/IcedWatermelonJuice/API-Balance-Monitor-Extension/issues) 提交反馈。提交问题时请注意隐藏 API Key、Token、User ID 及其他敏感信息。
