import { useState, useEffect } from "react";
import { GitBranch, ArrowRight } from "lucide-react";
import { governanceApi } from "@/services/api";

/** 流转路径（转派留痕）：谁转给谁、几时、为什么。空则不渲染。 */
export default function FlowPath({ entityType, entityId }: { entityType: string; entityId: number }) {
  const [path, setPath] = useState<any[]>([]);

  useEffect(() => {
    if (!entityId) return;
    governanceApi.flow(entityType, entityId)
      .then((r: any) => setPath(r.data || []))
      .catch(() => setPath([]));
  }, [entityType, entityId]);

  if (path.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-border/60 p-6">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-muted-foreground" /> 流转路径（转派留痕）
      </h3>
      <div className="space-y-2">
        {path.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground text-xs w-36 shrink-0">{p.time}</span>
            <span>{p.fromName}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="font-medium">{p.toName}</span>
            {p.reason && <span className="text-xs text-muted-foreground">· {p.reason}</span>}
            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">操作:{p.operatorName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
