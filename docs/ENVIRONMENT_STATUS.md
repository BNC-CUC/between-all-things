# 开发环境核查｜V3.0
2026-10-18｜本机Darwin，bainaichuandeMacBook-Pro.local。只检查，不新增安装。

| 项目 | 已安装/位置 | 已验证 | 尚未验证或不需要 |
| --- | --- | --- | --- |
| Git | Apple Git 2.54.0 | 分支、提交、标签、对象连通性、工作区检查 | 远端授权/推送未完成 |
| Node/npm | 24.21.0 / 11.19.0 | 可调用；npm ls依赖树成功 | 无需重新初始化 |
| Three.js/esbuild | 0.186.1 / 0.28.2，v0.5本地依赖 | 依赖树匹配；沿用loop.2已有构建通过记录 | 本轮未改代码，未重新构建；WebGL实际体验不合格 |
| GitHub CLI | 2.102.0 | 可调用，未登录 | 非必需；优先网页与现有Git |
| VS Code | /Applications/开发/Visual Studio Code.app，1.137.0 | 应用包和版本存在 | 未启动编辑/调试；code不在PATH不代表未安装 |
| PyCharm | /Applications/PyCharm.app，2026.2.2 | 应用包存在 | 非必需，未验证开发工作流 |
| Photoshop | /Applications/Adobe Photoshop 2026/Adobe Photoshop 2026.app，27.11.0 | 应用包存在 | 许可、透明PNG拆解导出及可编辑分层源未验证 |
| Blender | 常见应用目录/PATH未发现 | 未验证 | Work B提供最终导出工作流；当前审计不需安装 |
| Audition | /Applications/Adobe Audition 2026/Adobe Audition 2026.app，26.5.0 | 本机与Work C均确认应用存在 | 启动/许可、WAV/MP3往返及试听未验证 |
| Audacity | 常见安装目录未发现 | 未验证 | 非主工程必需，不安装 |
| FFmpeg/ImageMagick/Pillow | 当前PATH或当前Python未找到 | 未验证 | 尚无必须批处理的素材，暂不需要安装/新增转换脚本 |
| sips / afconvert | macOS系统工具 | sips存在；Work C确认afconvert帮助可用 | 未完成实际透明图/音频转换，不算流程通过 |
| 浏览器 | Chrome、Edge应用存在 | 本轮无自动运行游戏 | 不执行自动截图/游玩/兼容性测试 |
| 本地预览 | preview-launchers/下两份.command | 续办时发现5050/4176均已退出；已再次启动并核对HTTP200及入口字节一致，在用户Mac运行 | 双击流程未单独人工验收；用户已实际玩过loop.2且否决体验 |

预览：http://127.0.0.1:5050（技术原型），http://127.0.0.1:4176（旧版视觉参考，不再为参赛候选）。服务保持运行，重启Mac后可双击现有脚本并保持终端窗口。HTTP200只说明服务器响应。

Work C核查原稿已原样归档docs/archive/work-c-v3-20261018/。音频资产仍为0；原有soundscape.js是合成声音代码，不是已导出声音文件。Work C曾读旧WorkA-v0.5/draft-1，已通知正式路径为共享docs/AUDIO_SPEC.md的draft-3，仍待审核。Work B独立工具核查回执另见PROJECT_STATUS，不以安装包存在推断流水线通过。

## V4.0增量检查｜2026-10-19
- Git：已安装/已验证，沿用现有分支及恢复标签；origin已配置指定HTTPS仓库，账号授权需要配置，未推送。
- Node 24.21.0、npm11.19.0：已安装/已验证，满足项目Node>=20；npm ls无缺失，Three0.186.1/esbuild0.28.2匹配锁定版本。
- 构建：在临时目录复制src/tools/index并引用现有本地依赖，构建退出0；临时结果随检查清理，未覆盖任何现有build或发行包。
- WebGL2：Three本地源码要求WebGL2，浏览器关闭硬件加速/禁用WebGL或设备不支持时无法保证运行；没有WebGL1兼容回退。实际设备覆盖尚未验证，不运行自动浏览器。代码构建通过不是显卡验证。
- VS Code：应用已安装且位置已核对；未验证交互编辑与调试会话，无需安装新编辑器。
- Python3.14.7：已安装/已验证可执行本轮资源清单与检查脚本；不是游戏运行依赖。
- FFmpeg：沿用上轮未找到记录，当前无转换任务，暂不需要安装。
- 启动脚本：两份zsh语法检查通过，server.mjs、Node和现有入口具备；5050/4176 HTTP200。用户双击与浏览器运行仍属于人工验证。
- 运行资源：src/index静态搜索未发现CDN、在线fetch或WebSocket；Three打包进app.js、许可证随构建复制，离线HTML内联脚本。依赖安装需要包源，但已安装后的构建与当前游戏不需在线运行资源。新增GLB/音频加载器仍未实现，不能据此宣称未来资产已离线验收。

V4授权补记：用户已授权，BNC-CUC登录成功，指定仓库Private且空；不再处于账号待配置状态。首次push仍待用户批准。
