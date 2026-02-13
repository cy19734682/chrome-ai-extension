# AI浏览器助手 - 开发文档

## 项目概述

AI浏览器助手是一款基于Chrome扩展的智能工具，集成了AI对话和高级页面操作(MCP)功能，旨在提升用户的浏览体验和工作效率。

### 核心功能

1. **AI对话功能**
   - 多轮对话支持
   - 对话历史管理
   - 语音输入（可选）

2. **MCP功能**
   - 网页内容智能总结
   - 网页样式自动修改
   - 网络请求捕获与分析
   - 浏览记录分析与洞察

## 技术栈

- **前端框架**: Vue 3 Composition API
- **构建工具**: Vite
- **状态管理**: Pinia
- **UI组件库**: Element Plus
- **HTTP客户端**: Axios
- **扩展开发**: Chrome Extensions API (Manifest V3)

## 快速开始

### 开发环境准备

1. **安装Node.js**
   确保安装Node.js v16.0或更高版本

2. **克隆或进入项目目录**
   ```bash
   cd D:\000WorkProject\chrome-ai-extension
   ```

3. **安装依赖**
   ```bash
   npm install
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

### 构建与部署

1. **构建项目**
   ```bash
   npm run build
   ```
   构建产物将输出到`dist`目录

2. **加载扩展**
   - 打开Chrome浏览器
   - 访问`chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目的`dist`目录

## 项目结构

```
src/
├── assets/            # 静态资源文件
├── components/        # Vue组件
│   ├── common/        # 通用组件
│   ├── conversation/  # 对话相关组件
│   └── mcp/           # MCP功能组件
├── pages/             # 页面组件
│   ├── popup/         # 弹出页面
│   ├── options/       # 选项页面
│   └── content/       # 内容脚本页面
├── services/          # 服务层
│   ├── api.js         # API封装
│   ├── chrome-api.js  # Chrome API封装
│   └── ai-service.js  # AI服务封装
├── store/             # Pinia状态管理
├── utils/             # 工具函数
├── index.js      # 后台脚本
├── index.js         # 内容脚本入口
├── main.js           # 弹出页面入口
└── options.js         # 选项页面入口
```

## 主要配置文件

- **manifest.json**: 扩展配置文件，定义权限和资源
- **vite.config.js**: Vite构建配置
- **package.json**: 项目依赖和脚本

## 开发指南

### 组件开发

请参考 [前端开发工作指南](./前端开发工作指南.md) 了解详细的组件开发规范和示例。

### API使用

所有API调用都已在`services/api.js`中封装，支持真实API和模拟API两种模式。开发环境默认使用模拟API，可通过修改配置切换到真实API。

### 调试技巧

1. **扩展调试**
   - 弹出页面: 右键点击扩展图标，选择"检查弹出内容"
   - 背景脚本: 在扩展管理页面点击"检查视图"
   - 内容脚本: 在网页开发者工具中直接调试

2. **Vue调试**
   - 安装Vue DevTools扩展
   - 在开发者工具中使用Vue面板

## 文档资源

- [产品说明书](./产品说明书.md): 详细的产品需求和功能描述
- [技术架构与开发文档](./技术架构与开发文档.md): 系统架构和技术实现方案
- [前端开发工作指南](./前端开发工作指南.md): 组件开发和API使用指南

## 注意事项

1. **权限管理**
   - 扩展需要较多权限，请确保在manifest.json中只声明必要的权限
   - 动态权限申请时提供清晰的用户提示

2. **性能优化**
   - 避免阻塞主线程
   - 合理使用缓存
   - 优化DOM操作

3. **安全性**
   - 敏感数据加密存储
   - 避免XSS攻击
   - 验证所有用户输入

## 开发路线图

1. **第一阶段**: 基础架构搭建
2. **第二阶段**: AI对话功能实现
3. **第三阶段**: MCP功能实现
4. **第四阶段**: 完善与测试

## 贡献指南

1. 创建功能分支: `git checkout -b feature/xxx`
2. 提交更改: `git commit -m 'feat: 添加xxx功能'`
3. 推送到分支: `git push origin feature/xxx`
4. 提交合并请求

## 许可证

保留所有权利。

---

*最后更新: 2023-12-01*