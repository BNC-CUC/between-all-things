# 原画与表现记录

方式：内置 ImageGen，2026-10-17。未使用 CLI/API 回退。

项目资产：`dist/assets/wetland.png`。原始文件保留于 Codex generated_images 目录。

用途：完整暮色湿地底景，配合程序化鸟翼、阴影、植物摆动、水波、种子、路径、星苔和萤火。没有用参考视频截图或配乐作为资产。

## 完整生成提示词

Use case: stylized-concept. Asset type: production background painting for a 2D poetic nature game named The Seventh Bird. Create one rich, finished, hand-painted aerial environment, wide landscape 16:10 or 3:2, viewed from almost directly above, with NO horizon. A vast dusk wetland lagoon, dark indigo and muted turquoise water flowing between irregular jade reed islands, soft painterly moonlit ripples, meandering river channels, thin mossy shores, isolated ancient weathered stones, tiny waterlilies and delicate grasses along the banks. Large open water spaces make flying creatures readable. Left third has an island with branching natural root-like paths and a few ochre seed plants, center lower area has an organic marsh clearing with lush dark vegetation and faint cyan bioluminescent moss, right third has two separate reed islands with a gentle channel between them and tiny sparse amber firefly-like glints. Upper central lake has a soft warm opening in mist suggesting a place of return. Painterly gouache and layered translucent watercolor, textured brushwork, sophisticated natural color harmony, deep atmospheric spatial layering, restrained ethereal beauty, quiet emotional mood. Cohesive artwork designed to support moving silver birds and warm gold light effects over it. Even top-down projection without perspective distortion. All four edges remain natural wetland textures. No UI, no labels, no words, no logos, no borders, no people, no buildings, no birds painted into the background, no giant magical circles, no neon cyberpunk. This is the actual game environment artwork, not a mockup or screenshot.

## 动态表现

- 主角：连续空速、限速转向、倾斜、翼拍、滑翔、掠地与落种下沉。
- 群体：245 只鸟，局部邻居关系和鸣叫响应，短暂方向尾迹。
- 地表：115 只蚂蚁留下路径；种子作为实际食源。
- 生命：邻域规则驱动星苔的生长和衰退，使用花瓣与枝脉表现细胞状态。
- 夜色：132 个局部耦合的发光个体，明暗由各自相位产生。
- 声音：Web Audio 合成风声、具有回应延迟和声像的鸟鸣、种子落地音、按世界状态加入的持续声部。
- 叙事：局部发现字幕、阶段印记、世界总览与完成后的自由飞行。

## v0.3《万物之间》实验扩展

继续复用此文档记录的 ImageGen 湿地原画，资产仍位于 `dist/assets/wetland.png`。本轮没有生成新位图，也没有引入他人美术或视频素材。

新增美术通过 Canvas 绘制：有膜结构、内部光核和游动尾丝的微观生命；可辨识的植物叶片、局部连接、新生与消退；带六条运动足、触角和搬运食物的蚂蚁；生长中的草丛；带草籽的鸟和地面投影。金色用于玩家及携带资源，青色用于回应，绿色用于生长，土金色用于气味路径。

同一空间采用微观、近景、地面、天空、全景五种观看尺度。镜头会缓慢过渡，不清空世界；鸟的高度影响体积和阴影，前景悬浮微粒具有独立的视差。视觉标记服务于识别动作与结果。

## v0.4 2026-10-18复用记录

上文是原v0.2/v0.3的历史美术记录，不代表v0.4角色数量。本版没有生成新AI原画，仅导出现有资产的排版物料，仍使用同一个wetland.png与原合成声音。程序绘制改为三片岸地、32只蚂蚁、26只鸟，以及持续运行的植物、微光、果实和幼苗。实际运行效果未检查。

提交物料导出延续原SVG标识几何，使用直角非透明背景；封面在既有原画上排版“万物之间”，不添加宣传性文字。它们是图标/封面，不是实机截图，未通过画面验收。原背景及派生封面应在AI说明中如实披露，不能用素材个数论证AI占比低于阈值。
