## ADDED Requirements

### Requirement: SQLite 本地持久化初始化

后端 SHALL 在 `data/` 目录初始化单用户 SQLite 数据库,用于保存用户设置、快捷键布局、输入历史、Composer 草稿、任务索引和注意力事件。数据库初始化 MUST 是幂等的,重复启动不得破坏已有数据。

#### Scenario: 首次启动创建数据库
- **WHEN** `data/nexus.sqlite` 不存在且服务启动
- **THEN** 后端 SHALL 创建数据库文件并应用当前 schema migrations

#### Scenario: 重复启动不重建数据
- **WHEN** `data/nexus.sqlite` 已存在且 schema version 已是最新
- **THEN** 后端 SHALL 复用现有数据库且不得清空已有记录

### Requirement: JSON 数据迁移兼容

后端 SHALL 将现有 `data/toolbar-config.json` 与 `data/tasks.json` 迁移到 SQLite 中对应的数据表。迁移成功前 MUST 保留原 JSON 文件;迁移失败 MUST 不影响服务使用旧数据回退。

#### Scenario: 迁移工具栏配置
- **WHEN** SQLite 中尚无 active toolbar layout 且 `data/toolbar-config.json` 存在
- **THEN** 后端 SHALL 将该配置导入 SQLite 并继续保留原 JSON 文件

#### Scenario: 迁移任务历史
- **WHEN** SQLite 中尚无任务记录且 `data/tasks.json` 存在
- **THEN** 后端 SHALL 将任务历史导入 SQLite 并保持 `/api/tasks` 的响应结构兼容

#### Scenario: 迁移失败回退
- **WHEN** JSON 迁移过程中发生解析或写入错误
- **THEN** 后端 SHALL 记录错误并继续使用原 JSON 数据路径提供兼容行为

### Requirement: 用户设置 API

后端 SHALL 提供经鉴权的用户设置读写接口,用于保存主题、历史保留、Composer 默认模式、输入历史开关等单用户偏好。所有设置写入 MUST 持久化到 SQLite。

#### Scenario: 读取设置
- **WHEN** 已鉴权客户端请求用户设置
- **THEN** 后端 SHALL 返回当前设置与默认值合并后的结果

#### Scenario: 更新设置
- **WHEN** 已鉴权客户端提交合法设置更新
- **THEN** 后端 SHALL 持久化更新并在后续读取中返回新值

#### Scenario: 未鉴权拒绝
- **WHEN** 未鉴权客户端请求或修改用户设置
- **THEN** 后端 SHALL 返回未授权错误且不得泄露设置内容

### Requirement: 输入历史隐私控制

系统 SHALL 只保存用户明确通过 Composer 或明确提交入口发送的文本历史,不得保存完整终端 scrollback、原始 PTY 字节流或环境变量。用户 MUST 能关闭输入历史记录、清空历史并配置保留天数。

#### Scenario: 历史记录关闭
- **WHEN** 用户关闭输入历史记录后通过 Composer 发送文本
- **THEN** 系统 SHALL 不向 `input_history` 新增该文本记录

#### Scenario: 清空历史
- **WHEN** 用户触发清空输入历史
- **THEN** 后端 SHALL 删除已保存的输入历史,但不得删除 tmux scrollback 或任务记录

#### Scenario: 保留天数清理
- **WHEN** 输入历史记录超过用户配置的保留天数
- **THEN** 后端 SHALL 在清理流程中删除过期历史

### Requirement: 本地数据库不接管 tmux 会话

SQLite SHALL 仅保存用户状态、索引和事件,不得成为 tmux session、tmux window 或 scrollback 的权威来源。项目/频道存在性与终端历史仍 MUST 从 tmux 查询。

#### Scenario: tmux session 删除后数据库不复活会话
- **WHEN** 某 tmux session 已在 tmux 中被删除但 SQLite 中仍存在相关历史或事件
- **THEN** 后端 SHALL 不因数据库记录重新创建该 tmux session

#### Scenario: scrollback 仍由 tmux 返回
- **WHEN** 客户端请求频道历史记录
- **THEN** 后端 SHALL 继续从 tmux capture/scrollback 获取内容,不得从 SQLite 返回完整终端历史
