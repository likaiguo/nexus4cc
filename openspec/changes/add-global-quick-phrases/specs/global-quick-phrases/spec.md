## ADDED Requirements

### Requirement: 全局常用语持久化

系统 SHALL 将用户维护的快捷句子作为全局常用语持久化到本地 SQLite 数据库。常用语 SHALL 不按项目、频道或设备类型隔离，并 SHALL 在所有项目和频道中共享。常用语数据 SHALL 独立于 Composer 输入历史、Composer 草稿和工具栏快捷键布局。

#### Scenario: 首次启动创建常用语表
- **WHEN** 后端启动且 SQLite 数据库尚未包含常用语表
- **THEN** 后端 SHALL 幂等创建用于保存全局常用语的表结构
- **AND** 后续重启 SHALL NOT 清空已有常用语

#### Scenario: 常用语跨项目共享
- **WHEN** 用户在任意项目或频道创建一条常用语
- **THEN** 用户切换到其他项目或频道后 SHALL 仍能在常用语列表中看到该条目

#### Scenario: 常用语不进入输入历史
- **WHEN** 用户点击常用语并发送到终端
- **THEN** 系统 SHALL NOT 因该发送动作向 Composer 输入历史新增记录
- **AND** 系统 SHALL NOT 修改当前 Composer 草稿

### Requirement: 常用语管理

系统 SHALL 提供经鉴权的常用语管理能力，允许用户查看、新增、编辑、删除并调整常用语顺序。每条常用语 MUST 至少包含稳定 id、标题、正文、是否追加 Enter、排序位置、创建时间和更新时间。

#### Scenario: 查看常用语列表
- **WHEN** 已鉴权用户打开常用语列表
- **THEN** 系统 SHALL 按用户保存的排序位置返回全局常用语

#### Scenario: 新增常用语
- **WHEN** 已鉴权用户提交合法的标题、正文和追加 Enter 设置
- **THEN** 系统 SHALL 创建一条全局常用语
- **AND** 新条目 SHALL 持久化到 SQLite

#### Scenario: 编辑常用语
- **WHEN** 已鉴权用户修改已有常用语的标题、正文或追加 Enter 设置
- **THEN** 系统 SHALL 持久化更新
- **AND** 后续列表读取 SHALL 返回更新后的内容

#### Scenario: 删除常用语
- **WHEN** 已鉴权用户删除一条常用语
- **THEN** 系统 SHALL 从常用语列表中移除该条目
- **AND** 后续列表读取 SHALL NOT 返回该条目

#### Scenario: 调整常用语顺序
- **WHEN** 已鉴权用户提交新的常用语 id 顺序
- **THEN** 系统 SHALL 按该顺序持久化排序位置
- **AND** 不在提交顺序中的现有条目 SHALL 保持可用并排在提交条目之后

#### Scenario: 未鉴权请求被拒绝
- **WHEN** 未鉴权客户端请求读取或修改常用语
- **THEN** 后端 SHALL 返回未授权错误
- **AND** 后端 SHALL NOT 泄露常用语内容

### Requirement: 常用语直接发送到当前终端

系统 SHALL 允许用户从常用语列表中选择一条常用语并直接发送到当前活跃终端。若该常用语启用追加 Enter，系统 SHALL 在正文后追加终端 Enter 序列；若未启用，系统 SHALL 仅发送正文。

#### Scenario: 点击常用语发送正文
- **WHEN** 用户在常用语列表点击一条未启用追加 Enter 的常用语
- **THEN** 系统 SHALL 将该常用语正文发送到当前活跃终端
- **AND** 系统 SHALL 保持当前终端上下文不变

#### Scenario: 点击常用语并追加 Enter
- **WHEN** 用户在常用语列表点击一条启用追加 Enter 的常用语
- **THEN** 系统 SHALL 将该常用语正文发送到当前活跃终端
- **AND** 系统 SHALL 紧随其后发送终端 Enter 序列

#### Scenario: 发送后记录使用情况
- **WHEN** 用户成功触发常用语发送
- **THEN** 系统 SHALL 更新该常用语的使用次数和最近使用时间

### Requirement: 常用语快速入口

系统 SHALL 在终端操作界面提供常用语快速入口。入口 SHALL 使用图标按钮呈现，并 SHALL 打开一个可快速点击发送的常用语列表。列表同时 SHALL 提供进入管理模式或直接执行增删改排序的路径。

#### Scenario: 打开常用语列表
- **WHEN** 用户点击常用语快速入口
- **THEN** 系统 SHALL 弹出全局常用语列表
- **AND** 列表 SHALL 允许用户直接点击条目发送到当前终端

#### Scenario: 空列表可新增
- **WHEN** 用户打开常用语列表且尚无常用语
- **THEN** 系统 SHALL 提供新增常用语的入口

#### Scenario: 管理模式保留发送安全性
- **WHEN** 用户处于新增、编辑、删除或排序常用语的管理操作中
- **THEN** 系统 SHALL NOT 因点击编辑控件而发送常用语到终端
