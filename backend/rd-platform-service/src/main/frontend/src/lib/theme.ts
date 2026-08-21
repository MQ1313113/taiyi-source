/**
 * 主题切换：light / dark / auto(跟随系统)。
 * index.css 已定义完整的 .dark CSS 变量体系，切换只需在 <html> 上加减 dark class。
 * 选择持久化到 localStorage(taiyi_theme)，main.tsx 启动时先应用，避免闪烁。
 */
export type ThemeMode = "light" | "dark" | "auto";

const KEY = "taiyi_theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

export function getThemeMode(): ThemeMode {
  const v = localStorage.getItem(KEY);
  return v === "dark" || v === "auto" ? v : "light";
}

function apply(mode: ThemeMode) {
  const dark = mode === "dark" || (mode === "auto" && media().matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function setThemeMode(mode: ThemeMode) {
  localStorage.setItem(KEY, mode);
  apply(mode);
}

/** 应用启动时调用：应用已保存的主题，并在 auto 模式下监听系统切换 */
export function initTheme() {
  apply(getThemeMode());
  media().addEventListener("change", () => {
    if (getThemeMode() === "auto") apply("auto");
  });
}
