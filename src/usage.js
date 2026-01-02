import { DEFAULT_UNKNOWN_MODEL_CONFIG, PLAN_CONFIGS, TIME_WINDOWS } from "./config.js";
import { emitDataChanged } from "./events.js";
import { usageData } from "./state.js";
import { Storage, refreshUsageData, updateUsageData } from "./storage.js";
import { getWindowEnd, tsOf } from "./utils.js";

export function cleanupExpiredRequests() {
  const now = Date.now();
  const maxWindow = TIME_WINDOWS.monthly;

  Object.values(usageData.models || {}).forEach((model) => {
    if (!Array.isArray(model.requests)) return;
    model.requests = model.requests.map((req) => tsOf(req)).filter((ts) => now - ts < maxWindow);
  });

  if (usageData.sharedQuotaGroups && typeof usageData.sharedQuotaGroups === "object") {
    Object.values(usageData.sharedQuotaGroups).forEach((group) => {
      if (!Array.isArray(group.requests)) return;
      group.requests = group.requests.filter((req) => now - tsOf(req) < maxWindow);
    });
  }
}

export function recordModelUsageByModelId(modelId) {
  // Get fresh data
  refreshUsageData();
  cleanupExpiredRequests();

  if (!usageData.models[modelId]) {
    usageData.models[modelId] = {
      requests: [],
      ...DEFAULT_UNKNOWN_MODEL_CONFIG,
    };
  }

  usageData.models[modelId].requests.push(Date.now());
  Storage.set(usageData);
  refreshUsageData();
  emitDataChanged();
}

export function applyPlanConfig(planType) {
  const planConfig = PLAN_CONFIGS[planType];
  if (!planConfig) return;

  updateUsageData((data) => {
    const existingUsageByModel = {};
    Object.entries(data.models || {}).forEach(([modelKey, model]) => {
      if (model?.requests?.length) existingUsageByModel[modelKey] = [...model.requests];
    });

    data.sharedQuotaGroups = {};
    if (planConfig.sharedQuotaGroups) {
      Object.entries(planConfig.sharedQuotaGroups).forEach(([groupId, groupConfig]) => {
        data.sharedQuotaGroups[groupId] = {
          quota: groupConfig.quota,
          windowType: groupConfig.windowType,
          models: groupConfig.models,
          displayName: groupConfig.displayName,
          requests: [],
        };
      });
    }

    const nextModels = {};
    Object.entries(planConfig.models).forEach(([modelKey, cfg]) => {
      nextModels[modelKey] = {
        requests: existingUsageByModel[modelKey] ? [...existingUsageByModel[modelKey]] : [],
      };

      if (cfg.sharedGroup) {
        nextModels[modelKey].sharedGroup = cfg.sharedGroup;
      } else {
        nextModels[modelKey].quota = cfg.quota;
        nextModels[modelKey].windowType = cfg.windowType;
      }
    });

    data.models = nextModels;
  });

  emitDataChanged();
}

// 汇总共用组用量（不持久化），仅用于显示层的配额/窗口计算
export function collectSharedGroupUsage(groupId, now = Date.now()) {
  const group = usageData.sharedQuotaGroups?.[groupId];
  if (!group) return null;

  const windowType = group.windowType || "daily";
  const windowDuration = TIME_WINDOWS[windowType];
  const activeRequests = [];

  Object.entries(usageData.models || {}).forEach(([key, model]) => {
    if (model.sharedGroup !== groupId) return;
    if (!Array.isArray(model.requests)) return;
    model.requests
      .map((req) => tsOf(req))
      .filter((ts) => typeof ts === "number" && !Number.isNaN(ts) && now - ts < windowDuration)
      .forEach((ts) => activeRequests.push({ ts, modelKey: key }));
  });

  activeRequests.sort((a, b) => a.ts - b.ts);

  return {
    group,
    windowType,
    windowDuration,
    activeRequests,
    windowEnd:
      activeRequests.length > 0 ? getWindowEnd(activeRequests[0].ts, windowType) : null,
  };
}
