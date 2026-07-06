# XHS Dislike

为小红书网页版信息流卡片添加「不感兴趣」按钮。

## 功能

- 仅在 `xiaohongshu.com` 生效
- 在每个笔记卡片的 `.like-wrapper` 前注入 dislike 图标
- 点击后调用官方 `POST /api/sns/web/v1/note/dislike` 接口
- 成功后淡出并移除该卡片

## 安装

```bash
cd ~/[yourpath]/xhs-dislike
pnpm install
pnpm build
```

1. 打开 Chrome / Edge：`chrome://extensions`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目的 `dist/` 目录

## 使用

1. 打开 https://www.xiaohongshu.com/explore 并登录
2. 等待页面加载几秒（签名引擎初始化）
3. 在信息流卡片点赞区域左侧会出现拇指向下图标
4. 点击即可标记「不感兴趣」

## 开发

```bash
pnpm build    # 构建到 dist/
pnpm watch    # 监听文件变更（需手动刷新扩展）
```

修改代码后，在 `chrome://extensions` 点击扩展的刷新按钮，然后刷新小红书页面。

## 技术说明

- Manifest V3 + TypeScript + esbuild
- `content.js`：DOM 注入与用户交互（ISOLATED world）
- `injected.js`：签名桥接与 API 调用（MAIN world，通过 `<script>` 注入）
- 签名：复用页面 webpack 内的 axios 实例，由官方拦截器自动注入 `x-s` / `x-s-common` / `x-t`

## 风险提示

- 这是**非官方**功能，请仅手动点击使用
- 高频自动化操作可能触发小红书风控（验证码、限流、封号）
- 小红书 DOM 结构与签名算法可能更新，扩展需要维护
- 建议使用测试账号，风险自负

## 已知限制

- 首版覆盖首页 explore、搜索结果等信息流卡片
- 未实现 App 端「选择不感兴趣原因」子菜单
- 详情页互动区暂不在首版范围
