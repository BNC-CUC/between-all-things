## V3.0状态更新｜2026-10-18
保留本draft-3接口及Work C原稿；暂停新增批量制作。当前正式音频资产0，集中播放器尚未接入v0.5。声音原则及可配置并发/冷却提案保留，均不能代替人工试听。正式共享路径是本docs/AUDIO_SPEC.md；旧WorkA-v0.5/draft-1仅历史副本。

---

# 《万物之间》v0.5｜音频接口规范

版本：draft-3 · 2026-10-18。

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
| seed.placed | Action | 0.50秒/工具 | 2 | 80 |
| environment.changed | Action | 0.50秒/工具 | 1 | 75 |
| resource.placed | Action | 0.30秒/工具 | 2 | 80 |
| plant.germinated | Nature | 6秒/邻近区域 | 1 | 35 |
| plant.stage_changed | Nature | 8秒/邻近区域 | 1 | 30 |
| resource.transferred | Nature | 6秒/邻近区域 | 1 | 30 |
| ecology.cluster_changed | Nature | 12秒/全局 | 1 | 40 |
| ambience.region | Ambience | 同 loopKey 不重复 | 2 | 10 |
| music.layer | Music | 状态变化时平滑切换 | 2 | 5 |

command.accepted 是通用状态事件：若已有 seed.placed 等具体动作声，不额外播放第二声。植物阶段仅对选定关键阶段考虑发声；全体自然一次性声音总计最多每 2 秒 1 次，群体变化按区域时间窗合并，声量不随个体数无限增加。ecology.cluster_changed 的指标/阈值待主设计定义，当前不得定时伪造。

全局最大 8 个逻辑声部；UI/Action/Nature 一次性声音合计最多 4 个，其中 Nature 最多 2 个；Ambience 最多 2、Music 最多 2。一个复合音效作为一个逻辑声部管理其所有节点，尾音/交叉淡化也计入预算。满额时同总线先淘汰更低优先级、较远/较弱声部；同优先级可丢弃新请求。淘汰短淡出，禁止堆积等待播放。UI/Action 可抢占低优先级 Nature；不得因此突破全局 8。高优先级动作无法播放时由视觉反馈兜底。

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
    "priority": 80, "cooldownSec": 0.5,
    "cooldownScope": "tool", "maxVoices": 2, "spatial": true
  }]
}
```

该示例是接口示意，不代表素材存在。asset id 稳定唯一，sources 按优先顺序解码回退；缺失时静音降级。variants 引用其他 assetId，变体只能小幅音色变化，不随机大幅变调形成电子提示轰炸。所有 URI 为包内相对路径。许可证记录作者、来源、授权与生成情况。

## 6. 后续接入完成条件

声音解锁、总静音、后台暂停、读档去重、快速连续操作上限、旋转后的声像、离线资源解码与循环衔接，都属于尚未验证事项。需结合最终素材实际听感确认；本轮不开展自动化游戏测试。素材团队先按审核后的接口制作小批量动作/环境样本，主工程接入预算系统后再扩充，避免批量制作错误音色与过密反馈。

## 7. 与 Work C 对齐补充（draft-3，待审核）

已接收 AUDIO_AUDIT_v0.4.1.md、AUDIO_DIRECTION.md、AUDIO_MANIFEST.md；原稿归档并保留。差异、内容 ID 对应及设计待决项见 AUDIO_RECONCILIATION.md。当前独立音频资产 0，运行资源加载器未实现，MP3/WAV 是计划接口而非已验证格式。

事件触发：seed.placed 在种子写入世界后；environment.changed 在湿度/肥力实际改变量非零后；resource.placed 在资源对象创建/合法移位提交后；plant.germinated 在种子转萌芽后；plant.stage_changed 在阶段改变后（默认只考虑 fruit）；resource.transferred 在货物从携带者扣除且接收方增加的原子操作成功后。command.rejected 只发简短拒绝提示，不发上述成功事件。聚合依据真实状态，不依赖动画时间。

共同事件增加 actorKind:player|autonomous|environment、regionId、resourceKind?、destinationKind?、tracked:boolean；缺失来源默认低优先级自然事件，缺失位置不播放空间声。actionId 说明直接操作关联，不将自然后代自动认定为玩家动作。去重键 eventId；不同状态阶段保留独立事件，单次状态提交不得重复绑定通用 accepted 声。

resource.transferred：直接玩家操作可走 Action（0.3秒去重），自主运输走 Nature（6秒/区域且全局2秒）；用户关注的 NPC 仍为 Nature。种子着地与萌发不能同事件双响。聚合窗口1秒，以稳定 regionId/type 分组，先距离筛选再消耗预算；延迟超过1秒丢弃，绝不积压补播。区域建议8×8地表格，属于工程分组参数不改变生态。

setBusGain(bus,value) 接受有限数0..1并夹取，20ms平滑；setMuted 独立于保存的音量，取消静音恢复原值。灰盒初始 master=0.5、UI=0.5、Action=0.5、Nature=0.25、Ambience=0.2、Music=0.15，仍需主动开启；这是线性增益起点，不是听感保证。音乐常态1轨、交接2轨；环境常态/交接最多2层，4～8秒平滑，不能借交接绕过总预算。动作优先时环境/音乐轻退2dB（建议），禁止逐次重启包络产生抽吸。

运行编码建议短声MP3 128kbps单声道，环境/音乐MP3 160kbps立体声；48kHz母版保持不变。短声单文件≤256KiB、长层≤2MiB；首屏音频≤2MiB，完整运行音频≤8MiB。无缝循环若压缩接缝无法处理才交WAV，并重新核算包体。loopStart/loopEnd 秒数以及原始采样点、sampleRate一起登记，解码后校验边界。所有音源从 assets/audio/runtime/ 加载，母版在 delivery/audio/<batch-id>/masters/，不进入首屏包。文件名小写ASCII下划线，内容ID沿用 C 的 FX/AMB 编号并在 manifest映射稳定 runtime id。

每个实体只能产生世界事实，不能创建 AudioNode；唯一 AudioManager 完成筛选、聚合、冷却、声部抢占、总线和节点回收。v0.5 适配启用后关闭对应旧合成事件；旧 v0.4.1 文件保持原状。正式制作前仍需主设计批准预算与范围。

## V1.1执行进展

核心循环已使用程序几何占位：seed/sprout/grow/mature状态、果实资源和自主搬运。正式美术/独立音频资产未新增；Work C原稿和清单保留。事件新增resource.produced用于真实产果，默认不新增提示音；resource.picked_up用于实际领取。接口数值仍待审核，不能据此要求批量制作。

## V2.0 声音事件与预算确认

主设计已授权一次性声音上限4、自然事件启动间隔2秒作为可配置测试参数；仍待人工试听，不是最终混音验收。配置建议oneShotMax=4、natureIntervalSec=2、natureMax=2；环境常态2层独立管理，音乐独立，总量策略沿用草案。玩家Action先于普通Nature，不排队补播被舍弃的自然事件。

新增resource.decayed：仅真实地面果实从资源表删除并添加organic后产生；默认静音，用环境层/视觉解释，不给每颗腐败负面警报。resource.transferred：实际载货扣除、nest.food增加后发生，NPC沿用6秒局部冷却及2秒全局限频。储备逐帧消耗、矿化、路径每步积累默认不发声；禁止把每次update当事件音。未来nest.reserve_low若设计批准，只在阈值跨越时考虑且目前未实现。

母版WAV48k/24bit、运行MP3和必要短WAV、命名目录/解锁/总线规则不变。当前正式音频资产0、集中播放器未实现、未做试听；不得称为已有并发保护运行证据。Work C原稿保留在archive/work-c-20261018，清单仍由C负责。收到素材后记录格式/实际导入/试听状态，不自动将收到改为完成。
