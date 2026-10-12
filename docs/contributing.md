# 贡献指南

[简体中文](./contributing.md) | [English](./contributing.en.md)

欢迎任何形式的贡献：报告问题、提出建议、完善文档或提交代码。

## 报告问题

在 [Issues](https://github.com/Tuning-Luna/github-avatar-generator/issues) 中说明复现步骤、期望结果与实际结果。涉及渲染或导出的问题，请附上所用的种子字符串与浏览器版本。

## 提交代码

1. Fork 本仓库
2. 从 `main` 切出分支
3. 完成修改，并在本地通过[验证](./verify.md)中的回归测试
4. 发起 Pull Request，说明改动原因与验证方式

## 本地开发

本项目是无构建、无运行时依赖的原生 ES module 应用，改完代码刷新页面即可生效，无需打包步骤。启动方式见[本地运行](./run-locally.md)。

## 项目约定

- 保持静态资源、样式表与模块 URL 为相对路径，以兼容 GitHub Pages 的子路径部署
- `core/` 与 `ui/` 只放 JavaScript，所有样式表放在 `styles/`
- 不引入运行时依赖或构建工具；新增逻辑请在 `tests/` 下补充回归测试
- 不要将随附的 `design-system/` 目录引入为应用依赖
