import api from '@/services/api.js'
import { handleResponse } from '@/utils/index.js'
import { DB_STORE_META, DB_STORE_MSG, CONNECT_PORT_NAME, CHAT_PORT_KEYS } from '@/utils/constant.js'
import { getDB } from '@/utils/db.js'
import { connectService } from '@/services/chrome-api.js'

// 会话映射
const sessionMap = {}
let portT = null
/**
 * 处理 chat 端口连接
 */
connectService.acceptPort(CONNECT_PORT_NAME, (port) => {
	portT = port
	let tabId = ''
	/* ---------- start ---------- */
	port.on(CHAT_PORT_KEYS.START, async ({ sessionId }) => {
		tabId = sessionId
		if (sessionMap[tabId]?.messages) {
			portT?.post?.(CHAT_PORT_KEYS.HISTORY, { sessionId: tabId, messages: sessionMap[tabId].messages })
			return
		}
		const db = await getDB()
		const history = (await db.get(DB_STORE_MSG, tabId)) || []
		sessionMap[tabId] = { messages: history }
		portT?.post?.(CHAT_PORT_KEYS.HISTORY, { sessionId: tabId, messages: history })
	})

	/* ---------- chat ---------- */
	port.on(CHAT_PORT_KEYS.CHAT, async ({ sessionId, content, ...options }) => {
		tabId = sessionId
		const db = await getDB()
		const history = sessionMap[tabId]?.messages || (await db.get(DB_STORE_MSG, tabId)) || []
		history.push({ role: 'user', content })

		const chat = (await db.get(DB_STORE_META, tabId)) || null
		if (!chat) {
			const title = history.find((m) => m.role === 'user')?.content.slice(0, 30) || '新对话'
			await db.put(DB_STORE_META, { id: tabId, title, createTime: Date.now() }, tabId)
		}

		const ctrl = new AbortController()
		sessionMap[tabId] = { messages: history, ctrl }
		let thinkAnswer = ''
		let answer = ''
		try {
			const response = await api.aiApi.chat(history, { controller: ctrl })
			history.push({ role: 'assistant', content: '', think: '' })
			await handleResponse(response, (data) => {
				if (!portT) {
					return
				}
				if (data.result) {
					const { content } = data.result
					if (data.type === 'think') {
						thinkAnswer += content
						portT?.post?.(CHAT_PORT_KEYS.DELTA, { think: content })
						sessionMap[tabId].messages[history.length - 1].think += content
					} else if (data.type === 'middle') {
						answer += content
						portT?.post?.(CHAT_PORT_KEYS.DELTA, { delta: content })
						sessionMap[tabId].messages[history.length - 1].content += content
					} else {
						portT?.post?.(CHAT_PORT_KEYS.DELTA, { [data.type]: content })
						sessionMap[tabId].messages[history.length - 1][data.type] = content
					}
				}
			})
		} catch (e) {
			answer += `\n\n⚠️ =====异常结束=====\n\n${e?.message}`
			portT?.post?.(CHAT_PORT_KEYS.DELTA, { delta: answer })
		} finally {
			history[history.length - 2] = { ...history[history.length - 2], ...options }
			history[history.length - 1].think = thinkAnswer
			history[history.length - 1].content = answer
			await db.put(DB_STORE_MSG, history, tabId)
			portT?.post?.(CHAT_PORT_KEYS.DONE)
			delete sessionMap[tabId]
		}
	})

	/* ---------- stop ---------- */
	port.on(CHAT_PORT_KEYS.STOP, () => sessionMap[tabId]?.ctrl.abort())

	/* ---------- disconnect ---------- */
	port.onDisconnect(() => {
		if (portT === port) {
			portT = null
		}
		// sessionMap[tabId]?.ctrl.abort()
		// 这里可以清理 sessionMap，也可保留让下次 start 复用
	})
})
