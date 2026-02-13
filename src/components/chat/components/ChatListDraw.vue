<script setup>
	import { Edit, Delete } from '@element-plus/icons-vue'
	import { formatTime } from '@/utils'
	import { useChatList } from '@/hooks'

	const __name__ = 'ChatListDraw'

	// 状态管理
	const { showSidebarDrawer, currentId, chats, clearAllChat, switchChat, renameChat, removeChat } = useChatList()
</script>
<template>
	<!-- 侧边栏弹窗 - 使用Element Plus的Drawer组件 -->
	<el-drawer
		v-model="showSidebarDrawer"
		class="chat-drawer"
		header-class="sidebar-header"
		body-class="sidebar-body"
		title="对话列表"
		direction="rtl"
		size="280px"
	>
		<div class="sidebar-drawer">
			<!-- 对话列表 -->
			<div class="chat-list" v-if="chats?.length > 0">
				<div
					v-for="chat in chats"
					:key="chat.id"
					:class="['chat-item', { active: currentId === chat.id }]"
					@click="switchChat(chat.id)"
				>
					<div class="chat-item-content">
						<div class="chat-title">{{ chat.title }}</div>
						<div class="chat-time">{{ formatTime(chat.createTime) }}</div>
					</div>
					<div class="chat-item-actions">
						<el-icon size="16" color="#409EFF" @click.stop="renameChat(chat.id)"><Edit /></el-icon>
						<el-icon size="16" color="#FF4D4F" @click.stop="removeChat(chat.id)"><Delete /></el-icon>
					</div>
				</div>
			</div>
			<div class="chat-list" v-else>
				<el-empty description="暂无对话记录" />
			</div>
			<!-- 清除所有对话按钮 -->
			<div class="clear-chat-button-container">
				<el-button type="danger" size="small" class="new-chat-button" @click="clearAllChat"> 清除所有对话 </el-button>
			</div>
		</div>
	</el-drawer>
</template>

<style>
	.chat-drawer .sidebar-header {
		margin-bottom: 0;
		padding-bottom: 20px;
		border-bottom: 1px solid #eee;
	}
	.chat-drawer .sidebar-body {
		--el-drawer-padding-primary: 10px;
	}
</style>

<style scoped>
	.new-chat-button {
		width: 100%;
	}

	.clear-chat-button-container {
		padding: 16px;
		border-top: 1px solid #ebeef5;
	}

	.sidebar-drawer {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.chat-list {
		overflow-y: auto;
		flex: 1;
	}

	.chat-item {
		padding: 4px 10px;
		margin-bottom: 6px;
		border-radius: 8px;
		cursor: pointer;
		position: relative;
		transition: all 0.2s;
		background-color: #fff;
		border: 1px solid transparent;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.chat-item:hover {
		background-color: #f5f7fa;
		border-color: #ebeef5;
	}

	.chat-item.active {
		background-color: #ecf5ff;
		border-color: #c6e2ff;
	}

	.chat-item-content {
		flex: 1;
		width: 85%;
	}

	.chat-title {
		font-size: 14px;
		color: #303133;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chat-time {
		font-size: 12px;
		color: #909399;
		margin-top: 4px;
	}

	.chat-item-actions {
		width: 40px;
		display: flex;
		gap: 5px;
		opacity: 0;
		transition: opacity 0.2s;
	}

	.chat-item:hover .chat-item-actions {
		opacity: 1;
	}
</style>
