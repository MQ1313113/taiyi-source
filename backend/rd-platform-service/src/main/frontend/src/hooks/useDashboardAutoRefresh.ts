import { useEffect, useRef } from "react";

/**
 * 工作台自动刷新：
 * 1. 定时轮询（默认 60s，页面不可见时暂停，避免后台标签页空转）；
 * 2. 收到 WebSocket 通知（GlobalNotificationToast 广播的 taiyi-notification 事件）时立即刷新；
 * 3. 从后台标签页切回来时立即刷新一次。
 * 组件卸载（离开工作台页面）自动清理监听，不会在其他页面触发。
 */
export function useDashboardAutoRefresh(refresh: () => void, intervalMs = 60000) {
  // 用 ref 持有最新的 refresh，避免闭包捕获过期的筛选条件（如 projectId）
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refreshRef.current();
    }, intervalMs);
    const onNotify = () => refreshRef.current();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshRef.current();
    };
    window.addEventListener("taiyi-notification", onNotify);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      window.removeEventListener("taiyi-notification", onNotify);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);
}
