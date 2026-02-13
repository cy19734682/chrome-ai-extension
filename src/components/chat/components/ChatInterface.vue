<script setup>
	import { ArrowDown, ArrowUp, ChatLineSquare, CirclePlus, Loading } from '@element-plus/icons-vue'
	import { formatTime } from '@/utils'
	import { useChatMessage } from '@/hooks'
	import renderMarkdown from '@/utils/md.js'
	import 'highlight.js/styles/github.css'

	const __name__ = 'ChatInterface'

	// 状态管理
	const { openThink, messagesEndRef, messagesContainer, messages, showSidebarDrawer, currentChat, newChat } =
		useChatMessage()
</script>
<template>
	<!-- 对话标题栏 -->
	<div class="chat-header">
		<h2 class="conversation-title">{{ currentChat?.title || '新对话' }}</h2>
		<div class="chat-header-actions">
			<el-button type="text" @click="newChat" title="新建聊天">
				<el-icon size="18"><CirclePlus /></el-icon>
			</el-button>
			<el-button type="text" @click="showSidebarDrawer = true" title="查看聊天记录">
				<el-icon size="18"><ChatLineSquare /></el-icon>
			</el-button>
		</div>
	</div>
	<!-- 对话消息区域 -->
	<div class="messages-container" ref="messagesContainer">
		<!-- 空状态 -->
		<div v-if="!currentChat" class="empty-state">
			<el-empty description="选择或创建一个新对话开始聊天" />
		</div>
		<!-- 消息列表 -->
		<div v-else class="messages-list">
			<div v-for="message in messages" :key="message.id" class="message-wrapper">
				<!-- 用户消息 -->
				<div v-if="message.role === 'user'" class="message user-message">
					<div class="message-content-wrapper">
						<div class="message-elm-content" :class="{ 'big-img': !!message.imgUrl }" v-if="message?.shortcutTitle">
							<img v-if="message.iconUrl" :src="message.iconUrl" class="message-elm-icon" alt="" />
							<el-popover v-if="message.imgUrl" placement="bottom" effect="light" width="100%">
								<template #reference>
									<img :src="message.imgUrl" class="message-elm-img" alt="" />
								</template>
								<template #default>
									<img :src="message.imgUrl" class="message-elm-img-full" alt="" />
								</template>
							</el-popover>
							<el-tooltip :content="message.url || message.title" placement="bottom" effect="light">
								<span class="message-elm-text">{{ message.title }}</span>
							</el-tooltip>
						</div>
						<div class="message-content" v-if="message?.shortcutTitle">{{ message.shortcutTitle }}</div>
						<div class="message-content" v-else>{{ message.content }}</div>
						<div class="message-time">{{ formatTime(message.timestamp) }}</div>
					</div>
					<div class="message-avatar" :class="{ 'message-elm-avatar': !!message?.shortcutTitle }">
						<svg viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
							/>
						</svg>
					</div>
				</div>
				<!-- AI消息 -->
				<div v-else-if="message.role === 'assistant'" class="message assistant-message">
					<div class="message-avatar">AI</div>
					<div class="message-content-wrapper">
						<div class="message-content" v-if="!message.content && !message.think">
							<el-icon class="is-loading" color="409EFF" size="20">
								<Loading />
							</el-icon>
						</div>
						<div class="message-content markdown-content" v-else>
							<div class="think-title" v-if="message.think && !message.content" v-loading>正在思考...</div>
							<div class="think-title" v-else-if="message.think && message.content" @click="openThink = !openThink">
								已深度思考（用时{{ message.time || 0 }}秒）
								<el-icon v-if="openThink"><ArrowUp /></el-icon>
								<el-icon v-else><ArrowDown /></el-icon>
							</div>
							<div class="md-think" v-show="openThink" v-html="renderMarkdown(message.think || '')" />
							<div class="md-content" v-html="renderMarkdown(message.content)" />
						</div>
						<div class="message-time" v-if="message.timestamp">{{ formatTime(message.timestamp) }}</div>
					</div>
				</div>
			</div>
		</div>
		<div ref="messagesEndRef" />
	</div>
</template>
<style scoped>
	/* 对话标题栏 */
	.chat-header {
		padding: 12px 20px;
		border-bottom: 1px solid #ebeef5;
		display: flex;
		justify-content: space-between;
		align-items: center;
		background-color: #fff;
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.conversation-title {
		font-size: 16px;
		font-weight: 500;
		color: #303133;
		margin: 0;
		padding-right: 20px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}

	.chat-header-actions {
		display: flex;
		gap: 10px;
	}
	/* 消息容器 */
	.messages-container {
		flex: 1;
		overflow-y: auto;
		padding: 20px 10px;
		background-color: #f5f7fa;
	}

	/* 空状态 */
	.empty-state {
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	/* 消息列表 */
	.messages-list {
		display: flex;
		flex-direction: column;
		gap: 20px;
		margin: 0 auto;
	}

	.message-wrapper {
		display: flex;
		width: 100%;
	}

	/* 通用消息样式 */
	.message {
		display: flex;
		gap: 12px;
		width: 100%;
	}

	.message-avatar {
		width: 35px;
		height: 35px;
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-shrink: 0;
		background-color: #dbeafe;
	}
	.message-elm-avatar {
		align-self: flex-end;
		margin-bottom: 10px;
	}

	.user-message .message-avatar {
		color: #409eff;
	}

	.assistant-message .message-avatar {
		color: #2563eb;
		font-size: 14px;
		font-weight: bold;
	}

	.message-avatar svg {
		width: 20px;
		height: 20px;
	}

	.message-content-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.user-message .message-content-wrapper {
		padding-left: 40px;
	}

	.assistant-message .message-content-wrapper {
		padding-right: 40px;
	}

	.user-message .message-elm-content {
		align-self: flex-end;
		display: flex;
		align-items: center;
		margin-bottom: 5px;
		padding: 5px 10px;
		background-color: #efefef;
		border-radius: 15px;
		color: #606266;
		max-width: 70%;
	}
	.user-message .message-elm-content.big-img {
		flex-direction: column;
		align-items: flex-start;
		overflow: hidden;
		height: 100px;
	}
	.user-message .message-elm-icon {
		width: 20px;
		height: auto;
		margin-right: 5px;
	}
	.user-message .message-elm-img {
		width: 120px;
		height: calc(100% - 20px);
		margin-bottom: 5px;
		object-fit: cover;
		object-position: center;
	}
	.user-message .message-elm-img-full {
		width: 100%;
	}
	.user-message .message-elm-text {
		max-width: 95%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.message-content {
		font-size: 13px;
		padding: 12px 16px;
		border-radius: 12px;
		line-height: 1.5;
		word-wrap: break-word;
		max-width: 100%;
	}

	.user-message .message-content {
		background-color: #409eff;
		color: #fff;
		border-radius: 12px 12px 0 12px;
		align-self: flex-end;
	}

	.assistant-message .message-content {
		background-color: #fff;
		color: #303133;
		border-radius: 12px 12px 12px 0;
		border: 1px solid #ebeef5;
		align-self: flex-start;
	}

	.error-message .message-content {
		background-color: #fff;
		color: #f56c6c;
		border-radius: 12px 12px 12px 0;
		border: 1px solid #fbc4c4;
	}

	.think-title{
		width: fit-content;
		display: flex;
		cursor: pointer;
		align-items: center;
		font-size: 12px;
		border-radius: 4px;
		background-color: #f3f4f6;
		padding: 2px 4px;
		margin: 2px 0;
	}
	.md-think{
		display: block;
		color: #8b8b8b;
		border-left: 2px solid #e5e7eb;
		padding-left: 12px;
		margin: 12px 0;
	}

	.message-time {
		font-size: 12px;
		color: #909399;
		margin-top: 4px;
		align-self: flex-end;
	}

	.assistant-message .message-time {
		align-self: flex-start;
	}

	.error-message .message-time {
		align-self: flex-start;
	}

	/* 代码块样式 */
	:deep(.code-block) {
		background-color: #f6f8fa;
		padding: 10px;
		border-radius: 6px;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 13px;
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-word;
		overflow-x: auto;
	}
</style>
