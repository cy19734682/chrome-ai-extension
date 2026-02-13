// Chrome API封装服务 - 提供浏览器扩展相关功能的统一接口

// 消息传递服务
export const messageService = {
	/**
	 * 发送消息到后台脚本
	 * @param type
	 * @param data
	 * @param timeout
	 */
	sendMessage(type, data, timeout = 60000) {
		let timer = null
		let rejectFn = null
		let isCancelled = false
		const promise = new Promise((resolve, reject) => {
			rejectFn = reject
			timer = setTimeout(() => {
				if (!isCancelled) {
					reject(new Error('消息超时！'))
				}
			}, timeout)
			chrome.runtime.sendMessage({ type, data }, (res) => {
				clearTimeout(timer)
				timer = null
				if (isCancelled) return // 已取消则忽略响应
				if (chrome.runtime.lastError) {
					return reject(new Error(chrome.runtime.lastError.message))
				}
				resolve(res)
			})
		})
		const cancel = (reason = '') => {
			if (!isCancelled) {
				isCancelled = true
				if (timer) {
					clearTimeout(timer)
					timer = null
				}
				if (reason) {
					rejectFn(new Error(reason))
				}
			}
		}
		return {
			promise,
			cancel
		}
	},

	/**
	 * 发送消息到Tab页面
	 * @param tabId
	 * @param message
	 * @param options
	 * @param timeout
	 */
	sendMessageTab(tabId, message = null, options = {}, timeout = 60000) {
		let timer = null
		let rejectFn = null
		let isCancelled = false
		const promise = new Promise((resolve, reject) => {
			rejectFn = reject
			timer = setTimeout(() => {
				if (!isCancelled) {
					reject(new Error('消息超时！'))
				}
			}, timeout)
			chrome.tabs.sendMessage(tabId, message, options, (res) => {
				clearTimeout(timer)
				timer = null
				if (isCancelled) return // 已取消则忽略响应
				if (chrome.runtime.lastError) {
					return reject(new Error(chrome.runtime.lastError.message))
				}
				resolve(res)
			})
		})
		const cancel = (reason = '') => {
			if (!isCancelled) {
				isCancelled = true
				if (timer) {
					clearTimeout(timer)
					timer = null
				}
				if (reason) {
					rejectFn(new Error(reason))
				}
			}
		}
		return {
			promise,
			cancel
		}
	},

	/**
	 * 监听来自其他脚本的消息
	 * @returns {Function} - 取消监听的函数
	 * @param type
	 * @param handler
	 */
	onMessage(type, handler) {
		const listener = (msg, sender, sendResponse) => {
			// 同时支持 type 和 action
			const msgType = msg?.type || msg?.action
			if (msgType !== type) return false

			let hasResponded = false

			// 安全的响应包装器
			const safeSendResponse = (response) => {
				if (hasResponded) return
				hasResponded = true
				try {
					sendResponse(response)
				} catch (error) {
					// 发送方可能已经关闭，忽略错误
					console.debug('Failed to send response, receiver may be gone:', error.message)
				}
			}
			try {
				const result = handler(msg, sender)
				if (result && typeof result.then === 'function') {
					result.then((data) => safeSendResponse({ data })).catch((err) => safeSendResponse({ error: err.message }))
					// 设置超时确保响应不会挂起
					setTimeout(() => {
						safeSendResponse({ error: 'Response timeout' })
					}, 30000) // 30秒超时
					return true
				} else {
					safeSendResponse({ data: result })
					return false // 同步完成
				}
			} catch (err) {
				safeSendResponse({ error: err.message })
				return false
			}
		}
		chrome.runtime.onMessage.addListener(listener)
		return () => chrome.runtime.onMessage.removeListener(listener)
	}
}

// 连接服务
export const connectService = {
	/**
	 * 包装端口，提供统一的消息发送和接收接口
	 * @param port
	 * @returns {{post: function(*, *): *, on: function(*, *): function(): *, disconnect: function(): *, onDisconnect:
	 *   function(*): *}}
	 */
	wrapPort: (port) => ({
		post: (type, payload) => port.postMessage({ type, payload }),
		on: (type, handler) => {
			const cb = (msg) => msg.type === type && handler(msg.payload, msg)
			port.onMessage.addListener(cb)
			return () => port.onMessage.removeListener(cb)
		},
		disconnect: () => port.disconnect(),
		onDisconnect: (cb) => port.onDisconnect.addListener(cb)
	}),
	/**
	 * 打开端口连接
	 * @param name
	 * @param options
	 * @returns {{post: function(*, *): *, on: function(*, *): function(): *, disconnect: function(): *, onDisconnect:
	 *   function(*): *}}
	 */
	openPort: (name, options = {}) => {
		const port = chrome.runtime.connect({ name }) // 1. 建链
		const api = connectService.wrapPort(port) // 2. 包一层优雅 API
		if (options.onDisconnect) api.onDisconnect(options.onDisconnect)
		return api
	},
	/**
	 * 监听端口连接请求
	 * @param name
	 * @param handler
	 */
	acceptPort: (name, handler) => {
		chrome.runtime.onConnect.addListener((port) => {
			if (port.name !== name) return
			handler(connectService.wrapPort(port))
		})
	}
}

// 存储服务
export const storageService = {
	/**
	 * 存储数据
	 * @param {String} key - 键
	 * @param {Any} value - 值
	 * @returns {Promise}
	 */
	async set(key, value) {
		return new Promise((resolve, reject) => {
			chrome.storage.sync.set({ [key]: value }, () => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError)
				} else {
					resolve()
				}
			})
		})
	},

	/**
	 * 获取数据
	 * @param {String} key - 键
	 * @returns {Promise} - 值
	 */
	async get(key) {
		return new Promise((resolve, reject) => {
			chrome.storage.sync.get(key, (result) => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError)
				} else {
					resolve(result[key])
				}
			})
		})
	},

	/**
	 * 删除数据
	 * @param {String} key - 键
	 * @returns {Promise}
	 */
	async remove(key) {
		return new Promise((resolve, reject) => {
			chrome.storage.sync.remove(key, () => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError)
				} else {
					resolve()
				}
			})
		})
	},

	/**
	 * 获取所有数据
	 * @returns {Promise} - 所有存储的数据
	 */
	async getAll() {
		return new Promise((resolve, reject) => {
			chrome.storage.sync.get(null, (result) => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError)
				} else {
					resolve(result)
				}
			})
		})
	},

	/**
	 * 清空所有数据
	 * @returns {Promise}
	 */
	async clear() {
		return new Promise((resolve, reject) => {
			chrome.storage.sync.clear(() => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError)
				} else {
					resolve()
				}
			})
		})
	}
}

// 标签页服务
export const tabService = {
	/**
	 * 获取当前标签页
	 * @returns {Promise} - 标签页对象
	 */
	async getCurrentTab() {
		return new Promise((resolve, reject) => {
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError)
				} else {
					resolve(tabs[0])
				}
			})
		})
	},

	/**
	 * 获取所有标签页
	 * @param {Object} query - 查询参数
	 * @returns {Promise} - 标签页数组
	 */
	async getTabs(query = {}) {
		return new Promise((resolve, reject) => {
			chrome.tabs.query(query, (tabs) => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError)
				} else {
					resolve(tabs)
				}
			})
		})
	},

	/**
	 * 执行脚本
	 * @param {Number} tabId - 标签页ID
	 * @param {Object} options - 执行选项
	 * @returns {Promise} - 执行结果
	 */
	async executeScript(tabId, options) {
		return new Promise((resolve, reject) => {
			chrome.scripting.executeScript({ target: { tabId }, ...options }, (results) => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError)
				} else {
					resolve(results)
				}
			})
		})
	},

	/**
	 * 插入CSS
	 * @param {Number} tabId - 标签页ID
	 * @param {Object} options - 插入选项
	 * @returns {Promise}
	 */
	async insertCSS(tabId, options) {
		return new Promise((resolve, reject) => {
			chrome.scripting.insertCSS({ target: { tabId }, ...options }, () => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError)
				} else {
					resolve()
				}
			})
		})
	},

	/**
	 * 重新加载标签页
	 * @param {Number} tabId - 标签页ID
	 * @param {Object} reloadOptions - 重载选项
	 * @returns {Promise}
	 */
	async reload(tabId, reloadOptions = {}) {
		return new Promise((resolve, reject) => {
			chrome.tabs.reload(tabId, reloadOptions, () => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError)
				} else {
					resolve()
				}
			})
		})
	},

	/**
	 * 监听标签页更新事件
	 * @returns {Promise<unknown>}
	 */
	async onUpdated() {
		return new Promise((resolve, reject) => {
			chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
				if (changeInfo.status === 'complete' && tab.active) {
					resolve()
				}
			})
		})
	},

	/**
	 * 监听标签页更新事件
	 * @returns {Promise<unknown>}
	 */
	async onActivated() {
		return new Promise((resolve, reject) => {
			chrome.tabs.onActivated.addListener((activeInfo) => {
				resolve()
			})
		})
	}
}

// 浏览历史服务
export const historyService = {
	/**
	 * 获取浏览历史
	 * @param {Object} options - 查询选项
	 * @returns {Promise} - 历史记录数组
	 */
	async getHistory(options = {}) {
		const defaultOptions = {
			text: '',
			startTime: 0,
			endTime: Date.now(),
			maxResults: 100
		}

		const queryOptions = { ...defaultOptions, ...options }

		return new Promise((resolve, reject) => {
			chrome.history.search(queryOptions, (results) => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError)
				} else {
					resolve(results)
				}
			})
		})
	},

	/**
	 * 获取访问频率最高的URL
	 * @param {Number} days - 天数
	 * @param {Number} limit - 限制数量
	 * @returns {Promise} - 排序后的历史记录
	 */
	async getMostVisited(days = 7, limit = 20) {
		const startTime = Date.now() - days * 24 * 60 * 60 * 1000
		const historyItems = await this.getHistory({ startTime, maxResults: 1000 })

		// 按URL分组并计数
		const urlCounts = {}
		historyItems.forEach((item) => {
			if (!urlCounts[item.url]) {
				urlCounts[item.url] = 0
			}
			urlCounts[item.url] += item.visitCount || 1
		})

		// 转换为数组并排序
		const sorted = Object.entries(urlCounts)
			.map(([url, count]) => ({
				url,
				visitCount: count,
				title: historyItems.find((item) => item.url === url)?.title || url
			}))
			.sort((a, b) => b.visitCount - a.visitCount)
			.slice(0, limit)

		return sorted
	},

	/**
	 * 分析浏览历史
	 * @param {Number} days - 分析天数
	 * @param {Object} options - 分析选项
	 * @returns {Promise} - 分析结果
	 */
	async analyzeHistory(days = 7, options = {}) {
		const historyItems = await this.getHistory({
			startTime: Date.now() - days * 24 * 60 * 60 * 1000,
			maxResults: 1000
		})

		// 调用AI服务进行分析
		const { aiApi } = await import('./api.js')
		return aiApi.analyzeHistory(historyItems, options)
	}
}
