import { TIME_WINDOWS } from "./config.js";

export function formatTimeAgo(timestamp) {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatTimestampForFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d}_${hh}-${mm}-${ss}`;
}

export function tsOf(req) {
  if (typeof req === "number") return req;
  if (req && typeof req.t === "number") return req.t;
  if (req && typeof req.timestamp === "number") return req.timestamp;
  return NaN;
}

export function formatTimeLeft(windowEnd) {
  const now = Date.now();
  const timeLeft = windowEnd - now;
  if (timeLeft <= 0) return "0h 0m";

  const hours = Math.floor(timeLeft / (60 * 60 * 1000));
  const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
}

export function getWindowEnd(timestamp, windowType) {
  return timestamp + TIME_WINDOWS[windowType];
}

