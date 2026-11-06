# DSH Mac 防空闲睡眠

**仅支持 macOS。** 插件声明支持 DSH `>=0.2.2-rc.1 <0.3.0`，目前只在 DSH Desktop `0.2.2-rc.1` 上验证过；其他版本尚未实测。请勿在 Windows 或 Linux 上安装。

DSH 加载插件后运行 macOS 系统自带的 `caffeinate -i -w <DSH host PID>`，阻止系统因空闲自动睡眠；允许锁屏和显示器熄灭。卸载插件或 DSH 进程结束时释放断言。不会阻止合盖睡眠、手动睡眠或关机。
