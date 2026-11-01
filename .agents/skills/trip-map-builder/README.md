# Trip Map Builder

从零散信息到可部署的交互式行程地图页面。

三阶段流水线：**规划行程 → Google Places / 小红书 / Instagram / X 调研 → 生成地图页面**。

定位：生成出发前的参考坐标，不是假装旅行会逐小时照做的执行脚本。

## 共享记忆

技能会优先读取 `~/.trip-map-builder/MEMORY.md`，复用长期有效的旅行偏好：节奏、餐饮、预算、支付、导航方式、历史行程输出和未解决事项。它不保存原始截图、证件、订单号、API 密钥或完整聊天记录。

## Demo

**[tokyo-trip-pi.vercel.app](https://tokyo-trip-pi.vercel.app)** — 东京 4 泊 5 日行程地图

源码：[hiyeshu/tokyo-trip](https://github.com/hiyeshu/tokyo-trip)

## 这个技能做什么

给 AI agent 一套完整的旅行规划工作流：

1. 用户丢过来机票截图、酒店截图、想去的地方
2. Agent 提取硬约束（日期、航班、酒店位置），按区域分组，主动删掉塞不下的点，并标记天气敏感点
3. 餐厅按当天区域给候选。Google Places 判断评分、评价量、价位和营业时间；小红书、Instagram、X 补氛围、近期体验和预警
4. 生成单文件 HTML 页面：Leaflet 地图 + 时间轴卡片 + Google Maps 导航 + 小红书 / Instagram / X 链接 + 支付方式标签
5. 更新共享记忆，只保存下次旅行仍然有用的偏好和输出索引
6. 推到 GitHub，Vercel 自动部署，手机打开直接用

## 安装

一行命令安装（[skills.sh](https://skills.sh) 生态）：

```bash
npx skills add hiyeshu/trip-map-builder
```

或者手动 clone 到 skills 目录：

```bash
# Cursor
git clone https://github.com/hiyeshu/trip-map-builder.git ~/.cursor/skills/trip-map-builder

# Claude Code
git clone https://github.com/hiyeshu/trip-map-builder.git ~/.claude/skills/trip-map-builder
```

## 触发词

说这些话会激活技能：

- "做个行程" / "行程规划" / "行程地图"
- "plan my trip" / "trip map" / "build itinerary"
- "帮我查一下小红书上这家店怎么样"
- "用 Google Places 看看这家店"

## 工作流

### Phase 1：规划行程

从用户给的碎片信息里抽出硬约束，按区域分组，主动删高风险点。

核心原则：
- 一天一个主区域
- 不是越满越好，是越顺越好
- 行程是参考坐标，真实执行可以被天气、当前位置、体力和饥饿程度覆盖
- 餐厅是当天区域内的顺路候选，不为名店反向扭曲路线
- 替用户删东西，说清楚删了什么、为什么删

详见 [`references/trip-planning.md`](references/trip-planning.md)

### Phase 2：Google Places + 小红书 + Instagram + X 调研

Google Places 判断评分、评价量、价位、营业时间和是否在当天区域。小红书补中文近期体验、氛围和软性提醒。Instagram 看菜品和氛围。X 的实时搜索看闭店、排队和踩雷。X 上的新鲜预警可以否掉一家候选。好看的照片不能把 Places 信号弱的店抬成绕路目的地。

Places API (New) 读取环境变量 `GOOGLE_PLACES_API_KEY`。密钥不写入记忆文件、仓库或生成的页面。

小红书可用 OpenCLI 的 CDPBridge 连接 Chrome，直接访问搜索结果页路由，拦截 `search/notes` API，提取前排笔记。

关键经验：**不要模拟输入框**，直接进 `search_result?keyword=` 路由更稳定。Instagram 同样不要操作搜索框。

两段式流程：先粗筛搜索结果（10-20 条），再精读最相关的 2-3 条详情页。

详见 [`references/google-social-research.md`](references/google-social-research.md) 和 [`references/xhs-research.md`](references/xhs-research.md)

### Phase 3：生成地图页面

基于 [`assets/template.html`](assets/template.html) 模板填入数据，生成单文件 HTML：

- Leaflet.js 交互地图（无需 API key）
- 按天切换的时间轴卡片
- 每个地点：
  - 📍 **导航**：Action Sheet 三选——Apple Maps / Google Maps / 🧭 **高德地图 App**（直接 scheme 唤起，不打开网页）
  - 📕 **小红书 App**：UA 检测，正常浏览器走 `xhsdiscover://` scheme，微信/抖音等 WebView 内自动降级到 m 站
  - ⭐ **Google**：有 `mapsUrl` 时打开 Places 返回的店铺页
  - 📷 **Instagram** / 𝕏 **X**：调研写回了链接才显示
  - 📅 预约按钮（可选）
- 支付方式标签（信用卡 / 支付宝 / 交通卡 / 现金）
- 默认 Apple 设计系统，可通过 [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) 切换风格

## 依赖

| 工具 | 用途 | 安装 |
|------|------|------|
| [OpenCLI](https://github.com/jackwener/OpenCLI) | 小红书调研 + Instagram / X adapters | `npm install -g @jackwener/opencli` |
| Google Places API (New) | 餐厅评分、评价量、价位、营业时间 | 环境变量 `GOOGLE_PLACES_API_KEY` |
| Chrome / Chromium | 浏览器 + 远程调试 | — |
| [Leaflet.js](https://leafletjs.com) | 地图渲染 | CDN 引入，无需安装 |
| [gh CLI](https://cli.github.com) | GitHub 仓库创建（可选） | `brew install gh` |

## 目录结构

```
trip-map-builder/
├── CLAUDE.md                 # 项目地图，记录目录职责
├── SKILL.md                  # 技能入口，三阶段流程
├── README.md                 # 本文件
├── assets/
│   └── template.html         # 可复用 HTML 地图模板
└── references/
    ├── CLAUDE.md             # references 局部地图
    ├── trip-planning.md      # 行程规划方法论
    ├── google-social-research.md  # Google Places + Instagram + X
    └── xhs-research.md            # 小红书调研 + OpenCLI 安装
```

## 许可

MIT
