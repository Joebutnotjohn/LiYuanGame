# 《梨园一梦》部署指南

## 项目类型

Vite + React + TypeScript 静态网页游戏

## 本地运行

```bash
npm install
npm run dev
```

## 本地构建

```bash
npm run build
```

## 本地预览构建产物

```bash
npm run preview
```

## EdgeOne Pages 部署参数

| 参数 | 值 |
|---|---|
| 项目名称 | `tchgame-[appid]` |
| 构建命令 | `npm run build` |
| 输出目录 | `dist` |
| Node.js 版本 | 建议 18 或更高 |

## 部署前检查

- [ ] 确认 `npm run build` 成功
- [ ] 确认 `dist` 目录存在
- [ ] 确认 `public/assets` 下的图片路径在代码中使用 `/assets/...` 引用
- [ ] 确认页面刷新后仍能打开
- [ ] 确认没有本地绝对路径，例如 `D:\code\...`

## EdgeOne Pages 操作步骤

1. 登录腾讯云 EdgeOne Pages
2. 创建新项目
3. 连接 Git 仓库
4. 项目名称填写 `tchgame-[appid]`
5. 选择 Vite / React 项目
6. 构建命令填写 `npm run build`
7. 输出目录填写 `dist`
8. 点击部署
9. 部署成功后复制公开访问链接
10. 用无痕浏览器测试链接是否能公开访问

## 常见问题

| 问题 | 解决方法 |
|---|---|
| 页面空白 | 检查资源路径是否写成了 `/public/assets`，应为 `/assets/...` |
| 部署失败 | 检查 output directory 是否为 `dist` |
| 图片不显示 | 检查 `public/assets` 文件名大小写是否与代码中引用一致 |
| 本地能运行但线上不行 | 重新执行 `npm run build` 并检查浏览器控制台错误 |
