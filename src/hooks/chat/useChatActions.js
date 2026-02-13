import { useChatStore } from '@/store'
import { ElMessage } from 'element-plus'
import { storeToRefs } from 'pinia'

/**
 * 会话相关hooks
 */
export default function () {
	// 响应式数据用 storeToRefs 解构
	const { chats, currentId, showRenameDialog, showDeleteDialog, selectedChatId, newChatTitle } =
		storeToRefs(useChatStore())
	// 方法直接从原 store 取，不需要解构
	const { updateChatTitle, deleteChat, clearChatAll } = useChatStore()

	// 确认重命名
	const confirmRename = async () => {
		const title = newChatTitle.value.trim()
		if (!title) {
			ElMessage.warning('标题不能为空')
			return
		}
		try {
			await updateChatTitle(selectedChatId.value, title)
			showRenameDialog.value = false
			ElMessage.success('对话已重命名')
		} catch (error) {
			ElMessage.error('重命名失败')
			console.error('Rename conversation error:', error)
		}
	}

	// 取消重命名
	const cancelRename = () => {
		showRenameDialog.value = false
		newChatTitle.value = ''
	}

	// 确认删除
	const confirmDelete = async () => {
		try {
			if (selectedChatId.value) {
				ElMessage.success('对话已删除')
				await deleteChat(selectedChatId.value)
			} else {
				ElMessage.success('对话已清空')
				await clearChatAll()
			}
			showDeleteDialog.value = false
		} catch (error) {
			ElMessage.error('删除对话失败')
			console.error('Delete conversation error:', error)
		}
	}

	// 取消删除
	const cancelDelete = () => {
		showDeleteDialog.value = false
	}

	return {
		showRenameDialog,
		showDeleteDialog,
		newChatTitle,
		chats,
		currentId,
		selectedChatId,
		confirmRename,
		cancelRename,
		confirmDelete,
		cancelDelete
	}
}
