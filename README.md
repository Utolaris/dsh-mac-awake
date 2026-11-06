# DSH Mac 防空闲睡眠

DSH 加载插件后运行 macOS 系统自带的 `caffeinate -i -w <DSH host PID>`，阻止系统因空闲自动睡眠；允许锁屏和显示器熄灭。卸载插件或 DSH 进程结束时释放断言。不会阻止合盖睡眠、手动睡眠或关机。
