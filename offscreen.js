const frame = document.querySelector("#extractorSandbox");
const pending = new Map();
let nextId = 0;
let markFrameReady;
const frameReady = new Promise((resolve) => { markFrameReady = resolve; });
const readyPing = setInterval(() => {
  frame.contentWindow?.postMessage({ channel: "abm-sandbox-ping" }, "*");
}, 25);

window.addEventListener("message", (event) => {
  if (event.source === frame.contentWindow && event.data?.channel === "abm-sandbox-ready") {
    clearInterval(readyPing);
    markFrameReady();
    return;
  }
  if (event.source !== frame.contentWindow || event.data?.channel !== "abm-sandbox-result") return;
  const job = pending.get(event.data.id);
  if (!job) return;
  pending.delete(event.data.id);
  clearTimeout(job.timeout);
  job.resolve(event.data);
});

async function executeInSandbox(action, payload) {
  await frameReady;
  const id = `job-${Date.now()}-${++nextId}`;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error("用量查询脚本执行超时"));
    }, 5000);
    pending.set(id, { resolve, timeout });
    frame.contentWindow.postMessage({ channel: "abm-sandbox", id, action, payload }, "*");
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen-extractor") return;
  executeInSandbox(message.action, message.payload)
    .then((result) => sendResponse(result))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
