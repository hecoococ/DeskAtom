# DeskAtom 官网技术架构与设计方案

> 项目路径：`d:\大学文档\俊涛html\electron-todo-desktop`
> 规划日期：2026-05-13

---

## 一、项目设计语言提取（从源码分析）

### 颜色系统
| Token | 值 | 用途 |
|-------|-----|------|
| `--theme-color-start` | `#FFB347` 暖黄色 | 品牌渐变起点 |
| `--theme-color-end` | `#FF8C00` 橙色 | 品牌渐变终点 |
| `--theme-gradient` | `linear-gradient(135deg, #FFB347 0%, #FF8C00 100%)` | **主品牌渐变（核心）** |
| `--theme-solid` | `#FF8C00` | 纯色场景（滚动条、边框等） |
| 配色方案 | 天空蓝 / 紫粉 / 珊瑚橙 / 薄荷绿 / 海洋蓝 / 靛蓝紫 | 用户可选主题 |
| 暗夜背景 | `#1e293b → #0f172a` (slate-800/900) | Dark Mode |
| 亮色背景 | `#fffbf5 → #fff8ed` (暖白底，带微黄调，与橙色呼应) | Light Mode |
| 成功色 | `#22c55e` (green-500) | 已完成 |
| 警告色 | `#f59e0b` (amber-500) | 未完成 |
| 错误色 | `#ef4444` (red-500) | 删除 |

### 圆角策略
- 卡片/容器：`16px`（大圆角，现代感）
- 按钮/输入框：`12px ~ 16px`
- 小元素：`8px`
- 统计格子：`12px`

### 阴影层次
- 基础阴影：`0 4px 6px -1px rgba(0,0,0,0.1)`
- 卡片阴影：`0 2px 4px -1px rgba(0,0,0,0.1)`
- 悬停增强：`0 10px 25px -5px rgba(0,0,0,0.1)`
- 发光效果：`0 0 20px rgba(255, 140, 0, 0.3)` / `0 0 40px rgba(255, 179, 71, 0.2)`

### 动画语言
- 过渡时长：`200ms ~ 500ms`
- 缓动函数：`ease`, `cubic-bezier(0.4, 0, 0.2, 1)`, 弹性回弹 `cubic-bezier(0.175, 0.885, 0.32, 1.275)`
- 核心动画：fadeIn、slideIn、float、pulse、bounce
- 交互反馈：hover scale(1.02~1.05), active scale(0.95~0.98)

### 特效风格
- **毛玻璃 (Glassmorphism)**：`backdrop-filter: blur(8px)` + 半透明渐变背景
- **渐变按钮**：`bg-gradient-primary` + shadow-md → hover shadow-lg
- **智能文字颜色**：根据背景亮度自动切换深浅文字

---

## 二、官网技术架构方案

### 推荐方案：纯静态 HTML 单页（零依赖）

```
deskatom-website/
├── index.html              # 官网主页面（单文件，内联 CSS+JS）
├── assets/
│   ├── css/
│   │   └── style.css       # 抽离的样式文件（可选）
│   ├── js/
│   │   └── main.js         # 交互逻辑（可选）
│   └── images/             # 图片资源（使用已有 readme_pic）
└── README.md               # 官网部署说明
```

#### 为什么选纯静态 HTML？
| 因素 | 选择理由 |
|------|----------|
| **部署简单** | GitHub Pages / Vercel / Netlify 一键部署，零构建步骤 |
| **加载极快** | 无框架开销，首屏 < 100KB |
| **SEO 友好** | 纯 HTML 结构清晰，搜索引擎友好 |
| **维护成本低** | 单文件或少量文件，无需 Node.js 环境 |
| **展示型页面足够** | 官网是营销/展示页，不需要复杂状态管理 |

#### 技术选型细节
| 技术 | 用途 | CDN 来源 |
|------|------|----------|
| **HTML5** | 页面结构 | — |
| **CSS3 (Custom Properties)** | 设计系统变量 + 响应式 | 内联 |
| **Vanilla JS** | 滚动动画、暗色模式切换、交互 | 内联 |
| **Google Fonts** | 字体（避免 Inter/Roboto） | `fonts.googleapis.com` |
| **Lucide Icons** (可选) | 图标系统 | `unpkg.com/lucide` |
| **AOS.js** 或自写 IntersectionObserver | 滚动进入动画 | CDN 或自写 |

---

## 三、视觉设计方案

### 设计风格定位：**"原子能量" —— 温暖、专注、有活力**

关键词：Warm · Focused · Energetic · Modern · Playful

### 设计系统声明

```markdown
Design Decisions:
- Color Palette:
  * Primary Gradient: linear-gradient(135deg, #FFB347 → #FF8C00) — 暖黄到橙的品牌渐变，温暖、有活力
  * Primary Solid: #FF8C00 — 纯橙色，用于边框/滚动条/小元素
  * Secondary: #1e293b (Slate-800) — 深邃 slate，专业稳重
  * Light BG: #fffbf5 (暖白底) — 带微黄调的暖白，与品牌色和谐呼应
  * Dark BG: #0f172a (深空黑)
  * Glow: rgba(255,179,71,0.2) / rgba(255,140,0,0.3) — 双层发光（黄+橙）
  
- Typography:
  * Heading: "Plus Jakarta Sans" 或 "Outfit" — 几何无衬线，现代感强
  * Body: "DM Sans" — 清晰易读，与 heading 搭配和谐
  * Code/Mono: "JetBrains Mono" — 技术感
  
- Spacing System: 8px base unit (8/16/24/32/48/64/96/128)
  
- Border Radius Strategy:
  * Large cards/sections: 24px (更圆润，区别于 App 的 16px)
  * Buttons/badges: 12px
  * Inputs: 16px
  * Avatars/icons: 50%
  
- Shadow Hierarchy:
  * Level 1 (elevation): 0 2px 8px rgba(0,0,0,0.06)
  * Level 2 (card): 0 8px 30px rgba(0,0,0,0.08)
  * Level 3 (floating): 0 20px 60px rgba(0,0,0,0.12)
  * Glow (brand): 0 0 40px rgba(255,179,71,0.15) + 0 0 80px rgba(255,140,0,0.08)
  
- Motion Style:
  * Entry: fadeInUp (opacity 0→1, translateY 30px→0), 600ms, ease-out
  * Hover: scale(1.02) + shadow enhancement, 300ms ease
  * Scroll-triggered: staggered reveal (每个子元素 delay +100ms)
  * Reduced motion: respect prefers-reduced-motion
```

### 页面结构（单页滚动式）

```
┌─────────────────────────────────────────────┐
│  Navigation Bar (fixed, glass effect)        │
│  Logo | Features | Gallery | Download | GitHub │
├─────────────────────────────────────────────┤
│                                             │
│          ★ HERO SECTION ★                   │
│   大标题 + 副标题 + CTA 按钮                │
│   动态背景（渐变/粒子/流动效果）             │
│   App 截图预览（带设备框）                   │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│        ★ FEATURES SECTION ★                 │
│   6 个核心功能卡片（图标+标题+描述）         │
│   3 列网格布局，hover 有微交互               │
│   功能截图穿插其中                          │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│        ★ SHOWCASE / GALLERY ★               │
│   应用截图轮播/网格                         │
│   支持暗色/亮色/透明度等不同状态展示        │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│        ★ TECH STACK ★                       │
│   Vue 3 / Electron / Vite / Tailwind        │
│   技术图标横向排列                          │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│        ★ DOWNLOAD / CTA ★                   │
│   大号下载按钮 + 安装说明                   │
│   GitHub Star 按钮                          │
│                                             │
├─────────────────────────────────────────────┤
│  Footer                                     │
│  Made with ❤️ by Hecoococ | License MIT     │
└─────────────────────────────────────────────┘
```

### 各 Section 详细设计

#### 1. Hero Section（首屏）
- **布局**：左文右图（桌面端），上下堆叠（移动端）
- **左侧内容**：
  - 产品名 "DeskAtom" （大字号，gradient text）
  - Slogan："让任务管理变得简单而优雅" / "Simple & Elegant Task Management"
  - 两行描述文案
  - 双 CTA：「立即下载」主按钮 + 「查看 Demo」次按钮
- **右侧**：App 主面板截图，放在模拟的窗口框中（macOS 风格圆角窗口）
- **背景**：柔和的渐变 + 微妙的网格/噪点纹理 + 浮动的模糊光斑（#FFB347 黄橙 glow blobs）

#### 2. Features Section（功能特性）
- **布局**：2×3 网格（桌面），2列/单列（移动端）
- **每张卡片**：
  - 左侧：彩色 icon 容器（圆形/圆角方形，带淡色背景）
  - 右侧：功能名称 + 描述 + 可选的小截图
- **卡片样式**：白色背景，subtle shadow，hover 时上浮 + shadow 加深
- **6 大功能**：
  1. 📝 任务管理（拖拽排序、快速添加）
  2. 🔍 智能筛选（全部/未完成/已完成）
  3. 🎯 专注模式（沉浸式体验）
  4. 🌙 暗夜模式（护眼深色主题）
  5. 🎨 个性化定制（主题色、透明度）
  6. 🖥️ 窗口管理（置顶、指示器模式）

#### 3. Showcase / Gallery（应用截图展示）
- **布局**：Bento Grid（不规则网格）或 Tab 切换
- **内容**：复用 `readme_pic/` 目录下的所有截图
- **交互**：点击放大（lightbox 效果），支持左右切换

#### 4. Tech Stack（技术栈）
- **布局**：水平居中排列，每个技术一个 icon + 名称
- **技术项**：Vue 3 ⚡️ / Electron 🖥️ / Vite ⚡️ / Tailwind 🎨 / pnpm 📦
- **样式**：简约的标签/徽章风格

#### 5. Download / CTA（下载引导）
- **布局**：居中大卡片，深色背景（或 brand gradient）
- **内容**：
  - 大标题 "Ready to Get Started?"
  - 安装命令代码块（带复制按钮）
  - GitHub Release 下载链接
  - Star 按钮

#### 6. Footer（页脚）
- 极简：一行文字，居中
- 包含：Copyright、License、作者信息

---

## 四、响应式断点策略

| 断点 | 宽度 | 布局变化 |
|------|------|----------|
| Mobile S | < 480px | 单列堆叠，紧凑间距 |
| Mobile L | 480px - 768px | 单列，适当放宽 |
| Tablet | 768px - 1024px | 2 列网格 |
| Desktop | 1024px - 1440px | 标准桌面布局 |
| Wide | > 1440px | 居中容器 max-width: 1280px |

---

## 五、交互与动画设计

### 滚动触发动画（IntersectionObserver）
- 元素进入视口时触发 fadeInUp
- 同组元素 stagger 延迟（每个 +100ms）
- 尊重 `prefers-reduced-motion: reduce`

### 导航栏
- 固定顶部，滚动时添加 glassmorphism 背景（blur + 半透明）
- 滚动 > 100px 后出现 shadow
- 移动端：汉堡菜单 + 全屏抽屉导航

### 暗色模式切换
- 导航栏右侧放置 toggle switch
- 使用 CSS 变量 + `data-theme="dark"` 属性切换
- 平滑过渡（transition on color/background-color 300ms）

### 微交互
- 按钮 hover：轻微上浮 + shadow 加深
- Card hover：scale(1.02) + border-color 高亮
- 链接 hover：下划线从左到右展开
- 图片 hover：轻微 zoom + overlay 显示描述

---

## 六、实施步骤清单

### Phase 1: 项目初始化与基础架构
- [ ] 创建 `deskatom-website/` 目录结构
- [ ] 创建 `index.html` 骨架（语义化 HTML5）
- [ ] 定义 CSS 自定义属性（Design Tokens）
- [ ] 引入 Google Fonts（Plus Jakarta Sans + DM Sans）
- [ ] 实现 CSS Reset + Base Styles

### Phase 2: 导航栏与 Hero 区域
- [ ] 实现 fixed glassmorphism 导航栏（含 logo、菜单链接、暗色切换、GitHub 按钮）
- [ ] 实现 Hero Section（标题、slogan、CTA 按钮、App 截图设备框）
- [ ] Hero 背景效果（渐变光斑 + 网格纹理）
- [ ] 响应式适配 Hero（移动端垂直布局）

### Phase 3: 功能特性区域
- [ ] 实现 Features 网格布局（6 张功能卡片）
- [ ] 为每张卡片绘制/放置 SVG icon
- [ ] 编写功能描述文案
- [ ] 实现 scroll-triggered stagger 入场动画
- [ ] Card hover 交互效果

### Phase 4: 展示画廊区域
- [ ] 实现 Bento Grid / Tab 切换式截图展示
- [ ] 引入 `readme_pic/` 下的截图资源
- [ ] 实现 lightbox 点击放大功能
- [ ] 截图分类标注（主面板/专注模式/设置等）

### Phase 5: 技术栈与下载区域
- [ ] 实现 Tech Stack 水平图标列表
- [ ] 实现 Download CTA 区域（含代码块 + 复制按钮）
- [ ] GitHub Star 徽章集成

### Phase 6: Footer 与收尾
- [ ] 实现 Footer
- [ ] 全局暗色模式完整适配
- [ ] 移动端汉堡菜单实现
- [ ] 性能优化（图片懒加载、CSS 压缩）
- [ ] 跨浏览器测试

### Phase 7: 部署准备
- [ ] 编写部署 README
- [ ] 配置 GitHub Pages（如需要）
- [ ] 最终视觉走查与调优

---

## 七、反模式避坑（来自 Web Design Engineer Skill）

| ❌ 避免 | ✅ 替代方案 |
|---------|-----------|
| 紫粉蓝渐变泛滥 | 使用品牌渐变 `#FFB347 → #FF8C00` 黄橙渐变作为核心色 |
| Inter/Roboto 字体 | Plus Jakarta Sans + DM Sans |
| Emoji 当图标用 | SVG 图标 / Lucide Icons |
| 左边框彩色 accent 卡片 | 使用 icon 容器 + 微妙背景色区分 |
| 虚假数据/数字 | 只展示真实的功能点 |
| 过度填充内容 | 少即是多，留白即设计 |
| 千篇一律的圆角卡片 | 结合 Bento Grid 不规则布局增加趣味性 |

---

## 八、参考网站风格

| 参考 | 借鉴点 |
|------|--------|
| Arc Browser 官网 | 大胆的排版对比、产品截图展示方式 |
| Raycast 官网 | 简洁的功能展示、深色基调 |
| Notion 官网 | 清晰的信息层级、温和的色彩 |
| Linear 官网 | 精致的微交互动画、高级感排版 |
| Vercel 官网 | 技术产品的视觉表现力 |

---

> **下一步**：确认此方案后，将按照 Phase 1 → 7 的顺序逐步实施，最终产出完整的 `index.html` 单文件官网。
