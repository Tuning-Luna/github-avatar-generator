# 本地运行

[简体中文](./run-locally.md) | [English](./run-locally.en.md)

这是一个零构建的原生 ES module 应用，应用本身无需安装任何依赖。请通过本地 HTTP 服务器提供仓库文件，以保证 Web Crypto 与模块加载正常工作：

```sh
npx serve .
```

然后打开终端输出的 localhost 地址。VS Code Live Server 同样可用。请勿用 `file://` 直接打开 `index.html`。
