import { ref, nextTick, onMounted, watch, onUnmounted } from 'vue'
import { useChatStore } from '@/store'
import { messageService, tabService } from '@/services/chrome-api.js'
import { ElMessage, ElNotification } from 'element-plus'
import { storeToRefs } from 'pinia'

/**
 * 会话相关hooks
 */
export default function () {
	// 响应式数据用 storeToRefs 解构
	const { messages, currentId, currentChat, showSidebarDrawer } = storeToRefs(useChatStore())
	// 方法直接从原 store 取，不需要解构
	const { createChat } = useChatStore()

	// 响应式数据
	const openThink = ref(true)
	const messagesEndRef = ref(null)
	const messagesContainer = ref(null)

	// 新建对话
	const newChat = async () => {
		try {
			await createChat()
			nextTick(() => {
				// 聚焦输入框
				const textarea = document.querySelector('.message-input textarea')
				if (textarea) textarea.focus()
			})
		} catch (error) {
			ElMessage.error('创建新对话失败')
			console.error('New chat.js error:', error)
		}
	}

	// 滚动到底部
	const scrollToBottom = () => {
		setTimeout(() => {
			messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
		}, 100)
	}

	// 监听当前消息变化，自动滚动到底部
	watch(
		() => messages.value,
		(v) => {
			scrollToBottom()
		},
		{ deep: true }
	)

	// 监听当前对话变化，自动滚动到底部
	watch(
		() => currentId.value,
		async () => {
			scrollToBottom()
		}
	)

	// 初始化
	onMounted(async () => {
		nextTick(() => {
			scrollToBottom()
		})
	})

	return {
		openThink,
		messagesEndRef,
		messagesContainer,
		showSidebarDrawer,
		messages,
		currentId,
		currentChat,
		newChat
	}
}
