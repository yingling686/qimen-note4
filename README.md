# 奇门排盘 · Note4

NAS 在局域网内控制 ZECTRIX Note4，显示 400×300 黑体九宫盘，默认使用16级灰平滑文字边缘，支持抽六十甲子、历史翻盘和 MiniMax 语音提问。

`NOTE4_IMAGE_FORMAT=gray16` 为默认16级灰；也可选 `gray4`（四灰阶）或 `mono`（黑白）。发送未预先抖色的 PNG，由 SDK 根据实机色板转换。NAS 使用 Noto Sans CJK 黑体，本机预览优先使用微软雅黑/黑体；可通过 `CJK_FONT` 指定字体文件。

值使门名称加矩形框和加粗；天盘日干反白、天盘时干加框，同干时保留日干标记。

## 按键

| 操作 | 行为 |
|---|---|
| 短按确定 | 按当前北京时间随机抽取六十甲子之一，临时显示，不加入翻盘列表 |
| 普通时间盘短按上 / 下 | 按正常时间重排前一个 / 后一个时辰（每次两小时） |
| 随机盘短按上 | 回到当前北京时间盘，恢复每分钟自动刷新 |
| 随机盘短按下 | 显示当前时间后一个时辰的普通盘 |
| 长按确定，松开 | Note4 录音 → MiniMax 识别 → 当前盘解读 → 约一分钟语音摘要 |
| 播放中上下键或短按确定 | 停止播放，然后翻盘或抽盘 |
| 播放中长按确定 | 固件中断播放并录音，继续提问 |
| 固件的远程退出手势 | 释放连接并暂停自动重连，重启服务可恢复 |

同一盘的追问携带之前已完成的问答，切盘不会把旧盘的解读播到新盘。没有提供生日或年命时不虚构主体资料。

## NAS 安装

1. 将本目录放到 NAS 的 `docker/qimen-note4`（本次实际部署目录为 `/volume1/docker/qimen-note4`）。不要放进 Web Station 对外公开的目录；`.env` 和 SQLite 都是服务私有数据。之前的 `home/qimen-note4` 为源文件副本，正式服务使用 docker 目录。
2. Note4 使用 SDK 配套固件 3.7.2，开启“设置 → 网络同步 → 待机保持 Wi-Fi”，和 NAS 位于同一局域网。地址已预设为 `192.168.110.149`。不适用于 Note4C。
3. 每位用户须自行配置 MiniMax API Key。仓库不提供共享密钥，也不包含部署者的 `.env`。新安装先执行 `cp .env.example .env`，编辑 `.env`，把 `MINIMAX_API_KEY=` 填成自己的密钥，并将 `NOTE4_TARGET` 改成自己的 Note4 局域网 IP。空的 TEXT/ASR/TTS 独立密钥继承 `MINIMAX_API_KEY`；若接口使用不同密钥，分别填写对应字段。仅排盘不需要密钥，语音识别、AI 解读和朗读需要相应接口权限。更新安装时保留自己已有的 `.env`。
4. 在 NAS 此目录中执行：

```sh
docker compose up -d --build
docker compose logs -f --tail=50
```

群晖若只有旧版命令，改用 `docker-compose`；若当前用户不在 docker 组，使用 `sudo docker compose`。首次构建需要下载 Rust、Node、中文字体和编译依赖，之后无需联网重新编译。host 网络用于直接 UDP 和 mDNS 通信，不新增对外 HTTP 端口。

停止和恢复：

```sh
docker compose stop
docker compose up -d
docker compose restart
```

服务设置 `restart: unless-stopped`，NAS 重启后会恢复；手动 stop 后不会自行启动。Note4 断网不会让主进程退出。

## 自动重连

- 首次不可达、网络断线、超时或桥接进程退出：释放旧进程后，按 2、5、10、20、30 秒退避，之后每 30 秒重试。设备忙碌时等待，不抢占。
- 首次连接会把设备 ID 保存到 SQLite。后续使用配置的 IP 直连，并在只读 INFO 阶段验证绑定 ID，然后才取得控制权，避免连错设备；直连不依赖 mDNS。建议路由器为 Note4 固定分配 `192.168.110.149`。地址变动时修改 `.env` 的 `NOTE4_TARGET`，绑定 ID 保留。
- 重连成功恢复最后查看的盘和历史位置，仅发送一次恢复画面。断线前的录音不会重复提交，旧 AI 任务仍可保存完整文字，但不会在重连后自动播报。
- 设备主动退出时保持服务运行但暂停重连，使用 `docker compose restart` 恢复。服务停止会取消等待中的重连，并释放旧连接。
- 显示结果未知时，不在旧连接重复刷图；重新建立连接后再恢复画面。日志区分握手、重试、身份不匹配和主动暂停。

换用另一台 Note4 前需停止服务、备份数据，然后显式清除绑定的 ID。不要直接删除整个数据目录：

```sh
docker compose stop
docker compose run --rm --entrypoint node qimen-note4 --input-type=module -e "import {Store} from './node/store.mjs'; const s=new Store('/data'); s.db.prepare('DELETE FROM settings WHERE key=?').run('device_id'); s.close();"
docker compose up -d
```

## 数据和语音

- `data/service.log`：带时间的启动、连接、按键、录音阶段及显示回执日志；超过 2MB 轮转至 `service.log.1`，不记录录音内容、问题、解读或密钥。DSM 显示“无可用日志”时可从共享目录直接查看。
- Compose 将 `node/` 只读挂载到容器，更新脚本后需重新创建容器以应用新增挂载（仅重启旧容器不会应用 Compose 变更）。后续 Node 脚本更新重启即可；Rust 修改仍须构建镜像。
- `data/qimen.sqlite`：完整盘面快照、历史位置、绑定设备 ID 和逐次问答；重新打开历史盘不重新计算。
- `data/records/盘ID/chart.json`：盘面导出；每次解读另存一份 `.md`，包括问题、完整解读、摘要和阶段错误。
- 原始录音仅在内存中封装 WAV 并发送给 MiniMax，不保存到磁盘。识别模型 `asr-1.0`；文本默认 `MiniMax-M3`；朗读默认 `speech-2.8-turbo` / `male-qn-qingse`，可在 `.env` 修改。
- 文字保存先于语音合成；语音接口失败时，已经生成的解读不会丢失。三种接口需要各自具备权限，不能仅凭文字接口成功判断全部已开通。

在 NAS 验证密钥（上传的只是自动生成的测试音频）：

```sh
docker compose run --rm --entrypoint node qimen-note4 node/check-api.mjs
```

## 开发和验收

实测通过项、未通过项和部署状态见 [VERIFICATION.md](VERIFICATION.md)，不将模拟测试等同于实机全部验收。

```sh
npm ci
npm test
npm run preview
cargo test --locked
cargo test --locked --manifest-path vendor/zectrix-local-push-sdk/Cargo.toml
```

Node 24；Rust stable、C/C++ 编译器、CMake、Opus，正式 Dockerfile 已包含构建依赖。`outputs/preview.png` 为实际 400×300 预览。

设备单次显示检查：配置 `NOTE4_BRIDGE` 指向编译后的桥接程序，在停止常驻服务后执行 `node --env-file=.env tools/device-check.mjs`。只有收到 SDK 的显示完成回执才报告 `displayed:true`；检查后会主动释放设备。

Linux 基础音频对照检查：先停止主服务，再执行 `docker compose -f diagnostics/compose.yaml run --rm qimen-note4-audio-check`。只播放一秒测试音，不调用 AI、不读取密钥、不自动重试，回执保存为 `outputs/audio-check.json`；结束后启动主服务。不要同时运行两个设备连接端。

测试覆盖全部 60 个抽时与旧引擎一致、寄干/空亡/驿马、历史恢复、问答保存、切盘取消播报、重连退避、进程清理和旧回执隔离。实机验收还需检查 Note4 字体效果、按键、Wi-Fi 断开恢复及语音音量。

## 源码与许可

`engine/` 是本项目创建时的 H5 算法、解释库和提示词快照；`node/engine.mjs` 从原 H5 提取现有序列化函数，不运行网页 UI。更新时同步这六个文件并重新跑一致性测试。

ZECTRIX SDK 上游：https://github.com/itopinion/zectrix-local-push-sdk

固定上游版本：`c71412f3f1e1d039bf4f09b9e7867c4661ae1237`（0.1.0），随附原始 MIT 许可证和 LICENSES 目录。本项目仅在 `Device` 增加兼容原接口的 `open_verified` 方法：在 INFO 响应中校验指定 ID，然后才 CONNECT；原 `open` 行为不变。补丁说明见 `SDK_PATCH.md`。Rust 进程是唯一 SDK 连接者，Node 通过 JSON Lines 传递请求与事件。
