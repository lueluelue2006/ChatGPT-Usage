import { COLORS } from "../config.js";

export function showToast(message, type = "success") {
  const container = document.getElementById("chatUsageMonitor");
  if (!container) return;

  const existingToast = container.querySelector(".toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  if (type === "error") {
    toast.style.color = COLORS.danger;
    toast.style.borderColor = COLORS.danger;
  } else if (type === "warning") {
    toast.style.color = COLORS.warning;
    toast.style.borderColor = COLORS.warning;
  }

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

