## 1. 规范与设计记录

- [x] 1.1 新建 OpenSpec change,记录白底白字与历史截断问题
- [x] 1.2 定义终端/历史可读性和深度历史拉取验收标准

## 2. 前端可读性修复

- [x] 2.1 增强 `ansiToHtml`:按当前主题解析默认前景/背景,支持 inverse,并对低对比度前景/背景组合做可读性兜底
- [x] 2.2 历史浮层调用 `ansiToHtml` 时传入当前终端主题,确保暗色/亮色主题一致
- [x] 2.3 XTerm 启用 `minimumContrastRatio`,降低当前终端输出中白底白字/低对比组合的风险

## 3. 历史拉取深度修复

- [x] 3.1 前端历史预取与打开历史时请求更大的历史范围,不再固定 3000 行
- [x] 3.2 后端 `/api/sessions/:id/scrollback` 提高可捕获上限,结合 tmux `history_size` 尽量返回当前 pane 可用完整历史
- [x] 3.3 服务启动时设置 tmux `history-limit`,使后续会话保留更长历史

## 4. 验证与交付

- [x] 4.1 `npm run build`(frontend) 通过
- [x] 4.2 `node --check server.js` 通过
- [x] 4.3 重启 nexus 服务并确认服务可访问
