import { useEffect, useRef, useCallback, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export interface NotificationMessage {
  id: number;
  title: string;
  content: string;
  type: string;
  priority: string;
  targetType: string;
  targetId: number;
  createdAt: string;
  isRead: boolean;
}

interface UseNotificationWebSocketOptions {
  onNotification: (notification: NotificationMessage) => void;
  enabled?: boolean;
}

// 通知提示音（base64编码的简短提示音）
const NOTIFICATION_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczGjmC0teleEQvSYvO5cF5RjA6dLvb2JRiQjlOeLXS0JZnRz1Qd7PQzpZoST9Rd7LOy5RnSUBTerHMx5JkR0FWfbLJxI5gQkNbgLTHwIpbPUVfibrDvYRUOkxljb3CuH9RNVB0mMHBt3hLN1WBo8nBtXRDNFqMr8/CrW5ALl2Sts7DqmhAMmCWuNDBpWI7MWOdvtG/oFw2MWqkxNa8mFMxNXKsyti3kEotOX20z9qxhkIpQYe90NmogDsiSJDB0dWZcjMgUJvF0M+OYyshW6XJ0MWCVCQlZa7Lz7t3RyYrcLbP0K5qOicxfcLT0KJdLCk9h8vUz5RQKy1Jj8/WzYtGKjFTlNHYyoZELTdamNXdyIRBMT1pntzjxn8+LUWJr9vkwHQ1IU2Xr+DlvGwwHlCa8GRnuSotnRFdMuZouqfrKpuRXzToKvvp6pmcEiC16+37qqjZnJMi9y3v/Gnm2R0VJXnwcv5oJFYdl2i68TP+5aMWoBqq+Lc+5B9T4x0s/Dq+4pyRpCEhc/0+fqBbECYm5b2/v2CZjqNnqW+P/+gGI/mJyf+v7+gmM/mZyh/P/+gWE+l5uf+/7+gWE+l5uf+/7+gWE+l5uf+/7+gWE+l5uf+/7+gWE+l5uf+/7+gWE+l5uf+/7+gA==";

let audioContext: AudioContext | null = null;

function playNotificationSound() {
  try {
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 0.5;
    audio.play().catch(() => {
      // 浏览器可能阻止自动播放，忽略错误
    });
  } catch (e) {
    // ignore
  }
}

export { playNotificationSound };

export function useNotificationWebSocket({ onNotification, enabled = true }: UseNotificationWebSocketOptions) {
  const clientRef = useRef<Client | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token || !enabled) return;

    // 确定WebSocket URL
    const wsUrl = `${window.location.protocol === "https:" ? "https:" : "http:"}//${window.location.host}/ws`;

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        token: token,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setConnected(true);
        console.log("[WS] 通知WebSocket已连接");

        // 订阅用户个人通知队列
        client.subscribe("/user/queue/notifications", (message) => {
          try {
            const notification: NotificationMessage = JSON.parse(message.body);
            onNotification(notification);
          } catch (e) {
            console.warn("[WS] 解析通知消息失败:", e);
          }
        });
      },
      onDisconnect: () => {
        setConnected(false);
        console.log("[WS] 通知WebSocket已断开");
      },
      onStompError: (frame) => {
        console.warn("[WS] STOMP错误:", frame.headers["message"]);
        setConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;
  }, [enabled, onNotification]);

  useEffect(() => {
    connect();
    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return { connected, playNotificationSound };
}
