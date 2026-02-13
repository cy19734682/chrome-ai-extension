/**
 * UUID生成
 * @returns {string}
 * @constructor
 */
export const UUID = () => {
	let d = new Date().getTime()
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		const r = ((d + Math.random() * 16) % 16) | 0
		d = Math.floor(d / 16)
		return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
	})
}

/**
 * 格式化时间戳为人类可读格式（今天显示时间，今年显示月日+时间，其他显示完整日期+时间）
 * @param timestamp - 时间戳（毫秒）
 * @returns {string}
 * @constructor
 */
export const formatTime = (timestamp) => {
	if (!timestamp) return ''
	const date = new Date(timestamp)
	const now = new Date()

	// 如果是今天，只显示时间
	if (date.toDateString() === now.toDateString()) {
		return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
	}

	// 如果是今年，显示月日和时间
	if (date.getFullYear() === now.getFullYear()) {
		return (
			date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) +
			' ' +
			date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
		)
	}
	// 其他情况显示完整日期和时间
	return date.toLocaleString('zh-CN')
}

/**
 * 封装处理响应的公共方法
 * @param response
 * @param onMessages
 */
export const handleResponse = async (response, onMessages) => {
	if (!response.ok) {
		const errorData = await response.json()
		// 直接返回错误信息，避免本地抛出异常
		throw new Error(errorData.error?.message || `请求失败: ${response.status}`)
	}
	// 处理流式响应
	const reader = response.body.getReader()
	const decoder = new TextDecoder('utf-8')
	try {
		while (true) {
			const { value, done } = await reader.read()
			if (done) break
			const chunk = decoder.decode(value, { stream: true })
			const lines = chunk.split('\n\n').filter((line) => line.trim() !== '')
			for (const line of lines) {
				if (!line.trim()) continue
				try {
					const data = JSON.parse(line)
					// 把回调也包起来，防止“设置 undefined”导致整个流被 abort
					try {
						onMessages(data)
					} catch (cbErr) {
						console.error('回调处理失败:', cbErr)
					}
				} catch (parseErr) {
					console.warn('JSON 解析失败:', line, parseErr)
				}
			}
		}
	} catch (readerErr) {
		//  AbortController 主动取消会走到这里
		if (readerErr.name === 'AbortError') {
			console.log('~~~请求被主动取消~~~~')
			return
		}
		// 其他 reader 异常继续抛，让外层 finally 处理
		throw readerErr
	} finally {
		reader.releaseLock()
	}
}
