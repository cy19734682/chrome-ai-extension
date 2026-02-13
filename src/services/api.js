// API服务封装 - 提供AI和数据管理的API调用
const defaultOptions = {
	baseURL: 'http://localhost:3000',
	timeout: 30000
}

const chatSettings = {
	model: 'deepseek-chat',
	temperature: 0.8,
	maxTokens: 8192,
	thinking: true
}

/**
 * 封装的fetch工具函数
 * @param {string} url - API端点URL
 * @param {string} method - HTTP方法
 * @param {Object} [options] - 选项
 * @returns {Promise<Response>} 返回响应对象
 */
export const apiFetch = async (url, method, options) => {
	let { body, headers = {}, controller, timeout = defaultOptions.timeout } = options

	const defaultHeaders = {
		'Content-Type': 'application/json'
	}

	if (!controller) {
		controller = new AbortController()
	}
	const timeoutId = setTimeout(() => controller.abort(), timeout)

	const config = {
		method,
		headers: { ...defaultHeaders, ...headers },
		signal: controller.signal
	}
	if (body) {
		if (method === 'POST' || method === 'PUT') {
			config.body = JSON.stringify(body)
		}
		if (method === 'GET' || method === 'DELETE') {
			url += '?'
			Object.entries(body).forEach(([k, v]) => {
				url += `${k}=${v}&`
			})
		}
	}
	try {
		const response = await fetch(defaultOptions.baseURL + url, config)
		clearTimeout(timeoutId)
		if (!response.ok) {
			let errorData
			try {
				errorData = await response.json()
			} catch {
				errorData = { error: `API请求失败: ${response.status} ${response.statusText}` }
			}
			throw new Error(errorData.error?.message || errorData.error || 'API请求失败')
		}
		return response
	} catch (error) {
		clearTimeout(timeoutId)
		console.error(`API请求错误 (${url}):`, error)
		throw new Error(`网络请求失败: ${error.message}`)
	}
}

// AI服务API
export const aiApi = {
	/**
	 * AI对话
	 * @param {Array} messages - 消息数组 [{role: 'user/assistant', content: '消息内容'}]
	 * @param {Object} options - 对话选项
	 * @returns {Promise} - AI响应
	 */
	async chat(messages, options = {}) {
		const { controller, ...restOptions } = options
		try {
			return await apiFetch('/api/chat', 'POST', {
				controller,
				body: {
					messages,
					options: {
						...chatSettings,
						...restOptions
					}
				}
			})
		} catch (error) {
			throw error
		}
	}
}

// 导出默认API（使用模拟API进行开发）
export default {
	aiApi
}
