import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Radar, ShieldAlert, AlertTriangle, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { governanceApi } from "@/services/api";
import { useRole } from "@/contexts/RoleContext";

const typeColor: Record<string, string> = {
  需求: "#ec4899", 任务: "#0088ff", 缺陷: "#ef4444", 工单: "#8b5cf6",
};

export default function GovernancePage() {
  const { role } = useRole();
  const allowed = role === "pm" || role === "sys_admin";
  const [radar, setRadar] = useState<any[]>([]);
  const [portrait, setPortrait] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allowed) { setLoading(false); return; }
    Promise.all([governanceApi.radar(), governanceApi.portrait()])
      .then(([r, p]: any[]) => {
        setRadar(r.data || []);
        setPortrait(p.data || []);
      })
      .catch(() => { setRadar([]); setPortrait([]); })
      .finally(() => setLoading(false));
  }, [allowed]);

  if (!allowed) {
    return (
      <div className="p-6">
        <div className="py-20 text-center text-muted-foreground">
          <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-40" />
          仅产品经理 / 系统管理员可查看治理看板
        </div>
      </div>
    );
  }

  const stuckCount = radar.filter((i) => i.stuck).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Radar className="w-5 h-5 text-[#0088ff]" /> 责任看板
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">球在谁脚下、卡了多久、谁总被打回——把拖延和不专业变成看得见的数字</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">加载中...</p>
      ) : (
        <>
          {/* 责任雷达 */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-border/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Radar className="w-4 h-4 text-[#0088ff]" /> 责任雷达 · 球在谁脚下
              </h3>
              <Badge className="bg-red-50 text-red-600 text-[10px]">{stuckCount} 项卡住(≥3天没动)</Badge>
            </div>
            {radar.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">当前没有未闭环的在办项</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border/50">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2">类型</th>
                      <th className="text-left px-3 py-2">标题</th>
                      <th className="text-left px-3 py-2">球在谁脚下</th>
                      <th className="text-left px-3 py-2">状态</th>
                      <th className="text-right px-3 py-2">卡了多久</th>
                    </tr>
                  </thead>
                  <tbody>
                    {radar.slice(0, 100).map((i, idx) => (
                      <tr key={idx} className={`border-t border-border/40 ${i.stuck ? "bg-red-50/40" : ""}`}>
                        <td className="px-3 py-2">
                          <Badge style={{ backgroundColor: `${typeColor[i.type] || "#6b7280"}15`, color: typeColor[i.type] || "#6b7280" }} className="text-[10px]">{i.type}</Badge>
                        </td>
                        <td className="px-3 py-2 max-w-[280px] truncate">{i.title}</td>
                        <td className="px-3 py-2">{i.holderName}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{i.status}</td>
                        <td className={`px-3 py-2 text-right font-medium ${i.stuck ? "text-red-600" : ""}`}>
                          {i.stuck && <AlertTriangle className="w-3 h-3 inline mr-1" />}{i.ageDays} 天
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* 健康度画像 */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-border/60 p-6">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <RotateCcw className="w-4 h-4 text-amber-500" /> 个人健康度画像
            </h3>
            {portrait.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">暂无数据</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border/50">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2">成员</th>
                      <th className="text-right px-3 py-2">在办</th>
                      <th className="text-right px-3 py-2">平均滞留</th>
                      <th className="text-right px-3 py-2">被打回次数</th>
                      <th className="text-right px-3 py-2">转出</th>
                      <th className="text-right px-3 py-2">转入</th>
                      <th className="text-right px-3 py-2">净流入</th>
                      <th className="text-right px-3 py-2">已完成</th>
                      <th className="text-right px-3 py-2">按时完成率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portrait.map((m, idx) => (
                      <tr key={idx} className="border-t border-border/40">
                        <td className="px-3 py-2 font-medium">{m.name}</td>
                        <td className="px-3 py-2 text-right">{m.openCount}</td>
                        <td className="px-3 py-2 text-right">{m.avgAgeDays} 天</td>
                        <td className={`px-3 py-2 text-right ${m.reworkBlamed > 0 ? "text-red-600 font-medium" : ""}`}>{m.reworkBlamed}</td>
                        <td className="px-3 py-2 text-right">{m.transferOut}</td>
                        <td className="px-3 py-2 text-right">{m.transferIn}</td>
                        <td className={`px-3 py-2 text-right font-medium ${m.netIn < 0 ? "text-red-600" : m.netIn > 0 ? "text-emerald-600" : ""}`}>
                          {m.netIn > 0 ? `+${m.netIn}` : m.netIn}
                        </td>
                        <td className="px-3 py-2 text-right">{m.doneCount}</td>
                        <td className={`px-3 py-2 text-right ${m.onTimeRate != null && m.onTimeRate < 60 ? "text-amber-600 font-medium" : ""}`}>
                          {m.onTimeRate != null ? `${m.onTimeRate}%` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              说明：被打回次数 = 作为责任方被测试/评审打回的次数;<b>净流入 = 转入(接锅) − 转出(甩活)</b>,负数(红)= 甩活多于接活。
              数据用于站会解卡与月度复盘,对事不对人。
            </p>
          </motion.div>
        </>
      )}
    </div>
  );
}
