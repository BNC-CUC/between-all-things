# v0.4.1 发行形态与后台材料核对
2026-10-18。用户已确认尚未投稿。本轮没有登录后台，**账户实际槽位、额外必填字段、包体解析及审核状态未直接核实**；以下按官方公开资料与本地文件整理，不能冒称已完成后台核对。

| 发行方式 | 当前包能否直接使用 | 边界 |
| --- | --- | --- |
| 普通浏览器H5 / TapTap H5包体入口 | 是目标候选格式 | ZIP只有BetweenAllThings/index.html，平台解析和实机运行未验收 |
| Tap小游戏专用运行时 | 不能直接假设兼容 | H5依赖DOM/window等浏览器能力；需要专用适配/打包，当前未做 |
| Windows原生包 | 不兼容 | 没有.exe、原生运行时或启动配置；ZIP后缀相同不意味着PC包 |
| Android APK / TapPlay | 不兼容 | 没有APK及对应接入；当前不制作 |
| TapTap制造 | 不是该形态 | 本项目是独立H5，不申报制造产物 |

官方已区分H5、Tap小游戏与原生包，参见[形态说明](https://developer.taptap.cn/agents/)；[小游戏运行环境](https://developer.taptap.cn/minigameapidoc/dev/tutorial/overview/)说明H5迁移涉及window兼容。Windows要求可运行PC游戏目录及启动配置，见[PC包体文档](https://developer.taptap.cn/docs/en/pc-store/guide/pc-bundle/)。不因v0.5使用WebGL就自动将其归为Tap小游戏。

## 本地包结构核对（不运行游戏）

H5 ZIP唯一入口BetweenAllThings/index.html；没有额外嵌套、__MACOSX或源码包混入。CSS/JS内联，湿地PNG data URI解码摘要与源码图像一致，图标和纸纹为内联SVG；没有外部src/href、残留ES模块import、fetch/XMLHttpRequest/WebSocket/importScripts调用模式。声音为运行时Web Audio合成，不存在缺失外部音频。详情H5_STRUCTURE_CHECK.json。

这证明资源组织不依赖外部下载，不证明file://、浏览器音频解锁、存档、平台首次离线启动或手机适配通过。平台分发下载仍可能需要联网。

## 用户在真实后台逐项核对

使用已报名的队长/厂商账号，先确认游戏类型是H5/网页包体。不要把当前ZIP放入Windows/APK/Tap小游戏专用槽位。记录实际游戏ID、已有版本号、后台提示要求；原包版本0.4.1是否可用由线上版本序列决定。若后台要求不同文件结构或备案/资质，回传准确提示，由主设计决定下一步，不自行换类型规避。

现有图标512×512、封面460×215及600×900，尺寸和文件体积已经读取；视觉合规尚待人工检查。文案、开发者说明、AI说明在保底交接包现有投稿资料目录；AI说明原稿标题0.4.0，新整理说明补记0.4.1沿用，保留原稿。

缺少：真实玩法截图/录屏、16:9宣传图、AI说明在线链接、真实署名及账号资质/适龄/赛事关联核对。官方通用[物料要求](https://developer.taptap.cn/docs/store/release/publish/material/)与账户当前H5槽位可能有区别，不能把未进入的后台描述为已检查。用户完成材料后自行提审；Work A不提交或修改公开页。
