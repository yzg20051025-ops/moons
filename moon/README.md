# 月见 MOONBORN

输入两个出生日期，看见那一天的月亮，以及两轮月亮叠在一起重合了多少。

灵感来自 Takuku 那类月相 / 塔罗应用：把一个日期变成一轮具体的月亮，再让两轮月亮相遇。

---

## 打开

双击 `index.html` 即可。不需要安装、不需要联网、不需要构建。
所有脚本都是普通 `<script>`，`file://` 下可直接运行；月面照片以 base64 内嵌在
`js/moon-texture.js` 里，所以不会触发 canvas 的跨域污染。

如果想用本地服务器：

```bash
python -m http.server 8080
# 打开 http://localhost:8080
```

## 页面上有什么

| 区块 | 内容 |
| --- | --- |
| 双月 | 两个人的出生日期、农历、月相名称、照亮比例、月龄、地月距离，月亮逐像素按真实相位渲染 |
| 重合度 | 两轮月亮亮部的 Jaccard 重叠率 + 相位差；切换日期时月相会从旧相位扫到新相位 |
| 月相说 | 八种月相各写了一段性格侧写（塔罗 App 的调性） |
| 叠在一起看 | 只有你 / 只有 TA / 两个人都有的三色叠加图 |
| 细节表 | 公历、农历、月相、照亮比例、月龄、地月距离、月亮星座 |
| 月相卡 | 生成 1080×1350 的分享长图（本地 canvas 绘制，直接下载）；另有复制文案 |
| 说明 | 算法、正午约定、重合度定义、隐私 |

## 月相是怎么算的

`js/astro.js`，纯手写，无依赖：

1. **月球位置**：Meeus《Astronomical Algorithms》第 47 章的 ELP-2000 简化周期项
   （黄经 60 项、黄纬 14 项、距离 27 项，含金星/木星摄动与扁率项）。
2. **太阳位置**：第 25 章的视黄经与日地距。
3. **相位角**：由日月角距 ψ 求 `i = atan2(R·sinψ, Δ − R·cosψ)`，
   照亮比例 `k = (1 + cos i) / 2`，月相角 `p = λ月 − λ日`（0 新月 / 90 上弦 / 180 满月）。
4. **月龄**：以 k/p 给出的估计时刻为起点，二分反解上一次新月时刻，误差数秒。

精度自检（`node tools/validate-astro.js`），拿 8 次日月食的食甚时刻反推相位角：

```
2024-04-08 北美日全食   误差 0.058°
2025-03-14 月全食       误差 0.005°
2026-08-12 日全食       误差 0.067°
……
最大误差 0.067°
```

0.067° 约合月相时间上的 1 分钟。

**农历**用浏览器内置的 ICU 中国历法（`Intl.DateTimeFormat('zh-CN-u-ca-chinese')`），
包含闰月；不支持该历法的浏览器会自动隐藏农历字段。

## 月面是怎么画的

`js/moon-render.js`：

- 贴图：一张全月照片裁成圆盘、去黑边、压高光、轻微锐化，当作**反照率图**，
  以 base64 写进 `js/moon-texture.js`。
- 逐像素：对圆盘内每个像素求球面法线 `n`，太阳方向 `L = (s·sin i, 0, cos i)`，
  `lam = n·L` 就是入射角余弦。
- 光照用 **Lommel–Seeliger**（`2lam / (lam + nz)`）混一点朗伯项 —— 这是月面真实的
  光度特性：满月时整盘几乎是平的，弦月时晨昏线附近迅速变暗。
- 晨昏线叠一层噪声扰动，避免出现几何般完美的椭圆弧。
- 暗面只留 5% 的透明度，所以弦月的暗部会彻底融进夜空；新月时补一圈极淡的轮廓。

## 重合度是什么

把两轮月亮的亮部投影到同一张月面上，用**交集面积 ÷ 并集面积**（Jaccard），
在 220×220 的网格上数值积分：

- 同一轮满月 → 100%
- 一弯新月与一轮满月 → 0%
- 上弦与下弦（亮部互补）→ 0%，文案会写成"正好互补"

这个定义和页面上的"叠在一起看"是同一套几何，所以数字和图形永远对得上。

## 目录

```
index.html
css/style.css
js/astro.js          月相计算
js/moon-render.js    月面渲染（光照 / 叠影 / 相位过渡）
js/moon-texture.js   月面贴图（base64，257 KB）
js/app.js            页面逻辑、文案、分享长图
assets/
  moon-900.jpg       裁好的月面贴图
  source-full-moon.jpg  原始全月照片
tools/
  validate-astro.js  用日月食校验算法
  make_texture2.py   重新裁切月面贴图
  embed.js           把贴图转成 base64 模块
  shot.js            用 CDP 截图（验收用）
vercel.json          静态托管配置（安全头 + 贴图缓存）
.vercelignore        不上传 preview / tools / assets
deploy.cmd           双击部署到 Vercel
README.md
```

## 部署到 Vercel

纯静态、零构建。`vercel.json` 与 `.vercelignore` 已经备好，CLI 也装在本机了。

### 一、双击 `deploy.cmd`（最省事）

1. 双击 `deploy.cmd`；
2. 浏览器会打开 Vercel 登录页 —— GitHub / Google / 邮箱都行，登录完回到命令行；
3. 看到 `Production: https://xxx.vercel.app` 就上线了。

之后每次更新，再双击一次即可（已登录会跳过第一步）。项目名默认 `moonborn`，
如果提示被占用，把 `deploy.cmd` 里的 `--project moonborn` 改成别的名字。

### 二、自己装 CLI

```powershell
npm i -g vercel
cd E:\zy\moon
vercel login
vercel deploy --prod --yes --project moonborn --create-if-missing
```

### 三、GitHub 自动部署（要长期维护推荐这个）

1. 把 `E:\zy\moon` 推到一个 GitHub 仓库；
2. vercel.com/new → Import Git Repository → 选这个仓库；
3. Framework Preset 选 **Other**，Build Command 留空，Output Directory 填 `.`；
4. Deploy。以后每次 push 自动发布。

### 部署的两个坑

- **不要加 `cleanUrls`**。Vercel CLI 会为它生成一份缺少 filesystem 路由的配置，
  结果是 `/` 和 `/index.html` 都 404，而 `/js/*.js` 正常 —— 很难查。现在的
  `vercel.json` 里没有它。
- `.vercelignore` 排除了 `assets/`，因为月面贴图已经 base64 内嵌在
  `js/moon-texture.js` 里，部署包只有 ~330 KB。

## 想改点什么

- **默认日期**：`js/app.js` 的 `store`，默认是"今天"和"25 天前"。
- **文案**：`verdictOf()` 的七档结论、`READINGS` 的八段月相侧写。
- **配色**：`css/style.css` 顶部的 `:root` 变量。
- **换月面照片**：替换 `assets/source-full-moon.jpg` → 改 `tools/make_texture2.py`
  里的圆心与半径 → 跑 `python tools/make_texture2.py` → 跑 `node tools/embed.js`。

## 已知限制

- 输入的是日期不是时刻，统一按**北京时间当天 12:00** 计算（一天里月亮只走 12°，
  不影响月相的样子）。
- 农历依赖浏览器 ICU，极老的浏览器会看不到农历。
- iPhone 上点"保存月相卡"可能直接打开图片而不是下载，长按图片存储即可。
- 月相按地心坐标计算，没有做大气折射与视差修正 —— 对月相外观没有可见影响。

## 素材

- 月面照片：Pexels #47367（Pexels License，可免费使用）。
- 字体：使用系统字体（PingFang SC / 微软雅黑 / 宋体 / Georgia），不加载外部字体。
- 无任何第三方 JS 依赖，无网络请求。
