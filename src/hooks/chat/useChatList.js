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
	const { showSidebarDrawer, showDeleteDialog, showRenameDialog, chats, currentId, selectedChatId, newChatTitle } =
		storeToRefs(useChatStore())
	// 方法直接从原 store 取，不需要解构
	const { loadList, switchChat } = useChatStore()

	// 清空
	const clearAllChat = () => {
		selectedChatId.value = null
		showDeleteDialog.value = true
	}

	// 重命名对话
	const renameChat = (chatId) => {
		selectedChatId.value = chatId
		const chat = chats.value.find((c) => c.id === chatId)
		newChatTitle.value = chat.title
		showRenameDialog.value = true
	}

	// 删除对话
	const removeChat = (chatId) => {
		selectedChatId.value = chatId
		showDeleteDialog.value = true
	}

	// 初始化
	onMounted(async () => {
		await loadList()
	})

	return {
		showRenameDialog,
		showDeleteDialog,
		showSidebarDrawer,
		newChatTitle,
		chats,
		currentId,
		selectedChatId,
		switchChat,
		clearAllChat,
		renameChat,
		removeChat
	}
}
