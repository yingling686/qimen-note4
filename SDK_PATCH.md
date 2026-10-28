# SDK 固定版本与本地扩展

上游：itopinion/zectrix-local-push-sdk

提交：c71412f3f1e1d039bf4f09b9e7867c4661ae1237

仅修改 `vendor/zectrix-local-push-sdk/src/device.rs` 的连接入口，新增
`Device::open_verified(OpenOptions, Option<&str>)`。原 `open` 委托该方法，传入 None，保持兼容。

扩展在 SDK 已有 INFO 响应解析后、任何 CONNECT 发送前，对比绑定 ID；不匹配则返回 InvalidOptions。
使用直接 IP 时仍能验证身份，重连不依赖 mDNS 广播，既不会重新接管同 IP 上的另一台设备，也不增加私有协议实现。

另增加可选 `NOTE4_DIAGNOSTICS` 环境变量：开启时仅在标准错误输出被拒绝的控制类型/错误码和播放结束原因码；不输出音频、问题、密钥等内容，不改变协议或处理结果。

除身份校验与可选诊断外，传输、录音、色板、显示回执、保活和媒体播放全部沿用上游代码。
