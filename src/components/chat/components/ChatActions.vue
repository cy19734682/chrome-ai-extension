<script setup>
	import { useChatActions } from '@/hooks'

	const __name__ = 'ChatActions'

	// 状态管理
	const {
		showRenameDialog,
		showDeleteDialog,
		newChatTitle,
		selectedChatId,
		confirmRename,
		cancelRename,
		confirmDelete,
		cancelDelete
	} = useChatActions()
</script>
<template>
	<!-- 重命名对话框 -->
	<el-dialog v-model="showRenameDialog" title="重命名对话" width="240px">
		<el-input
			v-model="newChatTitle"
			placeholder="请输入对话标题"
			maxlength="50"
			show-word-limit
			@keydown.enter="confirmRename"
		/>
		<template #footer>
			<span class="dialog-footer">
				<el-button @click="cancelRename">取消</el-button>
				<el-button type="primary" @click="confirmRename">确定</el-button>
			</span>
		</template>
	</el-dialog>

	<!-- 删除确认对话框 -->
	<el-dialog v-model="showDeleteDialog" title="确认删除" width="240px" :close-on-click-modal="false">
		<span v-if="selectedChatId">确定要删除这个对话吗？此操作不可恢复。</span>
		<span v-else>确定要删除所有对话吗？清除后不可恢复。</span>
		<template #footer>
			<span class="dialog-footer">
				<el-button @click="cancelDelete">取消</el-button>
				<el-button type="danger" @click="confirmDelete">删除</el-button>
			</span>
		</template>
	</el-dialog>
</template>
