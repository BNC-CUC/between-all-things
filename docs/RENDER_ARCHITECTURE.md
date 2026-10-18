## V3.0当前状态｜2026-10-18
Three.js/WebGL2及现有空间/模拟技术成果保留；原型人工体验未通过。v0.4.1是视觉与作品身份基线。以下历史架构批准不等于当前灰盒视觉获批；新增开发暂停。新的整合路线比较见VISUAL_INHERITANCE_AUDIT.md，推荐混合继承方案尚待批准，本轮未实施。所有未获批准的接口数值继续Draft。

---

# v0.5 渲染与世界架构｜审核稿1
2026-10-18 · Work A。状态：主设计已批准Three.js/WebGL2、独立v0.5、可配置1米格与垂直180°实验观察；接口数值仍待审。已完成第一空间灰盒源码和静态构建，人工体验未验收。

## 实际基线
共享根的 package.json 是0.3.0；真实0.4.1位于 PROJECT_STATUS 中记录的独立交付目录，并有 v0.4.1-pre-v0.5 Git标签。不能把共享根当前代码称为0.4.1。

0.4.1 的 dist/world.js 集中创建一个世界：1700×1120二维平面，三块 garden，各自12旧单位植物格，植物 values/age/maturity/yieldClock 等 TypedArray；气味场85×56、每格20旧单位。生物 x/y、vx/vy 以及鸟 altitude 是旧平面/表现坐标，不是真实Y高度。随机种子、种子来源、局部世代、资源搬运已有逻辑。

renderer.js 是Canvas2D，camera x/y/zoom，fromScreen是线性逆变换；game.js 统一帧更新、DOM界面、角色动作、存档和声音；soundscape.js 为合成Web Audio。tools/package.mjs 以文本内联代码/图像生成离线HTML和ZIP，无第三方构建依赖。源码在dist内，因此不能将整个dist加入gitignore。

## 方案比较与推荐

| 方案 | 优点 | 成本/限制 | 结论 |
| --- | --- | --- | --- |
| Canvas手写投影 | 依赖少 | 自写深度、遮挡、拾取、材质和模型导入成本高 | 不适合本轮360°观察 |
| Three.js + WebGL2 | 保留JS模拟，提供真实深度、相机、射线与GLB生态 | 渲染/输入需替换；旧设备能力需确认 | 推荐，待主设计批准 |
| 更完整WebGL游戏框架 | 内置更多系统 | 对当前小型无依赖工程收益有限，接入/迁移更广 | 暂不采用 |

不切换Unity/Godot/虚幻，不用CSS旋转二维画面。Three.js当前WebGLRenderer要求WebGL2，不能假设支持WebGL1。[官方文档](https://threejs.org/docs/pages/WebGLRenderer.html) Three.js采用MIT，发行时随包保留许可证。[官方许可](https://github.com/mrdoob/three.js/blob/dev/LICENSE) 实施时锁具体版本与依赖摘要；核心/addons保持同版本，自带本地模块与资源，不走CDN。本轮已锁定Three.js 0.186.1、esbuild 0.28.2，保留package-lock；实际设备兼容尚未验证。

## 世界坐标与相机

右手系：+Y高度、+X东、+Z南，米/秒/弧度。数据以世界坐标持久化，摄像机单独保存观察状态。地表为可分块高度场；建议每格1米、每块32×32格，均可配置，不是玩法尺寸定案。中心及索引公式见 ART_SPEC。湿度、肥力、地貌、通行成本、活动强度按地表格储存；高度在顶点网格共享，查询与渲染使用相同三角剖分，避免射线命中和heightAt不同。

旧坐标经单一迁移适配层转换：xNew=oldX*scale、zNew=oldY*scale；先以scale=1/12作比较夹具时，旧植物格=1米、气味格=5/3米，需要重采样而非假装相同格。正式场景尺度待确认；不自动迁移旧存档。

相机状态 {target:{x,y,z},yaw,elevation,distance,projection}。自由观察透视FOV建议35°、仰角25°～75°；yaw连续无夹限。俯视建设正交投影，保留target与近似可见范围；缩放和平移改变相机，不改实体。复位只复位视角。普通环绕可用OrbitControls，精确顶视采用稳定基向量。[官方控制器](https://threejs.org/docs/pages/OrbitControls.html)

垂直180°是从正上方经侧面至正下方的极角0..π实验观察，需独立姿态算法处理极点；不是立即批准地下建设。通过极点用固定连续右向量，避免up向量与视线共线；实验背面禁用工具。成本与风险：地形底面、纸片背面、输入反向、镜头穿地，先单独开关和复位，不纳入首个发布必达项。

屏幕点经canvas边界转NDC，以当前相机射线求地形/交互体交点，输出 worldPosition/normal/surfaceId/entityId 或null。模拟校验可达/占地/边界后接收命令。预览与提交使用同一命中与工具参数；UI事件先消费，双指手势取消单指放置。鼠标/触屏方案沿用 PROJECT_STATUS 初稿，阈值待人工体验。

地面动物连续移动在(x,z)，y从地表采样，速度单位米/秒，通行成本约束路径；飞行用真实三维位置和速度，模型翼振只表达运动。植物实体用rootPosition、speciesId、stage、growth和footprint表示，渲染读取状态。未来建筑使用同一占地查询/道路成本，不能另造屏幕坐标。

## 模块边界与复用

| 模块 | 处理 |
| --- | --- |
| world.js随机序列、局部生长、谱系、衰减、寻食/转向 | 提取为纯模拟函数，保留行为语义；去除写UI/发音效的耦合 |
| 旧stage/action/secondary、胜利条件 | 不原样接入；由新工具命令与创造循环替代 |
| renderer.js | 新渲染模块替换；纸片配色/形态可参考，旧整图不能作为唯一地形 |
| game.js | 拆输入、时钟、UI、存档；现有保存机制可参考，schema/key独立 |
| soundscape.js | v0.5改集中管理器，保留v0.4.1原文件；不同时播放同用途新旧事件 |
| tools/package.mjs | 老包保持；v0.5另建打包入口，适配本地模块和资产清单 |

建议新代码放 v0.5/，不改根dist；src/world、sim、commands、render、input、audio、ui、save分层。world只含数据；sim固定步长1/30秒，输入命令在tick边界处理，视图插值；暂停不无限追赶。不能读取纹理/动画进度决定生长。

## 数据契约草案

World={schemaVersion,seed,tick,terrainChunks,plants,resources,agents,structures,events}。
Cell={surfaceType,heightReference,moisture,fertility,passability,activity}。
Plant={id,speciesId,position,footprint,stage,growth,parentIds,yieldState}。
Resource={id,kind,amount,position,carrierId:null|string,originPlantId?,revision}；携带后不可同时保留可拾取地面副本。
Agent={id,kind,position,velocity,task,targetId,cargoId,route}；未来居民复用资源/路径，不要求现在实现社会系统。
Command={commandId,type,worldPosition,params,issuedAtTick}；校验失败无副作用，成功原子提交并返回事件。资源引用用稳定ID，不能用数组下标持久化。
事件共同字段见PROJECT_STATUS，来源/区域扩展见AUDIO_SPEC。快照不含Three.js对象、DOM或音频节点；schema版本不兼容时拒绝并保留原存档。

## H5、离线与性能

本灰盒已生成静态H5及自包含单HTML，资源仅内置几何体与打包代码；未人工验证file://运行。正式GLB/音频版本仍需要内嵌/路径适配，不宣称正式离线发行完成。所有资源及许可随发行提供；不设置运行时联网下载。当前设备已安装Chrome/Edge，但没有执行WebGL或手机测试。

重复植被实例化，尽量cutout，远景渲染LOD不删模拟对象；移动端限制像素比/阴影/粒子。预算见ART_SPEC，全音频预算见AUDIO_SPEC。记录drawcalls/帧耗时只用于未来获准的性能检查；不自动浏览器试玩。

## 本轮需要确认

1. 批准 Three.js/WebGL2 + 独立v0.5目录，允许替换渲染/输入、逐步抽取模拟。
2. 批准1米基础格、32格分块作为可配置技术起点；正式地图和工具半径另由设计给定。
3. 正常观察/正交建设，垂直180°仅实验观察；是否暂缓进入参赛包。
4. 审核ART_SPEC/AUDIO_SPEC draft-2及声音范围差异。批准前不批量生产正式素材，不启动H/I大规模实现。

## V1.1 实施更新

v0.5/src/world.mjs新增统一生态状态、工具命令、固定步模拟与四邻域地表寻路；src/main.mjs仅消费植物/资源/搬运者状态创建占位表现。原空间灰盒在Git提交8cc4635保留。该轮没有移植整个旧world.js：旧网格/角色/事件耦合较强，首条已授权循环以独立小模块实现，复用既定局部规则思路；后续旧生态模块仍按需逐项迁移，不宣称原代码已完整复用。活动强度只供显示，还未影响路径成本。

## V2.0 模块落地

terrain.mjs统一坐标/高度；rules.mjs集中可配置暂定参数；world.mjs建立状态并调度；commands.mjs处理玩家意图；environment.mjs处理水肥、生长、果实腐败与矿化；agents.mjs处理储备消耗、拾取/运输；navigation.mjs读取活动强度计算路径成本；persistence.mjs校验/恢复；main.mjs保持渲染与输入。模拟不依赖图像动画。音频层接口已定义，尚无正式资源/播放器落地。

保存版本schema2记录规则和grid签名，拒绝不兼容格尺寸，不静默挪动旧物体。当前地图参数仍1米/32格；修改基础尺度需一致调整地图与存档版本，未声称支持任意尺寸热切换。旧v0.4.1保持冻结。
