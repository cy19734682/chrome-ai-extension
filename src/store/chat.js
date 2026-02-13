import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { handleResponse, UUID } from '@/utils'
import { DB_STORE_META, DB_STORE_MSG, CONNECT_PORT_NAME, CHAT_PORT_KEYS } from '@/utils/constant.js'
import { getDB } from '@/utils/db.js'
import { connectService } from '@/services/chrome-api.js'
import api from '@/services/api.js'
let port = null

export const useChatStore = defineStore('chat', () => {
	const messages = ref([])
	const chats = ref([])
	const currentId = ref('')
	const inpDisabled = ref(false)

	const showRenameDialog = ref(false)
	const showDeleteDialog = ref(false)
	const showSidebarDrawer = ref(false)
	const selectedChatId = ref(null)
	const newChatTitle = ref('')

	const currentChat = computed(() => chats.value.find((s) => s.id === currentId.value) || null)
	let unListeners = []

	/**
	 * 工具：把旧监听器全部卸掉
	 */
	function clearListeners() {
		unListeners.forEach((fn) => fn())
		unListeners = []
	}

	/**
	 * 工具：确保已连接到服务端口
	 * @returns {*|{post: (function(*, *): *), on: (function(*, *): function(): *), disconnect: (function(): *),
	 *   onDisconnect: (function(*): *)}}
	 */
	function ensurePort() {
		if (port) return port
		port = connectService.openPort(CONNECT_PORT_NAME, {
			onDisconnect: () => {
				port = null
				clearListeners()
			}
		})
		return port
	}

	/**
	 * 连接到指定会话
	 * @param sessionId
	 * @param isNew
	 * @returns {Promise<void>}
	 */
	async function connect(sessionId, isNew = false) {
		// 先清掉上一次会话的监听
		clearListeners()
		const p = ensurePort()
		unListeners.push(
			p.on(CHAT_PORT_KEYS.HISTORY, ({ sessionId: sid, messages: m }) => {
				if (sid === sessionId) messages.value = m
			}),
			p.on(CHAT_PORT_KEYS.DELTA, ({ time, think, delta }) => {
				const last = messages.value[messages.value.length - 1]
				if (last?.role === 'assistant') {
					if (time) {
						last.time = time
					} else if (think) {
						last.think += think
					} else {
						last.content += delta
					}
				} else {
					const msg = { role: 'assistant', think: '', content: '' }
					if (time) {
						msg.time = time
					} else if (think) {
						msg.think += think
					} else {
						msg.content += delta
					}
					messages.value.push(msg)
				}
			}),
			p.on(CHAT_PORT_KEYS.DONE, () => {
				inpDisabled.value = false
				const chat = chats.value.find((s) => s.id === sessionId) || null
				if (chat && !chat.createTime) autoUpdateChatTitle(sessionId)
			}),
			p.on(CHAT_PORT_KEYS.ERROR, ({ text }) => alert(text))
		)
		if (!isNew) {
			p.post(CHAT_PORT_KEYS.START, { sessionId })
		}
	}

	/**
	 * 发送消息到指定会话
	 * @param content
	 * @param options
	 * @returns {Promise<void>}
	 */
	async function send(content, options = {}) {
		if (!port) {
			port = connectService.openPort(CONNECT_PORT_NAME)
		}
		if (!currentId.value) {
			await createChat(true)
		}
		if (!chats.value.some((s) => s.id === currentId.value)) {
			chats.value.unshift({
				id: currentId.value,
				title: '新对话'
			})
		}
		messages.value.push({ role: 'user', content, ...options })
		messages.value.push({ role: 'assistant', content: '', think: '' })
		inpDisabled.value = true
		port?.post(CHAT_PORT_KEYS.CHAT, { sessionId: currentId.value, content, ...options })
	}

	/**
	 * 停止当前会话
	 * @returns {Promise<void>}
	 */
	async function stop() {
		if (!port) {
			port = connectService.openPort(CONNECT_PORT_NAME)
		}
		port?.post(CHAT_PORT_KEYS.STOP)
		inpDisabled.value = false
	}

	/**
	 * 加载所有会话
	 * @returns {Promise<void>}
	 */
	async function loadList() {
		const db = await getDB()
		const raw = await db.getAll(DB_STORE_META)
		chats.value = raw.sort((a, b) => b.createTime - a.createTime)
		if (!currentId.value && chats.value.length) {
			currentId.value = chats.value[0].id
			// 连接到当前会话
			await connect(currentId.value)
		}
	}

	/**
	 * 创建新会话
	 * @returns {Promise<void>}
	 */
	async function createChat(isNew = false) {
		messages.value = []
		currentId.value = UUID()
		// 连接到当前会话
		await connect(currentId.value, isNew)
	}

	/**
	 * 自动更新会话标题
	 * @param id
	 * @returns {Promise<void>}
	 */
	async function autoUpdateChatTitle(id) {
		const chat = chats.value.find((s) => s.id === currentId.value) || null
		const userContent = messages.value.find((item) => item.role === 'user')?.content
		const assistantContent = messages.value.find((item) => item.role === 'assistant')?.content
		if (!userContent || !assistantContent || !chat) {
			return
		}
		const message = {
			role: 'user',
			content: `USER: ${userContent} \n\nAssistant: ${assistantContent.slice(0, 400)} \n\n`
		}
		const response = await api.aiApi.chat([message], { autoTitle: true })
		let answer = ''
		await handleResponse(response, (data) => {
			if (data.result) {
				const { content } = data.result
				answer += content
				chat.title = answer || ''
			}
		})
		const createTime = Date.now()
		chat.createTime = createTime
		const db = await getDB()
		const chatD = (await db.get(DB_STORE_META, id)) || null
		if (chatD) {
			chatD.title = answer || ''
			chatD.createTime = createTime
			await db.put(DB_STORE_META, chatD, chatD?.id)
		}
	}

	/**
	 * 更新会话标题
	 * @param id
	 * @param title
	 * @returns {Promise<void>}
	 */
	async function updateChatTitle(id, title) {
		const chat = chats.value.find((s) => s.id === id) || null
		if (chat) {
			chat.title = title || ''
			const db = await getDB()
			await db.put(DB_STORE_META, JSON.parse(JSON.stringify(chat)), chat?.id)
		}
	}

	/**
	 * 删除指定会话
	 * @param id
	 * @returns {Promise<void>}
	 */
	async function deleteChat(id) {
		const db = await getDB()
		await db.delete(DB_STORE_META, id)
		await db.delete(DB_STORE_MSG, id)
		chats.value = chats.value.filter((s) => s.id !== id)
		if (chats.value?.length > 0) {
			currentId.value = chats.value[0]?.id || UUID()
			// 连接到当前会话
			await connect(currentId.value)
		} else {
			messages.value = []
			currentId.value = ''
		}
	}

	/**
	 * 清除所有会话
	 * @returns {Promise<void>}
	 */
	async function clearChatAll() {
		const db = await getDB()
		await db.clear(DB_STORE_META)
		await db.clear(DB_STORE_MSG)
		messages.value = []
		chats.value = []
		currentId.value = ''
	}

	/**
	 * 切换当前会话
	 * @param id
	 * @returns {void}
	 */
	async function switchChat(id) {
		currentId.value = id
		await connect(currentId.value)
	}

	return {
		messages,
		inpDisabled,
		showRenameDialog,
		showDeleteDialog,
		showSidebarDrawer,
		selectedChatId,
		newChatTitle,
		chats,
		currentId,
		currentChat,
		send,
		stop,
		connect,
		loadList,
		createChat,
		updateChatTitle,
		deleteChat,
		clearChatAll,
		switchChat
	}
})
