<template>
	<div class="ai-browser-assistant">
		<div class="app-content">
			<main class="main-content">
				<ChatSidePanel />
			</main>
		</div>
	</div>
</template>

<script setup>
	import { onMounted } from 'vue'
	import ChatSidePanel from '@/components/chat/ChatSidePanel.vue'

	// 初始化应用
	onMounted(() => {
		// 可以在这里添加应用初始化逻辑
		console.log('AI浏览器助手已启动')
	})
</script>

<style scoped>
	/* 应用容器 */
	.ai-browser-assistant {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
		overflow: hidden;
	}

	/* 应用标题栏 */
	.app-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 20px;
		height: 45px;
		background-color: #fff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		z-index: 100;
	}

	.logo-container {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.app-title {
		font-size: 16px;
		font-weight: 600;
		color: #303133;
	}

	/* 主内容区域 */
	.app-content {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	/* 主内容区 */
	.main-content {
		flex: 1;
		overflow-y: auto;
		background-color: #fff;
	}
</style>
