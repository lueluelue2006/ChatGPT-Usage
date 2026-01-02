import {
  COLORS,
  DEFAULT_UNKNOWN_MODEL_CONFIG,
  MODEL_DISPLAY_ORDER,
  PLAN_CONFIGS,
  PLAN_DISPLAY_ORDER,
  SHARED_GROUP_COLORS,
  STYLE,
  TIME_WINDOWS,
  defaultUsageData,
  displayModelName,
} from "../config.js";
import { exportUsageData, importUsageData } from "../features/importExport.js";
import { exportMonthlyAnalysis, exportWeeklyAnalysis } from "../features/reports.js";
import { usageData } from "../state.js";
import { Storage, refreshUsageData, updateUsageData } from "../storage.js";
import { formatTimeAgo, formatTimeLeft, getWindowEnd, tsOf } from "../utils.js";
import { applyPlanConfig, collectSharedGroupUsage } from "../usage.js";
import { showToast } from "./toast.js";

function animateText(el, config) {
  try {
    const Scrambler =
      (typeof window !== "undefined" && (window.TextScrambler || window["TextScrambler"])) || null;
    if (!Scrambler) return;
    const animator = new Scrambler(el, { ...config });
    if (typeof animator.initialize === "function") animator.initialize();
    if (typeof animator.start === "function") animator.start();
  } catch (e) {
    console.debug("[monitor] Text animation skipped:", e?.message || e);
  }
}

export function updateUI() {
  const usageContent = document.getElementById("usageContent");
  const settingsContent = document.getElementById("settingsContent");

  if (usageContent) {
    updateUsageContent(usageContent);
    animateText(usageContent, {
      duration: 500,
      delay: 0,
      reverse: false,
      absolute: false,
      pointerEvents: true,
    });
  }

  if (settingsContent) {
    updateSettingsContent(settingsContent);
    animateText(settingsContent, {
      duration: 500,
      delay: 0,
      reverse: false,
      absolute: false,
      pointerEvents: true,
    });
  }
}

function createSettingsModelRow(model, modelKey) {
  const row = document.createElement("div");
  row.className = "model-row";

  const keyLabel = document.createElement("div");
  keyLabel.textContent = displayModelName(modelKey);
  row.appendChild(keyLabel);

  const quotaInput = document.createElement("input");
  quotaInput.type = "number";

  if (model.sharedGroup && usageData.sharedQuotaGroups?.[model.sharedGroup]) {
    quotaInput.value = usageData.sharedQuotaGroups[model.sharedGroup].quota ?? "";
    quotaInput.disabled = true;
    quotaInput.title = `由共享组（${usageData.sharedQuotaGroups[model.sharedGroup].displayName || model.sharedGroup}）控制`;
  } else {
    quotaInput.value = typeof model.quota === "number" ? model.quota : "";
  }
  quotaInput.placeholder = "配额";
  quotaInput.dataset.modelKey = modelKey;
  quotaInput.dataset.field = "quota";
  row.appendChild(quotaInput);

  const windowSelect = document.createElement("select");
  windowSelect.dataset.modelKey = modelKey;
  windowSelect.dataset.field = "windowType";
  windowSelect.innerHTML = `
    <option value="hour3">3小时窗口</option>
    <option value="hour5">5小时窗口</option>
    <option value="daily">24小时窗口</option>
    <option value="weekly">7天窗口</option>
    <option value="monthly">30天窗口</option>
  `;

  if (model.sharedGroup && usageData.sharedQuotaGroups?.[model.sharedGroup]) {
    windowSelect.value = usageData.sharedQuotaGroups[model.sharedGroup].windowType || "daily";
    windowSelect.disabled = true;
    windowSelect.title = `由共享组（${usageData.sharedQuotaGroups[model.sharedGroup].displayName || model.sharedGroup}）控制`;
  } else {
    windowSelect.value = model.windowType || "daily";
  }

  const controlsContainer = document.createElement("div");
  controlsContainer.style.display = "flex";
  controlsContainer.style.alignItems = "center";
  controlsContainer.style.gap = "4px";
  controlsContainer.appendChild(windowSelect);

  const delBtn = document.createElement("button");
  delBtn.className = "btn delete-btn";
  delBtn.textContent = "删除";
  delBtn.addEventListener("click", () => handleDeleteModel(modelKey));
  controlsContainer.appendChild(delBtn);

  row.appendChild(controlsContainer);

  return row;
}

function createUsageModelRow(model, modelKey) {
  const now = Date.now();

  let count = 0;
  let quota = 0;
  let windowType = "daily";
  let lastRequestTime = "never";
  let windowEndInfo = "";

  if (model.sharedGroup) {
    const sharedUsage = collectSharedGroupUsage(model.sharedGroup, now);
    if (sharedUsage) {
      quota = sharedUsage.group.quota;
      windowType = sharedUsage.windowType;
      count = sharedUsage.activeRequests.length;

      const modelRequests = sharedUsage.activeRequests.filter((req) => req.modelKey === modelKey);
      if (modelRequests.length > 0) {
        lastRequestTime = formatTimeAgo(Math.max(...modelRequests.map((req) => req.ts)));
      }

      if (count > 0 && usageData.showWindowResetTime) {
        const oldestActiveTimestamp = Math.min(...sharedUsage.activeRequests.map((req) => req.ts));
        const windowEnd = getWindowEnd(oldestActiveTimestamp, windowType);
        if (windowEnd > now) {
          windowEndInfo = `Window resets in: ${formatTimeLeft(windowEnd)}`;
        }
      }
    }
  } else {
    quota = model.quota;
    windowType = model.windowType;

    const windowDuration = TIME_WINDOWS[windowType] || TIME_WINDOWS.daily;
    const activeRequests = (model.requests || [])
      .map((req) => tsOf(req))
      .filter((ts) => now - ts < windowDuration);

    count = activeRequests.length;
    if (count > 0) {
      lastRequestTime = formatTimeAgo(Math.max(...activeRequests));
    }

    if (count > 0 && usageData.showWindowResetTime) {
      const oldestActiveTimestamp = Math.min(...activeRequests);
      const windowEnd = getWindowEnd(oldestActiveTimestamp, windowType);
      if (windowEnd > now) {
        windowEndInfo = `Window resets in: ${formatTimeLeft(windowEnd)}`;
      }
    }
  }

  const row = document.createElement("div");
  row.className = "model-row";

  const modelNameContainer = document.createElement("div");
  modelNameContainer.style.display = "flex";
  modelNameContainer.style.alignItems = "center";

  const modelName = document.createElement("span");
  modelName.textContent = displayModelName(modelKey);

  let sharedColor = null;
  if (model.sharedGroup) {
    sharedColor = SHARED_GROUP_COLORS[model.sharedGroup] || COLORS.warning;
    modelName.style.color = sharedColor;
    modelName.title = `共享组：${usageData.sharedQuotaGroups?.[model.sharedGroup]?.displayName || model.sharedGroup}`;
  }
  modelNameContainer.appendChild(modelName);

  const windowBadge = document.createElement("span");
  windowBadge.className = `window-badge ${windowType}`;
  windowBadge.textContent =
    windowType === "hour3"
      ? "3h"
      : windowType === "hour5"
        ? "5h"
        : windowType === "daily"
          ? "24h"
          : windowType === "weekly"
            ? "7d"
            : "30d";
  modelNameContainer.appendChild(windowBadge);

  row.appendChild(modelNameContainer);

  const lastUpdateValue = document.createElement("div");
  lastUpdateValue.className = "request-time";
  lastUpdateValue.textContent = lastRequestTime;
  row.appendChild(lastUpdateValue);

  const usageValue = document.createElement("div");
  if (sharedColor) usageValue.style.color = sharedColor;

  const currentPlan = usageData.planType || "team";
  const quotaDisplay =
    quota === 0 ? (currentPlan === "pro" ? "∞" : "不可用") : String(quota ?? "不可用");

  usageValue.textContent = `${count} / ${quotaDisplay}`;
  if (windowEndInfo && usageData.showWindowResetTime) {
    const windowInfoEl = document.createElement("div");
    windowInfoEl.className = "window-info";
    windowInfoEl.textContent = windowEndInfo;
    usageValue.appendChild(windowInfoEl);
  }
  row.appendChild(usageValue);

  const progressCell = document.createElement("div");
  if (quota === 0) {
    if (currentPlan === "pro") {
      progressCell.textContent = "无限制";
      progressCell.style.color = COLORS.success;
      progressCell.style.fontStyle = "italic";
    } else {
      progressCell.textContent = "不可用";
      progressCell.style.color = COLORS.disabled;
      progressCell.style.fontStyle = "italic";
    }
  } else {
    const usagePercent = count / quota;
    if (usageData.progressType === "dots") {
      const dotContainer = document.createElement("div");
      dotContainer.className = "dot-progress";
      const totalDots = 8;
      for (let i = 0; i < totalDots; i++) {
        const dot = document.createElement("div");
        dot.className = "dot";

        const dotThreshold = (i + 1) / totalDots;
        if (usagePercent >= 1) {
          dot.classList.add("dot-exceeded");
        } else if (usagePercent >= dotThreshold) {
          dot.classList.add("dot-full");
        } else if (usagePercent >= dotThreshold - 0.1) {
          dot.classList.add("dot-partial");
        } else {
          dot.classList.add("dot-empty");
        }

        dotContainer.appendChild(dot);
      }
      progressCell.appendChild(dotContainer);
    } else {
      const progressContainer = document.createElement("div");
      progressContainer.className = "progress-container";

      const progressBar = document.createElement("div");
      progressBar.className = "progress-bar";
      if (usagePercent > 1) progressBar.classList.add("exceeded");
      else if (usagePercent < 0.3) progressBar.classList.add("low-usage");

      progressBar.style.width = `${Math.min(usagePercent * 100, 100)}%`;

      progressContainer.appendChild(progressBar);
      progressCell.appendChild(progressContainer);
    }
  }
  row.appendChild(progressCell);

  return row;
}

function updateUsageContent(container) {
  container.innerHTML = "";

  const infoSection = document.createElement("div");
  infoSection.className = "reset-info";
  infoSection.innerHTML = `<b>滑动窗口跟踪:</b>`;

  const windowTypes = document.createElement("div");
  windowTypes.style.display = "flex";
  windowTypes.style.justifyContent = "space-between";
  windowTypes.style.marginTop = "4px";
  windowTypes.innerHTML = `
    <span><span class="window-badge hour3">3h</span> 3小时窗口</span>
    <span><span class="window-badge hour5">5h</span> 5小时窗口</span>
    <span><span class="window-badge daily">24h</span> 24小时窗口</span>
    <span><span class="window-badge weekly">7d</span> 7天窗口</span>
    <span><span class="window-badge monthly">30d</span> 30天窗口</span>
  `;
  infoSection.appendChild(windowTypes);
  container.appendChild(infoSection);

  const tableHeader = document.createElement("div");
  tableHeader.className = "table-header";
  tableHeader.innerHTML = `
    <div>模型名称</div>
    <div>最后使用</div>
    <div>使用量</div>
    <div>进度</div>
  `;
  container.appendChild(tableHeader);

  const now = Date.now();
  const planType = usageData.planType || "team";

  const modelCounts = Object.entries(usageData.models || {}).map(([key, model]) => {
    let activeCount = 0;
    let hasBeenUsed = false;
    let isAvailable = false;

    if (model.sharedGroup) {
      const sharedUsage = collectSharedGroupUsage(model.sharedGroup, now);
      if (sharedUsage) {
        activeCount = sharedUsage.activeRequests.length;
        hasBeenUsed = activeCount > 0;
        isAvailable = sharedUsage.group.quota > 0 || (sharedUsage.group.quota === 0 && planType === "pro");
      }
    } else {
      const windowDuration = TIME_WINDOWS[model.windowType] || TIME_WINDOWS.daily;
      activeCount = (model.requests || []).map(tsOf).filter((ts) => now - ts < windowDuration).length;
      hasBeenUsed = (model.requests || []).length > 0;
      isAvailable = model.quota > 0 || (model.quota === 0 && planType === "pro");
    }

    return { key, model, hasBeenUsed, isAvailable };
  });

  const sortedModels = MODEL_DISPLAY_ORDER.filter((modelKey) => {
    const modelData = modelCounts.find(({ key }) => key === modelKey);
    if (!modelData) return false;
    if (modelKey === "o3-pro" && planType !== "pro") return false;
    return modelData.hasBeenUsed || modelData.isAvailable;
  })
    .map((modelKey) => modelCounts.find(({ key }) => key === modelKey))
    .filter(Boolean);

  const extraModels = modelCounts
    .filter(({ key }) => !MODEL_DISPLAY_ORDER.includes(key))
    .filter(({ key }) => !(key === "o3-pro" && planType !== "pro"))
    .filter(({ hasBeenUsed, isAvailable }) => hasBeenUsed || isAvailable)
    .sort((a, b) => a.key.localeCompare(b.key));

  [...sortedModels, ...extraModels].forEach(({ key, model }) => {
    container.appendChild(createUsageModelRow(model, key));
  });

  if (sortedModels.length === 0 && extraModels.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.style.textAlign = "center";
    emptyState.style.color = COLORS.secondaryText;
    emptyState.style.padding = STYLE.spacing.lg;
    emptyState.textContent = Object.keys(usageData.models || {}).length > 0 ? "使用模型后才会显示用量统计。" : "未配置任何模型，请在设置中添加。";
    container.appendChild(emptyState);
  }
}

function updateSettingsContent(container) {
  container.innerHTML = "";

  const info = document.createElement("p");
  info.innerHTML = `配置模型映射与配额:<br>
    <span style="color:${COLORS.secondaryText}; font-size:${STYLE.textSize.xs};">
    使用像OpenAI一样的滑动时间窗口（统计最近N小时的使用量）
    </span>`;
  info.style.fontSize = STYLE.textSize.md;
  info.style.lineHeight = STYLE.lineHeight.md;
  info.style.color = COLORS.text;
  container.appendChild(info);

  const tableHeader = document.createElement("div");
  tableHeader.className = "table-header";
  tableHeader.style.gridTemplateColumns = "2fr 1fr 2fr";
  tableHeader.innerHTML = `<div>模型ID</div><div>配额</div><div>窗口/操作</div>`;
  container.appendChild(tableHeader);

  if (!document.querySelector('style[data-monitor-settings-style="true"]')) {
    const css = `
      #settingsContent .table-header,
      #settingsContent .model-row { grid-template-columns: 2fr 1fr 2fr; }
    `;
    const styleEl = document.createElement("style");
    styleEl.setAttribute("data-monitor-settings-style", "true");
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  const sortedModelKeys = MODEL_DISPLAY_ORDER.filter((modelKey) => usageData.models?.[modelKey]);
  const extraModelKeys = Object.keys(usageData.models || {}).filter((k) => !MODEL_DISPLAY_ORDER.includes(k));
  [...sortedModelKeys, ...extraModelKeys].forEach((modelKey) => {
    container.appendChild(createSettingsModelRow(usageData.models[modelKey], modelKey));
  });

  const addBtn = document.createElement("button");
  addBtn.className = "btn";
  addBtn.textContent = "添加模型映射";
  addBtn.style.marginTop = "20px";
  addBtn.addEventListener("click", () => {
    const rawId = prompt('输入新模型的内部ID（例如："o3-mini"）');
    const newModelID = rawId ? rawId.trim() : "";
    if (!newModelID) return;

    let added = false;
    updateUsageData((data) => {
      if (data.models[newModelID]) return;
      data.models[newModelID] = { requests: [], ...DEFAULT_UNKNOWN_MODEL_CONFIG };
      added = true;
    });

    if (!added) {
      alert("模型映射已存在。");
      return;
    }

    updateUI();
    showToast(`模型 ${newModelID} 已添加。`, "success");
  });
  container.appendChild(addBtn);

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn";
  saveBtn.textContent = "保存设置";
  saveBtn.style.marginLeft = STYLE.spacing.sm;
  saveBtn.addEventListener("click", () => {
    const inputs = container.querySelectorAll("input, select");
    let hasChanges = false;

    updateUsageData((data) => {
      inputs.forEach((input) => {
        if (input.disabled) return;
        const modelKey = input.dataset.modelKey;
        const field = input.dataset.field;
        if (!modelKey || !data.models[modelKey]) return;

        if (field === "quota") {
          const newQuota = parseInt(input.value, 10);
          if (!isNaN(newQuota) && newQuota !== data.models[modelKey].quota) {
            data.models[modelKey].quota = newQuota;
            hasChanges = true;
          }
        } else if (field === "windowType") {
          const newWindowType = input.value;
          if (newWindowType && newWindowType !== data.models[modelKey].windowType) {
            data.models[modelKey].windowType = newWindowType;
            hasChanges = true;
          }
        }
      });
    });

    if (hasChanges) {
      updateUI();
      showToast("设置保存成功。");
    } else {
      showToast("未检测到更改。", "warning");
    }
  });
  container.appendChild(saveBtn);

  const clearBtn = document.createElement("button");
  clearBtn.className = "btn";
  clearBtn.textContent = "清除历史";
  clearBtn.style.marginLeft = STYLE.spacing.sm;
  clearBtn.addEventListener("click", () => {
    if (!confirm("确定要清除所有模型的使用历史吗？")) return;

    updateUsageData((data) => {
      Object.values(data.models).forEach((model) => {
        if (Array.isArray(model.requests)) model.requests = [];
      });
      if (data.sharedQuotaGroups && typeof data.sharedQuotaGroups === "object") {
        Object.values(data.sharedQuotaGroups).forEach((group) => {
          if (Array.isArray(group.requests)) group.requests = [];
        });
      }
    });

    updateUI();
    showToast("所有模型的使用历史已清除。");
  });
  container.appendChild(clearBtn);

  const resetQuotaBtn = document.createElement("button");
  resetQuotaBtn.className = "btn";
  resetQuotaBtn.textContent = "恢复默认配额";
  resetQuotaBtn.style.marginLeft = STYLE.spacing.sm;
  resetQuotaBtn.style.color = COLORS.warning;
  resetQuotaBtn.addEventListener("click", () => {
    if (!confirm("确定要恢复当前套餐的默认配额设置吗？\n\n这将重置所有模型的配额和时间窗口，但保留使用历史。")) return;
    const currentPlan = refreshUsageData().planType || "team";
    applyPlanConfig(currentPlan);
    updateUI();
    showToast(`已恢复 ${PLAN_CONFIGS[currentPlan].name} 套餐的默认配额设置`, "success");
  });
  container.appendChild(resetQuotaBtn);

  const resetAllBtn = document.createElement("button");
  resetAllBtn.className = "btn";
  resetAllBtn.textContent = "重置所有";
  resetAllBtn.style.marginLeft = STYLE.spacing.sm;
  resetAllBtn.style.color = COLORS.danger;
  resetAllBtn.addEventListener("click", () => {
    if (!confirm("警告：这将重置所有内容为默认值，包括所有模型配置。确定继续吗？")) return;

    const freshDefaults = JSON.parse(JSON.stringify(defaultUsageData));
    Storage.set(freshDefaults);
    refreshUsageData();
    const planToApply = usageData.planType || "team";
    applyPlanConfig(planToApply);
    updateUI();
    showToast("所有内容已重置为默认值。", "warning");
  });
  container.appendChild(resetAllBtn);

  const weeklyAnalysisBtn = document.createElement("button");
  weeklyAnalysisBtn.className = "btn";
  weeklyAnalysisBtn.textContent = "导出一周分析";
  weeklyAnalysisBtn.style.marginTop = "20px";
  weeklyAnalysisBtn.style.display = "block";
  weeklyAnalysisBtn.style.width = "100%";
  weeklyAnalysisBtn.style.backgroundColor = COLORS.surface;
  weeklyAnalysisBtn.style.border = `1px solid ${COLORS.yellow}`;
  weeklyAnalysisBtn.addEventListener("click", () => exportWeeklyAnalysis());
  container.appendChild(weeklyAnalysisBtn);

  const monthlyAnalysisBtn = document.createElement("button");
  monthlyAnalysisBtn.className = "btn";
  monthlyAnalysisBtn.textContent = "导出一个月分析";
  monthlyAnalysisBtn.style.marginTop = "10px";
  monthlyAnalysisBtn.style.display = "block";
  monthlyAnalysisBtn.style.width = "100%";
  monthlyAnalysisBtn.style.backgroundColor = COLORS.surface;
  monthlyAnalysisBtn.style.border = `1px solid ${COLORS.green}`;
  monthlyAnalysisBtn.addEventListener("click", () => exportMonthlyAnalysis());
  container.appendChild(monthlyAnalysisBtn);

  const dataOperationsContainer = document.createElement("div");
  dataOperationsContainer.style.marginTop = "20px";
  dataOperationsContainer.style.display = "flex";
  dataOperationsContainer.style.gap = "8px";
  dataOperationsContainer.style.justifyContent = "center";

  const exportBtn = document.createElement("button");
  exportBtn.className = "btn";
  exportBtn.textContent = "导出数据";
  exportBtn.style.backgroundColor = COLORS.background;
  exportBtn.style.border = `1px solid ${COLORS.border}`;
  exportBtn.style.borderRadius = "4px";
  exportBtn.style.padding = "8px 12px";
  exportBtn.addEventListener("click", exportUsageData);

  const importBtn = document.createElement("button");
  importBtn.className = "btn";
  importBtn.textContent = "导入数据";
  importBtn.style.backgroundColor = COLORS.background;
  importBtn.style.border = `1px solid ${COLORS.border}`;
  importBtn.style.borderRadius = "4px";
  importBtn.style.padding = "8px 12px";
  importBtn.addEventListener("click", importUsageData);

  dataOperationsContainer.appendChild(exportBtn);
  dataOperationsContainer.appendChild(importBtn);
  container.appendChild(dataOperationsContainer);

  const dataOperationsInfo = document.createElement("div");
  dataOperationsInfo.style.textAlign = "center";
  dataOperationsInfo.style.marginTop = "8px";
  dataOperationsInfo.style.color = COLORS.secondaryText;
  dataOperationsInfo.style.fontSize = STYLE.textSize.xs;
  dataOperationsInfo.textContent = "导入/导出功能可在不同浏览器间同步用量统计数据";
  container.appendChild(dataOperationsInfo);

  const planSelectorContainer = document.createElement("div");
  planSelectorContainer.style.marginTop = STYLE.spacing.md;
  planSelectorContainer.style.display = "flex";
  planSelectorContainer.style.flexDirection = "column";
  planSelectorContainer.style.gap = "12px";
  planSelectorContainer.style.padding = "10px";
  planSelectorContainer.style.border = `1px solid ${COLORS.border}`;
  planSelectorContainer.style.borderRadius = "8px";
  planSelectorContainer.style.backgroundColor = COLORS.surface;

  const planTitle = document.createElement("div");
  planTitle.textContent = "套餐设置";
  planTitle.style.fontWeight = "bold";
  planTitle.style.marginBottom = "8px";
  planTitle.style.color = COLORS.white;
  planSelectorContainer.appendChild(planTitle);

  const planSelectContainer = document.createElement("div");
  planSelectContainer.style.display = "flex";
  planSelectContainer.style.alignItems = "center";
  planSelectContainer.style.justifyContent = "space-between";
  planSelectContainer.style.width = "100%";

  const planTypeLabel = document.createElement("span");
  planTypeLabel.textContent = "当前套餐:";
  planTypeLabel.style.color = COLORS.secondaryText;
  planSelectContainer.appendChild(planTypeLabel);

  const planTypeSelect = document.createElement("select");
  planTypeSelect.style.width = "140px";
  planTypeSelect.style.backgroundColor = COLORS.background;
  planTypeSelect.style.color = COLORS.white;
  planTypeSelect.style.border = `1px solid ${COLORS.border}`;
  planTypeSelect.style.borderRadius = "4px";
  planTypeSelect.style.padding = "4px 8px";

  PLAN_DISPLAY_ORDER.filter((k) => PLAN_CONFIGS[k])
    .concat(Object.keys(PLAN_CONFIGS).filter((k) => !PLAN_DISPLAY_ORDER.includes(k)))
    .forEach((key) => {
      const config = PLAN_CONFIGS[key];
      const option = document.createElement("option");
      option.value = key;
      option.textContent = config.name;
      planTypeSelect.appendChild(option);
    });

  planTypeSelect.value = usageData.planType || "team";
  planTypeSelect.addEventListener("change", () => {
    const newPlan = planTypeSelect.value;
    const currentPlan = refreshUsageData().planType || "team";

    if (!confirm(`确定要切换到 ${PLAN_CONFIGS[newPlan].name} 套餐吗？\n\n这将更新所有模型的配额和时间窗口设置。`)) {
      planTypeSelect.value = currentPlan;
      return;
    }

    updateUsageData((data) => {
      data.planType = newPlan;
    });

    applyPlanConfig(newPlan);
    updateUI();
    showToast(`已切换到 ${PLAN_CONFIGS[newPlan].name} 套餐`, "success");
  });

  planSelectContainer.appendChild(planTypeSelect);
  planSelectorContainer.appendChild(planSelectContainer);

  const planInfo = document.createElement("div");
  planInfo.style.fontSize = STYLE.textSize.xs;
  planInfo.style.color = COLORS.secondaryText;
  planInfo.style.marginTop = "4px";
  planInfo.textContent = "切换套餐将根据官方限制自动调整所有模型的配额和时间窗口";
  planSelectorContainer.appendChild(planInfo);

  const currentPlanConfig = PLAN_CONFIGS[usageData.planType || "team"];
  const planDetailsContainer = document.createElement("div");
  planDetailsContainer.style.marginTop = "8px";
  planDetailsContainer.style.padding = "8px";
  planDetailsContainer.style.backgroundColor = COLORS.background;
  planDetailsContainer.style.borderRadius = "4px";
  planDetailsContainer.style.border = `1px solid ${COLORS.border}`;

  const planDetailsTitle = document.createElement("div");
  planDetailsTitle.textContent = `${currentPlanConfig.name} 套餐配置:`;
  planDetailsTitle.style.fontWeight = "bold";
  planDetailsTitle.style.marginBottom = "6px";
  planDetailsTitle.style.fontSize = STYLE.textSize.xs;
  planDetailsTitle.style.color = COLORS.yellow;
  planDetailsContainer.appendChild(planDetailsTitle);

  const planDetailsList = document.createElement("div");
  planDetailsList.style.fontSize = STYLE.textSize.xs;
  planDetailsList.style.color = COLORS.secondaryText;
  planDetailsList.style.lineHeight = "1.4";

  const windowTextOf = (windowType) =>
    windowType === "hour3"
      ? "3小时"
      : windowType === "hour5"
        ? "5小时"
        : windowType === "daily"
          ? "24小时"
          : windowType === "weekly"
            ? "7天"
            : windowType === "monthly"
              ? "30天"
              : "";

  const visibleModels = Object.entries(currentPlanConfig.models).filter(([_, cfg]) => {
    if (cfg.sharedGroup) {
      const group = currentPlanConfig.sharedQuotaGroups?.[cfg.sharedGroup];
      if (!group) return false;
      if (group.quota === 0 && (usageData.planType || "team") !== "pro") return false;
      return true;
    }
    return !(cfg.quota === 0 && (usageData.planType || "team") !== "pro");
  });

  const detailsText =
    visibleModels
      .map(([model, cfg]) => {
        if (cfg.sharedGroup) {
          const group = currentPlanConfig.sharedQuotaGroups?.[cfg.sharedGroup];
          if (!group) return `• ${displayModelName(model)}: 未知配置`;
          const quotaText = group.quota === 0 ? "无限制" : `${group.quota}次`;
          return `• ${displayModelName(model)}: ${quotaText}/${windowTextOf(group.windowType)} (共享)`;
        }

        const quotaText = cfg.quota === 0 ? "无限制" : `${cfg.quota}次`;
        return `• ${displayModelName(model)}: ${quotaText}/${windowTextOf(cfg.windowType)}`;
      })
      .join("\n") || "当前套餐未包含可用模型";

  planDetailsList.textContent = detailsText;
  planDetailsList.style.whiteSpace = "pre-line";
  planDetailsContainer.appendChild(planDetailsList);
  planSelectorContainer.appendChild(planDetailsContainer);

  container.appendChild(planSelectorContainer);

  const optionsContainer = document.createElement("div");
  optionsContainer.style.marginTop = STYLE.spacing.md;
  optionsContainer.style.display = "flex";
  optionsContainer.style.flexDirection = "column";
  optionsContainer.style.gap = "12px";
  optionsContainer.style.padding = "10px";
  optionsContainer.style.border = `1px solid ${COLORS.border}`;
  optionsContainer.style.borderRadius = "8px";
  optionsContainer.style.backgroundColor = COLORS.surface;

  const optionsTitle = document.createElement("div");
  optionsTitle.textContent = "显示选项";
  optionsTitle.style.fontWeight = "bold";
  optionsTitle.style.marginBottom = "8px";
  optionsTitle.style.color = COLORS.white;
  optionsContainer.appendChild(optionsTitle);

  const progressSelectContainer = document.createElement("div");
  progressSelectContainer.style.display = "flex";
  progressSelectContainer.style.alignItems = "center";
  progressSelectContainer.style.justifyContent = "space-between";
  progressSelectContainer.style.width = "100%";

  const progressTypeLabel = document.createElement("span");
  progressTypeLabel.textContent = "进度条样式:";
  progressTypeLabel.style.color = COLORS.secondaryText;
  progressSelectContainer.appendChild(progressTypeLabel);

  const progressTypeSelect = document.createElement("select");
  progressTypeSelect.style.width = "100px";
  progressTypeSelect.style.backgroundColor = COLORS.background;
  progressTypeSelect.style.color = COLORS.white;
  progressTypeSelect.style.border = `1px solid ${COLORS.border}`;
  progressTypeSelect.style.borderRadius = "4px";
  progressTypeSelect.style.padding = "3px 6px";
  progressTypeSelect.innerHTML = `<option value=\"dots\">点状进度</option><option value=\"bar\">条状进度</option>`;
  progressTypeSelect.value = usageData.progressType || "bar";
  progressTypeSelect.addEventListener("change", () => {
    updateUsageData((data) => {
      data.progressType = progressTypeSelect.value;
    });
    updateUI();
  });
  progressSelectContainer.appendChild(progressTypeSelect);
  optionsContainer.appendChild(progressSelectContainer);

  const showResetTimeContainer = document.createElement("div");
  showResetTimeContainer.style.display = "flex";
  showResetTimeContainer.style.alignItems = "center";
  showResetTimeContainer.style.justifyContent = "space-between";
  showResetTimeContainer.style.width = "100%";

  const showResetTimeLabel = document.createElement("label");
  showResetTimeLabel.textContent = "显示窗口重置时间";
  showResetTimeLabel.style.color = COLORS.secondaryText;
  showResetTimeLabel.style.cursor = "pointer";

  const checkboxWrapper = document.createElement("div");
  checkboxWrapper.style.position = "relative";
  checkboxWrapper.style.width = "40px";
  checkboxWrapper.style.height = "20px";
  checkboxWrapper.style.backgroundColor = usageData.showWindowResetTime ? COLORS.success : COLORS.disabled;
  checkboxWrapper.style.borderRadius = "10px";
  checkboxWrapper.style.transition = "all 0.3s ease";
  checkboxWrapper.style.cursor = "pointer";

  const slider = document.createElement("div");
  slider.style.position = "absolute";
  slider.style.top = "2px";
  slider.style.left = usageData.showWindowResetTime ? "22px" : "2px";
  slider.style.width = "16px";
  slider.style.height = "16px";
  slider.style.borderRadius = "50%";
  slider.style.backgroundColor = COLORS.white;
  slider.style.transition = "all 0.3s ease";
  checkboxWrapper.appendChild(slider);

  checkboxWrapper.addEventListener("click", () => {
    const checked = !usageData.showWindowResetTime;
    updateUsageData((data) => {
      data.showWindowResetTime = checked;
    });
    checkboxWrapper.style.backgroundColor = checked ? COLORS.success : COLORS.disabled;
    slider.style.left = checked ? "22px" : "2px";
    updateUI();
  });
  showResetTimeLabel.addEventListener("click", () => checkboxWrapper.click());

  showResetTimeContainer.appendChild(showResetTimeLabel);
  showResetTimeContainer.appendChild(checkboxWrapper);
  optionsContainer.appendChild(showResetTimeContainer);

  container.appendChild(optionsContainer);
}

function handleDeleteModel(modelKey) {
  if (!confirm(`确定要删除模型 \"${modelKey}\" 的配置吗？`)) return;

  let removed = false;
  updateUsageData((data) => {
    if (data.models[modelKey]) {
      delete data.models[modelKey];
      removed = true;
    }
  });

  if (removed) {
    updateUI();
    showToast(`模型 \"${modelKey}\" 已删除。`);
  } else {
    showToast(`未找到模型 \"${modelKey}\"。`, "warning");
  }
}

export function setupDraggable(element) {
  let isDragging = false;
  let startX;
  let startY;
  let origLeft;
  let origTop;

  const handle = element.querySelector("header");
  if (handle) handle.addEventListener("mousedown", startDrag);

  element.addEventListener("mousedown", (e) => {
    if (element.classList.contains("minimized")) startDrag(e);
  });

  function startDrag(e) {
    if (
      e.target.classList.contains("minimize-btn") ||
      e.target.tagName === "BUTTON" ||
      e.target.tagName === "INPUT" ||
      e.target.tagName === "SELECT"
    ) {
      return;
    }

    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;

    const rect = element.getBoundingClientRect();
    origLeft = rect.left;
    origTop = rect.top;

    document.addEventListener("mousemove", handleDrag);
    document.addEventListener("mouseup", stopDrag);

    e.preventDefault();
  }

  function handleDrag(e) {
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    if (!isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      isDragging = true;
    }

    if (isDragging) {
      const rect = element.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      const newLeft = Math.min(Math.max(0, origLeft + deltaX), maxX);
      const newTop = Math.min(Math.max(0, origTop + deltaY), maxY);

      element.style.setProperty("left", `${newLeft}px`, "important");
      element.style.setProperty("top", `${newTop}px`, "important");
      element.style.setProperty("right", "auto", "important");
      element.style.setProperty("bottom", "auto", "important");
      e.preventDefault();
    }
  }

  function stopDrag(e) {
    document.removeEventListener("mousemove", handleDrag);
    document.removeEventListener("mouseup", stopDrag);

    if (isDragging) {
      const newLeft = parseInt(element.style.left, 10);
      const newTop = parseInt(element.style.top, 10);

      Storage.update((data) => {
        data.position = { x: newLeft, y: newTop };
      });

      setTimeout(() => {
        isDragging = false;
      }, 200);

      e.preventDefault();
      e.stopPropagation();
    }
  }
}

let _keyboardShortcutsInstalled = false;
export function setupKeyboardShortcuts() {
  if (_keyboardShortcutsInstalled) return;
  _keyboardShortcutsInstalled = true;

  const handleShortcut = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const monitor = document.getElementById("chatUsageMonitor");
      if (!monitor) return false;

      if (monitor.classList.contains("minimized")) {
        monitor.classList.remove("minimized");
        const currentData = Storage.get();
        if (currentData.size?.width && currentData.size?.height) {
          monitor.style.width = `${currentData.size.width}px`;
          monitor.style.height = `${currentData.size.height}px`;
        }
        Storage.update((data) => {
          data.minimized = false;
        });
      } else {
        monitor.classList.add("minimized");
        Storage.update((data) => {
          data.minimized = true;
        });
      }
      return false;
    }
  };

  document.addEventListener("keydown", handleShortcut, true);
}

let _uiUpdateIntervalId = null;
export function createMonitorUI() {
  if (usageData?.silentMode) return;
  if (document.getElementById("chatUsageMonitor")) return;

  const container = document.createElement("div");
  container.id = "chatUsageMonitor";

  if (usageData.minimized) container.classList.add("minimized");

  if (usageData.size?.width && usageData.size?.height && !usageData.minimized) {
    container.style.width = `${usageData.size.width}px`;
    container.style.height = `${usageData.size.height}px`;
  }

  if (usageData.position?.x !== null && usageData.position?.y !== null) {
    const maxX = window.innerWidth - 400;
    const maxY = window.innerHeight - 500;
    const x = Math.min(Math.max(0, usageData.position.x), maxX);
    const y = Math.min(Math.max(0, usageData.position.y), maxY);

    container.style.setProperty("left", `${x}px`, "important");
    container.style.setProperty("top", `${y}px`, "important");
    container.style.setProperty("right", "auto", "important");
    container.style.setProperty("bottom", "auto", "important");
  } else {
    container.style.setProperty("left", STYLE.spacing.lg, "important");
    container.style.setProperty("bottom", "100px", "important");
    container.style.setProperty("right", "auto", "important");
    container.style.setProperty("top", "auto", "important");
  }

  const header = document.createElement("header");

  const minimizeBtn = document.createElement("div");
  minimizeBtn.className = "minimize-btn";
  minimizeBtn.innerHTML = "−";
  minimizeBtn.title = "最小化监视器";
  minimizeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    container.classList.add("minimized");
    Storage.update((data) => {
      data.minimized = true;
    });
  });
  header.appendChild(minimizeBtn);

  const usageTabBtn = document.createElement("button");
  usageTabBtn.innerHTML = `<span>用量</span>`;
  usageTabBtn.classList.add("active");

  const settingsTabBtn = document.createElement("button");
  settingsTabBtn.innerHTML = `<span>设置</span>`;

  header.appendChild(usageTabBtn);
  header.appendChild(settingsTabBtn);
  container.appendChild(header);

  const usageContent = document.createElement("div");
  usageContent.className = "content";
  usageContent.id = "usageContent";
  container.appendChild(usageContent);

  const settingsContent = document.createElement("div");
  settingsContent.className = "content";
  settingsContent.id = "settingsContent";
  settingsContent.style.display = "none";
  container.appendChild(settingsContent);

  usageTabBtn.addEventListener("click", () => {
    usageTabBtn.classList.add("active");
    settingsTabBtn.classList.remove("active");
    usageContent.style.display = "";
    settingsContent.style.display = "none";
  });

  settingsTabBtn.addEventListener("click", () => {
    settingsTabBtn.classList.add("active");
    usageTabBtn.classList.remove("active");
    settingsContent.style.display = "";
    usageContent.style.display = "none";
  });

  container.addEventListener("click", (e) => {
    if (!container.classList.contains("minimized")) return;
    container.classList.remove("minimized");
    if (usageData.size?.width && usageData.size?.height) {
      container.style.width = `${usageData.size.width}px`;
      container.style.height = `${usageData.size.height}px`;
    }
    Storage.update((data) => {
      data.minimized = false;
    });
    e.stopPropagation();
  });

  document.body.appendChild(container);
  setupDraggable(container);
  updateUI();

  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(() => {
      if (container.classList.contains("minimized")) return;
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      if (width > 50 && height > 50) {
        Storage.update((data) => {
          data.size = { width, height };
        });
      }
    });
    resizeObserver.observe(container);
  }

  if (_uiUpdateIntervalId) {
    clearInterval(_uiUpdateIntervalId);
    _uiUpdateIntervalId = null;
  }
  _uiUpdateIntervalId = setInterval(updateUI, 60000);
}
