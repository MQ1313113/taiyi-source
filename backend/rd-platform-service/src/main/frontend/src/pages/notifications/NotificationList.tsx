import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, Filter, Settings2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { notificationApi, notificationSettingApi } from "@/services/api";
import { toast } from "sonner";

const typeConfig: Record<string, { label: string; color: string }> = {
  TASK: { label: "任务通知", color: "#0088ff" },
  TASK_ASSIGNED: { label: "任务指派", color: "#0088ff" },
  REQUIREMENT: { label: "需求通知", color: "#8b5cf6" },
  STATUS_CHANGE: { label: "状态变更", color: "#8b5cf6" },
  REVIEW_REQUEST: { label: "评审邀请", color: "#f59e0b" },
  BUG: { label: "Bug通知", color: "#ef4444" },
  BUG_REPORTED: { label: "Bug提交", color: "#ef4444" },
  SPRINT: { label: "迭代通知", color: "#06b6d4" },
  TEST: { label: "测试通知", color: "#10b981" },
  DEADLINE_WARNING: { label: "截止预警", color: "#dc2626" },
  MENTION: { label: "@提及", color: "#10b981" },
  SYSTEM: { label: "系统通知", color: "#6b7280" },
};

export default function NotificationList() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL");
  const [activeTab, setActiveTab] = useState<"messages" | "settings">("messages");

  const fetchNotifications = () => {
    setLoading(true);
    notificationApi.list({ page: 1, size: 50 }).then((res: any) => {
      setNotifications(res.data?.records || res.data || []);
    }).catch(() => {
      setNotifications([]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleMarkRead = (id: number) => {
    notificationApi.markRead(id).then(() => {
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    }).catch(() => {
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    });
  };

  const handleMarkAllRead = () => {
    notificationApi.markAllRead().then(() => {
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      toast.success("已全部标记为已读");
    }).catch(() => {
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      toast.success("已全部标记为已读");
    });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const filtered = notifications.filter(n => filterType === "ALL" || n.type === filterType);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#0088ff]" /> 通知中心
            {unreadCount > 0 && <Badge className="bg-red-500 text-white text-[10px]">{unreadCount}</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">站内信 + WebSocket实时推送</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "messages" && (
            <Button variant="outline" onClick={handleMarkAllRead} className="rounded-lg" disabled={unreadCount === 0}>
              <CheckCheck className="w-4 h-4 mr-1" /> 全部已读
            </Button>
          )}
        </div>
      </div>

      {/* Tab切换 */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("messages")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "messages" ? "bg-white shadow-sm text-[#0088ff]" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Bell className="w-3.5 h-3.5 inline mr-1.5" />消息列表
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "settings" ? "bg-white shadow-sm text-[#0088ff]" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Settings2 className="w-3.5 h-3.5 inline mr-1.5" />通知设置
        </button>
      </div>

      {activeTab === "messages" ? (
        <>
          {/* Filter */}
          <div className="flex items-center gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36"><SelectValue placeholder="筛选类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部类型</SelectItem>
                {Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">共 {filtered.length} 条通知</span>
          </div>

          {/* Notification List */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-[#0088ff]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">暂无通知</div>
            ) : (
              filtered.map((notif, i) => {
                const type = typeConfig[notif.type] || typeConfig.SYSTEM;
                return (
                  <motion.div key={notif.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className={`bg-white rounded-xl border p-4 hover:shadow-md transition-all duration-300 cursor-pointer ${!notif.isRead ? "border-[#0088ff]/30 bg-blue-50/30" : "border-border/60"}`}
                    onClick={() => !notif.isRead && handleMarkRead(notif.id)}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${type.color}15` }}>
                        <Bell className="w-4 h-4" style={{ color: type.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${!notif.isRead ? "font-semibold" : "font-medium"}`}>{notif.title}</span>
                          {notif.priority === "URGENT" && <Badge className="text-[9px] bg-red-50 text-red-600 border-red-200">紧急</Badge>}
                          {!notif.isRead && <div className="w-2 h-2 rounded-full bg-[#0088ff]" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{notif.content}</p>
                        <span className="text-[10px] text-muted-foreground/60 mt-1 block">{notif.createdAt}</span>
                      </div>
                      <Badge className="text-[9px] shrink-0" style={{ backgroundColor: `${type.color}15`, color: type.color }}>{type.label}</Badge>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <NotificationSettingsPanel />
      )}
    </div>
  );
}

// ============ 通知设置面板（所有用户可用） ============
function NotificationSettingsPanel() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  const channelConfig = [
    { code: "SITE", name: "站内信", desc: "WebSocket实时推送 + 全局弹窗 + 声音提醒", icon: "🔔", required: true },
    { code: "FEISHU", name: "飞书", desc: "通过飞书机器人Webhook推送通知", icon: "📱", required: false },
    { code: "DINGTALK", name: "钉钉", desc: "通过钉钉群机器人Webhook推送通知", icon: "💬", required: false },
    { code: "WECHAT_WORK", name: "企业微信", desc: "通过企业微信群机器人Webhook推送通知", icon: "💼", required: false },
  ];

  const levelOptions = [
    { value: "ALL", label: "全部通知" },
    { value: "URGENT", label: "仅紧急通知" },
    { value: "NONE", label: "不接收" },
  ];

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = () => {
    setLoading(true);
    notificationSettingApi.list().then((res: any) => {
      const data = res.data || [];
      const hasSite = data.some((s: any) => s.channel === "SITE");
      if (!hasSite) {
        data.unshift({ channel: "SITE", enabled: 1, notifyLevel: "ALL", webhookUrl: null, quietStart: null, quietEnd: null });
      }
      setSettings(data);
    }).catch(() => {
      setSettings([{ channel: "SITE", enabled: 1, notifyLevel: "ALL", webhookUrl: null, quietStart: null, quietEnd: null }]);
    }).finally(() => setLoading(false));
  };

  const getSettingForChannel = (channel: string) => {
    return settings.find(s => s.channel === channel) || { channel, enabled: 0, notifyLevel: "ALL", webhookUrl: "", quietStart: null, quietEnd: null };
  };

  const updateSetting = (channel: string, field: string, value: any) => {
    setSettings(prev => {
      const existing = prev.find(s => s.channel === channel);
      if (existing) {
        return prev.map(s => s.channel === channel ? { ...s, [field]: value } : s);
      } else {
        return [...prev, { channel, enabled: 0, notifyLevel: "ALL", webhookUrl: "", [field]: value }];
      }
    });
  };

  const handleSave = () => {
    setSaving(true);
    const payload = settings.map(s => ({
      channel: s.channel,
      enabled: s.enabled,
      webhookUrl: s.webhookUrl || null,
      notifyLevel: s.notifyLevel || "ALL",
      quietStart: s.quietStart || null,
      quietEnd: s.quietEnd || null,
    }));
    notificationSettingApi.batchSave(payload).then(() => {
      toast.success("通知设置已保存");
    }).catch(() => {
      toast.error("保存失败");
    }).finally(() => setSaving(false));
  };

  const handleTestWebhook = (channel: string) => {
    const setting = getSettingForChannel(channel);
    if (!setting.webhookUrl) {
      toast.error("请先填写Webhook地址");
      return;
    }
    setTestingChannel(channel);
    notificationSettingApi.testWebhook({ channel, webhookUrl: setting.webhookUrl }).then((res: any) => {
      if (res.code === 200) {
        toast.success("测试消息已发送，请检查对应渠道");
      } else {
        toast.error(res.message || "测试失败");
      }
    }).catch(() => {
      toast.error("测试请求失败");
    }).finally(() => setTestingChannel(null));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#0088ff]" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* 说明 */}
      <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
        <p className="text-sm text-blue-800">
          <strong>通知策略：</strong>当流程或任务流转到您时，系统会通过您启用的渠道发送强提醒。
          站内信为默认渠道（不可关闭），您可以额外启用飞书、钉钉、企业微信等渠道接收通知。
        </p>
      </div>

      {/* 渠道列表 */}
      <div className="space-y-4">
        {channelConfig.map(ch => {
          const setting = getSettingForChannel(ch.code);
          const isEnabled = setting.enabled === 1;

          return (
            <div key={ch.code} className={`rounded-xl border p-4 transition-all ${isEnabled ? "border-[#0088ff]/30 bg-white shadow-sm" : "border-border/40 bg-muted/20"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ch.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{ch.name}</span>
                      {ch.required && <Badge className="text-[9px] bg-blue-50 text-blue-600 border-blue-200">默认</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{ch.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  disabled={ch.required}
                  onCheckedChange={(v) => updateSetting(ch.code, "enabled", v ? 1 : 0)}
                />
              </div>

              {/* 展开配置 */}
              {isEnabled && (
                <div className="mt-4 pt-4 border-t border-border/40 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">通知级别</Label>
                      <Select value={setting.notifyLevel || "ALL"} onValueChange={(v) => updateSetting(ch.code, "notifyLevel", v)}>
                        <SelectTrigger className="h-9 rounded-lg text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {levelOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">免打扰时段</Label>
                      <div className="flex items-center gap-2">
                        <Input type="time" className="h-9 rounded-lg text-xs flex-1"
                          value={setting.quietStart || ""} onChange={(e) => updateSetting(ch.code, "quietStart", e.target.value)} />
                        <span className="text-xs text-muted-foreground">至</span>
                        <Input type="time" className="h-9 rounded-lg text-xs flex-1"
                          value={setting.quietEnd || ""} onChange={(e) => updateSetting(ch.code, "quietEnd", e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* Webhook配置（非站内信） */}
                  {!ch.required && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Webhook 地址</Label>
                      <div className="flex gap-2">
                        <Input className="h-9 rounded-lg text-xs flex-1" placeholder={`粘贴${ch.name}机器人Webhook URL`}
                          value={setting.webhookUrl || ""} onChange={(e) => updateSetting(ch.code, "webhookUrl", e.target.value)} />
                        <Button variant="outline" size="sm" className="h-9 rounded-lg text-xs px-3"
                          disabled={testingChannel === ch.code}
                          onClick={() => handleTestWebhook(ch.code)}>
                          {testingChannel === ch.code ? <Loader2 className="w-3 h-3 animate-spin" /> : "测试"}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {ch.code === "FEISHU" && "在飞书群设置 → 群机器人 → 添加自定义机器人，复制Webhook地址"}
                        {ch.code === "DINGTALK" && "在钉钉群设置 → 智能群助手 → 添加自定义机器人，复制Webhook地址"}
                        {ch.code === "WECHAT_WORK" && "在企业微信群 → 群机器人 → 添加机器人，复制Webhook地址"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 保存按钮 */}
      <div className="flex justify-end pt-2">
        <Button className="bg-[#0088ff] hover:bg-[#0066cc] text-white rounded-xl px-6"
          onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />保存中...</> : "保存设置"}
        </Button>
      </div>
    </div>
  );
}
