# 短视频分镜剧本生成工坊

这是一个基于 Google Gemini AI 的短视频分镜脚本生成工具，专门为文学创作者和视频博主设计。

## 本地运行指南

如果您下载了本项目的源代码并希望在本地运行，请按照以下步骤操作：

### 1. 环境要求
- 安装 [Node.js](https://nodejs.org/) (建议 v18 或更高版本)
- 一个 [Google Gemini API Key](https://aistudio.google.com/app/apikey) (免费)

### 2. 安装依赖
在项目根目录下打开终端，运行：
```bash
npm install
```

### 3. 配置环境变量
1. 在项目根目录创建一个名为 `.env` 的文件。
2. 将以下内容复制到 `.env` 文件中，并替换为您自己的 API Key：
```env
GEMINI_API_KEY="您的_GEMINI_API_KEY"
```

### 4. 启动开发服务器
运行以下命令启动项目：
```bash
npm run dev
```
之后在浏览器访问 [http://localhost:3000](http://localhost:3000) 即可。

### 5. 生产环境构建与运行
如果您想要构建生产版本：
```bash
npm run build
npm start
```

## 功能特点
- **智能分镜**：自动将小说片段转化为 8 秒一段的专业分镜脚本。
- **AI 视频提示词**：生成符合 Sora/Kling/Luma 等工具要求的结构化提示词。
- **一键文案**：提供适合“文字成片”工具直接导入的文段。
- **灵活编辑**：支持片段拆分、合并、重新生成及排序调整。
- **导出支持**：支持导出为 JSON、CSV 和 Markdown 格式。
