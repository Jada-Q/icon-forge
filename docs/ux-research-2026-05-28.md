# icon-forge — UX Research（2026-05-28，full 模式）

> 前提：icon-forge 当前是单用户 dogfood 工具。本调研的唯一意义在于回答「要不要 / 怎样把它变成对外产品」+「从竞品借哪些点子改进自己用的版本」。数据来自公开搜索。

## 模块 1：用户画像

PERSONA_START
id: P1
label: 一人多 app 的 vibe coder（= Jada 的泛化，主要用户）
demographics: 25-40 / 独立开发者·indie hacker·一人公司 / 会写代码但非设计师
core_pain: 每周建多个 app，AI 自动生成的 logo 又丑又不统一；手动做又要 10+ 尺寸 + 各平台格式
current_solution: AI 生成器 / 免费图标库 google / 偶尔花几百刀找设计师 / 忍受默认丑图标
switching_trigger: 同时维护多个 app，发现它们图标"不像一家人"；或被 App Store 格式校验卡住
quote: "design quality has become the new edge for indie hackers — products that stand out don't look like templates"（[DEV / Indie Hackers 讨论](https://www.indiehackers.com/post/how-do-other-indie-hackers-create-icons-for-their-side-projects-79cc54b5aa)）
PERSONA_END

PERSONA_START
id: P2
label: 起步阶段的 solo iOS/Mac 开发者
demographics: 独立 app 开发者 / Xcode 用户
core_pain: 新项目想要一个"不丢人的占位图标"快速起步，不想停下来纠结设计
current_solution: Bakery（Mac app，专做这个）/ 占位
switching_trigger: Bakery 拖进 Xcode 坏了（macOS Tahoe）/ 想要跨项目统一而非每个随机
quote: "I use it every time I start a new project"（Bakery 用户评价，[App Store](https://apps.apple.com/us/app/bakery-simple-icon-creator/id1575220747)）
PERSONA_END

PERSONA_START
id: P3
label: 快速出 app 的 AI/no-code builder
demographics: 用 AI 批量产小 app / 套壳 / MVP 工厂
core_pain: AI 出图"Frankenstein"——多个 app 风格对不上；每次重新 prompt 还不一定一致
current_solution: IconikAI / Midjourney / 各种 AI 生成器
switching_trigger: 受够了风格漂移 + 按次烧钱 [ASSUMED — 基于竞品评论推断，非直接用户原话]
quote: "Midjourney struggles with maintaining consistency across icon sets"（[howdoiuseai](https://www.howdoiuseai.com/blog/2026-03-09-7-ai-tools-that-create-brand-consistent-icon-sets-)）
PERSONA_END

红队：P1/P2/P3 差异 >70%（多 app 一致性 / 单项目起步 / AI 批量）。P3 的 quote 是竞品评论非用户原话，已标 [ASSUMED]。

## 模块 2：竞品分析

COMPETITOR_START
id: C1
name: IconKitchen
url: https://icon.kitchen
type: direct
positioning: "Cook up app icons for any platform" —— 免费 web，iOS/Android/web/macOS
strengths: 免费；所见即所得；多平台导出；图标库驱动（非 AI，质量稳）
weaknesses: 单个图标工具，不管理"跨多 app 的系列"；无项目集成（不自动放进代码库）
pricing: 免费
gap: 没有"一处定义风格 → 整个 app 组合系列统一"的概念；不放进项目
COMPETITOR_END

COMPETITOR_START
id: C2
name: Bakery
url: https://apps.apple.com/us/app/bakery-simple-icon-creator/id1575220747
type: direct
positioning: 给 Xcode 项目快速生成漂亮的占位/简洁图标
strengths: Mac 原生；"每次开新项目都用"的轻习惯；起步快
weaknesses: 拖进 Xcode 坏了（macOS Tahoe，要先拖 Finder）；单项目导向不管跨项目一致；隐私争议
pricing: 付费（Mac App Store）
gap: 不做跨项目系列一致；不支持 web favicon 全套；不能用自己的图标库/上传
COMPETITOR_END

COMPETITOR_START
id: C3
name: IconikAI / SVGMaker / Recraft（AI 生成类）
url: https://www.iconikai.com
type: indirect
positioning: AI prompt → app 图标；SVGMaker 主打 prompt→SVG + 批量相关图标
strengths: 零设计基础出"独特"图标；自动全尺寸；SVGMaker 出矢量
weaknesses: Frankenstein——多 app 风格对不上；要"Brand Kit Memory"硬凑一致性；按次/订阅烧钱（SVGMaker $10/mo）；位图发虚
pricing: freemium → 付费（$10/mo 起）
gap: 一致性靠"祈祷 AI 记住"，非结构保证；扁平矢量风是 AI 最差场景
COMPETITOR_END

红队：真实替代方案还包括 **免费图标库 google + Figma/手动**（indie hacker 最常用），以及 **「不做，忍受默认丑图标」**。这些是 icon-forge 真正在抢的"现状"。

## 模块 3：需求验证

HYPOTHESIS_START
id: H1
assumption: "跨多个 app 的图标系列一致性"是真痛点，且竞品没解决好
supporting_evidence: "ship multiple apps... new icon must match prior brand. Tools without memory force you to re-prompt"；"Frankenstein designs — stroke weights / corner radii clash"（[howdoiuseai](https://www.howdoiuseai.com/blog/2026-03-09-7-ai-tools-that-create-brand-consistent-icon-sets-)）
counter_evidence: 多数 indie hacker 一次只关心"这一个 app 的图标"，系列一致是少数人（同时维护多 app）的需求
confidence: HIGH（痛点真实）/ 但受众窄
verdict: BUILD（已建）
reasoning: icon-forge 的结构化一致性（共享 style.json）正面解决这个公认难题，比"Brand Kit Memory"更可靠——这是唯一的真差异点
HYPOTHESIS_START
id: H2
assumption: 图标库驱动 + 自助挑选/上传，比 AI 出图更靠谱
supporting_evidence: indie hacker 实际行为就是"google 找图标库挑一个"；AI 出图被诟病 Frankenstein + 发虚
counter_evidence: IconKitchen 已经免费做到了图标库驱动 + 所见即所得 + 多平台
confidence: HIGH
verdict: BUILD（已建）
reasoning: 方法对，但不新——IconKitchen 免费占了单图标场景
HYPOTHESIS_END
HYPOTHESIS_START
id: H3
assumption: icon-forge 值得变成对外产品
supporting_evidence: "多 app 系列一致 + 放进项目"这个组合竞品没人做；新项目集成（像 Bakery 的习惯）+ 系列管理是空白
counter_evidence: 单图标场景 IconKitchen 免费且好；市场拥挤（15+ 工具）；真差异点（系列管理）受众窄；/pm 已定 anti-goal = 不做对外 SaaS
confidence: LOW（作为通用产品）/ MEDIUM（作为"多 app 组合的图标系统"窄切口）
verdict: SKIP（本阶段）/ 若productize 必须只打"管理整个 app 组合的统一图标系统"这一窄切口，别碰单图标（IconKitchen 免费赢）
reasoning: 个人用已达成目标；对外差异化太窄、对手免费，不值得现在投入
HYPOTHESIS_END

## 最终汇总

RESEARCH_SUMMARY
personas: 3，primary: P1（一人多 app 的 vibe coder = 你自己的泛化，也是唯一有真差异化诉求的群体）
competitors: 3 类，biggest_threat: C1 IconKitchen（免费 + 所见即所得 + 多平台，单图标场景全面覆盖）
hypotheses: 3 | BUILD:2（已建）TEST_FIRST:0 SKIP:1（productize）
key_insight: icon-forge 真正且唯一的差异点 = **"一处定义 → 整个 app 组合系列一致"的结构化保证**，正好命中市场公认未解的 Frankenstein 难题。但单图标场景被免费的 IconKitchen 占满——所以它作为个人工具价值最高，作为产品只有"多 app 图标系统"这一窄切口才立得住。
recommended_next: 保持个人 dogfood（符合 /pm anti-goal）。借竞品 2 个点子改自己用的版本：①Bakery 的"新项目起步即用"习惯（你已有 new-project workflow 集成）②IconKitchen 的多平台导出完整度（已有）。productize 念头进 backlog，等你自己用满 1 个月、确认"多 app 系列一致"对你真省事，再重评。
END_SUMMARY
