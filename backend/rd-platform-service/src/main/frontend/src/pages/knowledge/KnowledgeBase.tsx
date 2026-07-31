import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Search, Eye, ThumbsUp, FileText, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { knowledgeApi } from "@/services/api";
import { toast } from "sonner";

const categoryConfig: Record<string, { label: string; color: string; icon: string }> = {
  TECHNICAL: { label: "技术文档", color: "#0088ff", icon: "📘" },
  PROCESS: { label: "流程规范", color: "#8b5cf6", icon: "📋" },
  BEST_PRACTICE: { label: "最佳实践", color: "#10b981", icon: "✨" },
  TROUBLESHOOTING: { label: "问题排查", color: "#f59e0b", icon: "🔧" },
  ONBOARDING: { label: "新人指南", color: "#ec4899", icon: "🎓" },
};

export default function KnowledgeBase() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [form, setForm] = useState({ title: "", content: "", category: "TECHNICAL", tags: "" });

  const fetchArticles = () => {
    setLoading(true);
    knowledgeApi.list({ page: 1, size: 50 }).then((res: any) => {
      setArticles(res.data?.records || res.data || []);
    }).catch(() => {
      setArticles([]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchArticles(); }, []);

  const handleCreate = () => {
    if (!form.title || !form.content || !form.category) {
      toast.error("请填写所有必填字段"); return;
    }
    knowledgeApi.create({ ...form, projectId: 1 }).then(() => {
      toast.success("知识文档已创建");
      setShowCreate(false);
      fetchArticles();
    }).catch((err: any) => toast.error(err?.message || "创建失败"));
  };

  const filtered = articles.filter(a => {
    if (filterCategory !== "ALL" && a.category !== filterCategory) return false;
    const tagsStr = typeof a.tags === 'string' ? a.tags : (Array.isArray(a.tags) ? a.tags.join(',') : '');
    if (searchText && !a.title?.includes(searchText) && !tagsStr.includes(searchText)) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#0088ff]" /> 知识库
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">团队知识沉淀与共享，支持全文检索和标签分类</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#0088ff] hover:bg-[#0066cc] text-white rounded-lg">
          <Plus className="w-4 h-4 mr-1" /> 新建文档
        </Button>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(categoryConfig).map(([key, cfg]) => (
          <div key={key} onClick={() => setFilterCategory(filterCategory === key ? "ALL" : key)}
            className={`bg-white rounded-xl border p-3 text-center cursor-pointer transition-all hover:shadow-md ${filterCategory === key ? "border-[#0088ff] ring-1 ring-[#0088ff]/20" : "border-border/60"}`}>
            <span className="text-xl">{cfg.icon}</span>
            <p className="text-[11px] text-muted-foreground mt-1">{cfg.label}</p>
            <p className="text-sm font-bold mt-0.5">{articles.filter(a => a.category === key).length}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="搜索文档标题或标签..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-9 bg-muted/50 border-0 rounded-xl" />
      </div>

      {/* Article List */}
      <div className="space-y-2">
        {filtered.map((article, i) => {
          const category = categoryConfig[article.category] || categoryConfig.TECHNICAL;
          return (
            <motion.div key={article.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl border border-border/60 p-4 hover:shadow-md transition-all duration-300 cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: `${category.color}10` }}>
                  {category.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">{article.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span>{article.author}</span>
                    <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{article.views}</span>
                    <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{article.likes}</span>
                    <span>{article.createdAt}</span>
                  </div>
                  {article.tags && (
                    <div className="flex items-center gap-1 mt-2">
                      {(typeof article.tags === 'string' ? article.tags.split(',') : article.tags).filter(Boolean).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-[9px] px-1.5">{tag.trim()}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Badge className="text-[9px] shrink-0" style={{ backgroundColor: `${category.color}15`, color: category.color }}>{category.label}</Badge>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>新建知识文档</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>文档标题 <span className="text-red-500">*</span></Label>
              <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="输入文档标题" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>分类 <span className="text-red-500">*</span></Label>
                <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>标签</Label>
                <Input value={form.tags} onChange={(e) => setForm({...form, tags: e.target.value})} placeholder="逗号分隔，如: Git,规范" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>文档内容 <span className="text-red-500">*</span></Label>
              <Textarea value={form.content} onChange={(e) => setForm({...form, content: e.target.value})}
                placeholder="支持Markdown格式" rows={10} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">发布文档</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
