import { useState } from "react";
import { useLocation } from "wouter";
import { userApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

/**
 * 强制/自助修改密码页。
 * 首次登录或被管理员重置密码后，登录会被重定向到此页（forced 模式），
 * 改密成功前无法进入系统，成功后清除 isFirstLogin 标记并进入工作台。
 */
export default function ChangePasswordPage() {
  const [, setLocation] = useLocation();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  // 是否为首次登录强制改密（无法跳过）
  let forced = false;
  try {
    const u = JSON.parse(localStorage.getItem("taiyi_user") || "{}");
    forced = u?.isFirstLogin === 1;
  } catch { /* ignore */ }

  const dashboardPath = (): string => {
    const role = localStorage.getItem("taiyi_role") || "developer";
    const paths: Record<string, string> = {
      sys_admin: "/app/dashboard/admin",
      pm: "/app/dashboard/pm",
      developer: "/app/dashboard/dev",
      qa: "/app/dashboard/qa",
    };
    return paths[role] || "/app/dashboard/dev";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) return toast.error("请输入原密码");
    if (newPassword.length < 8) return toast.error("新密码至少 8 位");
    if (newPassword === oldPassword) return toast.error("新密码不能与原密码相同");
    if (newPassword !== confirm) return toast.error("两次输入的新密码不一致");

    setLoading(true);
    try {
      await userApi.changePassword({ oldPassword, newPassword });
      // 清除本地首次登录标记
      try {
        const u = JSON.parse(localStorage.getItem("taiyi_user") || "{}");
        u.isFirstLogin = 0;
        localStorage.setItem("taiyi_user", JSON.stringify(u));
      } catch { /* ignore */ }
      toast.success("密码修改成功", { description: "请使用新密码，正在进入系统…" });
      setTimeout(() => setLocation(dashboardPath()), 400);
    } catch (err: any) {
      toast.error("修改失败", { description: err?.message || "原密码错误或请求异常" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="fixed inset-0 taiyi-grid-bg" />
      <div className="relative z-10 w-full max-w-[420px] mx-4">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-border/80 shadow-xl shadow-black/5 p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-[#ff5500]/10">
              <ShieldAlert className="w-6 h-6 text-[#ff5500]" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              {forced ? "首次登录 · 请修改密码" : "修改密码"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {forced ? "为保障账号安全，请先设置新密码后再进入系统" : "设置新的登录密码"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">原密码</Label>
              <Input
                type={show ? "text" : "password"}
                placeholder="请输入原密码"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">新密码</Label>
              <div className="relative">
                <Input
                  type={show ? "text" : "password"}
                  placeholder="至少 8 位，不能与原密码相同"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">确认新密码</Label>
              <Input
                type={show ? "text" : "password"}
                placeholder="再次输入新密码"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] text-white font-medium"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />提交中...</>
              ) : "确认修改"}
            </Button>

            {!forced && (
              <button
                type="button"
                onClick={() => setLocation(dashboardPath())}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                返回
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
