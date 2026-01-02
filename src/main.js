import { PLAN_CONFIGS, STYLE } from "./config.js";
import { onDataChanged } from "./events.js";
import { exportUsageData, importUsageData } from "./features/importExport.js";
import { usageData } from "./state.js";
import { Storage, refreshUsageData, updateUsageData } from "./storage.js";
import { injectStyles } from "./styles.js";
import { installFetchInterceptor } from "./tracking/fetchInterceptor.js";
import { createModelRouting } from "./tracking/modelRouting.js";
import { installTextScrambler } from "./textScrambler.js";
import { createMonitorUI, setupKeyboardShortcuts, updateUI } from "./ui/monitor.js";
import { showToast } from "./ui/toast.js";
import { applyPlanConfig, cleanupExpiredRequests } from "./usage.js";

export function main() {
  installTextScrambler();
  injectStyles();
  refreshUsageData();

  const modelRouting = createModelRouting();
  installFetchInterceptor(modelRouting);

  onDataChanged(() => {
    if (usageData?.silentMode) return;
    updateUI();
  });

  let _pendingInitTimerId = null;
  function scheduleInitialize(delay = 300) {
    if (_pendingInitTimerId) return;
    _pendingInitTimerId = setTimeout(() => {
      _pendingInitTimerId = null;
      initialize();
    }, delay);
  }

  function initialize() {
    if (!document?.body) {
      setTimeout(initialize, 300);
      return;
    }

    refreshUsageData();

    const currentPlan = usageData.planType || "team";
    const planConfig = PLAN_CONFIGS[currentPlan];
    if (planConfig) {
      const firstModelKey = Object.keys(planConfig.models)[0];
      const firstModelCfg = planConfig.models[firstModelKey];
      const shouldReapply =
        !usageData.models[firstModelKey] ||
        usageData.models[firstModelKey].quota !== firstModelCfg.quota;

      if (shouldReapply) {
        applyPlanConfig(currentPlan);
      } else {
        let addedModels = 0;
        updateUsageData((data) => {
          Object.entries(planConfig.models).forEach(([modelKey, cfg]) => {
            if (data.models[modelKey]) return;
            data.models[modelKey] = {
              requests: [],
              quota: cfg.quota,
              windowType: cfg.windowType,
            };
            if (cfg.sharedGroup) delete data.models[modelKey].quota;
            if (cfg.sharedGroup) delete data.models[modelKey].windowType;
            if (cfg.sharedGroup) data.models[modelKey].sharedGroup = cfg.sharedGroup;
            addedModels++;
          });
        });
        if (addedModels > 0) {
          console.log(`[monitor] Added ${addedModels} missing models for ${planConfig.name} plan during init`);
        }
      }
    }

    cleanupExpiredRequests();

    if (usageData.silentMode) {
      const existingMonitor = document.getElementById("chatUsageMonitor");
      if (existingMonitor) existingMonitor.remove();
      return;
    }

    createMonitorUI();
    setupKeyboardShortcuts();
  }

  GM_registerMenuCommand("重置监视器位置", () => {
    Storage.update((data) => {
      data.position = { x: null, y: null };
      data.minimized = false;
    });

    const existingMonitor = document.getElementById("chatUsageMonitor");
    if (existingMonitor) existingMonitor.remove();

    scheduleInitialize(100);

    setTimeout(() => {
      const monitor = document.getElementById("chatUsageMonitor");
      if (monitor) {
        monitor.style.setProperty("left", STYLE.spacing.lg, "important");
        monitor.style.setProperty("bottom", "100px", "important");
        monitor.style.setProperty("right", "auto", "important");
        monitor.style.setProperty("top", "auto", "important");
        showToast("监视器已重置并重新加载", "success");
      } else {
        alert("监视器重置完成。如果没有看到监视器，请刷新页面。");
      }
    }, 500);
  });

  GM_registerMenuCommand("导出用量统计数据", exportUsageData);
  GM_registerMenuCommand("导入用量统计数据", importUsageData);

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", () => scheduleInitialize(0));
  } else {
    scheduleInitialize(0);
  }

  const observer = new MutationObserver(() => {
    if (usageData?.silentMode) return;
    if (!document.getElementById("chatUsageMonitor")) scheduleInitialize(300);
  });

  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });

  window.addEventListener("popstate", () => scheduleInitialize(300));
  scheduleInitialize(300);

  console.log("🚀 ChatGPT Usage Monitor loaded");
}
