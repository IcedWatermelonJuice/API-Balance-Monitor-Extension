function workerSource() {
  return `
    function loadConfig(script) {
      var source = String(script || "").trim();
      try { return Function('"use strict"; return (' + source + ');')(); }
      catch (expressionError) {
        try { return Function('"use strict"; ' + source)(); }
        catch (statementError) { throw new Error(statementError.message || expressionError.message); }
      }
    }
    self.onmessage = async function(event) {
      try {
        var action = event.data.action;
        var payload = event.data.payload || {};
        var config = loadConfig(payload.script);
        if (!config || typeof config !== 'object') throw new Error('脚本必须返回配置对象');
        if (action === 'prepare') {
          if (!config.request || typeof config.request !== 'object') throw new Error('脚本缺少 request 对象');
          self.postMessage({ ok: true, result: config.request });
          return;
        }
        if (action === 'extract') {
          if (typeof config.extractor !== 'function') throw new Error('脚本缺少 extractor 函数');
          var extracted = await config.extractor(payload.response, payload.meta || {});
          self.postMessage({ ok: true, result: { extracted: extracted, display: config.display || null } });
          return;
        }
        throw new Error('未知脚本操作');
      } catch (error) {
        self.postMessage({ ok: false, error: error && error.message ? error.message : String(error) });
      }
    };
  `;
}

window.addEventListener("message", (event) => {
  if (event.source === parent && event.data?.channel === "abm-sandbox-ping") {
    parent.postMessage({ channel: "abm-sandbox-ready" }, "*");
    return;
  }
  if (event.source !== parent || event.data?.channel !== "abm-sandbox") return;
  const { id, action, payload } = event.data;
  const blob = new Blob([workerSource()], { type: "text/javascript" });
  const workerUrl = URL.createObjectURL(blob);
  const worker = new Worker(workerUrl);
  let finished = false;
  const finish = (result) => {
    if (finished) return;
    finished = true;
    worker.terminate();
    URL.revokeObjectURL(workerUrl);
    parent.postMessage({ channel: "abm-sandbox-result", id, ...result }, "*");
  };
  const timeout = setTimeout(() => finish({ ok: false, error: "脚本执行超过 2 秒，已终止" }), 2000);
  worker.onmessage = (workerEvent) => {
    clearTimeout(timeout);
    finish(workerEvent.data);
  };
  worker.onerror = (error) => {
    clearTimeout(timeout);
    finish({ ok: false, error: error.message || "脚本执行失败" });
  };
  worker.postMessage({ action, payload });
});

parent.postMessage({ channel: "abm-sandbox-ready" }, "*");
