import { useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImportResult {
  successCount: number;
  failureCount: number;
  failures: Array<{ line: number; title?: string; reason: string }>;
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  templateFileName: string;
  /** 使用说明条目 */
  tips: string[];
  /** 下载模板：返回 blob */
  downloadTemplate: () => Promise<any>;
  /** 上传导入：返回 Result（其 data 为 ImportResult） */
  importFile: (file: File) => Promise<any>;
  /** 导入成功后回调（用于刷新列表） */
  onImported?: () => void;
}

export default function ImportDialog({
  open, onOpenChange, title, templateFileName, tips,
  downloadTemplate, importFile, onImported,
}: ImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([blob], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = templateFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("模板已下载", { description: "请用 Excel/WPS 打开填写后保存为 CSV 再上传" });
    } catch (e: any) {
      toast.error("模板下载失败", { description: e?.message || "请稍后重试" });
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setSelectedFile(f);
    setResult(null);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("请先选择要导入的 CSV 文件");
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      const res: any = await importFile(selectedFile);
      const data: ImportResult = res?.data || { successCount: 0, failureCount: 0, failures: [] };
      setResult(data);
      if (data.failureCount === 0) {
        toast.success(`导入成功：${data.successCount} 条`);
        onImported?.();
      } else if (data.successCount > 0) {
        toast.warning(`部分成功：成功 ${data.successCount} 条，失败 ${data.failureCount} 条`);
        onImported?.();
      } else {
        toast.error(`导入失败：${data.failureCount} 条均未通过校验`);
      }
    } catch (e: any) {
      toast.error("导入失败", { description: e?.message || "请检查文件内容后重试" });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setSelectedFile(null);
      setResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#ff5500]" />{title}
          </DialogTitle>
          <DialogDescription>
            请先下载模板，按模板格式填写后再上传导入。支持 CSV(UTF-8) 文件。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 步骤1 下载模板 */}
          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">第一步：下载导入模板</div>
                <div className="text-xs text-muted-foreground mt-0.5">模板含表头与一行示例</div>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg" onClick={handleDownload} disabled={downloading}>
                {downloading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                下载模板
              </Button>
            </div>
          </div>

          {/* 步骤2 选择文件 */}
          <div className="rounded-xl border border-border p-3">
            <div className="text-sm font-medium mb-2">第二步：选择填写好的文件</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-[#ff5500]/10 file:text-[#ff5500] hover:file:bg-[#ff5500]/20"
            />
            {selectedFile && (
              <div className="text-xs text-muted-foreground mt-2">已选择：{selectedFile.name}</div>
            )}
          </div>

          {/* 填写说明 */}
          {tips.length > 0 && (
            <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <div className="font-medium text-foreground">填写说明</div>
              {tips.map((t, i) => (<div key={i}>· {t}</div>))}
            </div>
          )}

          {/* 导入结果 */}
          {result && (
            <div className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-[#22c55e]">
                  <CheckCircle2 className="w-4 h-4" />成功 {result.successCount} 条
                </span>
                <span className="flex items-center gap-1 text-red-600">
                  <XCircle className="w-4 h-4" />失败 {result.failureCount} 条
                </span>
              </div>
              {result.failures && result.failures.length > 0 && (
                <div className="max-h-40 overflow-y-auto text-xs space-y-1 border-t border-border pt-2">
                  {result.failures.map((f, i) => (
                    <div key={i} className="text-red-600">
                      第 {f.line} 行{f.title ? `（${f.title}）` : ""}：{f.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-lg" onClick={() => handleClose(false)}>关闭</Button>
          <Button
            className="rounded-lg bg-[#ff5500] hover:bg-[#e64d00] text-white"
            onClick={handleImport}
            disabled={importing || !selectedFile}
          >
            {importing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
            开始导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
