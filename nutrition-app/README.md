# 🥗 营养追踪器

AI 驱动的每日营养素追踪应用，使用 Google Gemini API 智能分析食物营养。

## 项目结构

```
nutrition-tracker/
├── api/
│   └── analyze.js      ← Vercel 后端（API Key 安全存放在这里）
├── src/
│   ├── App.jsx         ← 主界面
│   └── main.jsx        ← 入口文件
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

## 部署到 Vercel（小白步骤）

### 第一步：上传代码到 GitHub
1. 去 [github.com](https://github.com) 注册/登录
2. 点击右上角 `+` → `New repository`
3. 取名如 `nutrition-tracker`，点击 Create
4. 把这个文件夹的所有文件上传上去（拖拽即可）

### 第二步：部署到 Vercel
1. 去 [vercel.com](https://vercel.com) 用 GitHub 账号登录
2. 点击 `Add New Project`
3. 选择你刚创建的 `nutrition-tracker` 仓库
4. 点击 `Deploy`（Vercel 会自动检测 Vite 配置）

### 第三步：添加 API Key（最重要！）
1. 部署完成后，进入项目页面
2. 点击顶部 `Settings` 标签
3. 左侧选 `Environment Variables`
4. 点击 `Add New`：
   - **Name**: `GEMINI_API_KEY`
   - **Value**: 你的 Gemini API Key（去 https://aistudio.google.com/apikey 获取）
5. 点击 `Save`
6. 回到 `Deployments` 页面，点击 `Redeploy`

### 获取 Gemini API Key
1. 访问 https://aistudio.google.com/apikey
2. 点击 `Create API Key`
3. 复制 key（以 `AIza` 开头）
4. 粘贴到 Vercel 环境变量中

## 本地开发

```bash
npm install
npm run dev
```

本地开发时，创建 `.env.local` 文件：
```
GEMINI_API_KEY=你的key
```

## 功能
- ✅ 早餐/午餐/晚餐/宵夜分类记录
- ✅ AI 智能分析热量、蛋白质、碳水、脂肪
- ✅ 今日营养总计面板
- ✅ 本地存储，刷新不丢失
- ✅ API Key 安全存放在服务器端
