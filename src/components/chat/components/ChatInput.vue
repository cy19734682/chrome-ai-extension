<script setup>
	import { useChatInput } from '@/hooks'
	import { Close, Operation, Right } from '@element-plus/icons-vue'

	const __name__ = 'ChatMessageInput'

	// 状态管理
	const {
		popoverVisible,
		inputMessage,
		inputRef,
		selectedElmData,
		isLoading,
		moreActions,
		handleCloseElm,
		activeList,
		handleShortcut,
		handleEnter,
		sendMessage
	} = useChatInput()
</script>
<template>
	<!-- 消息输入区域 -->
	<div class="input-container">
		<div class="selected-elm" v-if="selectedElmData.title">
			<div class="selected-elm-box" :class="{ 'big-img': !!selectedElmData.imgUrl }">
				<el-popover v-if="selectedElmData.imgUrl" placement="top" effect="light" width="100%">
					<template #reference>
						<img :src="selectedElmData.imgUrl" class="selected-elm-img" alt="" />
					</template>
					<template #default>
						<img :src="selectedElmData.imgUrl" class="selected-elm-img-full" alt="" />
					</template>
				</el-popover>
				<img v-if="selectedElmData.iconUrl" :src="selectedElmData.iconUrl" class="selected-elm-icon" alt="" />
				<el-tooltip :content="selectedElmData.url || selectedElmData.title" placement="top" effect="light">
					<span class="selected-elm-text">{{ selectedElmData.title }}</span>
				</el-tooltip>
				<el-button class="selected-close" circle text @click="handleCloseElm">
					<el-icon size="14"><Close /></el-icon>
				</el-button>
			</div>
		</div>
		<div class="selected-content" v-if="selectedElmData.title && activeList?.length > 0">
			<div class="selected-item" v-for="(item, i) in activeList" :key="'activeItem' + i" @click="handleShortcut(item)">
				{{ item.title }}
				<el-icon><Right /></el-icon>
			</div>
		</div>
		<el-input
			ref="inputRef"
			v-model="inputMessage"
			type="textarea"
			:autosize="{ minRows: 4, maxRows: 7 }"
			placeholder="按 Enter 发送, 按 Shift + Enter 换行"
			:disabled="isLoading"
			class="message-input"
			@keydown.enter="handleEnter"
		/>
		<div class="input-actions">
			<div class="input-action">
				<el-popover effect="light" trigger="click" v-model:visible="popoverVisible">
					<template #reference>
						<el-button circle text>
							<el-icon type="primary" size="18"><Operation /></el-icon>
						</el-button>
					</template>
					<template #default>
						<div class="tool-box">
							<div class="tool-item" v-for="(item, i) in moreActions" :key="'action' + i" @click="item.action">
								<el-icon size="14"><component :is="item.icon" /></el-icon>
								{{ item.name }}
							</div>
						</div>
					</template>
				</el-popover>
			</div>
			<el-button type="primary" @click="sendMessage" :disabled="!inputMessage.trim() || isLoading" class="send-button">
				发送
			</el-button>
		</div>
	</div>
</template>
<style scoped>
	/* 输入容器 */
	.input-container {
		padding: 10px 20px;
		border-top: 1px solid #ebeef5;
		background-color: #fff;
		position: sticky;
		bottom: 0;
		z-index: 10;
	}

	.selected-elm {
		padding-bottom: 12px;
	}
	.selected-elm-box {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		background-color: #efefef;
		border-radius: 15px;
		max-width: 350px;
		padding: 5px;
	}
	.big-img{

	}
	.selected-elm-icon {
		width: 20px;
		height: auto;
	}
	.selected-elm-img {
		width: 50px;
		height: auto;
	}
	.selected-elm-img-full {
		width: 100%;
	}
	.selected-elm-text {
		flex: 1;
		font-size: 14px;
		line-height: 16px;
		color: #333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding-left: 5px;
	}
	.selected-close {
		padding: 0;
		width: 20px;
		height: 20px;
		margin-left: 5px;
	}

	.selected-content {
		padding-bottom: 12px;
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
	}
	.selected-content .selected-item {
		display: flex;
		align-items: center;
		gap: 4px;
		line-height: 16px;
		color: #606266;
		background-color: #fafafa;
		border: 1px solid #ebeef5;
		padding: 2px 4px;
		border-radius: 4px;
		cursor: pointer;
	}
	.selected-content .selected-item:hover {
		color: #666666;
		border-color: #cccccc;
	}

	.message-input {
		margin-bottom: 10px;
	}

	.message-input :deep(.el-textarea__inner) {
		border-radius: 8px;
		font-size: 14px;
		resize: none;
	}

	.input-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.send-button {
		min-width: 80px;
	}

	.tool-box {
		color: #606266;
		font-size: 13px;
	}
	.tool-item {
		display: flex;
		align-items: center;
		min-width: 100px;
		cursor: pointer;
		padding: 8px 10px;
		border-radius: 6px;
	}
	.tool-item:deep(.el-icon) {
		margin-right: 3px;
	}
	.tool-item:hover {
		background-color: rgba(0, 0, 0, 0.03);
	}
</style>
