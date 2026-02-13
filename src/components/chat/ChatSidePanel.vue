<script setup>
	import ChatActions from './components/ChatActions.vue'
	import ChatInterface from './components/ChatInterface.vue'
	import ChatListDraw from './components/ChatListDraw.vue'
	import ChatInput from './components/ChatInput.vue'

	const __name__ = 'ChatSidePanel'
</script>
<template>
	<div class="chat-container">
		<!-- 对话内容区域 -->
		<div class="chat-content">
			<!-- 对话消息区域 -->
			<chat-interface />
			<!-- 消息输入区域 -->
			<chat-input />
		</div>
		<!-- 侧边栏弹窗 - 使用Element Plus的Drawer组件 -->
		<chat-list-draw />
		<!-- 重命名和删除对话框 -->
		<chat-actions />
	</div>
</template>
<style scoped>
	/* 聊天容器 */
	.chat-container {
		display: flex;
		height: 100vh;
		overflow: hidden;
	}

	/* 对话内容区域 */
	.chat-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
</style>
