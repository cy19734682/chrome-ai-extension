<template>
	<div class="summary-tab-container">
		<!-- 操作区域 -->
		<div class="action-section">
			<el-card class="action-card">
				<template #header>
					<div class="card-header">
						<span>网页内容总结</span>
					</div>
				</template>

				<div class="action-content">
					<div class="current-page-info" v-if="currentPageInfo">
						<h3>{{ currentPageInfo.title }}</h3>
						<p class="page-url">{{ currentPageInfo.url }}</p>
					</div>

					<div v-else class="no-page-info">
						<el-empty description="无法获取当前页面信息，请确保有活动标签页" />
					</div>

					<div class="summary-options">
						<h4>总结选项</h4>

						<el-form :model="summaryForm" label-width="80px">
							<el-form-item label="总结模式">
								<el-radio-group v-model="summaryForm.mode">
									<el-radio label="main_points">要点总结</el-radio>
									<el-radio label="detailed">详细总结</el-radio>
									<el-radio label="executive">简明摘要</el-radio>
								</el-radio-group>
							</el-form-item>

							<el-form-item label="总结长度">
								<el-slider
									v-model="summaryForm.maxLength"
									:min="200"
									:max="2000"
									:step="100"
									:marks="{
										200: '200',
										500: '500',
										1000: '1000',
										1500: '1500',
										2000: '2000'
									}"
								/>
								<div class="length-value">{{ summaryForm.maxLength }} 字</div>
							</el-form-item>

							<el-form-item label="关注重点">
								<el-checkbox-group v-model="summaryForm.focusPoints">
									<el-checkbox label="核心内容">核心内容</el-checkbox>
									<el-checkbox label="关键数据">关键数据</el-checkbox>
									<el-checkbox label="主要观点">主要观点</el-checkbox>
									<el-checkbox label="结论建议">结论建议</el-checkbox>
								</el-checkbox-group>
							</el-form-item>

							<el-form-item label="格式">
								<el-select v-model="summaryForm.format" placeholder="选择输出格式">
									<el-option label="文本" value="text"></el-option>
									<el-option label="要点列表" value="list"></el-option>
								</el-select>
							</el-form-item>
						</el-form>
					</div>

					<div class="action-buttons">
						<el-button
							type="primary"
							:loading="isSummarizing"
							@click="summarizeCurrentPage"
							:disabled="!currentPageInfo || isSummarizing"
							icon="DocumentCopy"
						>
							总结当前页面
						</el-button>

						<el-button type="default" @click="summarizeSelectedText" :disabled="isSummarizing" icon="TextSelect">
							总结选中内容
						</el-button>
					</div>
				</div>
			</el-card>
		</div>

		<!-- 结果展示区域 -->
		<div class="result-section" v-if="currentSummary">
			<el-card class="result-card">
				<template #header>
					<div class="card-header">
						<span>总结结果</span>
						<div class="header-actions">
							<el-button
								type="text"
								icon="RefreshRight"
								@click="summarizeCurrentPage"
								:disabled="isSummarizing"
							></el-button>
							<el-button type="text" icon="DocumentCopy" @click="copySummary"></el-button>
							<el-button type="text" icon="ChatRound" @click="sendToChat"></el-button>
						</div>
					</div>
				</template>

				<div class="summary-result">
					<div v-if="isSummarizing" class="loading-container">
						<el-skeleton :rows="8" animated />
					</div>

					<div v-else-if="currentSummary" class="summary-content">
						<div class="result-meta">
							<span class="page-title">{{ currentSummary.title }}</span>
							<span class="summary-time">{{ formatTime(currentSummary.timestamp) }}</span>
						</div>
						<div class="summary-text" v-html="formatSummaryContent(currentSummary.summary)"></div>
					</div>

					<div v-else-if="error" class="error-message">
						<el-alert :title="error" type="error" show-icon :closable="false" />
					</div>
				</div>
			</el-card>
		</div>

		<!-- 历史记录区域 -->
		<div class="history-section" v-if="recentSummaries.length > 0">
			<el-card class="history-card">
				<template #header>
					<div class="card-header">
						<span>历史总结记录</span>
					</div>
				</template>

				<div class="history-list">
					<div v-for="summary in recentSummaries" :key="summary.id" class="history-item" @click="loadSummary(summary)">
						<div class="history-item-header">
							<div class="history-title">{{ summary.title }}</div>
							<div class="history-time">{{ formatTime(summary.timestamp) }}</div>
						</div>
						<div class="history-preview">{{ truncateText(summary.summary, 100) }}</div>
					</div>
				</div>
			</el-card>
		</div>
	</div>
</template>

<script setup>
	import { ref, computed, onMounted } from 'vue'
	import { useMcpStore } from '@/store/mcp.js'
	import { tabService, messageService } from '@/services/chrome-api.js'
	import { ElMessage } from 'element-plus'

	// 定义组件名称
	const __name__ = 'SummaryTab'

	// 定义事件
	const emit = defineEmits(['summary-completed'])

	const mcpStore = useMcpStore()
	const currentPageInfo = ref(null)
	const isSummarizing = computed(() => mcpStore.isSummarizing)
	const currentSummary = computed(() => mcpStore.currentSummary)
	const recentSummaries = computed(() => mcpStore.recentSummaries)
	const error = computed(() => mcpStore.error)

	// 总结表单
	const summaryForm = ref({
		mode: 'main_points',
		maxLength: 500,
		focusPoints: ['核心内容', '主要观点'],
		format: 'text'
	})

	// 获取当前页面信息
	const getCurrentPageInfo = async () => {
		try {
			const tabs = await tabService.getCurrentTab()
			if (tabs && tabs[0]) {
				currentPageInfo.value = {
					title: tabs[0].title,
					url: tabs[0].url
				}
				return true
			}
			return false
		} catch (error) {
			console.error('获取当前页面信息失败:', error)
			return false
		}
	}

	// 总结当前页面
	const summarizeCurrentPage = async () => {
		if (!currentPageInfo.value || isSummarizing.value) return

		try {
			// 向内容脚本发送消息获取页面内容
			const content = await messageService.sendMessage('GET_PAGE_CONTENT', {
				tabId: (await tabService.getCurrentTab())[0].id
			})

			if (!content || !content.html) {
				throw new Error('无法获取页面内容')
			}

			// 调用总结功能
			await mcpStore.summarizePage(content.html, currentPageInfo.value.title, {
				url: currentPageInfo.value.url,
				maxLength: summaryForm.value.maxLength,
				focus: summaryForm.value.mode,
				format: summaryForm.value.format,
				focusPoints: summaryForm.value.focusPoints
			})

			// 触发完成事件
			emit('summary-completed', currentSummary.value)
		} catch (err) {
			console.error('总结页面失败:', err)
			ElMessage.error('总结页面失败: ' + err.message)
		}
	}

	// 总结选中内容
	const summarizeSelectedText = async () => {
		if (isSummarizing.value) return

		try {
			// 向内容脚本发送消息获取选中内容
			const selection = await messageService.sendMessage('GET_SELECTED_TEXT', {
				tabId: (await tabService.getCurrentTab())[0].id
			})

			if (!selection || !selection.text || selection.text.trim() === '') {
				ElMessage.warning('请先在页面中选择要总结的文本')
				return
			}

			// 调用总结功能
			await mcpStore.summarizePage(selection.text, '选中内容', {
				maxLength: summaryForm.value.maxLength,
				focus: summaryForm.value.mode,
				format: summaryForm.value.format
			})

			// 触发完成事件
			emit('summary-completed', currentSummary.value)
		} catch (err) {
			console.error('总结选中内容失败:', err)
			ElMessage.error('总结选中内容失败: ' + err.message)
		}
	}

	// 格式化总结内容
	const formatSummaryContent = (content) => {
		if (!content) return ''

		// 将纯文本换行转换为<br>
		let formattedContent = content.replace(/\n/g, '<br>')

		// 格式化列表项
		if (summaryForm.value.format === 'list') {
			// 将数字列表转换为有序列表
			formattedContent = formattedContent.replace(/^(\d+)\.\s+/gm, '<li>$2</li>')
			// 将项目符号列表转换为无序列表
			formattedContent = formattedContent.replace(/^[-*]\s+/gm, '<li>$2</li>')

			// 包裹在列表标签中
			if (formattedContent.includes('<li>')) {
				formattedContent = '<ul>' + formattedContent + '</ul>'
			}
		}

		return formattedContent
	}

	// 格式化时间
	const formatTime = (timestamp) => {
		if (!timestamp) return ''
		const date = new Date(timestamp)
		return date.toLocaleString('zh-CN')
	}

	// 截断文本
	const truncateText = (text, maxLength) => {
		if (!text || text.length <= maxLength) return text
		return text.substring(0, maxLength) + '...'
	}

	// 复制总结结果
	const copySummary = async () => {
		if (!currentSummary.value) return

		try {
			await navigator.clipboard.writeText(currentSummary.value.summary)
			ElMessage.success('总结结果已复制到剪贴板')
		} catch (error) {
			console.error('复制失败:', error)
			ElMessage.error('复制失败，请手动复制')
		}
	}

	// 发送到聊天
	const sendToChat = () => {
		if (!currentSummary.value) return

		// 向后台发送消息，切换到聊天标签并发送消息
		messageService.sendMessage('SEND_TO_CHAT', {
			message: currentSummary.value.summary,
			title: `总结内容: ${currentSummary.value.tit`le}`
		})

		ElMessage.success('已发送到聊天窗口')
	}

	// 加载历史总结
	const loadSummary = async (summary) => {
		try {
			// 设置为当前总结
			// mcpStore.currentSummary = summary
			ElMessage.success('已加载历史总结')
		} catch (error) {
			console.error('加载历史总结失败:', error)
			ElMessage.error('加载失败')
		}
	}

	// 初始化
	onMounted(async () => {
		await getCurrentPageInfo()

		// 监听标签页更新事件
		tabService.onUpdated().then(() => {
			console.log(123)
			getCurrentPageInfo()
		})

		// 监听标签页切换事件
		tabService.onActivated().then(() => {
			getCurrentPageInfo()
		})
	})
</script>

<style scoped>
	.summary-tab-container {
		display: flex;
		flex-direction: column;
		gap: 20px;
		height: 100%;
		overflow-y: auto;
	}

	/* 操作区域 */
	.action-section {
		flex-shrink: 0;
	}

	.action-card {
		max-width: 100%;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-weight: 600;
	}

	.header-actions {
		display: flex;
		gap: 5px;
	}

	.action-content {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.current-page-info {
		padding: 15px;
		background-color: #f5f7fa;
		border-radius: 8px;
		border: 1px solid #ebeef5;
	}

	.current-page-info h3 {
		margin: 0 0 8px 0;
		font-size: 16px;
		color: #303133;
	}

	.page-url {
		margin: 0;
		font-size: 13px;
		color: #606266;
		word-break: break-all;
	}

	.summary-options {
		margin-top: 10px;
	}

	.summary-options h4 {
		margin: 0 0 15px 0;
		font-size: 15px;
		color: #303133;
	}

	.action-buttons {
		display: flex;
		gap: 10px;
		margin-top: 10px;
	}

	/* 结果展示区域 */
	.result-section {
		flex: 1;
		min-height: 300px;
	}

	.result-card {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.summary-result {
		flex: 1;
		min-height: 200px;
	}

	.loading-container {
		padding: 20px 0;
	}

	.summary-content {
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	.result-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 10px;
		border-bottom: 1px solid #ebeef5;
	}

	.page-title {
		font-weight: 500;
		color: #303133;
	}

	.summary-time {
		font-size: 13px;
		color: #909399;
	}

	.summary-text {
		line-height: 1.7;
		color: #606266;
		white-space: pre-wrap;
	}

	.summary-text :deep(ul) {
		padding-left: 20px;
		margin: 10px 0;
	}

	.summary-text :deep(li) {
		margin-bottom: 8px;
	}

	/* 历史记录区域 */
	.history-section {
		flex-shrink: 0;
	}

	.history-card {
		max-width: 100%;
	}

	.history-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.history-item {
		padding: 15px;
		background-color: #f5f7fa;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.3s;
		border: 1px solid transparent;
	}

	.history-item:hover {
		background-color: #ecf5ff;
		border-color: #c6e2ff;
	}

	.history-item-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 8px;
	}

	.history-title {
		font-weight: 500;
		color: #303133;
		flex: 1;
		margin-right: 10px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.history-time {
		font-size: 13px;
		color: #909399;
		flex-shrink: 0;
	}

	.history-preview {
		font-size: 14px;
		color: #606266;
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* 滑块样式 */
	.length-value {
		text-align: center;
		margin-top: 5px;
		color: #606266;
		font-size: 14px;
	}

	/* 响应式设计 */
	@media (max-width: 768px) {
		.action-buttons {
			flex-direction: column;
		}

		.result-meta {
			flex-direction: column;
			align-items: flex-start;
			gap: 5px;
		}

		.history-item-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 5px;
		}
	}
</style>
