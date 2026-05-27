# icon-forge

统一风格的 app 图标工厂。**改一份 `icon-style.json` = 定义整个系列的视觉语言**；每个 app 选一个字形 + 一个底色，一键产出全平台格式。系列一致性是「结构保证」的——所有图标共用同一形状 / 调色板 / 字形权重 / 留白，不是靠 AI 记忆。

![series](output/_series.png)

## 为什么这样设计

- **字形（图案）来自图标库**：Phosphor（1200+，MIT）主用，缺概念退到 Tabler（6000+，MIT）。两个都商用免署名，可直接打进发布的 app。
- **风格来自你的令牌**：`icon-style.json` 里的调色板从你的参考图真实采样，加 Apple squircle 形状 + 留白规则。
- **导出是确定性的**：sharp 栅格化 → macOS `.icns`（系统 iconutil）+ web favicon 套件 + iOS appiconset。

## 快速开始

```bash
npm install                       # 装 sharp + 两个图标库

# 单个 app
node src/cli.mjs quake-globe --glyph globe --bg coral --fg white

# 全系列（读 series.json，改完 style.json 后一键刷新所有 app）
node src/cli.mjs --all
open output/index.html            # 浏览器看全系列预览
```

## 产物（每个 app 一个目录 `output/<app>/`）

| 文件 | 用在哪 |
|---|---|
| `icon.icns` | macOS app（放进 `.app/Contents/Resources/`，Info.plist `CFBundleIconFile`） |
| `web/favicon.ico` + `icon-*.png` + `apple-touch-icon.png` | 网站（放 `public/`） |
| `AppIcon.appiconset/` | iOS（整个文件夹拖进 Xcode 的 Assets） |
| `icon-1024.png` | 通用 / App Store / GitHub social |
| `master.svg` | 矢量源，无限放大 |

## 调风格（改 `icon-style.json`）

| 字段 | 作用 |
|---|---|
| `palette` | 你的色板（key→hex）。`--bg` / `--fg` 用 key 引用 |
| `glyph.library` / `glyph.weight` | `phosphor`(fill/duotone/bold) 或 `tabler`(filled) |
| `glyph.paddingRatio` | 字形在 tile 里的留白，越大字形越小 |
| `tile.cornerRatio` | squircle 圆角占比（0.2237 ≈ Apple） |
| `tile.macInsetRatio` | macOS 图标四周透明边（≈10%，对齐其他 mac 图标光学尺寸） |
| `defaults.bg` / `defaults.fg` | 没传 `--bg/--fg` 时的兜底色 |

改完跑 `--all`，整个系列同步更新——这是这个工具的核心循环。

## 加一个新 app

**方式 A（推荐，进系列）**：往 `series.json` 的 `apps` 加一行，跑 `--all`。
**方式 B（一次性）**：`node src/cli.mjs <名> --glyph <字形> --bg <色> --fg <色>`。

字形名去 [phosphoricons.com](https://phosphoricons.com) 或 [tabler.io/icons](https://tabler.io/icons) 搜；名字打错时 CLI 会列出相近候选。

## 建新 app 时直接用

在新项目里产出图标并就位（以 macOS app 为例）：

```bash
node ~/Desktop/Projects/icon-forge/src/cli.mjs myapp --glyph rocket --bg sky --fg white
cp ~/Desktop/Projects/icon-forge/output/myapp/icon.icns      <新项目>/build/
cp ~/Desktop/Projects/icon-forge/output/myapp/web/* <新项目>/public/   # web 项目
```

## Duotone 真双色

Phosphor `duotone` 权重每个字形分两层（背景大形 + 前景细节）。给 `--fg2` 就把两层映射成两个**独立**颜色（背景层默认拉满不透明），做出「珊瑚底+黑细节」那种 bold 两色：

```bash
# 黑圆盘 + 白经纬线，放在 sky 底上
icon-forge demo --glyph globe --weight duotone --bg sky --fg white --fg2 black

# 柔和 duotone（背景层半透明）：加 --fg2-opacity 0.35
```

不给 `--fg2` 时 `duotone` 退回同色调浓淡（主色 + 同色 20%）。`series.json` 里写 `"fg2"` / `"secondaryOpacity"` 字段同理。

## CLI 选项

```
icon-forge <app名> --glyph <字形> [--bg 色] [--fg 色] [--fg2 色] [--fg2-opacity 0-1]
                   [--lib phosphor|tabler] [--weight fill|duotone|bold] [--out 目录]
icon-forge --all          # 按 series.json 重生全系列 + 写 output/index.html
```
