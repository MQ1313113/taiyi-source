import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useNotificationWebSocket, NotificationMessage, playNotificationSound } from "@/hooks/useNotificationWebSocket";
import { notificationApi } from "@/services/api";

interface ToastItem {
  id: number;
  notification: NotificationMessage;
  timestamp: number;
}

const TOAST_DURATION = 8000; // 普通通知8秒后自动消失
const URGENT_TOAST_DURATION = 15000; // 紧急通知15秒

const priorityConfig = {
  URGENT: { icon: AlertTriangle, color: "#ef4444", bg: "bg-red-50", border: "border-red-200", label: "紧急" },
  NORMAL: { icon: Bell, color: "#0088ff", bg: "bg-blue-50", border: "border-blue-200", label: "通知" },
};

const typeIcons: Record<string, string> = {
  TASK_ASSIGN: "📋",
  STATUS_CHANGE: "🔄",
  REVIEW_INVITE: "📝",
  BUG_ASSIGN: "🐛",
  WARNING: "⚠️",
  SYSTEM: "⚙️",
};

export default function GlobalNotificationToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const toastIdCounter = useRef(0);

  // 获取未读数
  const fetchUnreadCount = useCallback(() => {
    // 只在有有效token时才请求，避免会话过期后反复触发401
    const token = localStorage.getItem('taiyi_token');
    if (!token) return;
    notificationApi.unreadCount().then((res: any) => {
      setUnreadCount(res.data?.count || 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // 每30秒轮询一次作为兖底
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleNotification = useCallback((notification: NotificationMessage) => {
    // 播放提示音
    playNotificationSound();

    // 紧急通知尝试浏览器通知
    if (notification.priority === "URGENT" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(`[紧急] ${notification.title}`, {
          body: notification.content,
          icon: "/logo.png",
          tag: `taiyi-${notification.id}`,
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }

    // 添加到Toast队列
    const toastId = ++toastIdCounter.current;
    const newToast: ToastItem = { id: toastId, notification, timestamp: Date.now() };
    setToasts(prev => [...prev.slice(-4), newToast]); // 最多显示5条

    // 更新未读数
    setUnreadCount(prev => prev + 1);

    // 自动消失
    const duration = notification.priority === "URGENT" ? URGENT_TOAST_DURATION : TOAST_DURATION;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toastId));
    }, duration);
  }, []);

  const dismissToast = useCallback((toastId: number) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  }, []);

  // WebSocket连接
  useNotificationWebSocket({
    onNotification: handleNotification,
    enabled: !!localStorage.getItem("token"),
  });

  // 暴露unreadCount到全局，供顶部导航使用
  useEffect(() => {
    (window as any).__taiyi_unread_count = unreadCount;
    window.dispatchEvent(new CustomEvent("taiyi-unread-update", { detail: unreadCount }));
  }, [unreadCount]);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = priorityConfig[toast.notification.priority as keyof typeof priorityConfig] || priorityConfig.NORMAL;
          const Icon = config.icon;
          const emoji = typeIcons[toast.notification.type] || "🔔";

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.8 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`pointer-events-auto rounded-xl border ${config.border} ${config.bg} p-4 shadow-lg backdrop-blur-sm cursor-pointer hover:shadow-xl transition-shadow`}
              onClick={() => {
                dismissToast(toast.id);
                // 可以跳转到对应页面
                if (toast.notification.targetType === "REQUIREMENT") {
                  window.location.href = "/app/requirements";
                } else if (toast.notification.targetType === "TASK") {
                  window.location.href = "/app/tasks";
                } else if (toast.notification.targetType === "BUG") {
                  window.location.href = "/app/bugs";
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}20` }}>
                  <span className="text-base">{emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{toast.notification.title}</span>
                    {toast.notification.priority === "URGENT" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">紧急</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{toast.notification.content}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); dismissToast(toast.id); }}
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
