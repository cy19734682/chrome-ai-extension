// 弹出页面入口文件
import { createApp } from 'vue'
import { setupStore } from '@/store'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'

// 创建Vue应用
const app = createApp(App)

// 注册Element Plus
app.use(ElementPlus)

// 注册Pinia
setupStore(app)

// 添加全局错误处理
app.config.errorHandler = (err, instance, info) => {
	console.error('Vue应用错误:', err)
	console.error('错误位置:', info)
	// 可以在这里添加错误上报逻辑
}

// 挂载应用
app.mount('#app')
