# 验证

[简体中文](./verify.md) | [English](./verify.en.md)

使用 Node 20 或更高版本运行无依赖的回归测试：

```sh
node --test tests/*.test.mjs
```

测试覆盖哈希、颜色转换、确定性的镜像渲染、Unicode 与空种子，以及共享的导出画布尺寸。仅浏览器可验证的行为（剪贴板权限、下载、响应式布局）需要在本地 localhost 服务器上手动检查。
