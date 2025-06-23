// ==UserScript==
// @name         ChatGPT用量统计
// @namespace    https://github.com/tizee/tampermonkey-chatgpt-model-usage-monitor
// @version      2.7.0
// @description  优雅的 ChatGPT 模型调用量实时统计，界面简洁清爽（中文版），支持导入导出、一周分析报告、快捷键切换最小化（Ctrl/Cmd+I）、DeepResearch监控！
// @author       tizee (original), schweigen (modified)
// @match        https://chatgpt.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chatgpt.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @license      MIT
// @run-at       document-start
// @downloadURL https://update.greasyfork.org/scripts/533399/ChatGPT%E7%94%A8%E9%87%8F%E7%BB%9F%E8%AE%A1.user.js
// @updateURL https://update.greasyfork.org/scripts/533399/ChatGPT%E7%94%A8%E9%87%8F%E7%BB%9F%E8%AE%A1.meta.js
// ==/UserScript==

(function () {
    "use strict";

    // Register menu commands
    GM_registerMenuCommand("重置监视器位置", function() {
        // 只重置位置，但保留其他数据
        Storage.update(data => {
            data.position = { x: null, y: null };
            data.minimized = false; // 确保不是最小化状态
        });

        // 移除现有的UI元素
        const existingMonitor = document.getElementById("chatUsageMonitor");
        if (existingMonitor) {
            existingMonitor.remove();
        }

        // 重新初始化脚本
        console.log("[monitor] Reinitializing script...");
        setTimeout(initialize, 100);

        // 显示消息
        setTimeout(() => {
            const monitor = document.getElementById("chatUsageMonitor");
            if (monitor) {
                // 重置为新的默认位置（左下角）
                monitor.style.setProperty('left', STYLE.spacing.lg, 'important');
                monitor.style.setProperty('bottom', '100px', 'important');
                monitor.style.setProperty('right', 'auto', 'important');
                monitor.style.setProperty('top', 'auto', 'important');

                showToast("监视器已重置并重新加载", "success");
            } else {
                alert("监视器重置完成。如果没有看到监视器，请刷新页面。");
            }
        }, 500);
    });

    // 注册导出和导入功能的菜单命令
    GM_registerMenuCommand("导出用量统计数据", exportUsageData);
    GM_registerMenuCommand("导入用量统计数据", importUsageData);

    // text-scramble animation
    (()=>{var TextScrambler=(()=>{var l=Object.defineProperty;var c=Object.getOwnPropertyDescriptor;var u=Object.getOwnPropertyNames;var m=Object.prototype.hasOwnProperty;var d=(n,t)=>{for(var e in t)l(n,e,{get:t[e],enumerable:!0})},f=(n,t,e,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let i of u(t))!m.call(n,i)&&i!==e&&l(n,i,{get:()=>t[i],enumerable:!(s=c(t,i))||s.enumerable});return n};var g=n=>f(l({},"__esModule",{value:!0}),n);var T={};d(T,{default:()=>r});function _(n){let t=document.createTreeWalker(n,NodeFilter.SHOW_TEXT,{acceptNode:s=>s.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}),e=[];for(;t.nextNode();)t.currentNode.nodeValue=t.currentNode.nodeValue.replace(/(\n|\r|\t)/gm,""),e.push(t.currentNode);return e}function p(n,t,e){return t<0||t>=n.length?n:n.substring(0,t)+e+n.substring(t+1)}function M(n,t){return n?"x":t[Math.floor(Math.random()*t.length)]}var r=class{constructor(t,e={}){this.el=t;let s={duration:1e3,delay:0,reverse:!1,absolute:!1,pointerEvents:!0,scrambleSymbols:"\u2014~\xB1\xA7|[].+$^@*()\u2022x%!?#",randomThreshold:null};this.config=Object.assign({},s,e),this.config.randomThreshold===null&&(this.config.randomThreshold=this.config.reverse?.1:.8),this.textNodes=_(this.el),this.nodeLengths=this.textNodes.map(i=>i.nodeValue.length),this.originalText=this.textNodes.map(i=>i.nodeValue).join(""),this.mask=this.originalText.split(" ").map(i=>"\xA0".repeat(i.length)).join(" "),this.currentMask=this.mask,this.totalChars=this.originalText.length,this.scrambleRange=Math.floor(this.totalChars*(this.config.reverse?.25:1.5)),this.direction=this.config.reverse?-1:1,this.config.absolute&&(this.el.style.position="absolute",this.el.style.top="0"),this.config.pointerEvents||(this.el.style.pointerEvents="none"),this._animationFrame=null,this._startTime=null,this._running=!1}initialize(){return this.currentMask=this.mask,this}_getEased(t){let e=-(Math.cos(Math.PI*t)-1)/2;return e=Math.pow(e,2),this.config.reverse?1-e:e}_updateScramble(t,e,s){if(Math.random()<.5&&t>0&&t<1)for(let i=0;i<20;i++){let o=i/20,a;if(this.config.reverse?a=e-Math.floor((1-Math.random())*this.scrambleRange*o):a=e+Math.floor((1-Math.random())*this.scrambleRange*o),!(a<0||a>=this.totalChars)&&this.currentMask[a]!==" "){let h=Math.random()>this.config.randomThreshold?this.originalText[a]:M(this.config.reverse,this.config.scrambleSymbols);this.currentMask=p(this.currentMask,a,h)}}}_composeOutput(t,e,s){let i="";if(this.config.reverse){let o=Math.max(e-s,0);i=this.mask.slice(0,o)+this.currentMask.slice(o,e)+this.originalText.slice(e)}else i=this.originalText.slice(0,e)+this.currentMask.slice(e,e+s)+this.mask.slice(e+s);return i}_updateTextNodes(t){let e=0;for(let s=0;s<this.textNodes.length;s++){let i=this.nodeLengths[s];this.textNodes[s].nodeValue=t.slice(e,e+i),e+=i}}_tick=t=>{this._startTime||(this._startTime=t);let e=t-this._startTime,s=Math.min(e/this.config.duration,1),i=this._getEased(s),o=Math.floor(this.totalChars*s),a=Math.floor(2*(.5-Math.abs(s-.5))*this.scrambleRange);this._updateScramble(s,o,a);let h=this._composeOutput(s,o,a);this._updateTextNodes(h),s<1?this._animationFrame=requestAnimationFrame(this._tick):this._running=!1};start(){this._running=!0,this._startTime=null,this.config.delay?setTimeout(()=>{this._animationFrame=requestAnimationFrame(this._tick)},this.config.delay):this._animationFrame=requestAnimationFrame(this._tick)}stop(){this._animationFrame&&(cancelAnimationFrame(this._animationFrame),this._animationFrame=null),this._running=!1}};return g(T);})();
          window.TextScrambler = TextScrambler.default || TextScrambler;
         })();


    // Constants and Configuration
    const COLORS = {
        primary: "#5E9EFF",
        background: "#1A1B1E",
        surface: "#2A2B2E",
        border: "#363636",
        text: "#E5E7EB",
        secondaryText: "#9CA3AF",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        disabled: "#4B5563",
        white: "oklch(.928 .006 264.531)",
        gray: "oklch(.92 .004 286.32)",
        yellow: "oklch(.905 .182 98.111)",
        green: "oklch(.845 .143 164.978)",
        // Red for low usage
        progressLow: "#EF4444",
        // Orange for medium usage
        progressMed: "#F59E0B",
        // Green for high usage
        progressHigh: "#10B981",
        // Gray for exceeded
        progressExceed: "#4B5563",
        // Blue for 3 hour window
        hourModel: "#61DAFB",
        // Purple for daily models (24h)
        dailyModel: "#9F7AEA",
        // Green for weekly models (7d)
        weeklyModel: "#10B981",
        // Pink for monthly models (30d)
        monthlyModel: "#F472B6",
    };

    const STYLE = {
        borderRadius: "12px",
        boxShadow:
        "0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)",
        spacing: {
            xs: "4px",
            sm: "8px",
            md: "16px",
            lg: "24px",
        },
        textSize: {
            xs: "0.75rem",
            sm: "0.875rem",
            md: "1rem",
        },
        lineHeight: {
            xs: "calc(1/.75)",
            sm: "calc(1.25/.875)",
            md: "1.5",
        },
    };

    // Time window constants in milliseconds
    const TIME_WINDOWS = {
        hour3: 3 * 60 * 60 * 1000,      // 3 hours in ms
        daily: 24 * 60 * 60 * 1000,     // 24 hours (1 day) in ms
        weekly: 7 * 24 * 60 * 60 * 1000, // 7 days (1 week) in ms
        monthly: 30 * 24 * 60 * 60 * 1000 // 30 days (1 month) in ms
    };

    // 特殊模型标识 - 从gpt-4o-mini修改为gpt-4-1-mini
    const SPECIAL_MODEL = "gpt-4-1-mini";

    // DeepResearch特殊模型
    const DEEPRESEARCH_MODEL = "DeepResearch";

    // Helper Functions
    const formatTimeAgo = (timestamp) => {
        const now = Date.now();
        const seconds = Math.floor((now - timestamp) / 1000);

        if (seconds < 60) return `${seconds}s ago`;

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;

        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const formatTimeLeft = (windowEnd) => {
        const now = Date.now();
        const timeLeft = windowEnd - now;

        if (timeLeft <= 0) return "0h 0m";

        const hours = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

        return `${hours}h ${minutes}m`;
    };

    // Calculate window end time for oldest request
    const getWindowEnd = (timestamp, windowType) => {
        return timestamp + TIME_WINDOWS[windowType];
    };

    // Default Configuration with updated model list
    const defaultUsageData = {
        position: { x: null, y: null },
        size: { width: 400, height: 500 },
        minimized: false,
        progressType: "bar", // bar or dots (default to bar)
        planType: "team", // 默认套餐：team, plus, free, pro
        // 为gpt-4-1-mini添加特殊计数器
        miniCount: 0,
        // DeepResearch数据
        deepResearch: {
            remaining: null,
            resetAfter: null,
            lastUpdate: null
        },
        // 新增：是否显示窗口刷新时间，默认关闭以保持界面简洁
        showWindowResetTime: false,
        models: {
            "gpt-4o": {
                requests: [],
                quota: 100, // 实测修正：从80改为100
                windowType: "hour3" // 3-hour window
            },
            // 新增正常模型，与gpt-4o有相同配额
            "gpt-4-1": {
                requests: [],
                quota: 100, // 实测修正：从80改为100，3小时100次
                windowType: "hour3" // 3-hour window
            },
            "o4-mini": {
                requests: [],
                quota: 300, // 翻倍 (原来150)
                windowType: "daily" // 24-hour window
            },
            "o4-mini-high": {
                requests: [],
                quota: 100, // 翻倍 (原来50)
                windowType: "daily" // 24-hour window
            },
            "o3": {
                requests: [],
                quota: 200, // 修改为200次每周 (原来100)
                windowType: "weekly" // 7-day window
            },
            "o3-pro": {
                requests: [],
                quota: 20, // 新增o3-pro模型，20次每月
                windowType: "monthly" // 30-day window
            },
            "gpt-4-5": {
                requests: [],
                quota: 25, // 修改为25次
                windowType: "weekly" // 7-day window
            },
            // 从models对象中移除gpt-4o-mini，我们将单独处理它
        },
    };

    // 套餐配置
    const PLAN_CONFIGS = {
        team: {
            name: "Team",
            models: {
                "gpt-4o": { quota: 100, windowType: "hour3" },
                "gpt-4-1": { quota: 100, windowType: "hour3" },
                "o4-mini": { quota: 300, windowType: "daily" },
                "o4-mini-high": { quota: 100, windowType: "daily" },
                "o3": { quota: 200, windowType: "weekly" },
                "o3-pro": { quota: 20, windowType: "monthly" },
                "gpt-4-5": { quota: 25, windowType: "weekly" }
            }
        },
        plus: {
            name: "Plus",
            models: {
                "gpt-4o": { quota: 80, windowType: "hour3" },
                "gpt-4-1": { quota: 80, windowType: "hour3" },
                "o4-mini": { quota: 300, windowType: "daily" },
                "o4-mini-high": { quota: 100, windowType: "daily" },
                "o3": { quota: 200, windowType: "weekly" },
                "o3-pro": { quota: 20, windowType: "monthly" },
                "gpt-4-5": { quota: 20, windowType: "weekly" }
            }
        },
        free: {
            name: "Free",
            models: {
                "gpt-4o": { quota: 10, windowType: "hour3" },
                "gpt-4-1": { quota: 0, windowType: "hour3" }, // Free套餐不可用
                "o4-mini": { quota: 10, windowType: "daily" },
                "o4-mini-high": { quota: 0, windowType: "daily" }, // Free套餐不可用
                "o3": { quota: 0, windowType: "weekly" },
                "o3-pro": { quota: 0, windowType: "monthly" },
                "gpt-4-5": { quota: 0, windowType: "weekly" }
            }
        },
        pro: {
            name: "Pro",
            models: {
                "gpt-4o": { quota: 0, windowType: "hour3" }, // Pro无限制
                "gpt-4-1": { quota: 0, windowType: "hour3" }, // Pro无限制
                "o4-mini": { quota: 0, windowType: "daily" }, // Pro无限制
                "o4-mini-high": { quota: 0, windowType: "daily" }, // Pro无限制
                "o3": { quota: 0, windowType: "weekly" }, // Pro无限制
                "o3-pro": { quota: 0, windowType: "monthly" }, // Pro无限制
                "gpt-4-5": { quota: 0, windowType: "weekly" } // Pro无限制
            }
        }
    };

    // Updated Styles
    GM_addStyle(`
  #chatUsageMonitor {
    position: fixed;
    bottom: 100px;  /* 往下移动一点点 */
    left: ${STYLE.spacing.lg};  /* 改为左侧 */
    width: 400px;
    height: 500px;
    max-height: 80vh;
    overflow: auto;
    background: ${COLORS.background};
    color: ${COLORS.text};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    border-radius: ${STYLE.borderRadius};
    box-shadow: ${STYLE.boxShadow};
    z-index: 9999;
    border: 1px solid ${COLORS.border};
    user-select: none;
    resize: both;
    transition: all 0.3s ease;
    transform-origin: top left;  /* 改为左侧 */
  }

  #chatUsageMonitor.hidden {
    display: none !important;
  }

  #chatUsageMonitor::after {
    content: "";
    position: absolute;
    bottom: 0;
    right: 0;
    width: 15px;
    height: 15px;
    background: transparent;
    border-bottom: 2px solid ${COLORS.yellow};
    border-right: 2px solid ${COLORS.yellow};
    opacity: 0.5;
    pointer-events: none;
  }

  #chatUsageMonitor:hover::after {
    opacity: 1;
  }

  #chatUsageMonitor.minimized {
    width: 30px !important;
    height: 30px !important;
    border-radius: 50%;
    overflow: hidden;
    resize: none;
    opacity: 0.8;
    cursor: pointer;
    background-color: ${COLORS.primary};
    bottom: auto;
    top: 100px;  /* 往下移动一点点 */
    left: ${STYLE.spacing.lg};  /* 改为左侧 */
    z-index: 9999;
  }

  #chatUsageMonitor.minimized:hover {
    opacity: 1;
  }

  #chatUsageMonitor.minimized > * {
    display: none !important;
  }

  #chatUsageMonitor.minimized::before {
    content: "次";
    color: white;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: bold;
  }

  #chatUsageMonitor header {
    padding: 0 ${STYLE.spacing.md};
    display: flex;
    border-radius: ${STYLE.borderRadius} ${STYLE.borderRadius} 0 0;
    background: ${COLORS.background};
    flex-direction: row;
    position: relative;
    align-items: center;
    height: 36px;
    cursor: move; /* 指示整个头部可拖动 */
  }

  #chatUsageMonitor .minimize-btn {
    position: absolute;
    left: 8px;
    top: 0;
    height: 36px;
    width: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${COLORS.secondaryText};
    cursor: pointer;
    font-size: 18px;
    transition: color 0.2s ease;
    z-index: 10;
  }

  #chatUsageMonitor .minimize-btn:hover {
    color: ${COLORS.yellow};
  }

  #chatUsageMonitor header button {
    border: none;
    background: none;
    color: ${COLORS.secondaryText};
    cursor: pointer;
    font-weight: 500;
    transition: color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 30px; /* Move buttons to the right to avoid overlap with minimize button */
    padding-top: ${STYLE.spacing.sm};
  }

  #chatUsageMonitor header button.active {
    color: ${COLORS.yellow};
  }

  #chatUsageMonitor .content {
    padding: ${STYLE.spacing.xs} ${STYLE.spacing.md};
    overflow-y: auto;
  }

  #chatUsageMonitor .reset-info {
    font-size: ${STYLE.textSize.xs};
    color: ${COLORS.secondaryText};
    margin: ${STYLE.spacing.xs} 0;
  }

  #chatUsageMonitor input {
    width: 80px;
    padding: ${STYLE.spacing.xs} ${STYLE.spacing.sm};
    margin: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    color: ${COLORS.secondaryText};
    font-family: monospace;
    font-size: ${STYLE.textSize.xs};
    line-height: ${STYLE.lineHeight.xs};
    transition: color 0.2s ease;
  }

  #chatUsageMonitor input:focus {
    outline: none;
    color: ${COLORS.yellow};
    background: transparent;
  }

  #chatUsageMonitor input:hover {
    color: ${COLORS.yellow};
  }

  #chatUsageMonitor .btn {
    padding: ${STYLE.spacing.sm} ${STYLE.spacing.md};
    border: none;
    cursor: pointer;
    color: ${COLORS.white};
    font-weight: 500;
    font-size: ${STYLE.textSize.sm};
    transition: all 0.2s ease;
    text-decoration: underline;
  }

  #chatUsageMonitor .btn:hover {
    color: ${COLORS.yellow};
  }

  #chatUsageMonitor .delete-btn {
    padding: ${STYLE.spacing.xs} ${STYLE.spacing.sm};
    margin-left: ${STYLE.spacing.sm};
  }

  #chatUsageMonitor .delete-btn.btn:hover {
     color: ${COLORS.danger};
  }

  #chatUsageMonitor::-webkit-scrollbar {
    width: 8px;
  }

  #chatUsageMonitor::-webkit-scrollbar-track {
    background: ${COLORS.surface};
    border-radius: 4px;
  }

  #chatUsageMonitor::-webkit-scrollbar-thumb {
    background: ${COLORS.border};
    border-radius: 4px;
  }

  #chatUsageMonitor::-webkit-scrollbar-thumb:hover {
    background: ${COLORS.secondaryText};
  }

  #chatUsageMonitor .progress-container {
      width: 100%;
      background: ${COLORS.surface};
      margin-top: ${STYLE.spacing.xs};
      border-radius: 6px;
      overflow: hidden;
      height: 8px;
      position: relative;
  }

  #chatUsageMonitor .progress-bar {
      height: 100%;
      transition: width 0.3s ease;
      border-radius: 6px;
      background: linear-gradient(
          90deg,
          ${COLORS.progressLow} 0%,
          ${COLORS.progressMed} 50%,
          ${COLORS.progressHigh} 100%
      );
      background-size: 200% 100%;
      animation: gradientShift 2s linear infinite;
  }

  #chatUsageMonitor .progress-bar.low-usage {
      animation: pulse 1.5s ease-in-out infinite;
  }

  #chatUsageMonitor .progress-bar.exceeded {
      background: ${COLORS.progressExceed};
      animation: none;
  }

  #chatUsageMonitor .window-badge {
      display: inline-block;
      font-size: 10px;
      padding: 2px 4px;
      border-radius: 4px;
      margin-left: 4px;
      color: ${COLORS.background};
      font-weight: bold;
  }

  #chatUsageMonitor .window-badge.hour3 {
      background-color: ${COLORS.hourModel};
  }

  #chatUsageMonitor .window-badge.daily {
      background-color: ${COLORS.dailyModel};
  }

  #chatUsageMonitor .window-badge.weekly {
      background-color: ${COLORS.weeklyModel};
  }

  #chatUsageMonitor .window-badge.monthly {
      background-color: ${COLORS.monthlyModel};
  }

  #chatUsageMonitor .request-time {
      color: ${COLORS.secondaryText};
      font-size: ${STYLE.textSize.xs};
  }

  #chatUsageMonitor .window-info {
      color: ${COLORS.secondaryText};
      font-size: ${STYLE.textSize.xs};
      margin-top: 2px;
  }

  #chatUsageMonitor .active-window {
      font-weight: bold;
  }

  #chatUsageMonitor .unknown-quota {
      color: ${COLORS.warning};
      font-style: italic;
  }

  /* 为特殊模型添加样式 */
  #chatUsageMonitor .special-model-row {
      border-top: 1px dashed ${COLORS.border};
      margin-top: 8px;
      padding-top: 8px;
      opacity: 0.8;
  }

  #chatUsageMonitor .special-model-name {
      color: ${COLORS.disabled};
      font-style: italic;
  }

  /* 周分析报告样式 */
  #chatUsageMonitor .weekly-report {
      background: ${COLORS.surface};
      border-radius: 8px;
      padding: ${STYLE.spacing.md};
      margin-top: ${STYLE.spacing.md};
  }

  #chatUsageMonitor .weekly-report h3 {
      color: ${COLORS.yellow};
      margin-bottom: ${STYLE.spacing.sm};
      font-size: ${STYLE.textSize.md};
  }

  #chatUsageMonitor .weekly-report .stat-row {
      display: flex;
      justify-content: space-between;
      padding: ${STYLE.spacing.xs} 0;
      font-size: ${STYLE.textSize.sm};
      border-bottom: 1px solid ${COLORS.border};
  }

  #chatUsageMonitor .weekly-report .stat-row:last-child {
      border-bottom: none;
  }

  #chatUsageMonitor .weekly-report .stat-label {
      color: ${COLORS.secondaryText};
  }

  #chatUsageMonitor .weekly-report .stat-value {
      color: ${COLORS.text};
      font-weight: 500;
  }

  #chatUsageMonitor .weekly-report .model-breakdown {
      margin-top: ${STYLE.spacing.sm};
  }

  #chatUsageMonitor .weekly-report .model-item {
      display: flex;
      justify-content: space-between;
      padding: ${STYLE.spacing.xs} ${STYLE.spacing.sm};
      font-size: ${STYLE.textSize.xs};
      background: ${COLORS.background};
      border-radius: 4px;
      margin: 2px 0;
  }

  @keyframes gradientShift {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
  }

  @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  }

  /* Dot-based progression system */
  #chatUsageMonitor .dot-progress {
      display: flex;
      gap: 4px;
      align-items: center;
      height: 8px;
  }

  #chatUsageMonitor .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      transition: all 0.3s ease;
  }

  #chatUsageMonitor .dot-empty {
      background: rgba(239, 68, 68, 0.3);
      border: 1px solid ${COLORS.progressLow};
  }

  #chatUsageMonitor .dot-partial {
      background: ${COLORS.progressMed};
  }

  #chatUsageMonitor .dot-full {
      background: ${COLORS.progressHigh};
  }

  #chatUsageMonitor .dot-exceeded {
      background: ${COLORS.progressExceed};
      position: relative;
  }

  #chatUsageMonitor .dot-exceeded::before {
      content: '';
      position: absolute;
      top: 50%;
      left: -2px;
      right: -2px;
      height: 2px;
      background: ${COLORS.surface};
      transform: rotate(45deg);
  }

  #chatUsageMonitor .table-header {
    font-family: monospace;
    color: ${COLORS.white};
    font-size:  ${STYLE.textSize.xs};
    line-height: ${STYLE.lineHeight.xs};
    display : grid;
    align-items: center;
    grid-template-columns: 2fr 1.5fr 1.5fr 2fr;
  }

  #chatUsageMonitor .model-row {
    font-family: monospace;
    color: ${COLORS.secondaryText};
    transition: color 0.2s ease;
    font-size:  ${STYLE.textSize.xs};
    line-height: ${STYLE.lineHeight.xs};
    display : grid;
    grid-template-columns: 2fr 1.5fr 1.5fr 2fr;
    align-items: center;
  }

  #chatUsageMonitor .model-row:hover {
    color: ${COLORS.yellow};
    text-decoration-line: underline;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  /* Container to help position the arrow (pseudo-element) */
  #chatUsageMonitor .custom-select {
    position: relative;
    display: inline-block;
    margin-right: 8px;
  }

  /* Hide the native select arrow and style the dropdown */
  #chatUsageMonitor .custom-select select {
    -webkit-appearance: none; /* Safari and Chrome */
    -moz-appearance: none;    /* Firefox */
    appearance: none;         /* Standard modern browsers */
    background-color: transparent;
    color: #ffffff;
    border: none;
    cursor: pointer;
    color: ${COLORS.white};
    font-size: ${STYLE.textSize.sm};
    line-height:  ${STYLE.lineHeight.sm};
    padding: 2px 5px;
  }

  /* Style the list of options (when the dropdown is open) */
  .custom-select select option {
    background: ${COLORS.background};
    color: ${COLORS.white};
  }

  /* Optional: highlight the hovered option in some browsers */
  .custom-select select option:hover {
    background: ${COLORS.background};
    color: ${COLORS.yellow};
    text-decoration-line: underline;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  #chatUsageMonitor input {
    width: 90%;
    padding: ${STYLE.spacing.xs} ${STYLE.spacing.sm};
    margin: 0;
    border: 1px solid ${COLORS.border};
    border-radius: 4px;
    background: ${COLORS.surface};
    color: ${COLORS.secondaryText};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: ${STYLE.textSize.xs};
    line-height: ${STYLE.lineHeight.xs};
    transition: all 0.2s ease;
  }

  #chatUsageMonitor input:focus {
    outline: none;
    border-color: ${COLORS.yellow};
    color: ${COLORS.yellow};
    background: rgba(245, 158, 11, 0.1);
  }

  #chatUsageMonitor input:hover {
    border-color: ${COLORS.yellow};
    color: ${COLORS.yellow};
  }

  /* Toast notification for feedback */
  #chatUsageMonitor .toast {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${COLORS.background};
    color: ${COLORS.success};
    padding: ${STYLE.spacing.sm} ${STYLE.spacing.md};
    border-radius: ${STYLE.borderRadius};
    border: 1px solid ${COLORS.success};
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: 10000;
  }

  #chatUsageMonitor .toast.show {
    opacity: 1;
  }
`);

    // State Management
    const Storage = {
        key: "usageData",

        get() {
            let usageData = GM_getValue(this.key, defaultUsageData);

            // Handle migration from older versions
            if (!usageData) {
                usageData = defaultUsageData;
            }

            // Add position if missing
            if (!usageData.position) {
                usageData.position = { x: null, y: null };
            }

            // Add size if missing
            if (!usageData.size) {
                usageData.size = { width: 400, height: 500 };
            }

            // Add minimized state if missing
            if (usageData.minimized === undefined) {
                usageData.minimized = false;
            }

            // Add progressType if missing
            if (!usageData.progressType) {
                usageData.progressType = "bar";
            }

            // 添加planType如果不存在
            if (!usageData.planType) {
                usageData.planType = "team";
            }

            // 添加miniCount如果不存在
            if (usageData.miniCount === undefined) {
                usageData.miniCount = 0;
            }

            // 添加showWindowResetTime如果不存在
            if (usageData.showWindowResetTime === undefined) {
                usageData.showWindowResetTime = false;
            }

            // 添加deepResearch如果不存在
            if (!usageData.deepResearch) {
                usageData.deepResearch = {
                    remaining: null,
                    resetAfter: null,
                    lastUpdate: null
                };
            }

            // 如果gpt-4o-mini在models中，迁移它的计数到miniCount并移除
            if (usageData.models[SPECIAL_MODEL]) {
                // 如果有请求历史，计算总次数并加到miniCount
                if (Array.isArray(usageData.models[SPECIAL_MODEL].requests)) {
                    usageData.miniCount += usageData.models[SPECIAL_MODEL].requests.length;
                }
                // 如果有count，加到miniCount
                if (typeof usageData.models[SPECIAL_MODEL].count === 'number') {
                    usageData.miniCount += usageData.models[SPECIAL_MODEL].count;
                }
                // 从models中删除
                delete usageData.models[SPECIAL_MODEL];
            }

            // 确保添加的新模型在现有配置中也存在
            const newModels = ["gpt-4-1", "o3-pro"];
            newModels.forEach(modelId => {
                if (!usageData.models[modelId]) {
                    console.debug(`[monitor] Adding new model "${modelId}" to configuration.`);
                    if (modelId === "gpt-4-1") {
                        usageData.models[modelId] = {
                            requests: [],
                            quota: 100,
                            windowType: "hour3"
                        };
                    } else if (modelId === "o3-pro") {
                        usageData.models[modelId] = {
                            requests: [],
                            quota: 20,
                            windowType: "monthly"
                        };
                    }
                }
            });

            // 更新现有o3模型的配额为200
            if (usageData.models["o3"] && usageData.models["o3"].quota !== 200) {
                console.debug(`[monitor] Updating o3 model quota from ${usageData.models["o3"].quota} to 200.`);
                usageData.models["o3"].quota = 200;
            }

            // 实测修正：更新现有gpt-4o和gpt-4-1模型的配额为100
            if (usageData.models["gpt-4o"] && usageData.models["gpt-4o"].quota !== 100) {
                console.debug(`[monitor] Updating gpt-4o model quota from ${usageData.models["gpt-4o"].quota} to 100.`);
                usageData.models["gpt-4o"].quota = 100;
            }
            if (usageData.models["gpt-4-1"] && usageData.models["gpt-4-1"].quota !== 100) {
                console.debug(`[monitor] Updating gpt-4-1 model quota from ${usageData.models["gpt-4-1"].quota} to 100.`);
                usageData.models["gpt-4-1"].quota = 100;
            }

            // 删除gpt-4模型
            if (usageData.models["gpt-4"]) {
                delete usageData.models["gpt-4"];
            }

            // Migrate from count-based to time-based models
            Object.entries(usageData.models).forEach(([key, model]) => {
                // If the model doesn't have a requests array, create one
                if (!Array.isArray(model.requests)) {
                    model.requests = [];
                    // If it has a count, create that many requests with current timestamp
                    // This is an approximation for migration
                    if (typeof model.count === 'number' && model.count > 0) {
                        const now = Date.now();
                        for (let i = 0; i < model.count; i++) {
                            // Stagger the timestamps slightly for better visualization
                            model.requests.push({
                                timestamp: now - (i * 60000) // each request 1 minute apart
                            });
                        }
                    }
                    // Remove old properties
                    delete model.count;
                    delete model.lastUpdate;
                }

                // Rename dailyLimit to quota if needed
                if (model.dailyLimit !== undefined && model.quota === undefined) {
                    model.quota = model.dailyLimit;
                    delete model.dailyLimit;
                }

                // Rename resetFrequency to windowType if needed
                if (model.resetFrequency !== undefined && model.windowType === undefined) {
                    model.windowType = model.resetFrequency;
                    delete model.resetFrequency;
                }

                // Ensure windowType is valid
                if (!['hour3', 'daily', 'weekly', 'monthly'].includes(model.windowType)) {
                    model.windowType = 'daily'; // Default to daily
                }
            });

            // Clean up old properties at root level
            delete usageData.lastDailyReset;
            delete usageData.lastWeeklyReset;
            delete usageData.lastReset;

            this.set(usageData);
            console.debug("[monitor] get usageData:", usageData);
            return usageData;
        },

        set(newData) {
            GM_setValue(this.key, newData);
        },

        update(callback) {
            const data = this.get();
            callback(data);
            this.set(data);
        }
    };

    let usageData = Storage.get();

    // =============== DeepResearch 监控功能 ===============

    // DeepResearch数据更新函数
    function updateDeepResearchData(remaining, resetAfter) {
        usageData = Storage.get();
        usageData.deepResearch = {
            remaining: remaining,
            resetAfter: resetAfter,
            lastUpdate: Date.now()
        };
        Storage.set(usageData);
        updateUI();
        console.log(`✅ [DeepResearch] 剩余次数: ${remaining}, 重置时间: ${resetAfter}`);
    }

    // DeepResearch响应数据分析
    function analyzeResponseForDeepResearch(data, endpoint) {
        if (!data || typeof data !== 'object') return false;

        // 检查 limits_progress 字段
        if (data.limits_progress && Array.isArray(data.limits_progress)) {
            const deepResearch = data.limits_progress.find(
                item => item.feature_name === 'deep_research'
            );

            if (deepResearch) {
                console.log(`✅ 在 ${endpoint} 找到 DeepResearch 数据:`, deepResearch);
                updateDeepResearchData(deepResearch.remaining, deepResearch.reset_after);
                return true;
            }
        }

        // 递归搜索包含 "deep_research" 的任何字段
        function deepSearch(obj) {
            if (!obj || typeof obj !== 'object') return false;

            for (const [key, value] of Object.entries(obj)) {
                // 检查键名是否包含相关信息
                if (key.toLowerCase().includes('deep') || key.toLowerCase().includes('research')) {
                    if (typeof value === 'object' && value !== null && value.remaining !== undefined) {
                        console.log(`✅ 找到 DeepResearch 数据:`, value);
                        updateDeepResearchData(value.remaining, value.reset_after || value.resetAfter);
                        return true;
                    }
                }

                // 递归搜索
                if (typeof value === 'object' && value !== null) {
                    if (deepSearch(value)) {
                        return true;
                    }
                }
            }
            return false;
        }

        return deepSearch(data);
    }

    // 导出功能
    function exportUsageData() {
        const data = Storage.get();
        // 创建导出数据的副本，移除DeepResearch数据（因为这是实时获取的）
        const exportData = { ...data };
        delete exportData.deepResearch;

        const jsonData = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `chatgpt-usage-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("用量统计数据已导出（不含DeepResearch实时数据）");
        }, 100);
    }

    // 导入功能
    function importUsageData() {
        if (!confirm("导入将合并现有记录与导入文件中的记录。继续吗？")) {
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.style.display = 'none';

        input.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const importedData = JSON.parse(event.target.result);

                    // 验证导入数据结构
                    if (!validateImportedData(importedData)) {
                        showToast("导入失败：数据格式不正确", "error");
                        return;
                    }

                    // 显示导入摘要
                    const importSummary = generateImportSummary(importedData);
                    if (!confirm(`导入记录摘要:\n${importSummary}\n\n确认导入这些数据吗？`)) {
                        return;
                    }

                    // 合并数据
                    const currentData = Storage.get();
                    const mergedData = mergeUsageData(currentData, importedData);

                    // 保存合并后的数据
                    Storage.set(mergedData);

                    // 刷新UI
                    updateUI();

                    showToast("用量记录已成功导入", "success");
                } catch (error) {
                    console.error("[monitor] Import error:", error);
                    showToast("导入失败：" + error.message, "error");
                }

                // 清理
                document.body.removeChild(input);
            };

            reader.readAsText(file);
        };

        document.body.appendChild(input);
        input.click();
    }

    // 验证导入的数据结构
    function validateImportedData(data) {
        // 检查基本结构
        if (!data || typeof data !== 'object') return false;

        // 检查必需字段
        if (!('models' in data) || typeof data.models !== 'object') return false;

        // 检查模型是否具有正确的结构
        for (const modelKey in data.models) {
            const model = data.models[modelKey];
            if (!model || typeof model !== 'object') return false;

            // 检查必需的模型字段
            if (!Array.isArray(model.requests)) return false;
            if (typeof model.quota !== 'number') return false;
            if (!model.windowType || !['hour3', 'daily', 'weekly', 'monthly'].includes(model.windowType)) return false;
        }

        // 基本验证通过
        return true;
    }

    // 生成导入摘要
    function generateImportSummary(importedData) {
        let summary = '';

        // 统计导入数据中的模型和请求数量
        const modelCount = Object.keys(importedData.models || {}).length;
        let totalRequests = 0;
        const modelDetails = [];

        Object.entries(importedData.models || {}).forEach(([key, model]) => {
            const count = model.requests.length;
            totalRequests += count;
            if (count > 0) {
                modelDetails.push(`${key}: ${count}条记录`);
            }
        });

        summary += `共 ${modelCount} 个模型，${totalRequests} 条请求记录\n`;

        // 如果模型不太多，添加模型详情
        if (modelDetails.length <= 5) {
            summary += `\n模型详情:\n${modelDetails.join('\n')}`;
        }

        // 特殊模型计数
        if (importedData.miniCount !== undefined && importedData.miniCount > 0) {
            summary += `\n\n特殊模型 ${SPECIAL_MODEL} 计数: ${importedData.miniCount}`;
        }

        // DeepResearch数据说明
        summary += `\n\n注: ${DEEPRESEARCH_MODEL} 数据为实时获取，不包含在导入数据中`;

        return summary;
    }

    // 合并导入的数据与现有数据
    function mergeUsageData(currentData, importedData) {
        const result = JSON.parse(JSON.stringify(currentData)); // 深拷贝

        // 合并模型数据
        Object.entries(importedData.models || {}).forEach(([modelKey, importedModel]) => {
            // 如果模型在当前数据中不存在，则添加它
            if (!result.models[modelKey]) {
                result.models[modelKey] = {
                    requests: [],
                    quota: importedModel.quota || 50,
                    windowType: importedModel.windowType || "daily"
                };
            }

            // 获取当前请求
            const currentRequests = result.models[modelKey].requests || [];

            // 根据窗口类型计算最早的相关时间戳
            const now = Date.now();
            const windowDuration = TIME_WINDOWS[result.models[modelKey].windowType];
            const oldestRelevantTime = now - windowDuration;

            // 过滤导入的请求，只包括相关的请求
            const relevantImportedRequests = (importedModel.requests || [])
                .filter(req => req.timestamp > oldestRelevantTime);

            // 创建现有时间戳的映射(使用1秒的时间窗口)
            // 以处理由于时钟变化导致的潜在重复
            const existingTimeMap = new Map();

            currentRequests.forEach(req => {
                // 四舍五入到最接近的秒，以允许小的变化
                const roundedTime = Math.floor(req.timestamp / 1000) * 1000;
                existingTimeMap.set(roundedTime, true);
            });

            // 添加非重复的导入请求
            const newRequests = relevantImportedRequests.filter(req => {
                // 四舍五入到最接近的秒
                const roundedTime = Math.floor(req.timestamp / 1000) * 1000;
                return !existingTimeMap.has(roundedTime);
            });

            // 合并并按时间戳排序(最新的先)
            result.models[modelKey].requests = [...currentRequests, ...newRequests]
                .sort((a, b) => b.timestamp - a.timestamp);
        });

        // 处理特殊模型计数器
        if (importedData.miniCount !== undefined && importedData.miniCount > 0) {
            // 对于特殊计数器，取较大值
            result.miniCount = Math.max(result.miniCount || 0, importedData.miniCount || 0);
        }

        return result;
    }

    // 生成一周用量分析报告（按自然日统计）
    function generateWeeklyReport() {
        const now = new Date();
        // 获取今天的开始时间（0点）
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        // 获取7天前的开始时间
        const sevenDaysAgoStart = todayStart - 6 * TIME_WINDOWS.daily;

        const report = {
            totalRequests: 0,
            modelBreakdown: {},
            dailyData: [], // 最近7天的数据
            peakDay: '',
            averageDaily: 0,
            generatedAt: new Date().toISOString()
        };

        // 初始化最近7天的数据（包括今天）
        for (let i = 0; i < 7; i++) {
            const dayStart = todayStart - (6 - i) * TIME_WINDOWS.daily;
            const date = new Date(dayStart);
            report.dailyData.push({
                date: date.toLocaleDateString('zh-CN'),
                dayOfWeek: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()],
                models: {},
                total: 0,
                dayStart: dayStart,
                dayEnd: dayStart + TIME_WINDOWS.daily - 1
            });
        }

        // 分析每个模型（排除特殊模型）
        Object.entries(usageData.models).forEach(([modelKey, model]) => {
            // 只统计7天内的请求
            const validRequests = model.requests.filter(req =>
                req.timestamp >= sevenDaysAgoStart && req.timestamp < todayStart + TIME_WINDOWS.daily
            );

            if (validRequests.length > 0) {
                if (!report.modelBreakdown[modelKey]) {
                    report.modelBreakdown[modelKey] = 0;
                }

                // 按天分组统计
                validRequests.forEach(req => {
                    // 找到请求所属的天
                    const dayData = report.dailyData.find(day =>
                        req.timestamp >= day.dayStart && req.timestamp <= day.dayEnd
                    );

                    if (dayData) {
                        dayData.total++;
                        dayData.models[modelKey] = (dayData.models[modelKey] || 0) + 1;
                        report.modelBreakdown[modelKey]++;
                        report.totalRequests++;
                    }
                });
            }
        });

        // 计算平均每天使用量
        const activeDays = report.dailyData.filter(d => d.total > 0).length || 1;
        report.averageDaily = Math.round(report.totalRequests / activeDays);

        // 找出使用高峰日
        const maxDayUsage = Math.max(...report.dailyData.map(d => d.total), 0);
        const peakDayData = report.dailyData.find(d => d.total === maxDayUsage);
        if (peakDayData) {
            report.peakDay = `${peakDayData.date} ${peakDayData.dayOfWeek}`;
        }

        return report;
    }

    // 导出一周分析报告为HTML文件
    function exportWeeklyAnalysis() {
        const report = generateWeeklyReport();

        // 生成HTML内容
        const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChatGPT 一周用量分析报告 - ${new Date().toLocaleDateString('zh-CN')}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #1a1b1e;
            color: #e5e7eb;
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1, h2 {
            color: #f59e0b;
        }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .card {
            background: #2a2b2e;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #363636;
        }
        .card h3 {
            margin-top: 0;
            color: #9ca3af;
            font-size: 14px;
        }
        .card .value {
            font-size: 28px;
            font-weight: bold;
            color: #f59e0b;
        }
        .card .subtext {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 4px;
        }
        .chart-container {
            background: #2a2b2e;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #363636;
            margin-bottom: 20px;
            position: relative;
        }
        .chart-container.daily {
            height: 400px;
        }
        .chart-container.pie {
            height: 350px;
        }
        .table-container {
            background: #2a2b2e;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #363636;
            overflow-x: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #363636;
        }
        th {
            background: #1a1b1e;
            color: #f59e0b;
            font-weight: 600;
        }
        .highlight {
            color: #f59e0b;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            color: #9ca3af;
            font-size: 12px;
        }
        .info-text {
            color: #9ca3af;
            font-size: 14px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>ChatGPT 一周用量分析报告</h1>
        <p class="info-text">分析时间段: ${report.dailyData[0].date} 至 ${report.dailyData[6].date}</p>
        <p class="info-text">生成时间: ${new Date().toLocaleString('zh-CN')}</p>

        <div class="summary-cards">
            <div class="card">
                <h3>总请求数</h3>
                <div class="value">${report.totalRequests}</div>
                <div class="subtext">最近7天</div>
            </div>
            <div class="card">
                <h3>日均使用</h3>
                <div class="value">${report.averageDaily}</div>
                <div class="subtext">活跃天数平均</div>
            </div>
            <div class="card">
                <h3>使用高峰日</h3>
                <div class="value" style="font-size: 20px;">${report.peakDay || 'N/A'}</div>
            </div>
            <div class="card">
                <h3>活跃模型数</h3>
                <div class="value">${Object.keys(report.modelBreakdown).length}</div>
                <div class="subtext">有使用记录</div>
            </div>
        </div>

        <h2>每日使用趋势</h2>
        <div class="chart-container daily">
            <canvas id="dailyChart"></canvas>
        </div>

        <h2>模型使用分布</h2>
        <div class="chart-container pie">
            <canvas id="modelChart"></canvas>
        </div>

        <h2>详细数据表</h2>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>日期</th>
                        <th>星期</th>
                        <th>总请求数</th>
                        ${Object.keys(report.modelBreakdown).map(model => `<th>${model}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${report.dailyData.map((day, index) => `
                        <tr ${index === 6 ? 'style="background: rgba(245, 158, 11, 0.1);"' : ''}>
                            <td>${day.date} ${index === 6 ? '<span style="color: #f59e0b;">(今天)</span>' : ''}</td>
                            <td>${day.dayOfWeek}</td>
                            <td class="highlight">${day.total}</td>
                            ${Object.keys(report.modelBreakdown).map(model =>
                                `<td>${day.models[model] || 0}</td>`
                            ).join('')}
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background: #1a1b1e; font-weight: bold;">
                        <td colspan="2">总计</td>
                        <td class="highlight">${report.totalRequests}</td>
                        ${Object.entries(report.modelBreakdown).map(([model, count]) =>
                            `<td>${count}</td>`
                        ).join('')}
                    </tr>
                </tfoot>
            </table>
        </div>

        <div class="footer">
            <p>此报告由 ChatGPT 用量统计脚本自动生成</p>
            <p style="font-size: 11px; margin-top: 10px;">注：gpt-4-1-mini 和 DeepResearch 模型因特殊性质，未包含在此分析中</p>
        </div>
    </div>

    <script>
        // 配置图表默认选项
        Chart.defaults.color = '#9ca3af';
        Chart.defaults.borderColor = '#363636';

        // 每日使用趋势图
        const dailyCtx = document.getElementById('dailyChart').getContext('2d');
        new Chart(dailyCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(report.dailyData.map((d, i) =>
                    i === 6 ? d.date + ' (今天)' : d.date
                ))},
                datasets: [{
                    label: '每日请求数',
                    data: ${JSON.stringify(report.dailyData.map(d => d.total))},
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#f59e0b',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const index = context.dataIndex;
                                const dayData = ${JSON.stringify(report.dailyData.map(d => d.dayOfWeek))};
                                return dayData[index];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#363636'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        grid: {
                            color: '#363636'
                        }
                    }
                }
            }
        });

        // 模型使用分布饼图
        const modelCtx = document.getElementById('modelChart').getContext('2d');
        new Chart(modelCtx, {
            type: 'doughnut',
            data: {
                labels: ${JSON.stringify(Object.keys(report.modelBreakdown))},
                datasets: [{
                    data: ${JSON.stringify(Object.values(report.modelBreakdown))},
                    backgroundColor: [
                        '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
                        '#9333ea', '#ec4899', '#14b8a6', '#f97316',
                        '#06b6d4', '#84cc16', '#f43f5e', '#8b5cf6'
                    ],
                    borderWidth: 2,
                    borderColor: '#1a1b1e'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(2);
                                return label + ': ' + value + ' (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>
        `;

        // 下载HTML文件
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chatgpt-weekly-analysis-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("一周用量分析报告已导出", "success");
        }, 100);
    }

    // Component Functions
    function createModelRow(model, modelKey, isSettings = false) {
        const row = document.createElement("div");
        row.className = "model-row";

        if (isSettings) {
            return createSettingsModelRow(model, modelKey, row);
        }
        return createUsageModelRow(model, modelKey, row);
    }

    function createSettingsModelRow(model, modelKey, row) {
        // Model ID cell
        const keyLabel = document.createElement("div");
        keyLabel.textContent = modelKey;
        row.appendChild(keyLabel);

        // Quota input cell
        const quotaInput = document.createElement("input");
        quotaInput.type = "number";
        quotaInput.value = model.quota;
        quotaInput.placeholder = "配额";
        quotaInput.dataset.modelKey = modelKey;
        quotaInput.dataset.field = "quota";
        row.appendChild(quotaInput);

        // Window Type Select
        const windowSelect = document.createElement("select");
        windowSelect.dataset.modelKey = modelKey;
        windowSelect.dataset.field = "windowType";

        const hour3Option = document.createElement("option");
        hour3Option.value = "hour3";
        hour3Option.textContent = "3小时窗口";

        const dailyOption = document.createElement("option");
        dailyOption.value = "daily";
        dailyOption.textContent = "24小时窗口";

        const weeklyOption = document.createElement("option");
        weeklyOption.value = "weekly";
        weeklyOption.textContent = "7天窗口";

        const monthlyOption = document.createElement("option");
        monthlyOption.value = "monthly";
        monthlyOption.textContent = "30天窗口";

        windowSelect.appendChild(hour3Option);
        windowSelect.appendChild(dailyOption);
        windowSelect.appendChild(weeklyOption);
        windowSelect.appendChild(monthlyOption);

        // Set the current value
        windowSelect.value = model.windowType || "daily";

        const controlsContainer = document.createElement("div");
        controlsContainer.style.display = "flex";
        controlsContainer.style.alignItems = "center";
        controlsContainer.style.gap = "4px";

        controlsContainer.appendChild(windowSelect);

        // Delete button
        const delBtn = document.createElement("button");
        delBtn.className = "btn delete-btn";
        delBtn.textContent = "删除";
        delBtn.dataset.modelKey = modelKey;
        delBtn.addEventListener("click", () => handleDeleteModel(modelKey));

        controlsContainer.appendChild(delBtn);
        row.appendChild(controlsContainer);

        return row;
    }

    function createUsageModelRow(model, modelKey) {
        const now = Date.now();

        // Filter requests to only include those within the time window
        const windowDuration = TIME_WINDOWS[model.windowType];
        const activeRequests = model.requests.filter(req =>
            now - req.timestamp < windowDuration
        );

        const count = activeRequests.length;
        let lastRequestTime = count > 0 ?
            formatTimeAgo(Math.max(...activeRequests.map(req => req.timestamp))) :
            "never";

        // Calculate time until oldest request expires (window end time)
        let windowEndInfo = "";
        if (count > 0 && usageData.showWindowResetTime) {
            const oldestActiveTimestamp = Math.min(...activeRequests.map(req => req.timestamp));
            const windowEnd = getWindowEnd(oldestActiveTimestamp, model.windowType);
            if (windowEnd > now) {
                windowEndInfo = `Window resets in: ${formatTimeLeft(windowEnd)}`;
            }
        }

        const row = document.createElement("div");
        row.className = "model-row";

        // Model Name cell with window type badge
        const modelNameContainer = document.createElement("div");
        modelNameContainer.style.display = "flex";
        modelNameContainer.style.alignItems = "center";

        const modelName = document.createElement("span");
        modelName.textContent = modelKey;
        modelNameContainer.appendChild(modelName);

        // Add window type badge
        const windowBadge = document.createElement("span");
        windowBadge.className = `window-badge ${model.windowType}`;

        // Display badge based on window type
        if (model.windowType === "hour3") {
            windowBadge.textContent = "3h";
        } else if (model.windowType === "daily") {
            windowBadge.textContent = "24h";
        } else if (model.windowType === "weekly") {
            windowBadge.textContent = "7d";
        } else {
            windowBadge.textContent = "30d";
        }

        windowBadge.title = `${model.windowType === "hour3" ? "3 hour" :
                            model.windowType === "daily" ? "24 hour" :
                            model.windowType === "weekly" ? "7 day" : "30 day"} sliding window`;

        modelNameContainer.appendChild(windowBadge);
        row.appendChild(modelNameContainer);

        // Last Request Time cell
        const lastUpdateValue = document.createElement("div");
        lastUpdateValue.className = "request-time";
        lastUpdateValue.textContent = lastRequestTime;
        row.appendChild(lastUpdateValue);

        // Usage cell
        const usageValue = document.createElement("div");

        // 处理不同的配额显示
        let quotaDisplay;
        if (model.quota === 0) {
            // 检查当前套餐类型
            const currentPlan = usageData.planType || "team";
            if (currentPlan === "pro") {
                quotaDisplay = "∞"; // Pro套餐无限制
            } else {
                quotaDisplay = "不可用"; // 其他套餐中0配额表示不可用
            }
        } else {
            quotaDisplay = model.quota;
        }

        // If model is gpt-4o, show numeric quota (实测修正：100次/3小时)
        if (modelKey === "gpt-4o") {
            usageValue.innerHTML = `${count} / ${quotaDisplay}`;
        } else {
            usageValue.textContent = `${count} / ${quotaDisplay}`;
        }

        // 根据设置决定是否显示窗口刷新时间
        if (windowEndInfo && usageData.showWindowResetTime) {
            const windowInfoEl = document.createElement("div");
            windowInfoEl.className = "window-info";
            windowInfoEl.textContent = windowEndInfo;
            usageValue.appendChild(windowInfoEl);
        }

        row.appendChild(usageValue);

        // Progress Bar cell
        const progressCell = document.createElement("div");

        // 处理进度条显示
        if (model.quota === 0) {
            const currentPlan = usageData.planType || "team";
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
            // For models with quota > 0
            const usagePercent = count / model.quota;

            if (usageData.progressType === "dots") {
                // Dot-based progress implementation
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
                // Enhanced progress bar implementation
                const progressContainer = document.createElement("div");
                progressContainer.className = "progress-container";

                const progressBar = document.createElement("div");
                progressBar.className = "progress-bar";

                if (usagePercent > 1) {
                    progressBar.classList.add("exceeded");
                } else if (usagePercent < 0.3) {
                    progressBar.classList.add("low-usage");
                }

                progressBar.style.width = `${Math.min(usagePercent * 100, 100)}%`;

                progressContainer.appendChild(progressBar);
                progressCell.appendChild(progressContainer);
            }
        }

        row.appendChild(progressCell);

        return row;
    }

    // 创建特殊模型gpt-4-1-mini的行
    function createSpecialModelRow() {
        const row = document.createElement("div");
        row.className = "model-row special-model-row";

        // Model Name cell
        const modelNameContainer = document.createElement("div");
        const modelName = document.createElement("span");
        modelName.className = "special-model-name";
        modelName.textContent = SPECIAL_MODEL;
        modelNameContainer.appendChild(modelName);
        row.appendChild(modelNameContainer);

        // Last Request Cell (空的)
        const lastUpdateValue = document.createElement("div");
        lastUpdateValue.textContent = "-";
        lastUpdateValue.className = "request-time";
        row.appendChild(lastUpdateValue);

        // Usage cell (只显示总使用次数)
        const usageValue = document.createElement("div");
        usageValue.textContent = `${usageData.miniCount} 次`;
        row.appendChild(usageValue);

        // Progress Cell (空的)
        const progressCell = document.createElement("div");
        progressCell.textContent = "无限制";
        progressCell.style.color = COLORS.disabled;
        progressCell.style.fontStyle = "italic";
        row.appendChild(progressCell);

        return row;
    }

    // 创建DeepResearch模型行
    function createDeepResearchModelRow() {
        const row = document.createElement("div");
        row.className = "model-row";

        // Model Name cell
        const modelNameContainer = document.createElement("div");
        const modelName = document.createElement("span");
        modelName.textContent = DEEPRESEARCH_MODEL;
        modelName.style.color = COLORS.text; // 使用正常模型的颜色，不是特殊模型样式
        modelNameContainer.appendChild(modelName);
        row.appendChild(modelNameContainer);

        // Last Request Cell
        const lastUpdateValue = document.createElement("div");
        lastUpdateValue.className = "request-time";
        lastUpdateValue.textContent = "-";
        row.appendChild(lastUpdateValue);

        // Usage cell (显示剩余次数)
        const usageValue = document.createElement("div");
        if (usageData.deepResearch.remaining !== null) {
            usageValue.textContent = `剩余: ${usageData.deepResearch.remaining}`;
        } else {
            usageValue.textContent = "未知";
            usageValue.style.color = COLORS.secondaryText;
        }
        row.appendChild(usageValue);

        // Reset Time cell (显示重置时间)
        const resetTimeCell = document.createElement("div");
        resetTimeCell.style.fontSize = STYLE.textSize.xs;
        if (usageData.deepResearch.resetAfter) {
            try {
                const resetDate = new Date(usageData.deepResearch.resetAfter);
                const now = new Date();
                const isToday = resetDate.toDateString() === now.toDateString();

                if (isToday) {
                    resetTimeCell.textContent = `今日 ${resetDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
                } else {
                    resetTimeCell.textContent = resetDate.toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
                resetTimeCell.style.color = COLORS.secondaryText;
            } catch (e) {
                resetTimeCell.textContent = "重置时间未知";
                resetTimeCell.style.color = COLORS.disabled;
            }
        } else {
            resetTimeCell.textContent = "重置时间未知";
            resetTimeCell.style.color = COLORS.disabled;
        }
        row.appendChild(resetTimeCell);

        return row;
    }

    // 应用套餐配置
    function applyPlanConfig(planType) {
        const planConfig = PLAN_CONFIGS[planType];
        if (!planConfig) {
            console.warn(`[monitor] Unknown plan type: ${planType}`);
            return;
        }

        console.log(`[monitor] Applying ${planConfig.name} plan configuration`);

        // 更新所有模型的配额和时间窗口
        Object.entries(planConfig.models).forEach(([modelKey, config]) => {
            if (usageData.models[modelKey]) {
                usageData.models[modelKey].quota = config.quota;
                usageData.models[modelKey].windowType = config.windowType;
            }
        });

        // 保存更新后的数据
        Storage.set(usageData);
        console.log(`[monitor] Successfully applied ${planConfig.name} plan`);
    }

    // Event Handlers
    function handleDeleteModel(modelKey) {
        if (confirm(`确定要删除模型 "${modelKey}" 的配置吗？`)) {
            delete usageData.models[modelKey];
            Storage.set(usageData);
            updateUI();
            showToast(`模型 "${modelKey}" 已删除。`);
        }
    }

    function animateText(el, config) {
        const animator = new TextScrambler(el, {...config});
        animator.initialize();
        animator.start();
    }

    // UI Updates
    function updateUI() {
        const usageContent = document.getElementById("usageContent");
        const settingsContent = document.getElementById("settingsContent");

        if (usageContent) {
            console.debug("[monitor] update usage");
            updateUsageContent(usageContent);
            animateText(usageContent, { duration: 500, delay: 0, reverse: false, absolute: false, pointerEvents: true });
        }

        if (settingsContent) {
            console.debug("[monitor] update setting");
            updateSettingsContent(settingsContent);
            animateText(settingsContent, { duration: 500, delay: 0, reverse: false, absolute: false, pointerEvents: true });
        }
    }

    let sortDescending = true;

    function updateUsageContent(container) {
        container.innerHTML = "";

        // Sliding window explanation
        const infoSection = document.createElement("div");
        infoSection.className = "reset-info";
        infoSection.innerHTML = `<b>滑动窗口跟踪:</b>`;

        const windowTypes = document.createElement("div");
        windowTypes.style.display = "flex";
        windowTypes.style.justifyContent = "space-between";
        windowTypes.style.marginTop = "4px";

        windowTypes.innerHTML = `
            <span><span class="window-badge hour3">3h</span> 3小时窗口</span>
            <span><span class="window-badge daily">24h</span> 24小时窗口</span>
            <span><span class="window-badge weekly">7d</span> 7天窗口</span>
            <span><span class="window-badge monthly">30d</span> 30天窗口</span>
        `;

        infoSection.appendChild(windowTypes);
        container.appendChild(infoSection);

        // Table Header Row
        const tableHeader = document.createElement("div");
        tableHeader.className = "table-header";

        // Header cells
        const modelNameHeader = document.createElement("div");
        modelNameHeader.textContent = "模型名称";
        tableHeader.appendChild(modelNameHeader);

        const lastUpdateHeader = document.createElement("div");
        lastUpdateHeader.textContent = "最后使用";
        tableHeader.appendChild(lastUpdateHeader);

        const usageHeader = document.createElement("div");
        usageHeader.textContent = sortDescending ? "使用量 ↓" : "使用量 ↑";
        usageHeader.style.cursor = "pointer";
        usageHeader.addEventListener("click", () => {
            sortDescending = !sortDescending;
            updateUsageContent(container);
        });
        tableHeader.appendChild(usageHeader);

        const progressHeader = document.createElement("div");
        progressHeader.textContent = "进度";
        tableHeader.appendChild(progressHeader);

        container.appendChild(tableHeader);

        // Calculate active counts for all models
        const now = Date.now();
        const currentPlan = usageData.planType || "team";
        const modelCounts = Object.entries(usageData.models).map(([key, model]) => {
            const windowDuration = TIME_WINDOWS[model.windowType];
            const activeCount = model.requests.filter(req =>
                now - req.timestamp < windowDuration
            ).length;

            // 检查模型是否曾经被使用过
            const hasBeenUsed = model.requests.length > 0;

            // 检查模型是否可用（Pro套餐中quota=0表示无限制，其他套餐中quota=0表示不可用）
            const isAvailable = model.quota > 0 || (model.quota === 0 && currentPlan === "pro");

            return { key, model, activeCount, hasBeenUsed, isAvailable };
        });

        // 在使用量页面只显示：1) 曾经被使用过的模型，或 2) 可用的模型
        const usedModels = modelCounts
            .filter(({ hasBeenUsed, isAvailable }) => hasBeenUsed || isAvailable)
            .sort((a, b) => sortDescending ? b.activeCount - a.activeCount : a.activeCount - b.activeCount);

        // 单独存储模型
        const sortedModels = usedModels;

        // Create a row for each model
        sortedModels.forEach(({ key, model }) => {
            const row = createUsageModelRow(model, key);
            container.appendChild(row);
        });

        // 检查是否有常规模型显示
        const hasRegularModels = sortedModels.length > 0;

        // 如果miniCount > 0，在最后添加gpt-4-1-mini模型行
        if (usageData.miniCount > 0) {
            // 如果没有常规模型显示，添加一个spacer
            if (!hasRegularModels) {
                const spacer = document.createElement("div");
                spacer.style.height = "16px";
                container.appendChild(spacer);
            }

            // 添加特殊模型行
            const specialRow = createSpecialModelRow();
            container.appendChild(specialRow);
        }

        // 检查是否已经有模型显示（常规模型或特殊模型）
        const hasAnyModels = hasRegularModels || usageData.miniCount > 0;

        // 添加DeepResearch模型行（总是显示在最底部）
        if (usageData.deepResearch.remaining !== null || hasAnyModels) {
            // 如果前面有模型，添加一个小间距
            if (hasAnyModels) {
                const spacer = document.createElement("div");
                spacer.style.height = "8px";
                container.appendChild(spacer);
            }

            // 添加DeepResearch模型行
            const deepResearchRow = createDeepResearchModelRow();
            container.appendChild(deepResearchRow);
        }

        if (sortedModels.length === 0 && usageData.miniCount === 0 && usageData.deepResearch.remaining === null) {
            const emptyState = document.createElement("div");
            emptyState.style.textAlign = "center";
            emptyState.style.color = COLORS.secondaryText;
            emptyState.style.padding = STYLE.spacing.lg;

            // 检查是否有配置了模型，只是都没有使用过
            const hasConfiguredModels = Object.keys(usageData.models).length > 0;

            if (hasConfiguredModels) {
                emptyState.textContent = "使用模型后才会显示用量统计。";
            } else {
                emptyState.textContent = "未配置任何模型，请在设置中添加。";
            }

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
        info.style.fontSize = STYLE.lineHeight.md;
        info.style.color = COLORS.text;
        container.appendChild(info);

        // Add table header for settings
        const tableHeader = document.createElement("div");
        tableHeader.className = "table-header";
        tableHeader.style.gridTemplateColumns = "2fr 1fr 2fr";

        const idHeader = document.createElement("div");
        idHeader.textContent = "模型ID";
        tableHeader.appendChild(idHeader);

        const quotaHeader = document.createElement("div");
        quotaHeader.textContent = "配额";
        tableHeader.appendChild(quotaHeader);

        const actionHeader = document.createElement("div");
        actionHeader.textContent = "窗口/操作";
        tableHeader.appendChild(actionHeader);

        container.appendChild(tableHeader);

        // Update model rows style
        GM_addStyle(`
      #settingsContent .table-header,
      #settingsContent .model-row {
        grid-template-columns: 2fr 1fr 2fr;
      }
    `);

        Object.entries(usageData.models).forEach(([modelKey, model]) => {
            const row = createModelRow(model, modelKey, true);
            container.appendChild(row);
        });

        // 显示特殊模型设置
        const specialModelInfo = document.createElement("div");
        specialModelInfo.style.marginTop = "20px";
        specialModelInfo.style.padding = "10px";
        specialModelInfo.style.borderTop = `1px dashed ${COLORS.border}`;
        specialModelInfo.style.borderBottom = `1px dashed ${COLORS.border}`;

        specialModelInfo.innerHTML = `
            <div style="margin-bottom: 8px; color: ${COLORS.secondaryText};">
                <span style="font-style: italic; color: ${COLORS.disabled};">${SPECIAL_MODEL}</span> 特殊模型设置:
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <div style="flex: 1;">当前使用次数: <span style="color: ${COLORS.yellow};">${usageData.miniCount}</span> 次</div>
                <button id="resetMiniCount" class="btn" style="padding: 4px 8px; margin: 0;">重置计数</button>
            </div>
            <div style="font-size: ${STYLE.textSize.xs}; color: ${COLORS.secondaryText};">
                注: 此模型仅记录使用次数，无使用限制，不占用存储空间
            </div>
        `;

        container.appendChild(specialModelInfo);

        // DeepResearch信息显示
        const deepResearchInfo = document.createElement("div");
        deepResearchInfo.style.marginTop = "10px";
        deepResearchInfo.style.padding = "10px";
        deepResearchInfo.style.border = `1px dashed ${COLORS.border}`;
        deepResearchInfo.style.borderRadius = "4px";

        const drRemaining = usageData.deepResearch.remaining !== null ? usageData.deepResearch.remaining : "未知";
        const drResetTime = usageData.deepResearch.resetAfter ?
            new Date(usageData.deepResearch.resetAfter).toLocaleString('zh-CN') : "未知";

        deepResearchInfo.innerHTML = `
            <div style="margin-bottom: 8px; color: ${COLORS.text};">
                <span style="color: ${COLORS.text};">${DEEPRESEARCH_MODEL}</span> 模型状态:
            </div>
            <div style="margin-bottom: 6px; font-size: ${STYLE.textSize.sm};">
                剩余次数: <span style="color: ${COLORS.yellow};">${drRemaining}</span>
            </div>
            <div style="margin-bottom: 6px; font-size: ${STYLE.textSize.sm};">
                重置时间: <span style="color: ${COLORS.secondaryText};">${drResetTime}</span>
            </div>
            <div style="font-size: ${STYLE.textSize.xs}; color: ${COLORS.secondaryText};">
                注: 此模型数据通过API自动获取，无法手动配置
            </div>
        `;

        container.appendChild(deepResearchInfo);

        // 添加重置gpt-4-1-mini计数的事件处理
        setTimeout(() => {
            const resetMiniBtn = document.getElementById("resetMiniCount");
            if (resetMiniBtn) {
                resetMiniBtn.addEventListener("click", () => {
                    if (confirm(`确定要重置 ${SPECIAL_MODEL} 的使用计数吗？`)) {
                        usageData.miniCount = 0;
                        Storage.set(usageData);
                        updateUI();
                        showToast(`已重置 ${SPECIAL_MODEL} 的使用计数。`);
                    }
                });
            }
        }, 0);

        // Add new model button
        const addBtn = document.createElement("button");
        addBtn.className = "btn";
        addBtn.textContent = "添加模型映射";
        addBtn.style.marginTop = "20px";
        addBtn.addEventListener("click", () => {
            const newModelID = prompt('输入新模型的内部ID（例如："o3-mini"）');
            if (!newModelID) return;

            // 不允许添加特殊模型
            if (newModelID === SPECIAL_MODEL) {
                alert(`不能添加特殊模型 "${SPECIAL_MODEL}"，它有单独的处理逻辑。`);
                return;
            }

            if (usageData.models[newModelID]) {
                alert("模型映射已存在。");
                return;
            }

            usageData.models[newModelID] = {
                requests: [],
                quota: 50,
                windowType: "daily"
            };

            Storage.set(usageData);
            updateUI();
        });
        container.appendChild(addBtn);

        // Save settings button
        const saveBtn = document.createElement("button");
        saveBtn.className = "btn";
        saveBtn.textContent = "保存设置";
        saveBtn.style.marginLeft = STYLE.spacing.sm;
        saveBtn.addEventListener("click", () => {
            const inputs = container.querySelectorAll("input, select");
            let hasChanges = false;

            inputs.forEach((input) => {
                const modelKey = input.dataset.modelKey;
                const field = input.dataset.field;

                if (!modelKey || !usageData.models[modelKey]) return;

                if (field === "quota") {
                    const newQuota = parseInt(input.value, 10);
                    if (!isNaN(newQuota) && newQuota !== usageData.models[modelKey].quota) {
                        usageData.models[modelKey].quota = newQuota;
                        hasChanges = true;
                    }
                } else if (field === "windowType") {
                    const newWindowType = input.value;
                    if (newWindowType && newWindowType !== usageData.models[modelKey].windowType) {
                        usageData.models[modelKey].windowType = newWindowType;
                        hasChanges = true;
                    }
                }
            });

            if (hasChanges) {
                Storage.set(usageData);
                updateUI();
                showToast("设置保存成功。");
            } else {
                showToast("未检测到更改。", "warning");
            }
        });
        container.appendChild(saveBtn);

        // Clear history button
        const clearBtn = document.createElement("button");
        clearBtn.className = "btn";
        clearBtn.textContent = "清除历史";
        clearBtn.style.marginLeft = STYLE.spacing.sm;
        clearBtn.addEventListener("click", () => {
            if (confirm("确定要清除所有模型的使用历史吗？")) {
                Object.values(usageData.models).forEach(model => {
                    model.requests = [];
                });
                Storage.set(usageData);
                updateUI();
                showToast("所有模型的使用历史已清除。");
            }
        });
        container.appendChild(clearBtn);

        // Reset all button (completely resets everything to defaults)
        const resetAllBtn = document.createElement("button");
        resetAllBtn.className = "btn";
        resetAllBtn.textContent = "重置所有";
        resetAllBtn.style.marginLeft = STYLE.spacing.sm;
        resetAllBtn.style.color = COLORS.danger;
        resetAllBtn.addEventListener("click", () => {
            if (confirm("警告：这将重置所有内容为默认值，包括所有模型配置。确定继续吗？")) {
                Storage.set(defaultUsageData);
                usageData = defaultUsageData;
                updateUI();
                showToast("所有内容已重置为默认值。", "warning");
            }
        });
        container.appendChild(resetAllBtn);

        // 添加一周用量分析按钮
        const weeklyAnalysisBtn = document.createElement("button");
        weeklyAnalysisBtn.className = "btn";
        weeklyAnalysisBtn.textContent = "导出一周分析";
        weeklyAnalysisBtn.style.marginTop = "20px";
        weeklyAnalysisBtn.style.display = "block";
        weeklyAnalysisBtn.style.width = "100%";
        weeklyAnalysisBtn.style.backgroundColor = COLORS.surface;
        weeklyAnalysisBtn.style.border = `1px solid ${COLORS.yellow}`;
        weeklyAnalysisBtn.addEventListener("click", () => {
            exportWeeklyAnalysis();
        });
        container.appendChild(weeklyAnalysisBtn);

        // 添加导入/导出按钮
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

        // 套餐选择器
        const planSelectorContainer = document.createElement("div");
        planSelectorContainer.style.marginTop = STYLE.spacing.md;
        planSelectorContainer.style.display = "flex";
        planSelectorContainer.style.flexDirection = "column";
        planSelectorContainer.style.gap = "12px";
        planSelectorContainer.style.padding = "10px";
        planSelectorContainer.style.border = `1px solid ${COLORS.border}`;
        planSelectorContainer.style.borderRadius = "8px";
        planSelectorContainer.style.backgroundColor = COLORS.surface;

        // 套餐选择标题
        const planTitle = document.createElement("div");
        planTitle.textContent = "套餐设置";
        planTitle.style.fontWeight = "bold";
        planTitle.style.marginBottom = "8px";
        planTitle.style.color = COLORS.white;
        planSelectorContainer.appendChild(planTitle);

        // 套餐选择器
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

        // 添加套餐选项
        Object.entries(PLAN_CONFIGS).forEach(([key, config]) => {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = config.name;
            planTypeSelect.appendChild(option);
        });

        planTypeSelect.value = usageData.planType || "team";
        planTypeSelect.addEventListener('change', () => {
            const newPlan = planTypeSelect.value;
            if (confirm(`确定要切换到 ${PLAN_CONFIGS[newPlan].name} 套餐吗？\n\n这将更新所有模型的配额和时间窗口设置。`)) {
                usageData.planType = newPlan;
                applyPlanConfig(newPlan);
                // 完全重新渲染所有内容
                updateUI();
                showToast(`已切换到 ${PLAN_CONFIGS[newPlan].name} 套餐`, "success");
            } else {
                // 用户取消，恢复原选择
                planTypeSelect.value = usageData.planType || "team";
            }
        });

        planSelectContainer.appendChild(planTypeSelect);
        planSelectorContainer.appendChild(planSelectContainer);

        // 套餐说明
        const planInfo = document.createElement("div");
        planInfo.style.fontSize = STYLE.textSize.xs;
        planInfo.style.color = COLORS.secondaryText;
        planInfo.style.marginTop = "4px";
        planInfo.textContent = "切换套餐将根据官方限制自动调整所有模型的配额和时间窗口";
        planSelectorContainer.appendChild(planInfo);

        // 当前套餐配置详情
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

        const detailsText = Object.entries(currentPlanConfig.models)
            .map(([model, config]) => {
                const windowText = config.windowType === "hour3" ? "3小时" :
                                 config.windowType === "daily" ? "24小时" : "7天";
                let quotaText;
                if (config.quota === 0) {
                    quotaText = (usageData.planType || "team") === "pro" ? "无限制" : "不可用";
                } else {
                    quotaText = `${config.quota}次`;
                }
                return `• ${model}: ${quotaText}/${windowText}`;
            }).join('\n');

        planDetailsList.textContent = detailsText + '\n• gpt-4-1-mini: 无限制/计数';
        planDetailsList.style.whiteSpace = "pre-line";
        planDetailsContainer.appendChild(planDetailsList);

        planSelectorContainer.appendChild(planDetailsContainer);

        container.appendChild(planSelectorContainer);

        // Progress type selector & additional options
        const optionsContainer = document.createElement("div");
        optionsContainer.style.marginTop = STYLE.spacing.md;
        optionsContainer.style.display = "flex";
        optionsContainer.style.flexDirection = "column";
        optionsContainer.style.gap = "12px";
        optionsContainer.style.padding = "10px";
        optionsContainer.style.border = `1px solid ${COLORS.border}`;
        optionsContainer.style.borderRadius = "8px";
        optionsContainer.style.backgroundColor = COLORS.surface;

        // 添加"界面设置"标题
        const optionsTitle = document.createElement("div");
        optionsTitle.textContent = "界面设置";
        optionsTitle.style.fontWeight = "bold";
        optionsTitle.style.marginBottom = "8px";
        optionsTitle.style.color = COLORS.white;
        optionsContainer.appendChild(optionsTitle);

        // Progress type selector
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
        progressTypeSelect.style.width = "100px"; // 限制宽度
        progressTypeSelect.style.backgroundColor = COLORS.background;
        progressTypeSelect.style.color = COLORS.white;
        progressTypeSelect.style.border = `1px solid ${COLORS.border}`;
        progressTypeSelect.style.borderRadius = "4px";
        progressTypeSelect.style.padding = "3px 6px";

        progressTypeSelect.innerHTML = `
        <option value="dots">点状进度</option>
        <option value="bar">条状进度</option>
        `;
        progressTypeSelect.value = usageData.progressType || "bar";
        progressTypeSelect.addEventListener('change', () => {
            usageData.progressType = progressTypeSelect.value;
            Storage.set(usageData);
            updateUI();
            console.debug('[monitor] progress type:', progressTypeSelect.value);
        });

        progressSelectContainer.appendChild(progressTypeSelect);
        optionsContainer.appendChild(progressSelectContainer);

        // 窗口重置时间显示选项
        const showResetTimeContainer = document.createElement("div");
        showResetTimeContainer.style.display = "flex";
        showResetTimeContainer.style.alignItems = "center";
        showResetTimeContainer.style.justifyContent = "space-between";
        showResetTimeContainer.style.width = "100%";

        const showResetTimeLabel = document.createElement("label");
        showResetTimeLabel.textContent = "显示窗口重置时间";
        showResetTimeLabel.style.color = COLORS.secondaryText;
        showResetTimeLabel.style.cursor = "pointer";

        // 创建自定义样式的复选框容器
        const checkboxWrapper = document.createElement("div");
        checkboxWrapper.style.position = "relative";
        checkboxWrapper.style.width = "40px";
        checkboxWrapper.style.height = "20px";
        checkboxWrapper.style.backgroundColor = usageData.showWindowResetTime ? COLORS.success : COLORS.disabled;
        checkboxWrapper.style.borderRadius = "10px";
        checkboxWrapper.style.transition = "all 0.3s ease";
        checkboxWrapper.style.cursor = "pointer";

        // 创建开关滑块
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

        // 创建隐藏的实际复选框以保持功能
        const showResetTimeCheckbox = document.createElement("input");
        showResetTimeCheckbox.type = "checkbox";
        showResetTimeCheckbox.id = "showResetTimeCheckbox";
        showResetTimeCheckbox.checked = usageData.showWindowResetTime;
        showResetTimeCheckbox.style.display = "none";

        // 点击事件处理
        checkboxWrapper.addEventListener('click', () => {
            showResetTimeCheckbox.checked = !showResetTimeCheckbox.checked;
            usageData.showWindowResetTime = showResetTimeCheckbox.checked;

            // 更新开关样式
            checkboxWrapper.style.backgroundColor = showResetTimeCheckbox.checked ? COLORS.success : COLORS.disabled;
            slider.style.left = showResetTimeCheckbox.checked ? "22px" : "2px";

            Storage.set(usageData);
            updateUI();
            console.debug('[monitor] show reset time:', showResetTimeCheckbox.checked);
        });

        // 标签点击也能切换开关
        showResetTimeLabel.addEventListener('click', () => {
            checkboxWrapper.click();
        });

        showResetTimeContainer.appendChild(showResetTimeLabel);
        showResetTimeContainer.appendChild(checkboxWrapper);
        showResetTimeContainer.appendChild(showResetTimeCheckbox);
        optionsContainer.appendChild(showResetTimeContainer);

        container.appendChild(optionsContainer);
    }

    // Model Usage Tracking
    function recordModelUsage(modelId) {
        // 模型重定向逻辑
        if (modelId === "auto") {
            console.debug(`[monitor] Redirecting model "${modelId}" to "gpt-4o"`);
            modelId = "gpt-4o";
        } else if (modelId === "gpt-4o-mini") {
            console.debug(`[monitor] Redirecting model "${modelId}" to "${SPECIAL_MODEL}"`);
            modelId = SPECIAL_MODEL;
        }

        // Get fresh data
        usageData = Storage.get();

        // 特殊处理gpt-4-1-mini
        if (modelId === SPECIAL_MODEL) {
            // 只增加计数器，不存储时间戳
            usageData.miniCount = (usageData.miniCount || 0) + 1;
            Storage.set(usageData);
            updateUI();
            return;
        }

        // 处理其他常规模型
        // Clean up expired requests to save storage
        cleanupExpiredRequests();

        if (!usageData.models[modelId]) {
            console.debug(`[monitor] No mapping found for model "${modelId}". Creating new entry.`);
            usageData.models[modelId] = {
                displayName: modelId,
                requests: [],
                quota: 50,
                windowType: "daily" // Default to daily
            };
        }

        // Add new request with current timestamp
        usageData.models[modelId].requests.push({
            timestamp: Date.now()
        });

        Storage.set(usageData);
        updateUI();
    }

    // Cleanup old requests that are no longer relevant for any window type
    function cleanupExpiredRequests() {
        const now = Date.now();
        const maxWindow = TIME_WINDOWS.monthly; // Longest time window

        Object.values(usageData.models).forEach(model => {
            // Keep only requests within the longest possible window
            model.requests = model.requests.filter(req =>
                now - req.timestamp < maxWindow
            );
        });
    }

    // Toast notification function
    function showToast(message, type = 'success') {
        const container = document.getElementById('chatUsageMonitor');
        if (!container) return;

        // Remove any existing toast
        const existingToast = container.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create new toast
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;

        // Set color based on type
        if (type === 'error') {
            toast.style.color = COLORS.danger;
            toast.style.borderColor = COLORS.danger;
        } else if (type === 'warning') {
            toast.style.color = COLORS.warning;
            toast.style.borderColor = COLORS.warning;
        }

        container.appendChild(toast);

        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // Improved draggable functionality that supports both vertical and horizontal movement
    function setupDraggable(element) {
        let isDragging = false;
        let startX, startY, origLeft, origTop;

        // Make header draggable
        const handle = element.querySelector('header');
        if (handle) {
            handle.addEventListener('mousedown', startDrag);
        }

        // Make minimized panel draggable from anywhere
        element.addEventListener('mousedown', (e) => {
            if (element.classList.contains('minimized')) {
                startDrag(e);
            }
        });

        function startDrag(e) {
            // Ignore clicks on minimize button or other controls
            if (e.target.classList.contains('minimize-btn') ||
                e.target.tagName === 'BUTTON' ||
                e.target.tagName === 'INPUT' ||
                e.target.tagName === 'SELECT') {
                return;
            }

            isDragging = false; // Start as false until we move enough
            startX = e.clientX;
            startY = e.clientY;

            // Get current position
            const rect = element.getBoundingClientRect();
            origLeft = rect.left;
            origTop = rect.top;

            // Add movement handlers
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', stopDrag);

            e.preventDefault();
        }

        function handleDrag(e) {
            // Calculate new position
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            // Only consider it a drag if moved more than 5px
            if (!isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
                isDragging = true;
                console.log("[monitor] Started dragging");
            }

            if (isDragging) {
                // Apply boundary constraints
                const rect = element.getBoundingClientRect();
                const maxX = window.innerWidth - rect.width;
                const maxY = window.innerHeight - rect.height;

                const newLeft = Math.min(Math.max(0, origLeft + deltaX), maxX);
                const newTop = Math.min(Math.max(0, origTop + deltaY), maxY);

                // Update position using important to override defaults
                element.style.setProperty('left', `${newLeft}px`, 'important');
                element.style.setProperty('top', `${newTop}px`, 'important');
                element.style.setProperty('right', 'auto', 'important');
                element.style.setProperty('bottom', 'auto', 'important');

                e.preventDefault();
            }
        }

        function stopDrag(e) {
            document.removeEventListener('mousemove', handleDrag);
            document.removeEventListener('mouseup', stopDrag);

            if (isDragging) {
                console.log("[monitor] Stopped dragging");
                // Save position
                const newLeft = parseInt(element.style.left);
                const newTop = parseInt(element.style.top);

                Storage.update(data => {
                    data.position = {
                        x: newLeft,
                        y: newTop
                    };
                });

                // Give time for real click to be ignored
                setTimeout(() => {
                    isDragging = false;
                }, 200);

                // Prevent click
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }

    // 添加快捷键支持
    function setupKeyboardShortcuts() {
        // 使用多种方式确保快捷键能工作
        const handleShortcut = (e) => {
            // Ctrl/Cmd + I 切换最小化/展开状态
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const monitor = document.getElementById('chatUsageMonitor');
                if (monitor) {
                    if (monitor.classList.contains('minimized')) {
                        // 展开监视器
                        monitor.classList.remove('minimized');

                        // 恢复保存的尺寸
                        const currentData = Storage.get();
                        if (currentData.size.width && currentData.size.height) {
                            monitor.style.width = `${currentData.size.width}px`;
                            monitor.style.height = `${currentData.size.height}px`;
                        }

                        // 更新状态
                        Storage.update(data => {
                            data.minimized = false;
                        });
                    } else {
                        // 最小化监视器
                        monitor.classList.add('minimized');

                        // 更新状态
                        Storage.update(data => {
                            data.minimized = true;
                        });
                    }
                }

                return false;
            }
        };

        // 在捕获阶段监听，优先级更高
        document.addEventListener('keydown', handleShortcut, true);
        // 也在冒泡阶段监听，以防万一
        document.addEventListener('keydown', handleShortcut, false);

        // 直接在window上也监听
        window.addEventListener('keydown', handleShortcut, true);
    }

    // UI Creation
    function createMonitorUI() {
        if (document.getElementById("chatUsageMonitor")) return;

        const container = document.createElement("div");
        container.id = "chatUsageMonitor";

        // Apply minimized state if needed
        if (usageData.minimized) {
            container.classList.add("minimized");
        }

        // Apply custom size if set
        if (usageData.size.width && usageData.size.height && !usageData.minimized) {
            container.style.width = `${usageData.size.width}px`;
            container.style.height = `${usageData.size.height}px`;
        }

        // Set saved position if available
        if (usageData.position.x !== null && usageData.position.y !== null) {
            const maxX = window.innerWidth - 400;
            const maxY = window.innerHeight - 500;
            const x = Math.min(Math.max(0, usageData.position.x), maxX);
            const y = Math.min(Math.max(0, usageData.position.y), maxY);

            container.style.setProperty('left', `${x}px`, 'important');
            container.style.setProperty('top', `${y}px`, 'important');
            container.style.setProperty('right', 'auto', 'important');
            container.style.setProperty('bottom', 'auto', 'important');
        } else {
            // 使用新的默认位置
            container.style.setProperty('left', STYLE.spacing.lg, 'important');
            container.style.setProperty('bottom', '100px', 'important');
            container.style.setProperty('right', 'auto', 'important');
            container.style.setProperty('top', 'auto', 'important');
        }

        // Create header with tabs
        const header = document.createElement("header");

        // Add minimize button
        const minimizeBtn = document.createElement("div");
        minimizeBtn.className = "minimize-btn";
        minimizeBtn.innerHTML = "−";
        minimizeBtn.title = "最小化监视器";
        minimizeBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            console.log("[monitor] Minimize button clicked");
            container.classList.add("minimized");

            // Save minimized state
            Storage.update(data => {
                data.minimized = true;
            });
        });
        header.appendChild(minimizeBtn);

        // Create tab buttons with proper spacing
        const usageTabBtn = document.createElement("button");
        usageTabBtn.innerHTML = `<span>用量</span>`;
        usageTabBtn.classList.add("active");

        const settingsTabBtn = document.createElement("button");
        settingsTabBtn.innerHTML = `<span>设置</span>`;

        header.appendChild(usageTabBtn);
        header.appendChild(settingsTabBtn);
        container.appendChild(header);

        // Create content panels
        const usageContent = document.createElement("div");
        usageContent.className = "content";
        usageContent.id = "usageContent";
        container.appendChild(usageContent);

        const settingsContent = document.createElement("div");
        settingsContent.className = "content";
        settingsContent.id = "settingsContent";
        settingsContent.style.display = "none";
        container.appendChild(settingsContent);

        // Add tab switching logic
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

        // Add restore functionality when clicking minimized monitor
        container.addEventListener("click", (e) => {
            if (container.classList.contains("minimized")) {
                console.log("[monitor] Clicked on minimized container, restoring...");
                container.classList.remove("minimized");

                // When restored, apply saved size
                if (usageData.size.width && usageData.size.height) {
                    container.style.width = `${usageData.size.width}px`;
                    container.style.height = `${usageData.size.height}px`;
                }

                // Save state
                Storage.update(data => {
                    data.minimized = false;
                });

                e.stopPropagation();
            }
        });

        document.body.appendChild(container);
        setupDraggable(container);
        updateUI();

        // Save size when resizing
        const resizeObserver = new ResizeObserver((entries) => {
            if (!container.classList.contains('minimized')) {
                const width = container.offsetWidth;
                const height = container.offsetHeight;
                if (width > 50 && height > 50) {
                    Storage.update(data => {
                        data.size = { width, height };
                    });
                }
            }
        });
        resizeObserver.observe(container);

        // Update UI periodically
        setInterval(updateUI, 60000); // Every minute
    }

    // Fetch Interception
    const target_window = typeof unsafeWindow === "undefined" ? window : unsafeWindow;
    const originalFetch = target_window.fetch;

    target_window.fetch = new Proxy(originalFetch, {
        apply: async function (target, thisArg, args) {
            const response = await target.apply(thisArg, args);

            try {
                const [requestInfo, requestInit] = args;
                const fetchUrl = typeof requestInfo === "string" ? requestInfo : requestInfo?.href;
                const requestMethod = typeof requestInfo === "object" && requestInfo.method
                    ? requestInfo.method
                    : requestInit?.method || "GET";

                // 检查是否是对话请求（模型使用统计）
                if (requestInit?.method === "POST" && fetchUrl?.endsWith("/conversation")) {
                    const bodyText = requestInit.body;
                    const bodyObj = JSON.parse(bodyText);

                    if (bodyObj?.model) {
                        console.debug("[monitor] Detected model usage:", bodyObj.model);
                        recordModelUsage(bodyObj.model);
                    }
                }

                // 检查是否是DeepResearch相关的API
                const deepResearchApis = [
                    { url: "/backend-api/conversation/init", method: "POST" },
                    { url: "/backend-api/accounts/check", method: "GET" },
                    { url: "/backend-api/me", method: "GET" },
                    { url: "/backend-api/models", method: "GET" }
                ];

                const shouldInterceptDeepResearch = deepResearchApis.some(api =>
                    fetchUrl?.includes(api.url) &&
                    requestMethod.toUpperCase() === api.method
                );

                if (shouldInterceptDeepResearch && response.ok) {
                    let responseBodyText;
                    try {
                        responseBodyText = await response.text();
                        const data = JSON.parse(responseBodyText);

                        // 分析DeepResearch数据
                        analyzeResponseForDeepResearch(data, fetchUrl);

                        // 返回新的 Response 对象
                        return new Response(responseBodyText, {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers,
                        });

                    } catch (error) {
                        console.warn(`[monitor] Failed to process DeepResearch data from ${fetchUrl}:`, error);

                        if (typeof responseBodyText === "string") {
                            return new Response(responseBodyText, {
                                status: response.status,
                                statusText: response.statusText,
                                headers: response.headers,
                            });
                        }
                    }
                }

            } catch (error) {
                console.warn("[monitor] Failed to process request:", error);
            }

            return response;
        },
    });

    // Initialize
    function initialize() {
        cleanupExpiredRequests();

        // 确保套餐配置是最新的
        const currentPlan = usageData.planType || "team";
        const planConfig = PLAN_CONFIGS[currentPlan];
        if (planConfig) {
            // 检查是否需要应用配置（简单检查第一个模型的配额是否匹配）
            const firstModelKey = Object.keys(planConfig.models)[0];
            if (usageData.models[firstModelKey] &&
                usageData.models[firstModelKey].quota !== planConfig.models[firstModelKey].quota) {
                console.log(`[monitor] Plan configuration outdated, applying ${planConfig.name} config`);
                applyPlanConfig(currentPlan);
            }
        }

        createMonitorUI();
        setupKeyboardShortcuts(); // 添加快捷键支持
    }

    // Setup observers and event listeners
    if (document.readyState === "loading") {
        target_window.addEventListener("DOMContentLoaded", initialize);
    } else {
        setTimeout(initialize, 500);
    }

    // Observer for dynamic content changes
    const observer = new MutationObserver(() => {
        if (!document.getElementById("chatUsageMonitor")) {
            setTimeout(initialize, 300);
        }
    });

    observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true,
    });

    // Handle navigation events
    window.addEventListener("popstate", () => setTimeout(initialize, 300));

    // Initialize immediately
    setTimeout(initialize, 300);

    console.log("🚀 ChatGPT Usage Monitor with DeepResearch tracking loaded");
})();
