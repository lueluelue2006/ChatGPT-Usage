import { DEFAULT_UNKNOWN_MODEL_CONFIG, PLAN_CONFIGS, TIME_WINDOWS, defaultUsageData } from "./config.js";
import { usageData, setUsageData } from "./state.js";
import { SILENT_MODE } from "./userConfig.js";
import { tsOf } from "./utils.js";

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultModelConfig(modelId) {
  const config = defaultUsageData?.models?.[modelId];
  if (config && typeof config === "object") return deepClone(config);
  return { requests: [], ...DEFAULT_UNKNOWN_MODEL_CONFIG };
}

export const Storage = {
  key: "usageData",

  get() {
    let data = GM_getValue(this.key);
    if (!data || typeof data !== "object") {
      data = deepClone(defaultUsageData);
    }

    if (!data.models || typeof data.models !== "object") {
      data.models = {};
    }

    if (!data.position) {
      data.position = { x: null, y: null };
    }

    if (!data.size) {
      data.size = { width: 400, height: 500 };
    }

    if (data.minimized === undefined) {
      data.minimized = false;
    }

    if (data.silentMode === undefined) {
      data.silentMode = false;
    }

    // 顶部用户配置优先级最高
    if (typeof SILENT_MODE === "boolean") {
      data.silentMode = SILENT_MODE;
    }

    if (!data.progressType) {
      data.progressType = "bar";
    }

    if (!data.planType) {
      data.planType = "team";
    }
    if (!PLAN_CONFIGS[data.planType]) {
      data.planType = "team";
    }

    if (!data.sharedQuotaGroups) {
      data.sharedQuotaGroups = {};
    }

    if (data.showWindowResetTime === undefined) {
      data.showWindowResetTime = false;
    }

    // 清理已下线模型的历史残留
    if (data.models["gpt-4-1-mini"]) delete data.models["gpt-4-1-mini"];
    if (data.models["o4-mini-high"]) delete data.models["o4-mini-high"];

    const gpt5ProAllowedPlans = ["team", "edu", "enterprise", "pro"];
    const isGpt5ProAllowed = gpt5ProAllowedPlans.includes(data.planType);
    if (!isGpt5ProAllowed) {
      ["gpt-5-2-pro", "gpt-5-1-pro"].forEach((key) => {
        if (data.models[key]) delete data.models[key];
      });
    }
    if (data.deepResearch) delete data.deepResearch;

    // 迁移：确保新模型出现在旧存储中
    const newModels = [
      "gpt-5",
      "gpt-5-thinking",
      "gpt-5-2-instant",
      "gpt-5-2-thinking",
      "gpt-5-2-pro",
      "gpt-5-1",
      "gpt-5-1-thinking",
      "gpt-5-pro",
      "gpt-5-1-pro",
      "o3",
      "o3-pro",
      "gpt-4-5",
      "o4-mini",
      "gpt-4o",
      "gpt-4-1",
      "gpt-5-t-mini",
      "gpt-5-mini",
    ];
    if (!isGpt5ProAllowed) {
      ["gpt-5-2-pro", "gpt-5-1-pro"].forEach((m) => {
        const idx = newModels.indexOf(m);
        if (idx !== -1) newModels.splice(idx, 1);
      });
    }
    newModels.forEach((modelId) => {
      if (data.models[modelId]) return;
      if (modelId === "gpt-5") {
        data.models[modelId] = { requests: [], quota: 10000, windowType: "hour3" };
      } else if (modelId === "gpt-5-thinking") {
        data.models[modelId] = { requests: [], quota: 3000, windowType: "weekly" };
      } else if (modelId === "gpt-5-2-instant") {
        data.models[modelId] = { requests: [], quota: 10000, windowType: "hour3" };
      } else if (modelId === "gpt-5-2-thinking") {
        data.models[modelId] = { requests: [], quota: 3000, windowType: "weekly" };
      } else if (modelId === "gpt-5-1") {
        data.models[modelId] = { requests: [], quota: 10000, windowType: "hour3" };
      } else if (modelId === "gpt-5-1-thinking") {
        data.models[modelId] = { requests: [], quota: 3000, windowType: "weekly" };
      } else if (modelId === "gpt-5-pro") {
        data.models[modelId] = { requests: [], quota: 15, windowType: "monthly" };
      } else if (modelId === "gpt-5-2-pro") {
        data.models[modelId] = { requests: [], quota: 15, windowType: "monthly" };
      } else if (modelId === "gpt-5-1-pro") {
        data.models[modelId] = { requests: [], quota: 15, windowType: "monthly" };
      } else if (modelId === "o3") {
        data.models[modelId] = { requests: [], quota: 100, windowType: "weekly" };
      } else if (modelId === "o3-pro") {
        data.models[modelId] = { requests: [], quota: 0, windowType: "monthly" };
      } else if (modelId === "gpt-4-5") {
        data.models[modelId] = { requests: [], quota: 0, windowType: "daily" };
      } else if (modelId === "o4-mini") {
        data.models[modelId] = { requests: [], quota: 300, windowType: "daily" };
      } else if (modelId === "gpt-4o") {
        data.models[modelId] = { requests: [], quota: 80, windowType: "hour3" };
      } else if (modelId === "gpt-4-1") {
        data.models[modelId] = { requests: [], quota: 500, windowType: "hour3" };
      } else if (modelId === "gpt-5-t-mini") {
        data.models[modelId] = { requests: [], quota: 10000, windowType: "hour3" };
      } else if (modelId === "gpt-5-mini") {
        data.models[modelId] = { requests: [], quota: 10000, windowType: "hour3" };
      }
    });

    // 删除旧 gpt-4 模型
    if (data.models["gpt-4"]) delete data.models["gpt-4"];

    // Migrate from count-based to time-based models
    Object.entries(data.models).forEach(([key, model]) => {
      if (!model || typeof model !== "object") {
        data.models[key] = defaultModelConfig(key);
        return;
      }
      if (!Array.isArray(model.requests)) {
        model.requests = [];
        if (typeof model.count === "number" && model.count > 0) {
          const now = Date.now();
          for (let i = 0; i < model.count; i++) {
            model.requests.push(now - i * 60000);
          }
        }
        delete model.count;
        delete model.lastUpdate;
      }

      if (model.dailyLimit !== undefined && model.quota === undefined) {
        model.quota = model.dailyLimit;
        delete model.dailyLimit;
      }

      if (model.resetFrequency !== undefined && model.windowType === undefined) {
        model.windowType = model.resetFrequency;
        delete model.resetFrequency;
      }

      if (
        !model.sharedGroup &&
        !["hour3", "hour5", "daily", "weekly", "monthly"].includes(model.windowType)
      ) {
        model.windowType = defaultModelConfig(key).windowType || "hour3";
      }

      if (!model.sharedGroup && typeof model.quota !== "number") {
        model.quota = defaultModelConfig(key).quota;
      }

      if (Array.isArray(model.requests)) {
        model.requests = model.requests
          .map((r) => tsOf(r))
          .filter((ts) => typeof ts === "number" && !Number.isNaN(ts));
      }
    });

    // Optional: compact shared quota group entries' timestamp field to 't'
    if (data.sharedQuotaGroups && typeof data.sharedQuotaGroups === "object") {
      Object.values(data.sharedQuotaGroups).forEach((group) => {
        if (group && Array.isArray(group.requests)) {
          group.requests = group.requests.map((r) => {
            if (typeof r === "number") return { t: r };
            if (r && typeof r === "object") {
              const t = tsOf(r);
              if (typeof r.modelId === "string") return { t, modelId: r.modelId };
              const copy = { ...r };
              if (t && typeof copy.t !== "number") copy.t = t;
              return copy;
            }
            return r;
          });
          // 共享请求不再持久化，转为显示时临时汇总
          group.requests = [];
        }
      });
    }

    delete data.lastDailyReset;
    delete data.lastWeeklyReset;
    delete data.lastReset;

    this.set(data);
    return data;
  },

  set(newData) {
    GM_setValue(this.key, newData);
  },

  update(callback) {
    const data = this.get();
    callback(data);
    this.set(data);
  },
};

export function refreshUsageData() {
  const data = Storage.get();
  setUsageData(data);
  return usageData;
}

export function updateUsageData(mutator) {
  Storage.update((data) => {
    mutator(data);
  });
  return refreshUsageData();
}
