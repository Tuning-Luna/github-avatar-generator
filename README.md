# GitHub Avatar Generator

<div align="center">

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen?style=flat-square&logo=github)](https://tuning-luna.github.io/github-avatar-generator/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

**输入字符串，生成 GitHub 风格头像**  
_Generate GitHub-style identicons from any string_

</div>

---

## 🚀 Live Demo | 在线体验

🔗 **[https://tuning-luna.github.io/github-avatar-generator/](https://tuning-luna.github.io/github-avatar-generator/)**

---

## ✨ Features | 特性

- 🎨 **SHA-256 Based** - Deterministic, unique avatar for any input
- 🔧 **1000x1000px HD Output** - High-resolution PNG export
- 🖼️ **Border Option** - Toggle background-colored border on download
- ⚡ **Instant Preview** - Real-time generation as you type
- 🎲 **Random Generator** - Quick random name with number suffix
- 📱 **Responsive** - Works on desktop and mobile

---

## 🖼️ Preview | 预览

<div align="center">
  <img src="./assets/1.png" width="30%" />
  <img src="./assets/2.png" width="30%" />
  <img src="./assets/3.png" width="30%" />
</div>

---

## 📦 How It Works | 工作原理

1. **Input** → Normalize string (trim, lowercase)
2. **Hash** → Compute SHA-256 of input
3. **Color** → Extract HSL from hash, convert to RGB
4. **Pattern** → Use hash bits to determine 5×5 mirrored grid cells
5. **Render** → Draw on HTML5 Canvas at 1000×1000px resolution
6. **Export** → Download as PNG with optional border
