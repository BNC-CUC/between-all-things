# 《万物之间》v0.5｜音频接口规范

版本：draft-1 · 2026-10-18。

本地共享权威路径：`/Users/cornelius-lowell-winthrop/Documents/GameJam/emergent-life/docs/AUDIO_SPEC.md`。Work A 维护；此文件为审核草案，尚非批准后的生产规范。ChatGPT 项目文件同步：未完成，本地修改不会自动同步。

状态：初稿已完成；正式制作接口待主设计确认；播放系统尚未实现。坐标与共同事件字段遵循 PROJECT_STATUS.md。

## 1. 目标与现状

声音帮助玩家听见动作被接受、附近生命变化和环境的持续存在。优先克制、柔和、自然层次，留出安静；不把每次生态计算翻译成一声提示音。

v0.4.1 以振荡器和噪声合成，声音事件直连主输出，持续和弦与提示音会叠加；部分事件虽有间隔，但缺少全局声部控制。本轮规范用统一事件、总线、冷却和并发解决结构问题，不宣称已有音效得到改善。

## 2. 总线及播放生命周期

主输出下分 UI、Action、Nature、Ambience、Music 五总线，各有音量/静音，主界面至少提供总静音与音量入口。首次用户手势后才解锁 AudioContext；解锁失败保留无声运行和明确状态，不重复弹窗。

灰盒先以显式“开启声音”启动，正式版默认音量由主设计确认。切到后台时淡出并暂停环境循环；回来不追播积压事件；读档、重放以及快进不重放历史提示。暂停/静音时清理待播放的一次性队列，已发声节点短淡出后释放。环境循环以唯一 loopKey 管理，场景切换不能叠建相同循环。

播放系统对外：unlock()、setBusGain(bus,value)、setMuted(bool)、consume(event)、setListener(view)、pause()、resume()、dispose()。异步解码失败跳过该资源并记录一次错误，玩法不受阻。声音不能修改世界或决定动作完成。

## 3. 事件映射及初始预算

事件只接受已提交的模拟/命令结果。共用 eventId 去重；actionId 连接玩家操作；预览移动不产生成功声。以下数值为待听感调整的首轮上限，不是每个事件都必须响。

| 事件 | 总线 | 最短间隔/作用域 | 同类上限 | 优先级（大者优先） |
| --- | --- | --- | ---: | ---: |
| ui.confirm | UI | 0.10秒/全局 | 1 | 90 |
| command.rejected | UI | 1秒/全局 | 1 | 85 |
| seed.placed | Action | 0.30秒/工具 | 2 | 80 |
| environment.changed | Action | 0.50秒/工具 | 1 | 75 |
| resource.placed | Action | 0.30秒/工具 | 2 | 80 |
| plant.germinated | Nature | 6秒/邻近区域 | 1 | 35 |
| plant.stage_changed | Nature | 8秒/邻近区域 | 1 | 30 |
| resource.transferred | Nature | 4秒/邻近区域 | 1 | 30 |
| ecology.cluster_changed | Nature | 12秒/全局 | 1 | 40 |
| ambience.region | Ambience | 同 loopKey 不重复 | 2 | 10 |
| music.layer | Music | 状态变化时平滑切换 | 2 | 5 |

command.accepted 是通用状态事件：若已有 seed.placed 等具体动作声，不额外播放第二声。植物阶段仅对选定关键阶段考虑发声；全体自然一次性声音总计最多 2 次/秒，群体变化按区域时间窗合并，声量不随个体数无限增加。ecology.cluster_changed 的指标/阈值待主设计定义，当前不得定时伪造。

全局最大 12 个逻辑声部；总线同时上限 UI 2、Action 3、Nature 3、Ambience 2、Music 2。一个复合音效作为一个逻辑声部管理其所有节点，尾音/交叉淡化也计入预算。满额时同总线先淘汰更低优先级、较远/较弱声部；同优先级可丢弃新请求。淘汰短淡出，禁止堆积等待播放。UI/Action 可抢占低优先级 Nature；不得因此突破全局 12。高优先级动作无法播放时由视觉反馈兜底。

冷却使用单调实时时钟，暂停后丢弃过期请求；模拟时间仅用于事件归属。静音期间只更新状态，不堆积队列。相同区域边界的聚合由主工程维护稳定区域键，不能依赖摄像机像素位置。

## 4. 空间与混音

UI 非空间化。世界音效从事件世界坐标取得声源位置；以观察焦点为听觉中心，使用相机右方向计算左右声像，绕到另一侧应自然改变声像。俯视镜头保持稳定方向，缩放影响可听范围而不是无条件放大音量。起始近场半径 2 米、远场 20 米，超过范围的低优先级自然事件丢弃；地图尺度明确后统一调整。

音乐/环境层缓慢淡入淡出，不能每 5 秒重新触发一组长音造成持续重叠。动作清楚但不尖锐；生态密集时降低自然层密度，禁止靠越来越响证明生命更多。不要求首版灰盒加入完整配乐。

素材峰值建议 ≤-3 dBFS，避免硬削波；最终混音预留余量，输出目标 true peak ≤-1 dBTP，需后续实际测量，不宣称当前达到。短音不以统一 LUFS 数字强行归一，响度匹配以角色和实际试听为准。输出限幅器只能防异常尖峰，不能替代声部预算。

## 5. 资源格式与交付

源文件：WAV 48 kHz / 24 bit；短空间声优先单声道，环境/音乐可立体声。运行资源提供 MP3，必要的短无缝循环保留 WAV；其他压缩格式可选，但须有主工程明确支持和目标浏览器解码证据。不能只交工程文件或依赖在线播放器。循环资源标明 loopStart/loopEnd（秒）、有效长度和是否需要交叉淡化。

目录：delivery/audio/<batch-id>/，含 manifest.json、runtime/、masters/、LICENSES.md、CHANGELOG.md；由 Work A 导入 assets/audio/。美术/音频工作区不直接修改 soundscape 或主工程。主工程在导入时生成文件摘要并保留版本。

```json
{
  "schemaVersion": 1,
  "batchId": "riverbank-audio-001",
  "assets": [{
    "id": "action.seed.place", "revision": 1,
    "sources": [{"uri": "runtime/seed_place.mp3", "mime": "audio/mpeg"}],
    "bus": "Action", "durationSec": 0.6, "channels": 1,
    "loop": false, "gainDb": -6,
    "variants": [], "licenseRef": "LICENSES.md"
  }],
  "bindings": [{
    "event": "seed.placed", "assetId": "action.seed.place",
    "priority": 80, "cooldownSec": 0.3,
    "cooldownScope": "tool", "maxVoices": 2, "spatial": true
  }]
}
```

该示例是接口示意，不代表素材存在。asset id 稳定唯一，sources 按优先顺序解码回退；缺失时静音降级。variants 引用其他 assetId，变体只能小幅音色变化，不随机大幅变调形成电子提示轰炸。所有 URI 为包内相对路径。许可证记录作者、来源、授权与生成情况。

## 6. 后续接入完成条件

声音解锁、总静音、后台暂停、读档去重、快速连续操作上限、旋转后的声像、离线资源解码与循环衔接，都属于尚未验证事项。需结合最终素材实际听感确认；本轮不开展自动化游戏测试。素材团队先按审核后的接口制作小批量动作/环境样本，主工程接入预算系统后再扩充，避免批量制作错误音色与过密反馈。
