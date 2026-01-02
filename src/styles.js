import { COLORS, STYLE } from "./config.js";

export function injectStyles() {
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
  
  #chatUsageMonitor .window-badge.hour5 {
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
  
  /* DeepResearch 分割线与区域样式 */
  #chatUsageMonitor .section-divider {
  margin: 8px 0 10px 0;
  border-top: 1px dashed ${COLORS.border};
  opacity: 0.8;
  }
  #chatUsageMonitor .deepresearch-title {
  font-family: monospace;
  font-weight: bold;
  color: ${COLORS.white};
  font-size: ${STYLE.textSize.xs};
  margin: 6px 0;
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
}
