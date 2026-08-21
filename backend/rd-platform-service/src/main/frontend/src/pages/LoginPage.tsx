import { useState, useEffect, useCallback } from "react";
import { authApi } from "@/services/api";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRole, roleInfo, type RoleType } from "@/contexts/RoleContext";
import { toast } from "sonner";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  // 记住我：登录成功后持久化用户名(不存密码)，下次打开自动回填
  const [username, setUsername] = useState(() => localStorage.getItem("taiyi_remember_username") || "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(() => !!localStorage.getItem("taiyi_remember_username"));
  const { setRole } = useRole();

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  // Map backend role string to frontend RoleType
  const mapBackendRole = (roles: string[]): RoleType => {
    if (roles.includes("admin") || roles.includes("sys_admin")) return "sys_admin";
    if (roles.includes("pm")) return "pm";
    if (roles.includes("developer") || roles.includes("dev")) return "developer";
    if (roles.includes("qa") || roles.includes("tester")) return "qa";
    if (roles.includes("support")) return "support";
    return "developer";
  };

  const getDashboardPath = (role: RoleType): string => {
    const paths: Record<RoleType, string> = {
      sys_admin: "/app/dashboard/admin",
      pm: "/app/dashboard/pm",
      developer: "/app/dashboard/dev",
      qa: "/app/dashboard/qa",
      support: "/app/dashboard/support",
    };
    return paths[role];
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error("请输入用户名");
      return;
    }
    if (!password.trim()) {
      toast.error("请输入密码");
      return;
    }

    setLoading(true);
    
    try {
      const res: any = await authApi.login({ username: username.trim(), password: password });
      
      if (res.code === 200 && res.data?.token) {
        const backendRoles = res.data.roles || [];
        const detectedRole = mapBackendRole(Array.isArray(backendRoles) ? backendRoles : [backendRoles]);
        
        localStorage.setItem('taiyi_token', res.data.token);
        localStorage.setItem('taiyi_user', JSON.stringify(res.data));
        localStorage.setItem('taiyi_role', detectedRole);
        // 记住我：仅持久化用户名，出于安全不保存密码
        if (remember) localStorage.setItem('taiyi_remember_username', username.trim());
        else localStorage.removeItem('taiyi_remember_username');
        setRole(detectedRole);
        // 首次登录或被管理员重置密码 → 强制先改密，改密成功前不进系统
        if (res.data.isFirstLogin === 1) {
          toast.info("首次登录", { description: "为保障安全，请先修改初始密码" });
          setTimeout(() => setLocation("/app/change-password"), 300);
          return;
        }
        toast.success("登录成功", { description: `欢迎回来，${res.data.nickname || username}` });
        setTimeout(() => setLocation(getDashboardPath(detectedRole)), 300);
      } else {
        toast.error("登录失败", { description: res.message || "用户名或密码错误" });
      }
    } catch (error: any) {
      // 透出后端真实原因(如"账号已被禁用"),不再一律显示"用户名或密码错误"
      const msg = error?.message || error?.response?.data?.message || "用户名或密码错误，请重试";
      toast.error("登录失败", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Grid Background */}
      <div className="fixed inset-0 taiyi-grid-bg" />
      
      {/* Mouse Follow Glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 136, 255, 0.06), transparent 60%)`,
        }}
      />

      {/* Decorative Elements */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-[#0088ff]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-[#ff5500]/5 rounded-full blur-3xl" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-[420px] mx-4">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-border/80 shadow-xl shadow-black/5 p-8">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <img src="/logo.png" alt="太一" className="w-14 h-14 rounded-2xl mx-auto mb-4 shadow-lg shadow-[#0088ff]/20" />
            <h1 className="text-2xl font-bold text-foreground">太一 TaiYi</h1>
            <p className="text-sm text-muted-foreground mt-1">研发管理平台 · 万物归一，秩序自生</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">用户名</Label>
              <Input
                id="username"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => { setUsername(e.target.value); }}
                className="h-11 rounded-xl bg-muted/30 border-border/60 focus:border-[#0088ff] focus:ring-[#0088ff]/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">密码</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); }}
                  className="h-11 rounded-xl bg-muted/30 border-border/60 pr-10 focus:border-[#0088ff] focus:ring-[#0088ff]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
                <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  记住我
                </Label>
              </div>
              <button type="button" className="text-sm text-[#0088ff] hover:underline" onClick={() => toast.info("忘记密码", { description: "请联系系统管理员重置密码" })}>
                忘记密码？
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] text-white font-medium text-sm taiyi-btn-active shadow-lg shadow-[#ff5500]/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  登录中...
                </>
              ) : (
                "登录"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-5 pt-4 border-t border-border/60 text-center">
            <p className="text-xs text-muted-foreground">
              太一研发管理平台 V3.0 · 渐进式弹性框架
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
