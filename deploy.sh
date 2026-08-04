#!/usr/bin/env bash
# =============================================================================
# 太一（TaiYi）研发管理平台 —— 一键部署 / 启动脚本
#
# 单产物：前端已内嵌进后端 jar，java -jar 一处启动，:17080 同时提供 API 与页面，
#          无需 nginx、无需单独部署前端。
#
# 用法：
#   ./deploy.sh build             构建（含前端，产出单 jar）
#   ./deploy.sh build -Dskip.frontend=true   仅构建后端，跳过前端
#   ./deploy.sh start             后台启动（nohup，写 pid 与日志）
#   ./deploy.sh stop              停止
#   ./deploy.sh restart           重启
#   ./deploy.sh status            查看运行状态
#   ./deploy.sh run               前台运行（Ctrl+C 退出，适合调试）
#   ./deploy.sh deploy            构建 + 后台启动（一键部署）
#
# 可用环境变量覆盖（示例）：
#   SERVER_PORT=9090 JAVA_OPTS="-Xmx2g" SPRING_PROFILES_ACTIVE=prod ./deploy.sh start
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
SERVICE_DIR="$BACKEND_DIR/rd-platform-service"
PID_FILE="$SCRIPT_DIR/.taiyi.pid"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/taiyi.log"

# ---- 可通过环境变量覆盖 ----
SERVER_PORT="${SERVER_PORT:-17080}"
JAVA_OPTS="${JAVA_OPTS:--Xms512m -Xmx1024m}"
SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-}"

JAR=""

find_jar() {
  # repackage 后的可执行 jar；排除 .original（若存在）
  JAR="$(ls "$SERVICE_DIR"/target/rd-platform-service-*.jar 2>/dev/null | grep -v '\.original$' | head -1 || true)"
}

is_running() {
  [ -f "$PID_FILE" ] || return 1
  local pid; pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

build() {
  echo "==> 构建（含前端，打进单 jar）..."
  ( cd "$BACKEND_DIR" && mvn -DskipTests clean package "$@" )
  find_jar
  [ -n "$JAR" ] || { echo "!! 构建结束但未找到 jar" >&2; exit 1; }
  echo "==> 构建完成：$JAR"
}

start() {
  find_jar
  if [ -z "$JAR" ]; then
    echo "==> 未找到 jar，先执行构建..."
    build
  fi
  if is_running; then
    echo "==> 已在运行 (PID $(cat "$PID_FILE"))，如需重启用 ./deploy.sh restart"
    return 0
  fi
  mkdir -p "$LOG_DIR"
  echo "==> 启动 :$SERVER_PORT ..."
  # shellcheck disable=SC2086
  nohup java $JAVA_OPTS \
      -Dserver.port="$SERVER_PORT" \
      ${SPRING_PROFILES_ACTIVE:+-Dspring.profiles.active=$SPRING_PROFILES_ACTIVE} \
      -jar "$JAR" >> "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  sleep 1
  if is_running; then
    echo "==> 已启动 (PID $(cat "$PID_FILE"))  端口 :$SERVER_PORT"
    echo "    日志：$LOG_FILE"
    echo "    访问：http://localhost:$SERVER_PORT"
  else
    echo "!! 启动失败，请查看日志：$LOG_FILE" >&2
    rm -f "$PID_FILE"
    exit 1
  fi
}

stop() {
  if ! is_running; then
    echo "==> 未在运行"
    rm -f "$PID_FILE"
    return 0
  fi
  local pid; pid="$(cat "$PID_FILE")"
  echo "==> 停止 PID $pid ..."
  kill "$pid" 2>/dev/null || true
  for _ in $(seq 1 30); do is_running || break; sleep 0.5; done
  if is_running; then
    echo "==> 优雅停止超时，强制结束"
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
  echo "==> 已停止"
}

status() {
  if is_running; then
    echo "运行中 (PID $(cat "$PID_FILE"))  端口 :$SERVER_PORT"
  else
    echo "未运行"
  fi
}

run() {
  find_jar
  [ -n "$JAR" ] || build
  echo "==> 前台运行 :$SERVER_PORT （Ctrl+C 退出）"
  # shellcheck disable=SC2086
  exec java $JAVA_OPTS \
      -Dserver.port="$SERVER_PORT" \
      ${SPRING_PROFILES_ACTIVE:+-Dspring.profiles.active=$SPRING_PROFILES_ACTIVE} \
      -jar "$JAR"
}

usage() {
  sed -n '2,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

cmd="${1:-}"
[ $# -gt 0 ] && shift || true
case "$cmd" in
  build)   build "$@" ;;
  start)   start ;;
  stop)    stop ;;
  restart) stop; start ;;
  status)  status ;;
  run)     run ;;
  deploy)  build "$@"; start ;;
  ""|-h|--help|help) usage ;;
  *) echo "未知命令：$cmd"; echo; usage; exit 1 ;;
esac