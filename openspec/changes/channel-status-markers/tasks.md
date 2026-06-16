## 1. 共享启发式(前后端复用)

- [x] 1.1 在 `frontend/src/windowStatus.ts` 扩展 `WindowStatus` 枚举,新增 `active`(等价现 running)、`needs-confirm`、`done`;保留 `idle`/`shell`/`unknown` 语义,更新 `STATUS_DOT_COLOR`(绿/醒目脉冲/蓝/灰)与 `STATUS_DOT_TITLE` i18n key
- [x] 1.2 抽出纯函数:`detectNeedsConfirm(output: string): boolean`(确认提示特征)与 `detectShellPrompt(lastLine: string): boolean`,集中正则便于后端派生与维护
- [x] 1.3 用真实 Claude TUI 输出样本校准 needs-confirm 正则(`❯ N.`、`Do you want to proceed`、`(y/n)`、`1. Yes` 等),记录在文件注释中

## 2. 后端状态机与轮询

- [x] 2.1 在 `server.js` 新增内存表 `channelAttention`(key=`session:index`),字段:`realtime`、`sticky`(needs-confirm/done/null)、`lastSampleHash`、`lastActiveAt`
- [x] 2.2 实现采样函数:对单个 `session:index` 执行 `tmux capture-pane -p -t <target> -S -<N>`(N 行上限,默认 50),返回末尾文本
- [x] 2.3 实现状态计算:由采样文本算实时态(hash 变化→active 并更新 lastActiveAt;无变化且超 idle 阈值→idle;末行 shell 提示符→shell);命中确认特征→置 sticky=needs-confirm;检测 active→idle 下降沿且末行非 shell→置 sticky=done
- [x] 2.4 实现轮询器:`setInterval` 周期(默认 ≥3s,可配)枚举全部 session(`tmux list-sessions`)× window(`tmux list-windows`),小并发/串行采样,更新 `channelAttention`;对窗口数设软上限并对超限情况降级
- [x] 2.5 实现对外报告优先级:`needs-confirm` > `done` > 实时态,导出 `getReportedStatus(key)`
- [x] 2.6 进程退出/无 tmux 时安全降级(轮询异常吞掉、不崩主进程)

## 3. 后端接口

- [x] 3.1 新增 `GET /api/channel-status`(authMiddleware),返回 `{ "<session>": { "<index>": status, ... } }`
- [x] 3.2 在频道激活路径 `POST /api/projects/:name/activate` 中清除目标频道 sticky 态
- [x] 3.3 新增 idempotent 兜底 `POST /api/channel-status/seen`(body: `{ session, index }`,authMiddleware)清除指定频道 sticky 态,供前端切换时调用

## 4. 前端数据接入

- [x] 4.1 新增拉取 `/api/channel-status` 的逻辑(独立周期 3–5s),在 `SessionManagerV2` 持有 `channelStatus` 状态,按 `session+index` 索引
- [x] 4.2 频道列表渲染:用 `STATUS_DOT_COLOR[reportedStatus]` 替换 `getChannelStatus` 的粗判,needs-confirm 加脉冲样式(CSS animation)
- [x] 4.3 项目级聚合渲染:实现 `aggregateProjectStatus(channels)` 按优先级 needs-confirm > done > active > 中性,项目行显示聚合标记
- [x] 4.4 `TabBar.tsx` 频道标签状态点接入新枚举与颜色/脉冲(可复用 `/api/channel-status` 或现有 per-window 输出)

## 5. 进入即清除交互

- [x] 5.1 在 `SessionManagerV2` 的 `onSwitchChannel` / 频道点击路径触发 `POST /api/channel-status/seen`(或依赖 activate),并本地乐观清除该频道标记
- [x] 5.2 在 `Terminal.tsx` 频道切换/WS attach 路径补充清除调用,确保非 SessionManager 入口也能清除
- [x] 5.3 验证进入其它频道不影响本频道 sticky 态

## 6. 国际化与文档

- [x] 6.1 在 `frontend/src/locales/zh-CN/translation.json` 与 `en/translation.json` 的 `windowStatus` 下新增 `active` / `needsConfirm` / `done` 文案
- [x] 6.2 按 Documentation Map 更新 `docs/PRD.md`(新功能)与 `docs/ARCHITECTURE.md`(后端状态轮询架构);如涉及环境变量(轮询周期/行数)更新 `.env.example`

## 7. 验证与发布

- [x] 7.1 前端 `npx tsc --noEmit` 通过(并 `npm run build` 成功、`node --check server.js` OK)
- [x] 7.2 重建前端并重启 nexus(本机 node 进程),确认服务可达(:59000 响应、新端点 401 鉴权、无 poll 错误)
- [ ] 7.3 手动验证:活跃频道绿色;触发 Claude 确认提示→该频道+项目醒目脉冲;任务跑完→蓝色 done;进入该频道后 needs-confirm/done 标记消失,active 不被误清 — **需用户在浏览器登录交互**
- [ ] 7.4 多项目场景验证:切换项目前即可在列表看到其它项目的 needs-confirm/done 聚合标记 — **需用户在浏览器登录交互**

