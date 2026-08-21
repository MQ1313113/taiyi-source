import { useState } from "react";
import { Ticket, Search, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { copyText } from "@/lib/clipboard";

// 公开报障页:不登录、不走带鉴权拦截的 api 实例,用原生 fetch 直连公开接口
const STATUS_LABEL: Record<string, string> = {
  PENDING_TRIAGE: "已收到,等待处理人员确认",
  DISPATCHED: "已确认,已安排处理人员",
  PROCESSING: "处理中",
  RESOLVED: "已解决",
  CLOSED: "已关闭",
};

export default function SupportPortal() {
  const [tab, setTab] = useState<"submit" | "query">("submit");
  const [form, setForm] = useState({ title: "", description: "", contactInfo: "", website: "" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ticketCode: string; queryToken: string } | null>(null);
  const [query, setQuery] = useState({ code: "", token: "" });
  const [queryResult, setQueryResult] = useState<any>(null);

  const submit = async () => {
    if (!form.title.trim()) { toast.error("请填写问题标题"); return; }
    if (!form.contactInfo.trim()) { toast.error("请留下联系方式,便于处理人员与您联系"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/public/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (body.code === 200) {
        setResult(body.data);
        setForm({ title: "", description: "", contactInfo: "", website: "" });
      } else {
        toast.error(body.message || "提交失败,请稍后再试");
      }
    } catch {
      toast.error("网络异常,请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  const doQuery = async () => {
    if (!query.code.trim() || !query.token.trim()) { toast.error("请输入工单号和查询码"); return; }
    setQueryResult(null);
    try {
      const res = await fetch(`/api/v1/public/tickets/status?code=${encodeURIComponent(query.code.trim())}&token=${encodeURIComponent(query.token.trim())}`);
      const body = await res.json();
      if (body.code === 200) setQueryResult(body.data);
      else toast.error(body.message || "查询失败");
    } catch {
      toast.error("网络异常,请稍后再试");
    }
  };

  const copyResult = () => {
    if (!result) return;
    copyText(`工单号:${result.ticketCode} 查询码:${result.queryToken}`).then(
      () => toast.success("已复制"), () => toast.error("复制失败,请手动记录"));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold flex items-center justify-center gap-2">
            <Ticket className="w-6 h-6 text-[#0088ff]" /> 问题反馈
          </h1>
          <p className="text-sm text-slate-500 mt-1">无需登录,提交后请妥善保存工单号与查询码</p>
        </div>

        <div className="flex gap-1 border-b border-slate-200 mb-6">
          {([["submit", "提交问题"], ["query", "查询进度"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 text-sm -mb-px border-b-2 ${tab === k ? "border-[#0088ff] text-[#0088ff] font-medium" : "border-transparent text-slate-500"}`}>
              {l}
            </button>
          ))}
        </div>

        {tab === "submit" && !result && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">问题标题 <span className="text-red-500">*</span></Label>
              <Input maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="一句话说清遇到的问题" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">详细描述</Label>
              <Textarea maxLength={2000} rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="发生了什么、在哪个页面/设备、如何复现、影响范围等,越详细处理越快" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">联系方式 <span className="text-red-500">*</span></Label>
              <Input maxLength={128} value={form.contactInfo} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} placeholder="手机 / 邮箱 / 姓名,便于处理人员联系您" />
            </div>
            {/* 蜜罐字段:对人类不可见,机器人填了即被服务端静默丢弃 */}
            <input type="text" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="absolute -left-[9999px] top-0 h-0 w-0 opacity-0" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <Button disabled={submitting} onClick={submit} className="w-full bg-[#0088ff] hover:bg-[#0066cc] text-white">
              {submitting ? "提交中..." : "提交问题"}
            </Button>
          </div>
        )}

        {tab === "submit" && result && (
          <div className="text-center space-y-4 py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="font-medium">提交成功,工作人员会尽快确认处理</p>
            <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
              <p>工单号:<span className="font-mono font-semibold">{result.ticketCode}</span></p>
              <p>查询码:<span className="font-mono font-semibold">{result.queryToken}</span></p>
            </div>
            <p className="text-xs text-amber-600">请务必保存工单号与查询码——这是查询处理进度的唯一凭证,丢失后无法找回。</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={copyResult}><Copy className="w-3.5 h-3.5 mr-1" />复制凭证</Button>
              <Button variant="outline" size="sm" onClick={() => { setQuery({ code: result.ticketCode, token: result.queryToken }); setTab("query"); }}>去查进度</Button>
              <Button size="sm" onClick={() => setResult(null)} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">再提一个</Button>
            </div>
          </div>
        )}

        {tab === "query" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">工单号</Label>
              <Input value={query.code} onChange={(e) => setQuery({ ...query, code: e.target.value })} placeholder="如 TK-2026-0012" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">查询码</Label>
              <Input value={query.token} onChange={(e) => setQuery({ ...query, token: e.target.value })} placeholder="提交成功时页面展示的查询码" />
            </div>
            <Button onClick={doQuery} className="w-full bg-[#0088ff] hover:bg-[#0066cc] text-white">
              <Search className="w-4 h-4 mr-1" /> 查询进度
            </Button>
            {queryResult && (
              <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
                <p className="font-medium">{queryResult.title}</p>
                <p>状态:<span className="font-semibold text-[#0088ff]">{STATUS_LABEL[queryResult.status] || queryResult.status}</span></p>
                <p className="text-xs text-slate-500">提交时间:{queryResult.createdAt || "-"}</p>
                {queryResult.resolvedAt && <p className="text-xs text-slate-500">解决时间:{queryResult.resolvedAt}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
