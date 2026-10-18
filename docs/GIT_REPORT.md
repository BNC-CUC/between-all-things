# Git / GitHub 交付报告
2026-10-18。

仓库：`/Users/cornelius-lowell-winthrop/Documents/GameJam/emergent-life`
当前分支：`feat/v0.5-riverbend`。本轮开始前没有.git、远端、历史提交或其他Git工作树；没有覆盖现有Git历史。

main初始提交：ac96425aba68641063a293b6b28889c753fd78c8（实际共享根v0.3及协作文档）。
标签v0.3.0-workspace-baseline指向该基线。
真实v0.4.1源码标签v0.4.1-pre-v0.5指向87e3ffb62e79ab47b923e6db0a08ae1675c1f83f，单独根提交，26个原源码/文档/素材文件逐blob核对匹配；另含.gitignore。发行包不入Git，从既有完整恢复点恢复。

本机原来未配置Git署名，因此本仓库使用明确的自动化身份 Work A <work-a@localhost>；不是用户GitHub身份，不改全局配置。后续可按用户提供署名设置，未经要求不改写既有提交。

安全恢复v0.4.1：在仓库中运行以下命令，生成全新目录，避免覆盖当前工作树：

```sh
git worktree add --detach ../between-all-things-v041-restore v0.4.1-pre-v0.5
```

该目录必须尚不存在。可在其中按原README运行；要取原发行包使用恢复点restored/v0.4.1/release。标签证明源文件可恢复，不宣称人工试玩验收。

GitHub：未连接，无仓库地址、无远端、未推送。GitHub CLI现已通过Homebrew安装2.102.0；auth status确认未登录。直接官方二进制下载超时后改用已安装Homebrew，未关闭证书校验。安装完成不代表账号授权完成。

用户下一步可在本机终端执行 `gh auth login --hostname github.com --git-protocol https --web`，按浏览器页面完成授权；不要把密码/令牌发到聊天。授权后只创建/连接private的between-all-things；若同名仓库存在先核对，不替换历史。确定待推送文件、仓库和分支后，再依用户要求确认首次push；尚未发起该确认，因为目标账户/仓库未确定。当前不阻塞本地灰盒开发。

凭据检查：本轮对候选文本执行常见GitHub/AWS/API令牌、私钥及密码赋值模式检查，无命中；扫描不是穷尽证明，首次推送前须重新检查最终待推送集合。发行ZIP、恢复包、缓存、环境配置、私钥排除；旧dist属于源码保留。文档含本地绝对路径，首次私人仓库推送说明应包含此事实。

最新交付提交可由 `git log -1 --oneline` 查看；最终交付摘要另附提交号，避免把提交自身哈希写进同一提交产生循环。当前只做本地版本管理。
