#!/usr/bin/env bash
# 太一平台系统测试套件 v1 — 用例即代码。每条用例: T <ID> <风险> <描述> <预期正则> <实际响应>
B=http://localhost:17080/api/v1
SFX=$RANDOM
D=.test/data; mkdir -p $D
PASSN=0; FAILN=0; FAILS=""

T(){ local id="$1" risk="$2" desc="$3" expect="$4" actual="$5"
  if echo "$actual" | grep -qE "$expect"; then
    PASSN=$((PASSN+1)); printf "PASS %-8s %s\n" "$id" "$desc"
  else
    FAILN=$((FAILN+1)); FAILS="$FAILS\n[$id][$risk] $desc\n  预期匹配: $expect\n  实际: $(echo "$actual" | head -c 160)"
    printf "FAIL %-8s %s\n" "$id" "$desc"
  fi
}
tok(){ curl -s -X POST $B/auth/login -H "Content-Type: application/json" -d "{\"username\":\"$1\",\"password\":\"$2\"}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'; }
GET(){ curl -s "$B$2" -H "Authorization: Bearer $1"; }
POST(){ curl -s -X POST "$B$2" -H "Authorization: Bearer $1" -H "Content-Type: application/json;charset=UTF-8" --data-binary @"$3"; }
POSTS(){ curl -s -X POST "$B$2" -H "Authorization: Bearer $1" -H "Content-Type: application/json" -d "$3"; }
PUTS(){ curl -s -X PUT "$B$2" -H "Authorization: Bearer $1" -H "Content-Type: application/json" -d "$3"; }
PUTF(){ curl -s -X PUT "$B$2" -H "Authorization: Bearer $1" -H "Content-Type: application/json;charset=UTF-8" --data-binary @"$3"; }
gid(){ sed -n 's/.*"id":\([0-9]*\).*/\1/p' | head -1; }

echo "===== 准备: 登录与测试数据 ====="
AT=$(tok admin admin123); ZT=$(tok zhangsan admin123); LT=$(tok lisi admin123)
WT=$(tok wangwu admin123); QT=$(tok zhaoliu admin123); QQ=$(tok qianqi Qianqi@2026)
[ -z "$AT" ] && { echo "ABORT: admin登录失败"; exit 1; }

# 专用测试项目: 轻量/完整档团队项目(标准档复用项目1)
printf '{"projectName":"ST-轻量档专测-%s","projectCode":"ST-L%s","description":"套件专用","ownerId":2,"gearLevel":"LIGHTWEIGHT","startDate":"2026-08-20","endDate":"2026-12-31"}' "$SFX" "$SFX" > $D/pl.json
PL=$(POST "$ZT" /projects $D/pl.json | gid); PUTS "$ZT" "/projects/$PL/status" '{"status":"ACTIVE"}' >/dev/null
printf '{"projectName":"ST-完整档专测-%s","projectCode":"ST-F%s","description":"套件专用","ownerId":2,"gearLevel":"FULL","startDate":"2026-08-20","endDate":"2026-12-31"}' "$SFX" "$SFX" > $D/pf.json
PF=$(POST "$ZT" /projects $D/pf.json | gid); PUTS "$ZT" "/projects/$PF/status" '{"status":"ACTIVE"}' >/dev/null
for P in $PL $PF; do for U in 3 4 5 12; do POSTS "$ZT" "/projects/$P/members" "{\"userId\":$U}" >/dev/null; done; done
echo "测试项目: 轻量=$PL 完整=$PF 标准=1"

echo "===== AU 认证与账号(R1) ====="
T AU-01 R1 "错误密码登录返回401" '"code":401' "$(curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"wrong"}')"
T AU-02 R1 "不存在用户名401(不泄露存在性)" '用户名或密码错误' "$(curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d '{"username":"nobody9","password":"x"}')"
PUTS "$AT" /users/12 '{"status":0}' >/dev/null
T AU-03 R1 "禁用账号登录提示禁用而非密码错" '账号已被禁用' "$(curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d '{"username":"sunba","password":"Sunba@2026"}')"
T AU-04 R1 "禁用账号+错误密码仍提示禁用(状态先于密码)" '账号已被禁用' "$(curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d '{"username":"sunba","password":"wrongpwd"}')"
PUTS "$AT" /users/12 '{"status":1}' >/dev/null
PUTS "$AT" /users/12/password '{"newPassword":"Sunba@2026"}' >/dev/null
T AU-05 R1 "admin重置密码后目标账号首登标记=1" '"isFirstLogin":1' "$(curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d '{"username":"sunba","password":"Sunba@2026"}')"
SBT=$(tok sunba Sunba@2026)
T AU-06 R1 "改密旧密码错误被拒" '原密码错误' "$(PUTS "$SBT" /users/change-password '{"oldPassword":"bad","newPassword":"Sunba@2027"}')"
PUTS "$SBT" /users/change-password '{"oldPassword":"Sunba@2026","newPassword":"Sunba@2027"}' >/dev/null
T AU-07 R1 "改密成功后首登标记清0" '"isFirstLogin":0' "$(curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d '{"username":"sunba","password":"Sunba@2027"}')"
SBT=$(tok sunba Sunba@2027)
T AU-08 R1 "无token访问受保护接口401" '401' "$(curl -s -o /dev/null -w '%{http_code}' $B/projects)"
T AU-09 R1 "伪造token401" '401' "$(curl -s -o /dev/null -w '%{http_code}' $B/projects -H 'Authorization: Bearer fake.token.xx')"

echo "===== PM 权限矩阵(R1) ====="
printf '{"projectId":%s,"title":"ST-PM11专用需求-%s","type":"FUNCTIONAL","priority":"P2","acceptanceCriteria":"Given A When B Then C","ownerId":2,"expectedCompletionDate":"2026-09-30"}' "$PL" "$SFX" > $D/rpm.json
RSOPEN=$(POST "$ZT" /requirements $D/rpm.json | gid); PLOPEN=$PL
T PM-01 R1 "dev建用户403" '"code":403' "$(POSTS "$WT" /users '{"username":"h1","password":"x12345678","nickname":"h"}')"
T PM-02 R1 "qa建用户403" '"code":403' "$(POSTS "$QT" /users '{"username":"h2","password":"x12345678","nickname":"h"}')"
T PM-03 R1 "dev建团队项目403" '无权限|403' "$(POSTS "$WT" /projects '{"projectName":"x1","ownerId":4}')"
T PM-04 R1 "dev拆解任务403" '只有产品经理|403' "$(POSTS "$WT" /tasks '{"projectId":1,"taskName":"x","description":"x","assigneeId":4,"dueDate":"2026-09-01"}')"
T PM-05 R1 "dev发起变更403" '只有产品经理|403' "$(POSTS "$WT" /change-requests '{"requirementId":1,"projectId":1,"changeContent":"x","changeReason":"x","impactScope":"x"}')"
T PM-06 R1 "dev提缺陷:权限表允许(过权限门禁),标准档内容校验拦截" '复现步骤' "$(POSTS "$WT" /bugs '{"projectId":1,"title":"x","description":"x","expectedResult":"x","actualResult":"x","severity":"MINOR","priority":"P2","moduleName":"x","assigneeId":12,"environment":"e","frequency":"ALWAYS"}')"
T PM-07 R1 "dev创建发布单403" '只有产品经理|403' "$(POSTS "$WT" /release-orders '{"projectId":1,"title":"x","rollbackPlan":"12345678901234567890x","requirementIds":[1]}')"
T PM-08 R1 "admin修改自身角色被拒" '不支持修改角色' "$(PUTS "$AT" /users/1 '{"roleIds":[2]}')"
T PM-09 R1 "admin禁用自身被拒" '不支持禁用' "$(PUTS "$AT" /users/1 '{"status":0}')"
T PM-10 R1 "admin无任务/缺陷/需求类业务待办(工单分诊系JSON配置遗留)" '^0$' "$(GET "$AT" /dashboard/my-todo | grep -cE '\"type\":\"(TASK|BUG_|REQUIREMENT)')"
printf '{"requirementId":%s,"projectId":%s,"changeContent":"PM11专用变更单内容","changeReason":"r","impactScope":"s"}' "$RSOPEN" "$PLOPEN" > $D/cr11.json
CR11=$(POST "$ZT" /change-requests $D/cr11.json | gid)
T PM-11 R1 "qa审批变更403(非池非PM非仲裁)" '403|须由' "$(PUTS "$QT" "/change-requests/$CR11/approve" '')"

echo "===== IS 数据隔离(R1) ====="
LY=$(tok linyi Init@2026)
T IS-01 R1 "非成员查不到隔离项目需求(linyi非V2成员)" '"records":\[\]|"total":0' "$(GET "$LY" '/requirements?pageNum=1&pageSize=5&projectId=1')"
T IS-02 R1 "他人列表不含单人项目" '^0$' "$(GET "$LT" '/projects?pageNum=1&pageSize=50' | grep -c '打印机固件')"
T IS-03 R1 "他人直查单人项目详情403" '"code":403' "$(GET "$LT" /projects/2)"
T IS-04 R1 "admin可见单人项目" '打印机固件' "$(GET "$AT" '/projects?pageNum=1&pageSize=50')"
T IS-05 R1 "单人项目加成员被拒" '不允许添加成员' "$(POSTS "$QT" /projects/2/members '{"userId":4}')"

echo "===== RS 需求状态机与门禁(R2) ====="
printf '{"projectId":%s,"title":"ST-需求态迁移专用-%s","type":"FUNCTIONAL","priority":"P2","acceptanceCriteria":"Given A When B Then C","ownerId":2,"expectedCompletionDate":"2026-09-30"}' "$PL" "$SFX" > $D/rs.json
RS=$(POST "$ZT" /requirements $D/rs.json | gid)
T RS-01 R2 "轻量档最小字段建需求成功" '^[0-9]+$' "$RS"
T RS-02 R2 "DRAFT直接跳CLOSED非法" '非法的状态流转|禁止' "$(PUTS "$ZT" "/requirements/$RS/status" '{"status":"CLOSED"}')"
T RS-03 R2 "DRAFT直接跳TESTING(须走提测)拒绝" '非法|禁止|业务流程' "$(PUTS "$ZT" "/requirements/$RS/status" '{"status":"TESTING"}')"
T RS-04 R2 "评审人含创建人被拒(防自审)" '创建人不能作为评审人' "$(POSTS "$ZT" "/requirements/$RS/submit-review" '{"reviewerIds":[2]}')"
T RS-05 R2 "空评审人列表被拒" '至少指定一名评审人' "$(POSTS "$ZT" "/requirements/$RS/submit-review" '{"reviewerIds":[]}')"
POSTS "$ZT" "/requirements/$RS/submit-review" '{"reviewerIds":[3]}' >/dev/null
T RS-06 R2 "非指定评审人评审403" '只有被指定的评审人' "$(POSTS "$QQ" "/requirements/$RS/review" '{"result":"APPROVED","comment":"ok"}')"
printf '{"result":"REJECTED","comment":"short"}' > $D/rj.json
T RS-07 R3 "驳回理由19字被拒(边界-1)" '不少于20字' "$(POST "$LT" "/requirements/$RS/review" $D/rj.json)"
printf '{"result":"REJECTED","comment":"12345678901234567890"}' > $D/rj20.json
T RS-08 R3 "驳回理由恰20字通过(边界)" '"code":200' "$(POST "$LT" "/requirements/$RS/review" $D/rj20.json)"
POSTS "$ZT" "/requirements/$RS/submit-review" '{"reviewerIds":[3]}' >/dev/null
printf '{"result":"APPROVED","comment":"approve for ST"}' > $D/ap.json
POST "$LT" "/requirements/$RS/review" $D/ap.json >/dev/null
T RS-09 R2 "评审通过后状态=DEVELOPING" 'DEVELOPING' "$(GET "$ZT" /requirements/$RS | grep -o '"status":"[A-Z_]*"' | head -1)"
T RS-10 R2 "同项目进行中同名需求查重拒绝" '已存在进行中的同名需求' "$(POST "$ZT" /requirements $D/rs.json)"
printf '{"projectId":%s,"title":"ST-AC校验-%s","type":"FUNCTIONAL","priority":"P2","acceptanceCriteria":"没有三段式的验收","ownerId":2,"expectedCompletionDate":"2026-09-30"}' "$PL" "$SFX" > $D/rac.json
T RS-11 R2 "AC缺Given-When-Then被拒" '三段式' "$(POST "$ZT" /requirements $D/rac.json)"
T RS-12 R2 "CLOSED需求发起变更被拒" '不支持发起变更' "$(POSTS "$ZT" /change-requests '{"requirementId":1,"projectId":1,"changeContent":"x","changeReason":"x","impactScope":"x"}')"

echo "===== QG 质量门禁·判定表(R3) ====="
# 档位×缺陷结构化: 轻量放行/标准拒/完整拒
printf '{"projectId":%s,"title":"ST-轻档自由文本缺陷","description":"自由文本描述即可","expectedResult":"ok","actualResult":"fail","severity":"MINOR","priority":"P2","moduleName":"st","assigneeId":4,"environment":"dev","frequency":"ALWAYS"}' "$PL" > $D/bl.json
T QG-01 R3 "轻量档缺陷自由文本放行" '"code":200' "$(POST "$QT" /bugs $D/bl.json)"
printf '{"projectId":1,"title":"ST-标准档自由文本缺陷","description":"自由文本无复现步骤段","expectedResult":"ok","actualResult":"fail","severity":"MINOR","priority":"P2","moduleName":"st","assigneeId":4,"environment":"dev","frequency":"ALWAYS"}' > $D/bs.json
T QG-02 R3 "标准档缺陷无结构化被拒" '标准档.*复现步骤' "$(POST "$QT" /bugs $D/bs.json)"
printf '{"projectId":%s,"title":"ST-完整档自由文本缺陷","description":"自由文本","expectedResult":"ok","actualResult":"fail","severity":"MINOR","priority":"P2","moduleName":"st","assigneeId":4,"environment":"dev","frequency":"ALWAYS"}' "$PF" > $D/bf.json
T QG-03 R3 "完整档缺陷无结构化被拒且文案为完整档" '完整档.*复现步骤' "$(POST "$QT" /bugs $D/bf.json)"
printf '{"projectId":1,"title":"ST-结构化仅1步","description":"【问题描述】\\nx\\n\\n【复现步骤】\\n1. 只有一步","expectedResult":"ok","actualResult":"fail","severity":"MINOR","priority":"P2","moduleName":"st","assigneeId":4,"environment":"dev","frequency":"ALWAYS"}' > $D/b1.json
T QG-04 R3 "标准档复现步骤仅1条被拒(边界-1)" '至少 2 条' "$(POST "$QT" /bugs $D/b1.json)"
# 档位×用例步骤
printf '{"projectId":%s,"caseName":"ST-轻档自由步骤","moduleName":"st","precondition":"p","steps":"自由描述步骤不编号","expectedResult":"ok","priority":"P2"}' "$PL" > $D/tcl.json
T QG-05 R3 "轻量档团队项目用例仍须关联需求(豁免仅限单人项目)" '必须关联需求' "$(POST "$QT" /test-cases $D/tcl.json)"
# 档位×需求L3字段
printf '{"projectId":%s,"title":"ST-完整档缺L3","type":"FUNCTIONAL","priority":"P2","description":"d","businessValue":"v","acceptanceCriteria":"Given A When B Then C","ownerId":2,"expectedCompletionDate":"2026-09-30"}' "$PF" > $D/rf.json
T QG-06 R3 "完整档缺数据字典被拒" '数据字典为必填' "$(POST "$ZT" /requirements $D/rf.json)"
printf '{"projectId":1,"title":"ST-标准档缺业务价值","type":"FUNCTIONAL","priority":"P2","acceptanceCriteria":"Given A When B Then C","ownerId":2,"expectedCompletionDate":"2026-09-30"}' > $D/rs2.json
T QG-07 R3 "标准档缺业务价值被拒" '业务价值为必填|业务价值' "$(POST "$ZT" /requirements $D/rs2.json)"

echo "===== TS 任务状态机·双模式(R2) ====="
printf '{"requirementId":%s,"projectId":%s,"taskName":"ST-任务态专用","description":"d","priority":"P2","assigneeId":4,"estimatedHours":4,"startDate":"2026-08-21","dueDate":"2026-08-28","acceptanceCriteria":"Given A When B Then C"}' "$RS" "$PL" > $D/ts.json
TS=$(POST "$ZT" /tasks $D/ts.json | gid)
T TS-01 R2 "团队任务创建成功" '^[0-9]+$' "$TS"
T TS-02 R2 "TODO直接跳DONE非法(团队)" '不允许的状态转换' "$(PUTS "$WT" "/tasks/$TS/status" '{"status":"DONE"}')"
T TS-03 R2 "非负责人推进他人任务403" '负责人本人|403' "$(PUTS "$SBT" "/tasks/$TS/status" '{"status":"IN_PROGRESS"}')"
PUTS "$WT" "/tasks/$TS/status" '{"status":"IN_PROGRESS"}' >/dev/null
PUTS "$WT" "/tasks/$TS/status" '{"status":"SELF_TESTING"}' >/dev/null
T TS-04 R3 "轻量档提测不强制工时(档位判定)" '"code":200' "$(PUTS "$WT" "/tasks/$TS/status" '{"status":"TESTING"}')"
T TS-05 R2 "开发自置DONE被拒(须QA)" '只有测试人员|403' "$(PUTS "$WT" "/tasks/$TS/status" '{"status":"DONE"}')"
T TS-06 R2 "QA不能验证自己负责的任务(防自审需assignee=QA场景)——QA验他人任务放行" '"code":200' "$(PUTS "$QT" "/tasks/$TS/status" '{"status":"DONE"}')"
T TS-07 R2 "DONE终态再迁移非法" '不允许的状态转换' "$(PUTS "$QT" "/tasks/$TS/status" '{"status":"IN_PROGRESS"}')"
# 标准档工时边界
printf '{"requirementId":2,"projectId":1,"taskName":"ST-工时边界","description":"d","priority":"P2","assigneeId":4,"estimatedHours":2,"startDate":"2026-08-21","dueDate":"2026-08-28","acceptanceCriteria":"Given A When B Then C"}' > $D/tw.json
TW=$(POST "$ZT" /tasks $D/tw.json | gid)
PUTS "$WT" "/tasks/$TW/status" '{"status":"IN_PROGRESS"}' >/dev/null
PUTS "$WT" "/tasks/$TW/status" '{"status":"SELF_TESTING"}' >/dev/null
T TS-08 R3 "标准档工时=0提测被拒(边界)" '实际工时' "$(PUTS "$WT" "/tasks/$TW/status" '{"status":"TESTING"}')"
PUTS "$WT" "/tasks/$TW/hours" '{"actualHours":0.5}' >/dev/null
T TS-09 R3 "工时=0.5提测放行(边界+)" '"code":200' "$(PUTS "$WT" "/tasks/$TW/status" '{"status":"TESTING"}')"

echo "===== PV 单人项目直通(R2) ====="
printf '{"projectName":"ST-单人专测-%s","description":"套件","visibility":"PRIVATE","ownerId":1,"gearLevel":"FULL","startDate":"2026-08-20","endDate":"2026-12-31"}' "$SFX" > $D/pv.json
PV=$(POST "$WT" /projects $D/pv.json | gid)
T PV-01 R2 "任意角色可建单人项目" '^[0-9]+$' "$PV"
T PV-02 R2 "单人项目强制轻量档(传FULL被纠正)" 'LIGHTWEIGHT' "$(GET "$WT" /projects/$PV | grep -o '"gearLevel":"[A-Z]*"')"
printf '{"projectId":%s,"taskName":"ST-单人任务","description":"d","priority":"P2","estimatedHours":2,"startDate":"2026-08-21","dueDate":"2026-08-25","assigneeId":99}' "$PV" > $D/pvt.json
PVT=$(POST "$WT" /tasks $D/pvt.json | gid)
T PV-03 R2 "单人任务免需求/AC且负责人强制本人" '"assigneeId":4' "$(GET "$WT" /tasks/$PVT)"
PUTS "$WT" "/tasks/$PVT/status" '{"status":"IN_PROGRESS"}' >/dev/null
T PV-04 R2 "单人任务IN_PROGRESS直达DONE" '"code":200' "$(PUTS "$WT" "/tasks/$PVT/status" '{"status":"DONE"}')"
printf '{"projectId":%s,"caseName":"ST-单人用例","moduleName":"st","precondition":"p","steps":"自由步骤","expectedResult":"ok","priority":"P0"}' "$PV" > $D/pvc.json
PVC=$(POST "$WT" /test-cases $D/pvc.json | gid)
T PV-05 R2 "单人用例免关联需求" '^[0-9]+$' "$PVC"
printf '{"executionStatus":"PASS","actualResult":"1234567890ok"}' > $D/pve.json
T PV-06 R3 "单人P0用例执行免证据" '"code":200' "$(PUTF "$WT" "/test-cases/$PVC/execute" $D/pve.json)"
printf '{"projectId":%s,"taskName":"ST-转报源任务","description":"值得产品化的发现","priority":"P2","estimatedHours":1,"startDate":"2026-08-21","dueDate":"2026-08-25","assigneeId":4}' "$PV" > $D/pvp.json
PVP=$(POST "$WT" /tasks $D/pvp.json | gid)
T PV-07 R4 "单人任务转报生成需求类工单" 'TK-|ticketCode' "$(POSTS "$WT" "/tasks/$PVP/promote" '')"
T PV-08 R2 "团队任务转报被拒" '仅单人项目' "$(POSTS "$WT" "/tasks/$TW/promote" '')"

echo "===== BS 缺陷状态机(R2) ====="
printf '{"projectId":%s,"title":"ST-缺陷态专用","description":"轻档自由描述","expectedResult":"ok","actualResult":"fail","severity":"MINOR","priority":"P2","moduleName":"st","assigneeId":4,"environment":"dev","frequency":"ALWAYS"}' "$PL" > $D/bg.json
BG=$(POST "$QT" /bugs $D/bg.json | gid)
T BS-01 R2 "提交人=负责人被拒(防自审)" '不能为同一人' "$(POSTS "$QT" /bugs "{\"projectId\":$PL,\"title\":\"x\",\"description\":\"d\",\"expectedResult\":\"o\",\"actualResult\":\"f\",\"severity\":\"MINOR\",\"priority\":\"P2\",\"moduleName\":\"m\",\"assigneeId\":5,\"environment\":\"e\",\"frequency\":\"ALWAYS\"}")"
T BS-02 R2 "OPEN直接跳VERIFIED非法" '不允许的状态转换' "$(PUTS "$QT" "/bugs/$BG/status" '{"status":"VERIFIED"}')"
T BS-03 R2 "非指派人确认缺陷被拒" '被指派的负责人|403' "$(PUTS "$SBT" "/bugs/$BG/status" '{"status":"CONFIRMED"}')"
PUTS "$WT" "/bugs/$BG/status" '{"status":"CONFIRMED"}' >/dev/null
PUTS "$WT" "/bugs/$BG/status" '{"status":"FIXING"}' >/dev/null
PUTS "$WT" "/bugs/$BG/status" '{"status":"FIXED"}' >/dev/null
T BS-04 R2 "修复人自验被拒(防自验)" '只有测试人员|403' "$(PUTS "$WT" "/bugs/$BG/status" '{"status":"VERIFIED"}')"
T BS-05 R2 "QA验证通过" '"code":200' "$(PUTS "$QT" "/bugs/$BG/status" '{"status":"VERIFIED"}')"
T BS-06 R2 "VERIFIED→CLOSED合法" '"code":200' "$(PUTS "$QT" "/bugs/$BG/status" '{"status":"CLOSED"}')"
T BS-07 R2 "CLOSED终态再改FIXING非法" '不允许的状态转换' "$(PUTS "$WT" "/bugs/$BG/status" '{"status":"FIXING"}')"

echo "===== RO 发布单状态机与卡点(R2) ====="
printf '{"projectId":1,"title":"ST-发布单","version":"st1","content":"c","rollbackPlan":"1234567890123456789","requirementIds":[2]}' > $D/ro19.json
T RO-01 R3 "回滚方案19字被拒(边界-1)" '不少于20字' "$(POST "$ZT" /release-orders $D/ro19.json)"
printf '{"projectId":1,"title":"ST-发布单","version":"st1","content":"c","rollbackPlan":"12345678901234567890","requirementIds":[99]}' > $D/ro99.json
T RO-02 R2 "关联不存在需求被拒" '不存在' "$(POST "$ZT" /release-orders $D/ro99.json)"
printf '{"projectId":1,"title":"ST-发布单","version":"st1","content":"c","rollbackPlan":"12345678901234567890","requirementIds":[2]}' > $D/roc.json
T RO-03 R2 "已关闭需求不能再上发布单(状态非TESTED/RELEASING)" '只有测试通过|不能|状态' "$(POST "$ZT" /release-orders $D/roc.json)"
T RO-04 R2 "QA不能创建发布单" '只有产品经理|403' "$(POST "$QT" /release-orders $D/roc.json)"

echo "===== GV 治理: 双审/仲裁/闸门/迭代(R4) ====="
printf '{"requirementId":%s,"projectId":%s,"changeContent":"ST变更内容需要十个字以上","changeReason":"reason","impactScope":"scope"}' "$RS" "$PL" > $D/cr.json
CR=$(POST "$ZT" /change-requests $D/cr.json | gid)
T GV-01 R4 "申请人自审被拒(R4防自审)" '防自审' "$(PUTS "$ZT" "/change-requests/$CR/approve" '')"
PUTS "$LT" "/change-requests/$CR/approve" '' >/dev/null
T GV-02 R4 "一审人再做二审被拒(双人双审)" '不能与第一重审批人相同' "$(PUTS "$LT" "/change-requests/$CR/approve" '')"
T GV-03 R4 "仲裁人(项目经理)二审放行" '复审通过|"code":200' "$(PUTS "$QQ" "/change-requests/$CR/approve" '')"
# 债务闸门边界
PUTS "$AT" "/system-config/debt.max.hours" '{"value":"0"}' >/dev/null
printf '{"projectId":1,"sprintName":"ST-闸门迭代-%s","goal":"g","startDate":"2026-09-05","endDate":"2026-09-18"}' "$SFX" > $D/sp.json
SP=$(POST "$ZT" /sprints $D/sp.json | gid)
T GV-04 R4 "阈值=0关闭闸门,启动放行" '"code":200' "$(curl -s -X PUT $B/sprints/$SP/start -H "Authorization: Bearer $ZT")"
PUTS "$AT" "/system-config/debt.max.hours" '{"value":"40"}' >/dev/null
# 迭代挂一个未完成任务(为 GV-05~07 制造未完成项)
printf '{"requirementId":2,"projectId":1,"sprintId":%s,"taskName":"ST-迭代未完成项-%s","description":"d","priority":"P2","assigneeId":4,"estimatedHours":2,"startDate":"2026-09-05","dueDate":"2026-09-10","acceptanceCriteria":"Given A When B Then C"}' "$SP" "$SFX" > $D/spt.json
POST "$ZT" /tasks $D/spt.json >/dev/null
T GV-05 R4 "迭代含未完成项无处置关闭被拒" '必须选择处置方式' "$(curl -s -X PUT "$B/sprints/$SP/complete" -H "Authorization: Bearer $ZT")"
T GV-06 R4 "顺延目标=自身被拒" '目标迭代无效' "$(curl -s -X PUT "$B/sprints/$SP/complete?unfinishedAction=MOVE_TO_SPRINT&targetSprintId=$SP" -H "Authorization: Bearer $ZT")"
T GV-07 R4 "退回待办池关闭成功并快照" '迭代已完成' "$(curl -s -X PUT "$B/sprints/$SP/complete?unfinishedAction=BACKLOG" -H "Authorization: Bearer $ZT")"
# 会话时长边界
T GV-08 R3 "会话时长169h被拒(边界+1)" '1~168' "$(PUTS "$AT" "/system-config/token.expiration.hours" '{"value":"169"}')"
T GV-09 R3 "会话时长168h放行(边界)" '"code":200' "$(PUTS "$AT" "/system-config/token.expiration.hours" '{"value":"168"}')"
PUTS "$AT" "/system-config/token.expiration.hours" '{"value":"2"}' >/dev/null

echo "===== ET 外部匿名工单(R1/R2) ====="
# 注意:公开接口有每 IP 每小时 5 单的限流(内存态,重启清零)。本组仅提交 1 单;
# 一小时内反复跑套件超过限流额度时 ET-01 会 400,重启应用或等待即可。
printf '{"title":"ST-外部报障-%s","description":"套件外部单","contactInfo":"st@test.com"}' "$SFX" > $D/et.json
ETRESP=$(curl -s -X POST $B/public/tickets -H "Content-Type: application/json;charset=UTF-8" --data-binary @$D/et.json)
T ET-01 R2 "匿名提交外部工单成功并返回凭证" '"ticketCode":"TK-.*"queryToken"' "$ETRESP"
ETC=$(echo "$ETRESP" | sed -n 's/.*"ticketCode":"\([^"]*\)".*/\1/p')
ETT=$(echo "$ETRESP" | sed -n 's/.*"queryToken":"\([^"]*\)".*/\1/p')
ETID=$(GET "$ZT" "/tickets?pageNum=1&pageSize=5&status=PENDING_TRIAGE" | python -c "
import json,sys
d=json.loads(sys.stdin.buffer.read().decode('utf-8'))['data']
recs=d.get('records',d) if isinstance(d,dict) else d
print(next((r['id'] for r in recs if r.get('ticketCode')=='$ETC'),''))" 2>/dev/null)
T ET-02 R1 "匿名凭证可查进度且仅状态字段" '"status":"PENDING_TRIAGE"' "$(curl -s "$B/public/tickets/status?code=$ETC&token=$ETT")"
T ET-03 R1 "错误查询码被拒(防遍历)" '"code":400' "$(curl -s "$B/public/tickets/status?code=$ETC&token=badtoken0000")"
T ET-04 R1 "蜜罐字段命中返回伪凭证不入库" 'TK-0000-0000' "$(POSTS "" /public/tickets '{"title":"bot","contactInfo":"x","website":"http://spam"}')"
T ET-05 R2 "外部单分诊缺优先级/分类被拒(强制人工确认)" '必须先确认信息' "$(PUTS "$ZT" "/tickets/$ETID/triage" '{"assigneeId":4}')"
T ET-06 R2 "外部单确认P2+分类后分诊成功" '"code":200' "$(PUTS "$ZT" "/tickets/$ETID/triage" '{"assigneeId":4,"priority":"P2","category":"OTHER"}')"

echo "===== TD 待办明细字段(R3) ====="
# 造数:再提一张外部单(限流额度内,本组用完即分诊清理),保证 pm 待办里有工单分诊项
printf '{"title":"ST-待办明细-%s","description":"待办明细字段校验专用","contactInfo":"td@test.com"}' "$SFX" > $D/td.json
TDRESP=$(curl -s -X POST $B/public/tickets -H "Content-Type: application/json;charset=UTF-8" --data-binary @$D/td.json)
TDC=$(echo "$TDRESP" | sed -n 's/.*"ticketCode":"\([^"]*\)".*/\1/p')
TODO=$(GET "$ZT" /dashboard/my-todo)
T TD-01 R3 "待办含类型中文标签typeLabel" '"typeLabel":"工单分诊"' "$TODO"
T TD-02 R3 "外部单待办相关人=外部来访" '"fromUser":"外部来访"' "$TODO"
T TD-03 R3 "工单待办含单号bizCode" "\"bizCode\":\"$TDC\"" "$TODO"
T TD-04 R3 "分诊待办动作为TRIAGE+VIEW" '"actions":\["TRIAGE","VIEW"\]' "$TODO"
T TD-05 R3 "SLA截止转dueLabel文案下发" '"dueLabel":"' "$TODO"
T TD-06 R3 "外部来源source标记下发" '"source":"EXTERNAL"' "$TODO"
WTODO=$(GET "$WT" /dashboard/my-todo)
T TD-07 R3 "开发任务待办含预估工时" '"estimatedHours":' "$WTODO"
T TD-08 R3 "修复缺陷待办含严重级" '"severity":"MINOR"' "$WTODO"
# 清理:分诊掉本组外部单,避免反复跑套件在待办中累积
TDID=$(GET "$ZT" "/tickets?pageNum=1&pageSize=10&status=PENDING_TRIAGE" | python -c "
import json,sys
d=json.loads(sys.stdin.buffer.read().decode('utf-8'))['data']
recs=d.get('records',d) if isinstance(d,dict) else d
print(next((r['id'] for r in recs if r.get('ticketCode')=='$TDC'),''))" 2>/dev/null)
[ -n "$TDID" ] && PUTS "$ZT" "/tickets/$TDID/triage" '{"assigneeId":4,"priority":"P3","category":"OTHER"}' >/dev/null

echo "===== FE 前端产物静态检查(R4) ====="
T FE-01 R4 "公开报障页/support返回SPA外壳" '<!DOCTYPE html' "$(curl -s http://localhost:17080/support)"
T FE-02 R4 "剪贴板降级方案已编译进产物" 'execCommand' "$(grep -oh execCommand backend/rd-platform-service/target/classes/static/assets/*.js 2>/dev/null | head -1)"
T FE-03 R4 "优先级档位描述已编译进产物" '须立即处理' "$(grep -oh '须立即处理' backend/rd-platform-service/target/classes/static/assets/*.js 2>/dev/null | head -1)"

echo "===== 汇总 ====="
TOTAL=$((PASSN+FAILN))
echo "总用例: $TOTAL | 通过: $PASSN | 失败: $FAILN | 通过率: $((PASSN*100/TOTAL))%"
[ $FAILN -gt 0 ] && printf "%b\n" "$FAILS"
