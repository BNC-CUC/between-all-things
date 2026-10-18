#!/bin/zsh
# User-invoked Mac launcher. Existing game files are never changed.
set -u
PROJECT=/Users/cornelius-lowell-winthrop/Documents/GameJam/emergent-life/v0.5
NODE_FALLBACK=/Users/cornelius-lowell-winthrop/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
PORT_NUMBER=5050
ENTRY=build/index.html
URL="http://127.0.0.1:${PORT_NUMBER}"
fail() { print -r -- "$1"; print '按回车关闭。'; read -r; exit 1; }
[[ -f "$PROJECT/tools/server.mjs" && -f "$PROJECT/$ENTRY" ]] || fail '找不到预览文件；不会自动安装、重建或覆盖工程。'
NODE_BIN="$(command -v node 2>/dev/null || true)"
[[ -n "$NODE_BIN" && -x "$NODE_BIN" ]] || NODE_BIN="$NODE_FALLBACK"
[[ -x "$NODE_BIN" ]] || fail '找不到 Node，请将此提示交给 Work A。'
probe_file="$(mktemp -t between-all-things-preview)" || exit 1
trap 'rm -f "$probe_file"' EXIT
if /usr/bin/curl --noproxy '*' --silent --fail --max-time 2 "$URL/" -o "$probe_file" && /usr/bin/cmp -s "$probe_file" "$PROJECT/$ENTRY"; then
  print "预览服务已在运行：$URL"
  /usr/bin/open "$URL"
  exit 0
fi
if /usr/sbin/lsof -nP -iTCP:"$PORT_NUMBER" -sTCP:LISTEN >/dev/null 2>&1; then
  fail "端口 $PORT_NUMBER 被其他内容占用，未关闭任何已有进程。请把提示交给 Work A。"
fi
cd "$PROJECT" || exit 1
print "正在启动：$URL"
print '请保持此终端窗口打开。关闭窗口或按 Control+C 会停止本次预览。'
# Open only after the expected page responds; this runs when the user double-clicks.
(
  for attempt in {1..30}; do
    if /usr/bin/curl --noproxy '*' --silent --fail --max-time 1 "$URL/" -o "$probe_file" && /usr/bin/cmp -s "$probe_file" "$PROJECT/$ENTRY"; then
      /usr/bin/open "$URL"
      exit 0
    fi
    sleep 0.3
  done
  print '未收到预期页面，请查看终端报错。'
) &
PORT="$PORT_NUMBER" "$NODE_BIN" tools/server.mjs
print '预览服务已经停止。按回车关闭。'
read -r
