# 备份与恢复

本轮第一项写入创建：/Users/cornelius-lowell-winthrop/Documents/Codex/2026-10-18/referenced-chatgpt-conversation-this-is-an-2/outputs/backup-before-v0.4.1-20261018-024444+0800

完整归档：complete-backup.tar.gz。manifest.json包含原路径与160个文件SHA-256；RECOVERY.txt包含压缩包摘要。已实际解压到临时新目录并逐文件验证一致，随后删除了临时解压副本。

归档包含完整GameJam、完整BetweenAllThings-v0.4.0与2026-10-18试玩报告目录。恢复时只解压到新目录，例如在终端使用 tar -xzf "完整归档路径" -C "空的恢复目录"；根据manifest.json核对后选取需要的版本，不直接覆盖任何旧稳定项目。

本轮修改只在本v0.4.1副本，不需要回滚旧项目即可使用v0.2/v0.3/v0.4.0。没有修改线上站点；本地公开页备份不是云端托管后台备份。
