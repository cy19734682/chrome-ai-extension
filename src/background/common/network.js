
import { messageService } from '@/services/chrome-api.js'


// 存储网络请求
let networkRequests = []
let isMonitoringNetwork = false

/**
 * 开始监控网络请求
 */
messageService.onMessage('START_NETWORK_MONITORING', (message, sender, sendResponse) => {
	startNetworkMonitoring()
	sendResponse({ success: true })
})

/**
 * 停止监控网络请求
 */
messageService.onMessage('STOP_NETWORK_MONITORING', (message, sender, sendResponse) => {
	stopNetworkMonitoring()
	sendResponse({ success: true })
})

/**
 * 获取最近的网络请求
 * @param limit 最大请求数
 * @returns {Array} 最近的网络请求数组
 */
messageService.onMessage('GET_NETWORK_REQUESTS', (message, sender, sendResponse) => {
	const requests = getRecentRequests(message.limit || 50)
	sendResponse({ success: true, requests })
})

/**
 * 开始监控网络请求
 */
function startNetworkMonitoring() {
	if (isMonitoringNetwork) return
	
	isMonitoringNetwork = true
	networkRequests = []
	
	// 监听所有网络请求
	chrome.webRequest.onBeforeRequest.addListener(
		(details) => {
			// 过滤掉扩展自身的请求
			if (details.url.startsWith('chrome-extension://')) return
			
			const request = {
				id: details.requestId,
				url: details.url,
				method: details.method,
				type: details.type,
				timestamp: details.timeStamp,
				tabId: details.tabId
			}
			
			networkRequests.push(request)
			
			// 限制存储的请求数量
			if (networkRequests.length > 1000) {
				networkRequests.shift()
			}
		},
		{ urls: ['<all_urls>'] },
		[]
	)
	
	// 监听请求完成
	chrome.webRequest.onCompleted.addListener(
		(details) => {
			const request = networkRequests.find((r) => r.id === details.requestId)
			if (request) {
				request.status = details.statusCode
				request.responseHeaders = details.responseHeaders
				request.completed = true
			}
		},
		{ urls: ['<all_urls>'] },
		['responseHeaders']
	)
	
	console.log('Network monitoring started')
}

/**
 * 停止监控网络请求
 */
function stopNetworkMonitoring() {
	if (!isMonitoringNetwork) return
	
	chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequest)
	chrome.webRequest.onCompleted.removeListener(onCompleted)
	isMonitoringNetwork = false
	
	console.log('Network monitoring stopped')
}


/**
 * 获取最近的请求
 * @param limit
 * @returns {*[]}
 */
function getRecentRequests(limit) {
	return networkRequests.slice(-limit).sort((a, b) => b.timestamp - a.timestamp)
}