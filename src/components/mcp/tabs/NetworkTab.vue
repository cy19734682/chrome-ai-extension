<template>
	<div class="network-tab-container">
		<!-- 操作区域 -->
		<div class="action-section">
			<el-card class="action-card">
				<template #header>
					<div class="card-header">
						<span>网络请求分析</span>
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

					<div class="network-options">
						<h4>监控选项</h4>

						<el-form :model="networkForm" label-width="100px">
							<el-form-item label="请求类型">
								<el-checkbox-group v-model="networkForm.requestTypes">
									<el-checkbox label="xhr">XHR</el-checkbox>
									<el-checkbox label="fetch">Fetch</el-checkbox>
									<el-checkbox label="script">Script</el-checkbox>
									<el-checkbox label="stylesheet">Stylesheet</el-checkbox>
									<el-checkbox label="image">Image</el-checkbox>
									<el-checkbox label="media">Media</el-checkbox>
									<el-checkbox label="font">Font</el-checkbox>
									<el-checkbox label="document">Document</el-checkbox>
								</el-checkbox-group>
							</el-form-item>

							<el-form-item label="过滤条件">
								<el-input v-model="networkForm.filterKeyword" placeholder="输入关键词过滤请求" clearable></el-input>
							</el-form-item>

							<el-form-item label="状态码过滤">
								<el-select v-model="networkForm.statusFilter" placeholder="选择状态码范围">
									<el-option label="所有状态码" value="all"></el-option>
									<el-option label="成功 (200-299)" value="success"></el-option>
									<el-option label="重定向 (300-399)" value="redirect"></el-option>
									<el-option label="错误 (400-599)" value="error"></el-option>
								</el-select>
							</el-form-item>

							<el-form-item label="时间范围">
								<el-select v-model="networkForm.timeFilter" placeholder="请求耗时过滤">
									<el-option label="所有请求" value="all"></el-option>
									<el-option label="快速 (< 300ms)" value="fast"></el-option>
									<el-option label="中等 (300ms - 1s)" value="medium"></el-option>
									<el-option label="慢速 (> 1s)" value="slow"></el-option>
								</el-select>
							</el-form-item>

							<el-form-item>
								<el-checkbox v-model="networkForm.includePayloads"> 包含请求/响应体数据 </el-checkbox>
							</el-form-item>
						</el-form>
					</div>

					<div class="analysis-options">
						<h4>分析选项</h4>
						<el-input
							v-model="analysisPrompt"
							type="textarea"
							:rows="2"
							placeholder="输入具体的分析需求，例如：'分析API调用模式'或'查找潜在性能问题'"
							resize="none"
						></el-input>
					</div>

					<div class="action-buttons">
						<el-button
							type="primary"
							:loading="isMonitoringNetwork"
							@click="toggleNetworkMonitoring"
							:disabled="!currentPageInfo"
							icon="SwitchButton"
						>
							{{ isMonitoringNetwork ? '停止监控' : '开始监控' }}
						</el-button>

						<el-button
							type="success"
							@click="analyzeNetworkRequests"
							:disabled="!currentPageInfo || networkRequests.length === 0 || isAnalyzingNetwork"
							icon="PieChart"
						>
							分析请求
						</el-button>

						<el-button
							type="default"
							@click="clearNetworkRequests"
							:disabled="networkRequests.length === 0 || isMonitoringNetwork"
							icon="Delete"
						>
							清空记录
						</el-button>
					</div>
				</div>
			</el-card>
		</div>

		<!-- 请求列表区域 -->
		<div class="requests-section" v-if="filteredRequests.length > 0">
			<el-card class="requests-card">
				<template #header>
					<div class="card-header">
						<span>捕获的请求 ({{ filteredRequests.length }})</span>
						<div class="header-actions">
							<el-button type="text" icon="Download" @click="exportNetworkRequests"></el-button>
						</div>
					</div>
				</template>

				<div class="requests-list">
					<el-table
						:data="filteredRequests"
						style="width: 100%"
						@row-click="showRequestDetails"
						height="300"
						v-loading="isMonitoringNetwork && !filteredRequests.length"
						element-loading-text="正在捕获请求..."
					>
						<el-table-column prop="method" label="方法" width="80"></el-table-column>
						<el-table-column prop="url" label="URL" show-overflow-tooltip>
							<template #default="scope">
								<div class="request-url">
									{{ getRequestUrlDisplay(scope.row.url) }}
								</div>
							</template>
						</el-table-column>
						<el-table-column prop="status" label="状态码" width="80">
							<template #default="scope">
								<el-tag :type="getStatusTagType(scope.row.status)">
									{{ scope.row.status }}
								</el-tag>
							</template>
						</el-table-column>
						<el-table-column prop="type" label="类型" width="100"></el-table-column>
						<el-table-column prop="time" label="耗时" width="80">
							<template #default="scope">
								<span :class="getDurationClass(scope.row.time)">
									{{ formatTime(scope.row.time) }}
								</span>
							</template>
						</el-table-column>
						<el-table-column prop="size" label="大小" width="100">
							<template #default="scope">
								{{ formatSize(scope.row.size) }}
							</template>
						</el-table-column>
					</el-table>
				</div>
			</el-card>
		</div>

		<!-- 分析结果区域 -->
		<div class="analysis-section" v-if="networkAnalysis">
			<el-card class="analysis-card">
				<template #header>
					<div class="card-header">
						<span>网络分析结果</span>
						<div class="header-actions">
							<el-button type="text" icon="DocumentCopy" @click="copyAnalysisResult"></el-button>
							<el-button type="text" icon="ChatRound" @click="sendToChat"></el-button>
						</div>
					</div>
				</template>

				<div class="analysis-content">
					<div v-if="isAnalyzingNetwork" class="loading-container">
						<el-skeleton :rows="8" animated />
					</div>

					<div v-else-if="networkAnalysis" class="analysis-details">
						<!-- 总体统计 -->
						<div class="analysis-stats">
							<el-row :gutter="20">
								<el-col :span="6">
									<div class="stat-item">
										<div class="stat-label">总请求数</div>
										<div class="stat-value">{{ networkAnalysis.requestCount }}</div>
									</div>
								</el-col>
								<el-col :span="6">
									<div class="stat-item">
										<div class="stat-label">平均耗时</div>
										<div class="stat-value">{{ formatTime(networkAnalysis.averageTime || 0) }}</div>
									</div>
								</el-col>
								<el-col :span="6">
									<div class="stat-item">
										<div class="stat-label">成功率</div>
										<div class="stat-value">{{ networkAnalysis.successRate || 0 }}%</div>
									</div>
								</el-col>
								<el-col :span="6">
									<div class="stat-item">
										<div class="stat-label">总数据量</div>
										<div class="stat-value">{{ formatSize(networkAnalysis.totalSize || 0) }}</div>
									</div>
								</el-col>
							</el-row>
						</div>

						<!-- 分析总结 -->
						<div class="analysis-section">
							<h5>分析总结</h5>
							<div class="analysis-summary" v-html="formatAnalysisContent(networkAnalysis.summary)"></div>
						</div>

						<!-- 主要发现 -->
						<div class="analysis-section" v-if="networkAnalysis.findings && networkAnalysis.findings.length > 0">
							<h5>主要发现</h5>
							<ul class="analysis-findings">
								<li v-for="(finding, index) in networkAnalysis.findings" :key="index">
									{{ finding }}
								</li>
							</ul>
						</div>

						<!-- 性能建议 -->
						<div
							class="analysis-section"
							v-if="networkAnalysis.recommendations && networkAnalysis.recommendations.length > 0"
						>
							<h5>性能建议</h5>
							<ul class="analysis-recommendations">
								<li v-for="(recommendation, index) in networkAnalysis.recommendations" :key="index">
									{{ recommendation }}
								</li>
							</ul>
						</div>
					</div>

					<div v-else-if="error" class="error-message">
						<el-alert :title="error" type="error" show-icon :closable="false" />
					</div>
				</div>
			</el-card>
		</div>

		<!-- 请求详情对话框 -->
		<el-dialog
			v-model="showRequestDetail"
			:title="`请求详情: ${selectedRequest?.url ? getRequestUrlDisplay(selectedRequest.url) : ''}`"
			width="80%"
		>
			<div v-if="selectedRequest" class="request-detail-content">
				<el-tabs>
					<el-tab-pane label="概览">
						<el-descriptions border :column="1">
							<el-descriptions-item label="URL">{{ selectedRequest.url }}</el-descriptions-item>
							<el-descriptions-item label="方法">{{ selectedRequest.method }}</el-descriptions-item>
							<el-descriptions-item label="状态码">{{ selectedRequest.status }}</el-descriptions-item>
							<el-descriptions-item label="类型">{{ selectedRequest.type }}</el-descriptions-item>
							<el-descriptions-item label="耗时">{{ formatTime(selectedRequest.time) }}</el-descriptions-item>
							<el-descriptions-item label="大小">{{ formatSize(selectedRequest.size) }}</el-descriptions-item>
							<el-descriptions-item label="开始时间">{{
								formatDateTime(selectedRequest.timestamp)
							}}</el-descriptions-item>
						</el-descriptions>
					</el-tab-pane>

					<el-tab-pane label="请求头" v-if="selectedRequest.requestHeaders">
						<pre class="headers-content">{{ formatHeaders(selectedRequest.requestHeaders) }}</pre>
					</el-tab-pane>

					<el-tab-pane label="请求体" v-if="selectedRequest.requestBody">
						<pre class="body-content">{{ formatBody(selectedRequest.requestBody) }}</pre>
					</el-tab-pane>

					<el-tab-pane label="响应头" v-if="selectedRequest.responseHeaders">
						<pre class="headers-content">{{ formatHeaders(selectedRequest.responseHeaders) }}</pre>
					</el-tab-pane>

					<el-tab-pane label="响应体" v-if="selectedRequest.responseBody">
						<pre class="body-content">{{ formatBody(selectedRequest.responseBody) }}</pre>
					</el-tab-pane>
				</el-tabs>
			</div>

			<template #footer>
				<span class="dialog-footer">
					<el-button @click="showRequestDetail = false">关闭</el-button>
				</span>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
	import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
	import { useMcpStore } from '@/store/mcp.js'
	import { tabService, messageService } from '@/services/chrome-api.js'
	import { ElMessage } from 'element-plus'

	// 定义事件
	const emit = defineEmits(['analysis-completed'])

	// 定义组件名称
	const __name__ = 'NetworkTab'

	const mcpStore = useMcpStore()
	const currentPageInfo = ref(null)
	const analysisPrompt = ref('')
	const showRequestDetail = ref(false)
	const selectedRequest = ref(null)
	const isMonitoringNetwork = computed(() => mcpStore.isMonitoringNetwork)
	const networkRequests = computed(() => mcpStore.networkRequests)
	const networkAnalysis = computed(() => mcpStore.networkAnalysis)
	const isAnalyzingNetwork = computed(() => mcpStore.isAnalyzingNetwork)
	const error = computed(() => mcpStore.error)

	// 网络监控表单
	const networkForm = ref({
		requestTypes: ['xhr', 'fetch'],
		filterKeyword: '',
		statusFilter: 'all',
		timeFilter: 'all',
		includePayloads: false
	})

	// 过滤后的请求列表
	const filteredRequests = computed(() => {
		let filtered = [...networkRequests.value]

		// 根据类型过滤
		if (networkForm.value.requestTypes.length > 0) {
			filtered = filtered.filter((req) => networkForm.value.requestTypes.includes(req.type))
		}

		// 根据关键词过滤
		if (networkForm.value.filterKeyword) {
			const keyword = networkForm.value.filterKeyword.toLowerCase()
			filtered = filtered.filter(
				(req) => req.url.toLowerCase().includes(keyword) || req.method.toLowerCase().includes(keyword)
			)
		}

		// 根据状态码过滤
		if (networkForm.value.statusFilter !== 'all') {
			filtered = filtered.filter((req) => {
				const status = req.status
				switch (networkForm.value.statusFilter) {
					case 'success':
						return status >= 200 && status < 300
					case 'redirect':
						return status >= 300 && status < 400
					case 'error':
						return status >= 400
					default:
						return true
				}
			})
		}

		// 根据时间过滤
		if (networkForm.value.timeFilter !== 'all') {
			filtered = filtered.filter((req) => {
				const time = req.time
				switch (networkForm.value.timeFilter) {
					case 'fast':
						return time < 300
					case 'medium':
						return time >= 300 && time <= 1000
					case 'slow':
						return time > 1000
					default:
						return true
				}
			})
		}

		// 按时间倒序排列
		return filtered.sort((a, b) => b.timestamp - a.timestamp)
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

	// 切换网络监控状态
	const toggleNetworkMonitoring = async () => {
		if (!currentPageInfo.value) return

		try {
			const currentTab = (await tabService.getCurrentTab())[0]

			if (isMonitoringNetwork.value) {
				// 停止监控
				await messageService.sendMessage('STOP_NETWORK_MONITORING', {
					tabId: currentTab.id
				})
				mcpStore.setNetworkMonitoringState(false)
				ElMessage.success('已停止网络请求监控')
			} else {
				// 开始监控
				await messageService.sendMessage('START_NETWORK_MONITORING', {
					tabId: currentTab.id,
					options: {
						requestTypes: networkForm.value.requestTypes,
						includePayloads: networkForm.value.includePayloads
					}
				})
				mcpStore.setNetworkMonitoringState(true)
				ElMessage.success('已开始网络请求监控')
			}
		} catch (err) {
			console.error('切换网络监控状态失败:', err)
			ElMessage.error('操作失败: ' + err.message)
		}
	}

	// 分析网络请求
	const analyzeNetworkRequests = async () => {
		if (filteredRequests.value.length === 0 || isAnalyzingNetwork.value) return

		try {
			// 调用AI分析服务
			await mcpStore.analyzeNetworkRequests(filteredRequests.value, analysisPrompt.value)

			// 触发分析完成事件
			emit('analysis-completed', networkAnalysis.value)
		} catch (err) {
			console.error('分析网络请求失败:', err)
			ElMessage.error('分析失败: ' + err.message)
		}
	}

	// 清空网络请求
	const clearNetworkRequests = () => {
		mcpStore.updateNetworkRequests([])
		ElMessage.success('已清空网络请求记录')
	}

	// 导出网络请求
	const exportNetworkRequests = async () => {
		if (filteredRequests.value.length === 0) {
			ElMessage.warning('没有可导出的请求')
			return
		}

		try {
			const dataStr = JSON.stringify(filteredRequests.value, null, 2)
			const blob = new Blob([dataStr], { type: 'application/json' })
			const url = URL.createObjectURL(blob)

			// 创建下载链接
			const link = document.createElement('a')
			link.href = url
			link.download = `network-requests-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			URL.revokeObjectURL(url)

			ElMessage.success('已导出网络请求记录')
		} catch (err) {
			console.error('导出失败:', err)
			ElMessage.error('导出失败: ' + err.message)
		}
	}

	// 显示请求详情
	const showRequestDetails = (row) => {
		selectedRequest.value = row
		showRequestDetail.value = true
	}

	// 复制分析结果
	const copyAnalysisResult = async () => {
		if (!networkAnalysis.value) return

		try {
			const resultText =
				`分析总结:\n${networkAnalysis.value.summary}\n\n` +
				(networkAnalysis.value.findings ? `主要发现:\n${networkAnalysis.value.findings.join('\n')}\n\n` : '') +
				(networkAnalysis.value.recommendations ? `性能建议:\n${networkAnalysis.value.recommendations.join('\n')}` : '')

			await navigator.clipboard.writeText(resultText)
			ElMessage.success('分析结果已复制到剪贴板')
		} catch (error) {
			console.error('复制失败:', error)
			ElMessage.error('复制失败，请手动复制')
		}
	}

	// 发送到聊天
	const sendToChat = () => {
		if (!networkAnalysis.value) return

		// 向后台发送消息，切换到聊天标签并发送消息
		messageService.sendMessage('SEND_TO_CHAT', {
			message: networkAnalysis.value.summary,
			title: '网络请求分析结果'
		})

		ElMessage.success('已发送到聊天窗口')
	}

	// 工具方法
	const getRequestUrlDisplay = (url) => {
		// 提取URL的最后一部分作为显示
		const urlObj = new URL(url)
		const path = urlObj.pathname
		const lastSegment = path.split('/').pop()
		return lastSegment || path || url
	}

	const getStatusTagType = (status) => {
		if (status >= 200 && status < 300) return 'success'
		if (status >= 300 && status < 400) return 'info'
		if (status >= 400 && status < 500) return 'warning'
		if (status >= 500) return 'danger'
		return 'default'
	}

	const getDurationClass = (time) => {
		if (time < 300) return 'time-fast'
		if (time <= 1000) return 'time-medium'
		return 'time-slow'
	}

	const formatTime = (time) => {
		if (time < 1000) return `${time}ms`
		return `${(time / 1000).toFixed(2)}s`
	}

	const formatSize = (size) => {
		if (!size) return '0 B'
		if (size < 1024) return `${size} B`
		if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
		return `${(size / (1024 * 1024)).toFixed(2)} MB`
	}

	const formatDateTime = (timestamp) => {
		return new Date(timestamp).toLocaleString('zh-CN')
	}

	const formatAnalysisContent = (content) => {
		if (!content) return ''
		return content.replace(/\n/g, '<br>')
	}

	const formatHeaders = (headers) => {
		if (!headers) return ''
		return Object.entries(headers)
			.map(([key, value]) => `${key}: ${value}`)
			.join('\n')
	}

	const formatBody = (body) => {
		if (!body) return ''
		try {
			// 尝试解析JSON并美化
			const parsed = typeof body === 'string' ? JSON.parse(body) : body
			return JSON.stringify(parsed, null, 2)
		} catch {
			// 如果不是有效的JSON，直接返回
			return String(body)
		}
	}

	// 监听网络请求消息
	const handleNetworkMessage = (message) => {
		if (message.action === 'NETWORK_REQUEST_CAPTURED' && message.request) {
			// 添加到请求列表
			const updatedRequests = [...networkRequests.value, message.request]
			mcpStore.updateNetworkRequests(updatedRequests)
		}
	}

	// 初始化
	onMounted(async () => {
		await getCurrentPageInfo()

		// 监听标签页更新事件
		tabService.onUpdated().then(() => {
			getCurrentPageInfo()
		})

		// 监听标签页切换事件
		tabService.onActivated().then(() => {
			getCurrentPageInfo()
		})

		// 监听网络请求消息
		// messageService.onMessage.addListener(handleNetworkMessage)
	})

	// 清理
	onBeforeUnmount(() => {
		// 移除消息监听器
		// messageService.onMessage.removeListener(handleNetworkMessage)

		// 停止监控
		if (isMonitoringNetwork.value) {
			messageService.sendMessage('STOP_NETWORK_MONITORING')
		}
	})
</script>

<style scoped>
	.network-tab-container {
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

	.network-options,
	.analysis-options {
		margin-top: 10px;
	}

	.network-options h4,
	.analysis-options h4 {
		margin: 0 0 15px 0;
		font-size: 15px;
		color: #303133;
	}

	.action-buttons {
		display: flex;
		gap: 10px;
		margin-top: 10px;
		flex-wrap: wrap;
	}

	/* 请求列表区域 */
	.requests-section {
		flex-shrink: 0;
	}

	.requests-card {
		max-width: 100%;
	}

	.requests-list {
		margin-top: 10px;
	}

	.request-url {
		color: #409eff;
		font-size: 14px;
	}

	/* 时间样式 */
	.time-fast {
		color: #67c23a;
	}

	.time-medium {
		color: #e6a23c;
	}

	.time-slow {
		color: #f56c6c;
	}

	/* 分析结果区域 */
	.analysis-section {
		flex: 1;
		min-height: 300px;
	}

	.analysis-card {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.analysis-content {
		flex: 1;
		min-height: 200px;
	}

	.loading-container {
		padding: 20px 0;
	}

	.analysis-details {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* 统计数据 */
	.analysis-stats {
		padding: 15px 0;
	}

	.stat-item {
		text-align: center;
		padding: 15px;
		background-color: #f5f7fa;
		border-radius: 8px;
	}

	.stat-label {
		font-size: 14px;
		color: #606266;
		margin-bottom: 5px;
	}

	.stat-value {
		font-size: 20px;
		font-weight: 600;
		color: #409eff;
	}

	/* 分析内容 */
	.analysis-section {
		padding: 15px;
		background-color: #fafafa;
		border-radius: 8px;
		border: 1px solid #ebeef5;
	}

	.analysis-section h5 {
		margin: 0 0 10px 0;
		font-size: 14px;
		font-weight: 500;
		color: #303133;
	}

	.analysis-summary {
		color: #606266;
		line-height: 1.6;
		white-space: pre-wrap;
	}

	.analysis-findings,
	.analysis-recommendations {
		color: #606266;
		line-height: 1.6;
		margin: 0;
		padding-left: 20px;
	}

	.analysis-findings li,
	.analysis-recommendations li {
		margin-bottom: 8px;
	}

	/* 请求详情 */
	.request-detail-content {
		max-height: 60vh;
		overflow-y: auto;
	}

	.headers-content,
	.body-content {
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 13px;
		line-height: 1.5;
		background-color: #f6f8fa;
		padding: 15px;
		border-radius: 6px;
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-all;
	}

	/* 响应式设计 */
	@media (max-width: 768px) {
		.action-buttons {
			flex-direction: column;
		}

		.stat-item {
			margin-bottom: 10px;
		}
	}
</style>
