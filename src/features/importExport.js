import { TIME_WINDOWS } from "../config.js";
import { emitDataChanged } from "../events.js";
import { Storage, refreshUsageData } from "../storage.js";
import { formatTimestampForFilename, tsOf } from "../utils.js";
import { showToast } from "../ui/toast.js";

export function exportUsageData() {
  const data = Storage.get();
  const exportData = { ...data };

  const jsonData = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `chatgpt-usage-${formatTimestampForFilename()}.json`;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("用量统计数据已导出");
  }, 100);
}

export function importUsageData() {
  if (!confirm("导入将合并现有记录与导入文件中的记录。继续吗？")) return;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.style.display = "none";

  input.onchange = function (e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const importedData = JSON.parse(event.target.result);

        if (!validateImportedData(importedData)) {
          showToast("导入失败：数据格式不正确", "error");
          return;
        }

        const importSummary = generateImportSummary(importedData);
        if (!confirm(`导入记录摘要:\\n${importSummary}\\n\\n确认导入这些数据吗？`)) return;

        const currentData = Storage.get();
        const mergedData = mergeUsageData(currentData, importedData);
        Storage.set(mergedData);

        refreshUsageData();
        emitDataChanged();
        showToast("用量记录已成功导入", "success");
      } catch (error) {
        console.error("[monitor] Import error:", error);
        showToast("导入失败：" + error.message, "error");
      } finally {
        document.body.removeChild(input);
      }
    };

    reader.readAsText(file);
  };

  document.body.appendChild(input);
  input.click();
}

function validateImportedData(data) {
  if (!data || typeof data !== "object") return false;
  if (!("models" in data) || typeof data.models !== "object") return false;

  for (const modelKey in data.models) {
    const model = data.models[modelKey];
    if (!model || typeof model !== "object") return false;
    if (!Array.isArray(model.requests)) return false;
    if (typeof model.quota !== "number" && typeof model.sharedGroup !== "string") return false;
    if (
      model.windowType &&
      !["hour3", "hour5", "daily", "weekly", "monthly"].includes(model.windowType)
    )
      return false;
  }

  return true;
}

function generateImportSummary(importedData) {
  let summary = "";

  const modelCount = Object.keys(importedData.models || {}).length;
  let totalRequests = 0;
  const modelDetails = [];

  Object.entries(importedData.models || {}).forEach(([key, model]) => {
    const count = (model.requests || []).length;
    totalRequests += count;
    if (count > 0) modelDetails.push(`${key}: ${count}条记录`);
  });

  summary += `共 ${modelCount} 个模型，${totalRequests} 条请求记录\\n`;

  if (modelDetails.length <= 5) {
    summary += `\\n模型详情:\\n${modelDetails.join("\\n")}`;
  }

  if (importedData.legacyMiniCount !== undefined && importedData.legacyMiniCount > 0) {
    summary += `\\n\\n遗留特殊模型计数: ${importedData.legacyMiniCount} (已不再使用)`;
  }

  return summary;
}

function mergeUsageData(currentData, importedData) {
  const result = JSON.parse(JSON.stringify(currentData));

  Object.entries(importedData.models || {}).forEach(([modelKey, importedModel]) => {
    if (!result.models[modelKey]) {
      result.models[modelKey] = {
        requests: [],
        quota: importedModel.quota || 50,
        windowType: importedModel.windowType || "daily",
      };
      if (importedModel.sharedGroup) result.models[modelKey].sharedGroup = importedModel.sharedGroup;
    }

    const currentRequests = result.models[modelKey].requests || [];

    const now = Date.now();
    const windowType = result.models[modelKey].windowType || "daily";
    const windowDuration = TIME_WINDOWS[windowType] || TIME_WINDOWS.daily;
    const oldestRelevantTime = now - windowDuration;

    const relevantImportedRequests = (importedModel.requests || [])
      .map((req) => tsOf(req))
      .filter((ts) => ts > oldestRelevantTime);

    const existingTimeMap = new Map();
    currentRequests.forEach((req) => {
      const roundedTime = Math.floor(tsOf(req) / 1000) * 1000;
      existingTimeMap.set(roundedTime, true);
    });

    const newRequests = relevantImportedRequests.filter((ts) => {
      const roundedTime = Math.floor(ts / 1000) * 1000;
      return !existingTimeMap.has(roundedTime);
    });

    result.models[modelKey].requests = [...currentRequests.map(tsOf), ...newRequests]
      .filter((ts) => typeof ts === "number" && !Number.isNaN(ts))
      .sort((a, b) => b - a);
  });

  return result;
}

