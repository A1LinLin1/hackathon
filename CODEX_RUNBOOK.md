Codex 执行指导手册：POC 验收规则输入附件与标准交付件构建

0. 任务目标与强制红线

你需要在当前本地代码仓库（智能合约自动化静态安全审计与链上存证平台）中，按阶段端到端构建一套用于「科技软件 / POC 验收 / 定义 POC 验收规则」任务的真实脱敏输入附件与标准复核交付件。

必须严格遵守的 6 条硬性红线

严禁伪造扫描数据：04_预扫描摸底原始输出与耗时日志.csv 必须通过实际运行当前仓库内的静态分析 CLI 引擎扫描真实 Move 源码文件生成，严禁使用随机数或硬编码捏造告警命中或扫描耗时。

输入与标准答案物理隔离：所有提供给待测模型的输入材料必须存放在 poc_task_artifacts/01_input_attachments/；所有标准交付与复核底稿存放在 poc_task_artifacts/02_golden_outputs/，严禁交叉混放。

输入附件严禁泄题与 AI 作业痕迹：在 01、02、03、05 四份输入文件中，严禁出现“注意冲突”“埋坑”“脏数据”“答题要点”“答案见下”“XX公司”“张三”“TODO”“待填”等任何答题视角、提示性措辞或占位符；所有文档须保持真实 B 端企业交付口吻。

全链路计量口径与复现标准绝对统一：

耗时/时延：统一换算为 ms，保留 2 位小数；

检出率、误报率、解析成功率、资源利用率：统一为 %，保留 2 位小数；

代码规模：以有效代码行 LOC（剔除空行及 //、/*...*/ 纯注释行）计，取整数；

内存与存储：统一为 MB（按 1024 进制折算），保留 1 位小数；

并发数与文件数：取整数；

分位数口径：统一采用包含端点线性插值（Python numpy.percentile(..., method="linear") / Excel PERCENTILE.INC）；

时区与时间边界：统一为东八区（UTC+8）。历史文档与预扫描日志日期严格落在 2026-10-15 至 2026-11-16；正式 POC 计划窗口固定为 2026-11-23 09:00 至 2026-12-04 18:00。

中文 PDF 无乱码、排版专业：生成 PDF 前必须先探测并嵌入本机真实中文字体，生成后须做文本抽取与页数核验，确保无方块乱码或内容截断。

Excel 跨平台零公式报错：生成的标准交付 Excel 必须使用兼容 Excel / WPS / LibreOffice 的经典公式（禁止使用需 CSE 数组键的数组公式或旧版不兼容函数），经重新计算校验后不得存在 #REF!、#DIV/0!、#VALUE!、#NAME?、#N/A。

目标目录结构

在仓库根目录创建以下目录（请先将 poc_task_artifacts/ 追加至 .gitignore，避免污染原仓库 Git 状态）：

poc_task_artifacts/
├── 01_input_attachments/
│   ├── 01_合约安全审计平台采购技术规范书_RFP节选.pdf
│   ├── 02_POC售前技术澄清与现场约束纪要.xlsx
│   ├── 03_合约静态审计平台架构与能力基线说明.pdf
│   ├── 04_预扫描摸底原始输出与耗时日志.csv
│   └── 05_客户方初版POC测试验收表_草案.xlsx
├── 02_golden_outputs/
│   └── 星图托管_POC验收规则定义表_定稿版.xlsx
├── 03_verification/
│   ├── repo_facts.json
│   ├── analyze_baseline.py
│   ├── baseline_metrics.json
│   └── RUN_SUMMARY.md
└── scripts/
    ├── run_prescan_collect.py
    ├── build_input_docs.py
    └── build_golden_excel.py


Phase 0：仓库真实技术资产盘点与环境预检

深度遍历当前仓库代码，提取真实架构事实并保存至 poc_task_artifacts/03_verification/repo_facts.json，须包含：

cli：静态分析 CLI 入口文件路径、完整调用命令、支持参数、原始输出结构（JSON 字段或 stdout 正则模式）；

rules：仓库内所有真实存在的安全检测规则数组，每条包含 rule_id、rule_name、severity（规范映射为 HIGH/MEDIUM/LOW）、description；

backend：Node.js / Express 后端目录、核心路由接口与扫描任务调度逻辑；

move_contract：Sui Move 链上存证合约（.move）路径、真实模块名、存证结构体名（如 AuditRecord）及链上持久化字段名列表；

frontend：React + Vite 前端支持的钱包交互及历史审计检索维度；

existing_move_samples：仓库中已有的全部 .move 源码及测试样本文件路径清单。

本地环境预检：

验证 Node.js / npm / pnpm / tsx（或 ts-node / 编译产物）能够成功执行 CLI 静态分析引擎；如缺少依赖，先完成安装并用仓库内单个 .move 文件完成冒烟测试。

验证 Python 3 及依赖库（pandas、numpy、openpyxl、reportlab 或 weasyprint、pypdf / pdfplumber）；探测本机可用的中文字体文件路径（如 macOS /System/Library/Fonts/STHeiti Medium.ttc、PingFang.ttc、Songti.ttc；Linux NotoSansCJK / WenQuanYi；Windows msyh.ttc / simsun.ttc）。

检测本机是否安装 libreoffice / soffice（用于 Phase 5 的 Excel 公式重算校验）。

Phase 1：构造脱敏待测代码仓并真实运行 CLI 生成 04_*.csv

1.1 组装脱敏待测代码仓（临时目录 /tmp/xt_poc_corpus）

按真实企业 Move 数字资产托管项目结构组织待测目录，必须包含 10 个 Move 核心业务模块 与 4 类真实非考核文件：

10 个 Move 核心业务模块（路径规范：contracts/<module_name>/sources/*.move）：

模块清单：vault_core、custody_pool、multisig_gov、withdraw_guard、fee_router、oracle_adapter、staking_proxy、whitelist_registry、settlement_engine、audit_hook。

源码构造要求：

优先复用当前仓库中真实存在的 .move 合约与漏洞测试样本；

若原仓库 .move 文件总数不足 25 个，可对现有真实合约进行合理模块拆分、函数组合与合法标识符重命名（保持语法合法、可被 tree-sitter-move 真实解析），使每个业务模块包含 2～4 个 .move 文件，10 个模块合计 28～42 个 有效业务 .move 文件；

确保 CLI 真实扫描这些业务文件时，能够真实命中仓库内多条检测规则（同时覆盖 HIGH、MEDIUM、LOW 以及部分零告警的干净合约文件）。

若所有有效 Move 文件在真实解析下均为 OK，请纳入 1 个包含 Move 2024 复杂嵌套宏或边界语法的 .move 业务文件，使其在真实 CLI 解析下触发真实的 PARSE_WARN 或 PARSE_ERR 状态（严禁在日志脚本中硬编码伪造解析错误）。

4 类必须保留在归档包中的真实非考核路径：

contracts/bridge_evm/bridge_eth_lock.sol 与 contracts/bridge_evm/bridge_bsc_relay.sol（2 个真实 Solidity 合约文件，触发 CLI 非 Move 语言跳过并记录 UNSUPPORTED_LANG）；

dependencies/sui-framework/sources/*.move（4～6 个第三方框架依赖 Move 文件，可触发部分静态告警）；

build/custody_pkg/sources/*.move（3～4 个编译产物目录中的副本 .move 文件）；

contracts/<module_name>/tests/*_tests.move（分布在不同模块下的 4～6 个单元测试文件，含测试桩断言与触发告警的测试代码）。

1.2 编写 poc_task_artifacts/scripts/run_prescan_collect.py 执行真实扫描

实际调用当前仓库 CLI 引擎扫描 /tmp/xt_poc_corpus 下的全部文件，采集真实的：

rule_id（严格来自 repo_facts.json 真实规则，无告警填 NONE）；

severity（HIGH / MEDIUM / LOW / NONE）；

start_line（命中起始行号整数；无告警时留空）；

loc（真实计算该文件的有效代码行：去除空行与 //、/*...*/ 注释后的整数行数）；

parse_status（OK / PARSE_WARN / PARSE_ERR / UNSUPPORTED_LANG）；

elapsed_time（真实单文件扫描墙钟耗时）。

输出 poc_task_artifacts/01_input_attachments/04_预扫描摸底原始输出与耗时日志.csv（标准 UTF-8 编码，第一行为表头，无任何说明性注释行），严格按以下 10 列顺序输出：

scan_job_id,timestamp_utc8,module_name,file_path,loc,parse_status,elapsed_time,rule_id,severity,start_line


保留以下真实工程日志特征（不要在 CSV 内添加任何提示字段）：

批次与时间映射：按模块或批次生成 scan_job_id（如 JOB-20261116-001 至 JOB-20261116-014），timestamp_utc8 按真实扫描耗时依次映射至 2026-11-16 14:00:05 至 2026-11-16 14:35:00 区间。

前端重试重复批次：对其中 1 个模块批次（例如 JOB-20261116-003）保留 1 次因前端超时重试导致的重复上报批次——拥有相同的 scan_job_id、相同的 file_path / 告警明细，但 timestamp_utc8 整体顺延 12 秒。

单文件多告警展开：同一文件命中多条告警时拆分为多行（每行一条告警，保留该文件该次扫描的 loc 与 elapsed_time）；无告警的文件保留 1 行（rule_id=NONE, severity=NONE, start_line=""）。

同位置重复上报边界：若真实 CLI 输出未自然产生同 (file_path, start_line, rule_id) 的重复告警，从已命中的真实告警中选取 2～3 条由多遍遍历/宏展开场景产生的记录保留重复行，以真实考察去重主键定义。

真实混合耗时单位：将大部分行的 elapsed_time 格式化为毫秒字符串（如 142.50ms），将其中耗时最长或特定大模块批次的 10～18 行格式化为秒级字符串（如 0.86s 或 1.24s），保留真实多源日志拼接时常见的 ms/s 混用特征。

数据量控制：CSV 总数据行控制在 150～450 行（不含表头），信息密度高且便于人工与机器复核。

Phase 2：构建 4 份高度咬合的业务输入附件（build_input_docs.py）

编写 poc_task_artifacts/scripts/build_input_docs.py，读取 repo_facts.json 与 Phase 1 的真实性能区间，生成以下 4 份文件并输出至 poc_task_artifacts/01_input_attachments/。

2.1 01_合约安全审计平台采购技术规范书_RFP节选.pdf

使用本机真实中文字体排版，包含页眉（项目编号：XT-SEC-2026-1015 | 星图数字资产托管有限公司）、页码及清晰章节结构（约 2 页），正文严格采用以下内容：

文档标题：星图数字资产托管有限公司 —— 智能合约自动化静态安全审计与链上存证平台采购项目 技术规范书（RFP 节选）

元信息：项目编号：XT-SEC-2026-1015；发布部门：信息安全与风控部；发布日期：2026 年 10 月 15 日

第 1 章 项目背景与建设目标

1.1 为降低数字资产托管核心合约的上线安全风险并满足内部合规审计留痕要求，我司拟采购一套智能合约自动化静态安全审计与链上存证平台，在 CI/CD 及发版评审前实现自动化漏洞检测、报告归档与不可篡改存证。

1.2 供应商须在正式采购合同签署前完成 POC 概念验证，POC 验收结果将作为商务定标的核心依据。

第 2 章 检测业务范围

2.1 本期纳入审计检测的业务代码仓共包含 12 个核心智能合约模块：

Move 生态核心托管业务模块（10 个）：vault_core、custody_pool、multisig_gov、withdraw_guard、fee_router、oracle_adapter、staking_proxy、whitelist_registry、settlement_engine、audit_hook。

跨链桥辅助合约模块（2 个，Solidity 语言）：bridge_eth_lock、bridge_bsc_relay。

2.2 平台须支持以代码仓库目录或 Git 归档包形式导入扫描，并按模块维度输出源码级审计报告。

第 3 章 安全检测与性能指标要求

3.1 缺陷定位能力：检测结果须精确至文件路径、起止行号、漏洞规则类型、严重等级（高危/中危/低危）及修复建议。

3.2 核心检测准确度指标：高危漏洞检出率 ≥ 95.00%；综合误报率 ≤ 5.00%；合约源码语法解析成功率 ≥ 99.00%。

3.3 性能与并发指标：单次全仓静态扫描总耗时 ≤ 60,000.00 ms（60 秒）；平台须支持不少于 20 个并发审计任务同时提交与执行，系统无崩溃或请求丢失；扫描服务峰值内存占用 ≤ 4,096.0 MB。

第 4 章 链上存证与审计追溯要求

4.1 不可篡改存证：每次审计任务完成后，平台须自动将完整审计报告及对应漏洞代码上下文实时写入区块链持久化存储，确保审计记录 100% 不可篡改。

4.2 上链时效：单次审计报告上链确认总耗时 ≤ 3,000.00 ms（3 秒）。

4.3 历史追溯检索：前端可视化平台须集成链上钱包交互能力，支持按项目模块、提交时间、严重等级及提交人地址多维度检索历史链上审计记录。

2.2 02_POC售前技术澄清与现场约束纪要.xlsx

包含 2 个工作表，保持精确行号以便后续 GT 与 Rubric 引用：

Sheet1：技术澄清问答记录（第 1 行为表头：澄清编号 | 澄清日期 | 涉及RFP条款 | 提问/争议事项 | 双方确认结论与现场约束 | 确认方，第 2～9 行为以下 8 条记录）：

第 2 行：Q-01 | 2026-11-02 | 1.2 | POC 实施周期与时间边界如何安排？ | 受年底发版窗口限制，POC 总周期由原计划 20 个工作日压缩为 10 个工作日，固定为 2026-11-23 09:00 至 2026-12-04 18:00（UTC+8）。 | 客户项目办 / 交付负责人

第 3 行：Q-02 | 2026-11-04 | 2.1 | 跨链桥 2 个 Solidity 模块是否必须在一期 POC 覆盖？ | 客户架构部确认：bridge_eth_lock 与 bridge_bsc_relay 延后至 2027 年 Q1 二期建设，不纳入本期 Move 生态一期交付范围；但因测试基线 Git 归档包（release/poc-baseline-20261115）已统一冻结打包，该 2 个 .sol 文件仍物理保留在归档包的 contracts/bridge_evm/ 目录下，不会重新出包。 | 客户架构部

第 4 行：Q-03 | 2026-11-05 | 2.2 | 测试代码仓中是否包含第三方框架或测试脚本？ | 确认包含。归档包内保留了 Move 标准构建生成的 build/ 目录、dependencies/sui-framework/ 第三方依赖源码及各模块单元测试文件（命名规范 *_tests.move），业务审计仅关注自研生产合约逻辑。 | 客户研发安全部

第 5 行：Q-04 | 2026-11-07 | 3.3 | POC 测试环境硬件是否与生产规划一致？ | 不一致。生产规划为 16C/32G 独立集群，但 POC 阶段受机房审批限制，客户仅能分配 1 台 4C/8G 云主机合署部署全部组件（详见 Sheet2 配额表）。 | 客户运维部

第 6 行：Q-05 | 2026-11-09 | 4.1 | 审计报告原文及漏洞代码片段是否允许直接上链？ | 客户法务与风控部明确禁止：凡涉及未修复漏洞详情、业务合约源码片段及触发路径的数据，严禁以明文形式写入任何公链或公共测试网（防未上线漏洞被外部监控抢跑）；链上仅允许写入报告摘要哈希及脱敏后的统计元数据，完整报告须保存在客户内网受控存储中。 | 客户法务与风控部

第 7 行：Q-06 | 2026-11-10 | 4.2 | POC 阶段接入哪条链？网络访问有何限制？ | POC 阶段对接 Sui Public Testnet；测试主机访问外部测试网 RPC 须经过公司统一出网代理，公共测试网节点出块与 RPC 响应波动不受供应商控制。 | 客户运维部

第 8 行：Q-07 | 2026-11-12 | 3.2 | 客户是否能提供全量 10 个 Move 模块的人工审计真值表用于计算检出率？ | 客户目前无全仓人工审计真值表，仅能提供 3 个经历史审计确认的高危缺陷样本（POC 启动前由双方封存 commit 哈希）；对于扫描检出的其他告警，双方同意通过人工联合复核定性真报/误报。 | 客户信息安全部

第 9 行：Q-08 | 2026-11-12 | 3.2 | 同一份代码多次触发或同位置命中是否重复计入告警？ | 双方确认需在验收规则中明确去重口径，避免单点缺陷重复放大误报或检出统计，具体定义由供应商在定稿规则表中给出并经评审确认。 | 客户信息安全部

Sheet2：POC环境资源配额表（第 1 行为表头：资源项 | 生产规划规格 | POC 实际配额 | 备注与约束，第 2～6 行为数据）：

第 2 行：计算与内存 | 16 vCPU / 32 GB RAM（独立应用+扫描节点） | 4 vCPU / 8 GB RAM（单台 Ubuntu 22.04 云主机） | 须同机合署 CLI 引擎、Node.js 后端、前端及本地存储服务

第 3 行：磁盘存储 | 1 TB NVMe SSD | 100 GB 普通云盘 | 含系统盘、测试仓及报告加密存储空间

第 4 行：网络环境 | 独立专线 RPC 节点 | 企业出网代理访问 Sui Testnet 公共 RPC | 平均代理往返 RTT 约 180–450 ms，高峰期存在抖动

第 5 行：测试网账户 | 独立正式签名钱包 | 预分配 2 个 Testnet 测试账户（共 10 SUI 测试币） | 仅用于 POC 链上对象写入与查询验证

第 6 行：独占性要求 | 生产独占 | POC 窗口期内分配给本项目专用 | 禁止运行其他业务压测任务，若运维维护需提前 24 小时书面通知

2.3 03_合约静态审计平台架构与能力基线说明.pdf

使用本机中文字体排版（版本 v1.4，发布日期 2026 年 10 月 28 日，约 2 页），动态注入 repo_facts.json 中的真实规则清单、真实 Move 存证结构体字段及真实 CLI 命令：

第 1 章 总体技术架构：说明四大子系统（TypeScript + tree-sitter-move CLI 静态分析引擎、Node.js + Express 后端服务、Sui Move 链上存证合约、React + Vite 前端及钱包集成），引用真实入口与模块名。

第 2 章 静态分析引擎能力边界与已知限制：

2.1 仅支持 Sui Move（.move）AST 解析，不支持 .sol/Rust，遇非 .move 文件记录 UNSUPPORTED_LANG 并跳过；

2.2 默认递归全目录扫描，须在扫描配置文件（audit.config.json）显式声明排除 dependencies/、build/、*_tests.move 及非目标目录；

2.3 列出 repo_facts.json 中的全部真实检测规则表（规则 ID、名称、等级、说明），并说明 Move 2024 复杂嵌套宏或边界语法可能触发单文件 PARSE_WARN/PARSE_ERR 且不中断全局扫描。

第 3 章 性能基线与单机并发机制：

3.1 4C/8G 单机合署基准：平台常驻基础内存 1,250.0 MB；单 CLI 扫描子进程峰值内存 580.0–680.0 MB；根据 Phase 1 真实 CLI 扫描实测推算合理单核吞吐区间（LOC/秒）；

3.2 并发队列保护：后端默认 MAX_WORKERS=4（4 并行峰值估算 1,250.0 + 4 * 680.0 = 3,970.0 MB）；当瞬时提交超过 4 个并发任务（如 20 并发）时，接口接收全部请求并返回 202 Accepted 进入 FIFO 队列顺序执行，不丢弃任务，排队任务端到端完成耗时包含队列等待时间。

第 4 章 链上存证架构与时延特性：

4.1 链下 AES-256 加密存储完整报告（JSON/PDF）+ 链上 Move 存证合约对象（使用 repo_facts.json 中的真实结构体名与脱敏字段名，叠加 report_sha256、repo_commit_hash 等摘要字段说明），严禁写入任何源码明文或未修复漏洞详情；

4.2 上链时延拆解：本地处理阶段（计算 SHA-256 + 组装 PTB 交易块 + 本地钱包签名）在 4C/8G 下典型耗时 ≤ 450.00 ms；外部链上确认阶段（经企业出网代理提交至 Sui Testnet 公共 RPC 并达成共识确认）实测波动区间 1,200.00–6,800.00 ms；

4.3 独立离线验签命令：明确支持 sui client object <object_id> --json、sui client tx-block <tx_digest> --json 拉取链上原始摘要并与本地归档报告 sha256sum 比对。

2.4 05_客户方初版POC测试验收表_草案.xlsx

单 Sheet 命名 初版POC验收清单，表头为 序号 | 测试项 | 对应要求 | 验收通过标准 | 验收方式与证据，填入以下 9 行：

合约全仓覆盖 | RFP 2.1 | 成功导入并扫描全部 12 个业务模块无报错 | 查看前端导入成功提示并截图

语法解析能力 | RFP 3.2 | 合约解析成功率 ≥ 99% | 查看界面展示的扫描完成统计并截图

高危漏洞检出 | RFP 3.2 | 高危漏洞检出率 ≥ 95% | 导出 PDF 报告，客户安全人员翻阅确认

误报率控制 | RFP 3.2 | 平台综合误报率 ≤ 5% | 抽看几条告警，无明显误报即通过

单次全仓扫描耗时 | RFP 3.3 | 全仓扫描时间不超过 1 分钟 | 人工看秒表或界面进度条记录耗时

平台并发能力 | RFP 3.3 | 20 人同时点击提交扫描，全部在 60 秒内完成且不崩溃 | 安排人员同时点击界面提交，观察页面不卡死

资源占用 | RFP 3.3 | 扫描过程内存不超过 4G | 在服务器上 top 看一眼内存截图

链上存证与防篡改 | RFP 4.1 / 4.2 | 3 秒内将完整审计报告和漏洞上下文写入区块链，不可篡改 | 前端点击“上链存证”，弹出成功绿框后截图留档

历史记录检索 | RFP 4.3 | 连接钱包后能查到历史审计记录 | 前端搜索 1 次展示列表并截图

Phase 3：编写独立基线复核脚本（analyze_baseline.py）

编写 poc_task_artifacts/03_verification/analyze_baseline.py，读取 01_input_attachments/04_预扫描摸底原始输出与耗时日志.csv，严格执行并输出 poc_task_artifacts/03_verification/baseline_metrics.json：

原始全量统计（清洗前）：

raw_total_rows、raw_unique_jobs、raw_unique_files、raw_finding_rows（rule_id != NONE）、raw_unit_ms_rows、raw_unit_s_rows；

清洗前按原始记录直接统计的告警分布（HIGH/MEDIUM/LOW）与粗糙解析率、粗糙耗时（用于和清洗后形成鲜明对比）。

四步清洗漏斗（每步互斥、按序执行，必须校验恒等式）：

Step A（剔除重试重复批次）：按 scan_job_id 识别重复批次（同一 scan_job_id 出现两个不同时间戳批次时，仅保留较早的首次完整批次，剔除顺延重试批次），记录 dropped_dup_job_rows；

Step B（剔除非目标语言 .sol）：剔除 file_path 以 .sol 结尾或位于 contracts/bridge_evm/ 的行，记录 dropped_sol_rows；

Step C（剔除第三方依赖与编译产物）：剔除 file_path 以 dependencies/ 或 build/ 开头的行，记录 dropped_dep_build_rows；

Step D（剔除单元测试文件）：剔除 file_path 以 _tests.move 结尾或位于 /tests/ 目录的行，记录 dropped_test_rows；

强校验断言：raw_total_rows - (A + B + C + D) == clean_valid_rows。

文件级基线统计（严格按 file_path 去重，杜绝多告警文件重复累计 LOC/耗时）：

valid_module_count（必须等于 10）；

valid_unique_files（有效业务 Move 文件数，整数）；

valid_total_loc（有效总 LOC，整数）；

parse_ok_files、parse_warn_files、parse_err_files；

strict_parse_success_rate_pct（parse_ok_files / valid_unique_files * 100，2 位小数）；

relaxed_parse_success_rate_pct（(parse_ok_files + parse_warn_files) / valid_unique_files * 100，2 位小数）；

单文件扫描耗时（全部换算为 ms，2 位小数）：mean_ms、p50_ms、p95_ms、max_ms（全部使用 numpy.percentile(..., method="linear")）；

full_repo_serial_ms（所有有效唯一文件 elapsed_ms 之和，2 位小数）；

按 4 核并行估算的全仓耗时 full_repo_4worker_est_ms（明确系数公式，例如 full_repo_serial_ms / 3.2，考虑进程拉起与 I/O 调度损耗）及按每模块统计的明细表。

告警级去重统计（清洗后有效业务仓，rule_id != NONE）：

clean_raw_findings（清洗后去重前告警行数）；

按主键 (file_path, start_line, rule_id) 去重后的 clean_unique_findings、dropped_dup_finding_rows；

去重后按 HIGH / MEDIUM / LOW 及按 10 个模块、按 rule_id 的分布统计。

自动推导正式 POC 建议阈值：

将推荐阈值、工程冗余系数与计算公式完整写入 baseline_metrics.json，确保与 Phase 4 的 Excel 完全同步。

Phase 4：生成标准交付 Excel（build_golden_excel.py）

编写 poc_task_artifacts/scripts/build_golden_excel.py，使用 openpyxl 生成专业级交付工作簿 poc_task_artifacts/02_golden_outputs/星图托管_POC验收规则定义表_定稿版.xlsx（统一字体、深色表头白字、冻结窗格、自动换行、合理行高列宽、规范数字格式 0.00 / 0.00% / #,##0 / 0.0），必须包含以下 4 个 Sheet：

Sheet 1：01_总则与Gate红线

分 4 个清晰区块表呈现：

POC 准入条件检查表（Entry Criteria，6 项）：测试仓 release/poc-baseline-20261115 commit hash 锁定、3 个历史高危缺陷样本哈希封存、audit.config.json 排除目录签字确认、4C/8G 云主机独占与系统监控就绪、2 个 Testnet 账户（10 SUI）与代理连通性确认、双方联合复核专家排期确认。

一票否决项清单（Pass/Fail Gate，5 项）：

GATE-01：链上存证泄露任何合约源码明文、未修复漏洞详情或触发路径（合规零容忍）；

GATE-02：3 个已封存历史高危缺陷样本未达到 100.00% 检出；

GATE-03：人为篡改链下报告单字节后，离线验签流程未拦截报错；

GATE-04：核心有效 Move 业务文件解析完全崩溃（PARSE_ERR）导致关键资产模块漏扫超红线；

GATE-05：20 并发提交压测期间后端进程崩溃、OOM 退出或发生请求静默丢失。

硬件、并发与网络时延折算说明：写明 4C/8G 与 16C/32G 的核数与内存换算逻辑、MAX_WORKERS=4 队列模型、以及“本地构建签名耗时”与“Sui Testnet 外部网络确认耗时”解耦口径。

暂停/重测机制、免责边界与争议仲裁流程：涵盖 Testnet 公共 RPC 中断、客户主机非通知维护、代码仓中途变更的暂停/重测条款，以及边界告警的双盲专家复核与 24 小时仲裁机制。

Sheet 2：02_POC验收规则明细表

严格包含提示词要求的 11 列：
规则ID | 源需求追溯 | 考核维度 | 考核指标名称 | 计算公式与统计口径 | 预扫描基线值/参考值 | 通过阈值与允许容差 | 适用样本范围 | 测试执行规程 | 原始取证物与独立复核方法 | 不达标归因与处理机制

覆盖 5 大维度共 15 条规则：

维度一：静态分析语法兼容与解析稳定性

RULE-PARSE-01：有效 Move 业务合约语法解析成功率（区分严格 OK 与宽松 OK+PARSE_WARN 口径，引用 Sheet4 基线公式）

RULE-PARSE-02：非目标语言（.sol）与噪声路径（dependencies/、build/、*_tests.move）配置隔离准确率

维度二：漏洞检出与误报控制

RULE-SEC-01：已知历史高危缺陷注入检出率（3/3 = 100.00%，容差 0）

RULE-SEC-02：联合复核综合误报率（明确分子：经双盲复核确认的误报唯一告警数；分母：有效业务仓按 (file_path, start_line, rule_id) 去重后的唯一告警总数）

RULE-SEC-03：告警定位元数据完整性与去重一致性（文件路径、起止行号、规则 ID、严重等级、修复建议完整率 100.00%，同主键重复率 0.00%）

RULE-SEC-04：内置安全规则覆盖与异常语法单文件容错不中断全局扫描

维度三：扫描性能与资源水位

RULE-PERF-01：单次有效全仓静态扫描耗时（引用 Sheet4 串行/估算基线，结合 4C/8G 硬件给出明确 ms 阈值与容差）

RULE-PERF-02：单文件扫描 P95 耗时稳定性（引用 Sheet4 P95 基线公式）

RULE-PERF-03：20 并发任务提交接收率（100.00% 返回 202 Accepted 无丢包）与 4-Worker FIFO 队列全量完成时效

RULE-PERF-04：4C/8G 单机峰值内存占用（≤ 4,096.0 MB，基于 1,250.0 + 4 * 680.0 = 3,970.0 MB 与 pidstat/cgroup 1 秒采样取峰值）

维度四：链上存证合规与防篡改追溯

RULE-CHAIN-01：链上数据零明文源码/漏洞详情合规审计（100.00% 脱敏，零明文泄露）

RULE-CHAIN-02：本地存证构建与签名处理时延（≤ 450.00 ms）与 Sui Testnet 外部确认时延解耦考核（记录外部 RTT 基准并豁免公共 RPC 抖动）

RULE-CHAIN-03：链上存证对象字段完整性与独立 CLI 离线验签一致性（sui client object + sha256sum 100% 匹配）

RULE-CHAIN-04：链下报告单字节篡改负向验签拦截测试（篡改任意 1 字节后重新验签必须 100.00% 报错不匹配）

维度五：前后端并发与检索可用性

RULE-UI-01：前端钱包集成鉴权与多维度（模块/时间/等级/提交人地址）历史链上审计检索结果与链上原始对象 100.00% 一致

关键要求：Sheet2 中所有涉及预扫描基线的单元格，必须使用跨表公式（如 ='04_预扫描基线复核底稿'!C12）动态引用 Sheet4，禁止贴死值。

Sheet 3：03_需求口径对齐与草案修订表

逐条汇总全部跨文档冲突与旧版草案缺陷（至少 9～10 条），列明：
修订编号 | 涉及维度 | 原RFP/初版草案原文及定位 | 冲突依据来源（文件/Sheet/行号或章节） | 存在问题与业务影响 | 架构师裁决结论 | 对应正式规则ID

Sheet 4：04_预扫描基线复核底稿

上半区（第 1～32 行左右）：

区块 A：四步数据清洗漏斗表（原始行数、各步剔除行数与占比、清洗后有效行数、恒等式校验 PASS/FAIL），全部用动态公式驱动；

区块 B：清洗前 vs 清洗后核心基线对比表（有效模块数、有效文件数、总有效 LOC、严格/宽松解析成功率、单文件耗时均值/P50/P95/Max、全仓串行耗时、4-Worker 估算耗时、原始告警数、去重唯一告警数、重复告警剔除数、HIGH/MEDIUM/LOW 分布），全部用标准 Excel 公式计算。

下半区（从第 36 行起）：

A–J 列原样贴入 04_预扫描摸底原始输出与耗时日志.csv 全部数据；

K–S 列使用纯经典 Excel 公式（无数组公式）构建透明复核辅助列：

K（elapsed_ms_norm）：=IF(RIGHT(G37,2)="ms",VALUE(LEFT(G37,LEN(G37)-2)),VALUE(LEFT(G37,LEN(G37)-1))*1000)

L（is_dup_job）：用 COUNTIFS 判断同一 scan_job_id 是否存在更早的同文件记录（或标注重试批次的时间戳晚于该 scan_job_id 最早一批），返回 1/0

M（is_sol）：=IF(OR(RIGHT(D37,4)=".sol",ISNUMBER(SEARCH("bridge_evm/",D37))),1,0)

N（is_dep_build）：=IF(OR(LEFT(D37,13)="dependencies/",LEFT(D37,6)="build/"),1,0)

O（is_test_file）：=IF(OR(RIGHT(D37,11)="_tests.move",ISNUMBER(SEARCH("/tests/",D37))),1,0)

P（is_valid_row）：=IF(AND(L37=0,M37=0,N37=0,O37=0),1,0)

Q（is_first_valid_file）：=IF(AND(P37=1,COUNTIFS($D$37:D37,D37,$P$37:P37,1)=1),1,0)（文件级去重标志）

R（valid_file_elapsed_ms）：=IF(Q37=1,K37,"")（专供上半区直接调用 =AVERAGE(R37:R...)、=PERCENTILE.INC(R37:R...,0.5)、=PERCENTILE.INC(R37:R...,0.95)、=MAX(R37:R...)、=SUM(R37:R...)，彻底避免数组公式兼容性问题）

S（is_unique_finding）：=IF(AND(P37=1,H37<>"NONE",COUNTIFS($D$37:D37,D37,$J$37:J37,J37,$H$37:H37,H37,$P$37:P37,1)=1),1,0)（告警级主键去重标志）

Phase 5：自动化端到端核验与汇总输出

Excel 公式重算与双向对账：

如本机有 libreoffice，将其转换重算为临时副本后用 openpyxl(..., data_only=True) 读取全部公式求值结果；若无 libreoffice，编写严格校验器验证所有公式语法及区间边界，并逐项比对 Sheet4 统计值与 baseline_metrics.json 误差必须为 0.00；确保全工作簿 0 个 #REF!/#DIV/0!/#VALUE!/#NAME?/#N/A。

输入附件反泄题与 PDF 可读性自动扫描：

使用 pypdf 或 pdfplumber 提取 01_*.pdf 与 03_*.pdf 全文，确认中文无乱码并记录准确页数；

对 01_input_attachments/ 下全部 5 个文件执行敏感/泄题关键词扫描（禁止出现 埋坑、脏数据、答题、标准答案、XX公司、TODO、待填），若命中须立即修正并重新生成。

生成 poc_task_artifacts/03_verification/RUN_SUMMARY.md，必须包含：

5 份输入附件精确清单（文件名、字节大小、PDF 页数 / Excel Sheet 名与行数 / CSV 总行数）；

repo_facts.json 摘要（真实规则数及列表、Move 存证结构体与字段名、CLI 实际运行命令）；

04_*.csv 清洗前 vs 清洗后完整数据对照表（全部按规定小数位输出）；

正式 POC 各规则 ID、跨表引用坐标（如 Sheet4 单元格地址）与最终推荐阈值表；

公式重算对账结果、反泄题扫描结果及任何需要人工复核的提示。