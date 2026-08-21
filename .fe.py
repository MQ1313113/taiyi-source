import io

# 1. api.ts: promote + myWeek
p = 'backend/rd-platform-service/src/main/frontend/src/services/api.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("  logHours: (id: number, data: any) => api.put(`/tasks/${id}/hours`, data),",
"""  logHours: (id: number, data: any) => api.put(`/tasks/${id}/hours`, data),
  promote: (id: number) => api.post(`/tasks/${id}/promote`),""")
s = s.replace("  myTodo: () => api.get('/dashboard/my-todo'),",
"""  myTodo: () => api.get('/dashboard/my-todo'),
  myWeek: () => api.get('/dashboard/my-week'),""")
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('api ok')

# 2. MyTodoPanel: PROMOTE 动作 + 周报按钮
p2 = 'backend/rd-platform-service/src/main/frontend/src/components/MyTodoPanel.tsx'
s2 = io.open(p2, encoding='utf-8').read()
s2 = s2.replace('  VIEW: { label: "查看详情", variant: "outline" },',
'''  PROMOTE: { label: "转报团队", variant: "outline" },
  VIEW: { label: "查看详情", variant: "outline" },''')

# PROMOTE 执行分支: 在动作分发处加(找 runAction/执行处)——插入到 needComment 检查后的 switch/映射前
anchor = '''    const meta = ACTION_META[action];
    if (meta?.needComment) {'''
add = '''    if (action === "PROMOTE") {
      // 单人项目任务转报团队:生成需求类工单,分诊后走正式流程
      taskApi.promote(item.bizId).then((res: any) => {
        toast.success("已提报为需求工单", { description: "PM 分诊后将转入团队正式流程,进展会通知您" });
        load(true);
      }).catch((e: any) => toast.error(e?.message || "转报失败"));
      return;
    }
''' + anchor
assert anchor in s2
s2 = s2.replace(anchor, add, 1)

# 周报: 面板标题行加"复制周报"按钮 —— 找面板标题(我的待办)
old = '<Inbox className="w-4 h-4 text-[#0088ff]" />'
assert old in s2
s2 = s2.replace(old, old, 1)  # noop, 定位存在性
# 在组件里加 copyWeekly 函数(放 load 定义后)
anchor2 = '''  // 自动刷新：定时轮询 + 收到通知立即刷新（静默模式,不闪加载态）'''
add2 = '''  // 一键复制周报:本周完成(团队/单人分组)+质量工作+进行中,直接粘贴到汇报群
  const copyWeekly = async () => {
    try {
      const res: any = await dashboardApi.myWeek();
      const text = res?.data?.reportText || "";
      await navigator.clipboard.writeText(text);
      toast.success(`周报已复制(完成${res?.data?.doneCount ?? 0}项/${res?.data?.totalHours ?? 0}h)`, { description: "可直接粘贴到汇报群或周报文档" });
    } catch (e: any) {
      toast.error(e?.message || "生成周报失败");
    }
  };

''' + anchor2
assert anchor2 in s2
s2 = s2.replace(anchor2, add2, 1)
io.open(p2, 'w', encoding='utf-8', newline='\n').write(s2)
print('panel logic ok')
