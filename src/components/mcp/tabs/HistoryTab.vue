<template>
	<div class="history-tab-container">
		<!-- 操作区域 -->
		<div class="action-section">
			<el-card class="action-card">
				<template #header>
					<div class="card-header">
						<span>浏览历史分析</span>
					</div>
				</template>

				<div class="action-content">
					<div class="history-options">
						<h4>历史记录选项</h4>

						<el-form :model="historyForm" label-width="120px">
							<el-form-item label="时间范围">
								<el-date-picker
									v-model="historyForm.timeRange"
									type="daterange"
									range-separator="至"
									start-placeholder="开始日期"
									end-placeholder="结束日期"
									value-format="YYYY-MM-DD"
									:default-time="['00:00:00', '23:59:59']"
								></el-date-picker>
							</el-form-item>

							<el-form-item label="最大记录数">
								<el-input-number
									v-model="historyForm.maxResults"
									:min="10"
									:max="1000"
									:step="10"
									placeholder="最大记录数"
								></el-input-number>
							</el-form-item>

							<el-form-item label="URL过滤">
								<el-input v-model="historyForm.urlFilter" placeholder="输入URL关键词过滤" clearable></el-input>
							</el-form-item>

							<el-form-item label="访问频率过滤">
								<el-select v-model="historyForm.frequencyFilter" placeholder="选择访问频率">
									<el-option label="所有记录" value="all"></el-option>
									<el-option label="频繁访问 (≥10次)" value="frequent"></el-option>
									<el-option label="中等访问 (5-9次)" value="medium"></el-option>
									<el-option label="偶尔访问 (≤4次)" value="rare"></el-option>
								</el-select>
							</el-form-item>

							<el-form-item>
								<el-checkbox-group v-model="historyForm.analysisOptions">
									<el-checkbox label="includeCategories">按网站类别分析</el-checkbox>
									<el-checkbox label="includeTimeDistribution">按时间分布分析</el-checkbox>
									<el-checkbox label="includeSearchTerms">分析搜索词</el-checkbox>
									<el-checkbox label="includeMostVisited">提取常用网站</el-checkbox>
								</el-checkbox-group>
							</el-form-item>
						</el-form>
					</div>

					<div class="analysis-options">
						<h4>分析选项</h4>
						<el-input
							v-model="analysisPrompt"
							type="textarea"
							:rows="2"
							placeholder="输入具体的分析需求，例如：'分析我的浏览习惯'或'找出我最常访问的网站'"
							resize="none"
						></el-input>
					</div>

					<div class="action-buttons">
						<el-button type="primary" @click="loadHistory" :loading="isLoadingHistory" icon="Download">
							加载历史记录
						</el-button>

						<el-button
							type="success"
							@click="analyzeHistory"
							:disabled="historyItems.length === 0 || isAnalyzingHistory"
							icon="PieChart"
						>
							分析历史记录
						</el-button>

						<el-button type="default" @click="clearHistory" :disabled="historyItems.length === 0" icon="Delete">
							清空记录
						</el-button>
					</div>
				</div>
			</el-card>
		</div>

		<!-- 历史记录统计信息 -->
		<div class="stats-section" v-if="historyStats">
			<el-card class="stats-card">
				<template #header>
					<div class="card-header">
						<span>历史记录概览</span>
					</div>
				</template>

				<div class="stats-content">
					<el-row :gutter="20">
						<el-col :span="6">
							<div class="stat-item">
								<div class="stat-label">总访问次数</div>
								<div class="stat-value">{{ historyStats.totalVisits }}</div>
							</div>
						</el-col>
						<el-col :span="6">
							<div class="stat-item">
								<div class="stat-label">不同网站数</div>
								<div class="stat-value">{{ historyStats.uniqueSites }}</div>
							</div>
						</el-col>
						<el-col :span="6">
							<div class="stat-item">
								<div class="stat-label">平均每天访问</div>
								<div class="stat-value">{{ historyStats.dailyAverage.toFixed(1) }}次</div>
							</div>
						</el-col>
						<el-col :span="6">
							<div class="stat-item">
								<div class="stat-label">总浏览时长</div>
								<div class="stat-value">{{ formatDuration(historyStats.totalDuration) }}</div>
							</div>
						</el-col>
					</el-row>
				</div>
			</el-card>
		</div>

		<!-- 历史记录列表区域 -->
		<div class="history-section" v-if="paginatedHistory.length > 0">
			<el-card class="history-card">
				<template #header>
					<div class="card-header">
						<span>历史记录 ({{ filteredHistory.length }}条)</span>
						<div class="header-actions">
							<el-button type="text" icon="Download" @click="exportHistory"></el-button>
							<el-button type="text" icon="RefreshRight" @click="refreshHistory"></el-button>
						</div>
					</div>
				</template>

				<div class="history-list">
					<el-table :data="paginatedHistory" style="width: 100%" height="300" @row-click="showHistoryDetails">
						<el-table-column prop="title" label="标题" show-overflow-tooltip>
							<template #default="scope">
								<div class="history-title">
									<el-image :src="getFaviconUrl(scope.row.url)" class="favicon" :fit="'cover'"></el-image>
									<span>{{ scope.row.title || '无标题' }}</span>
								</div>
							</template>
						</el-table-column>
						<el-table-column prop="url" label="URL" show-overflow-tooltip>
							<template #default="scope">
								<div class="history-url">{{ getDomain(scope.row.url) }}</div>
							</template>
						</el-table-column>
						<el-table-column prop="visitCount" label="访问次数" width="100">
							<template #default="scope">
								<el-tag :type="getVisitCountType(scope.row.visitCount)"> {{ scope.row.visitCount }}次 </el-tag>
							</template>
						</el-table-column>
						<el-table-column prop="lastVisitTime" label="最后访问" width="180">
							<template #default="scope">
								<div class="last-visit-time">{{ formatVisitTime(scope.row.lastVisitTime) }}</div>
							</template>
						</el-table-column>
					</el-table>

					<!-- 分页 -->
					<div class="pagination-container">
						<el-pagination
							background
							layout="prev, pager, next, jumper, total"
							:total="filteredHistory.length"
							:page-size="pageSize"
							v-model:current-page="currentPage"
							@current-change="handlePageChange"
						></el-pagination>
					</div>
				</div>
			</el-card>
		</div>

		<!-- 分析结果区域 -->
		<div class="analysis-section" v-if="historyAnalysis">
			<el-card class="analysis-card">
				<template #header>
					<div class="card-header">
						<span>浏览历史分析结果</span>
						<div class="header-actions">
							<el-button type="text" icon="DocumentCopy" @click="copyAnalysisResult"></el-button>
							<el-button type="text" icon="ChatRound" @click="sendToChat"></el-button>
						</div>
					</div>
				</template>

				<div class="analysis-content">
					<div v-if="isAnalyzingHistory" class="loading-container">
						<el-skeleton :rows="8" animated />
					</div>

					<div v-else-if="historyAnalysis" class="analysis-details">
						<!-- 分析总结 -->
						<div class="analysis-section">
							<h5>分析总结</h5>
							<div class="analysis-summary" v-html="formatAnalysisContent(historyAnalysis.summary)"></div>
						</div>

						<!-- 网站类别分布 -->
						<div class="analysis-section" v-if="historyAnalysis.categories && historyAnalysis.categories.length > 0">
							<h5>网站类别分布</h5>
							<div class="category-chart">
								<el-progress
									v-for="(category, index) in historyAnalysis.categories"
									:key="index"
									:percentage="category.percentage"
									:format="() => `${category.name} (${category.count}次)`"
									:color="getProgressColor(index)"
									style="margin-bottom: 15px"
								></el-progress>
							</div>
						</div>

						<!-- 时间分布 -->
						<div
							class="analysis-section"
							v-if="historyAnalysis.timeDistribution && historyAnalysis.timeDistribution.length > 0"
						>
							<h5>每日访问分布</h5>
							<div class="time-chart">
								<el-progress
									v-for="(item, index) in historyAnalysis.timeDistribution"
									:key="index"
									:percentage="item.percentage"
									:format="() => `${item.day}: ${item.count}次`"
									:color="getProgressColor(index, true)"
									style="margin-bottom: 10px"
								></el-progress>
							</div>
						</div>

						<!-- 最常访问 -->
						<div class="analysis-section" v-if="historyAnalysis.mostVisited && historyAnalysis.mostVisited.length > 0">
							<h5>最常访问网站</h5>
							<div class="most-visited-list">
								<el-table
									:data="historyAnalysis.mostVisited.slice(0, 5)"
									style="width: 100%"
									@row-click="openHistoryItem"
								>
									<el-table-column prop="title" label="网站" width="300">
										<template #default="scope">
											<div class="history-title">
												<el-image :src="getFaviconUrl(scope.row.url)" class="favicon" :fit="'cover'"></el-image>
												<span>{{ scope.row.title || '无标题' }}</span>
											</div>
										</template>
									</el-table-column>
									<el-table-column prop="url" label="URL" show-overflow-tooltip></el-table-column>
									<el-table-column prop="visitCount" label="访问次数" width="100">
										<template #default="scope">
											<el-tag type="success">{{ scope.row.visitCount }}</el-tag>
										</template>
									</el-table-column>
								</el-table>
							</div>
						</div>

						<!-- 搜索词分析 -->
						<div class="analysis-section" v-if="historyAnalysis.searchTerms && historyAnalysis.searchTerms.length > 0">
							<h5>常见搜索词</h5>
							<div class="search-terms">
								<el-tag
									v-for="(term, index) in historyAnalysis.searchTerms.slice(0, 10)"
									:key="index"
									type="info"
									size="large"
									style="margin: 5px"
								>
									{{ term.text }} ({{ term.count }})
								</el-tag>
							</div>
						</div>

						<!-- 浏览习惯建议 -->
						<div
							class="analysis-section"
							v-if="historyAnalysis.recommendations && historyAnalysis.recommendations.length > 0"
						>
							<h5>浏览习惯建议</h5>
							<ul class="analysis-recommendations">
								<li v-for="(recommendation, index) in historyAnalysis.recommendations" :key="index">
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

		<!-- 历史记录详情对话框 -->
		<el-dialog v-model="showHistoryDetail" :title="`历史记录详情: ${selectedHistory?.title || '无标题'}`" width="60%">
			<div v-if="selectedHistory" class="history-detail-content">
				<el-descriptions border :column="1">
					<el-descriptions-item label="标题">{{ selectedHistory.title || '无标题' }}</el-descriptions-item>
					<el-descriptions-item label="URL">{{ selectedHistory.url }}</el-descriptions-item>
					<el-descriptions-item label="访问次数">{{ selectedHistory.visitCount }}次</el-descriptions-item>
					<el-descriptions-item label="第一次访问">{{
						formatVisitTime(selectedHistory.firstVisitTime)
					}}</el-descriptions-item>
					<el-descriptions-item label="最后访问">{{
						formatVisitTime(selectedHistory.lastVisitTime)
					}}</el-descriptions-item>
					<el-descriptions-item label="估计浏览时间">{{
						formatDuration(selectedHistory.duration)
					}}</el-descriptions-item>
				</el-descriptions>

				<div class="detail-actions" style="margin-top: 20px; text-align: right">
					<el-button @click="openHistoryItem(selectedHistory)">打开页面</el-button>
				</div>
			</div>

			<template #footer>
				<span class="dialog-footer">
					<el-button @click="showHistoryDetail = false">关闭</el-button>
				</span>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
	import { ref, computed, onMounted } from 'vue'
	import { useMcpStore } from '@/store'
	import { tabService, historyService, messageService } from '@/services/chrome-api.js'
	import { ElMessage } from 'element-plus'

	// 定义事件
	const emit = defineEmits(['analysis-completed'])

	// 定义组件名称
	const __name__ = 'HistoryTab'

	const mcpStore = useMcpStore()
	const analysisPrompt = ref('')
	const showHistoryDetail = ref(false)
	const selectedHistory = ref(null)
	const isLoadingHistory = ref(false)
	const currentPage = ref(1)
	const pageSize = ref(20)

	const historyItems = computed(() => mcpStore.historyItems)
	const historyAnalysis = computed(() => mcpStore.historyAnalysis)
	const isAnalyzingHistory = computed(() => mcpStore.isAnalyzingHistory)
	const error = computed(() => mcpStore.error)

	// 历史记录表单
	const historyForm = ref({
		timeRange: [],
		maxResults: 500,
		urlFilter: '',
		frequencyFilter: 'all',
		analysisOptions: ['includeCategories', 'includeTimeDistribution', 'includeSearchTerms', 'includeMostVisited']
	})

	// 初始化时间范围为过去7天
	const initTimeRange = () => {
		const end = new Date()
		const start = new Date()
		start.setDate(start.getDate() - 7)
		historyForm.value.timeRange = [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
	}

	// 过滤后的历史记录
	const filteredHistory = computed(() => {
		let filtered = [...historyItems.value]

		// URL过滤
		if (historyForm.value.urlFilter) {
			const keyword = historyForm.value.urlFilter.toLowerCase()
			filtered = filtered.filter(
				(item) => item.url.toLowerCase().includes(keyword) || (item.title && item.title.toLowerCase().includes(keyword))
			)
		}

		// 访问频率过滤
		if (historyForm.value.frequencyFilter !== 'all') {
			filtered = filtered.filter((item) => {
				const count = item.visitCount || 0
				switch (historyForm.value.frequencyFilter) {
					case 'frequent':
						return count >= 10
					case 'medium':
						return count >= 5 && count < 10
					case 'rare':
						return count <= 4
					default:
						return true
				}
			})
		}

		// 按最后访问时间倒序排列
		return filtered.sort((a, b) => b.lastVisitTime - a.lastVisitTime)
	})

	// 分页后的历史记录
	const paginatedHistory = computed(() => {
		const start = (currentPage.value - 1) * pageSize.value
		const end = start + pageSize.value
		return filteredHistory.value.slice(start, end)
	})

	// 历史记录统计信息
	const historyStats = computed(() => {
		if (historyItems.value.length === 0) return null

		const totalVisits = historyItems.value.reduce((sum, item) => sum + (item.visitCount || 0), 0)
		const uniqueSites = historyItems.value.length

		// 计算平均每天访问次数（假设为过去7天）
		const dailyAverage = totalVisits / 7

		// 估计总浏览时长（每次访问约3分钟）
		const totalDuration = totalVisits * 3 * 60 * 1000 // 毫秒

		return {
			totalVisits,
			uniqueSites,
			dailyAverage,
			totalDuration
		}
	})

	// 加载历史记录
	const loadHistory = async () => {
		if (!historyForm.value.timeRange || historyForm.value.timeRange.length !== 2) {
			ElMessage.warning('请选择时间范围')
			return
		}

		isLoadingHistory.value = true
		currentPage.value = 1

		try {
			const [startDate, endDate] = historyForm.value.timeRange
			const startTime = new Date(startDate).getTime()
			const endTime = new Date(endDate + ' 23:59:59').getTime()

			// 调用Chrome历史API获取记录
			const history = await historyService.search({
				text: '',
				startTime,
				endTime,
				maxResults: historyForm.value.maxResults
			})

			// 更新状态
			mcpStore.updateHistoryItems(history)
			ElMessage.success(`成功加载 ${history.length} 条历史记录`)
		} catch (err) {
			console.error('加载历史记录失败:', err)
			ElMessage.error('加载历史记录失败: ' + err.message)
		} finally {
			isLoadingHistory.value = false
		}
	}

	// 分析历史记录
	const analyzeHistory = async () => {
		if (historyItems.value.length === 0 || isAnalyzingHistory.value) return

		try {
			// 调用AI分析服务
			await mcpStore.analyzeHistory(historyItems.value, analysisPrompt.value, historyForm.value.analysisOptions)

			// 触发分析完成事件
			emit('analysis-completed', historyAnalysis.value)
		} catch (err) {
			console.error('分析历史记录失败:', err)
			ElMessage.error('分析失败: ' + err.message)
		}
	}

	// 清空历史记录
	const clearHistory = () => {
		mcpStore.updateHistoryItems([])
		currentPage.value = 1
		ElMessage.success('已清空历史记录')
	}

	// 刷新历史记录
	const refreshHistory = () => {
		loadHistory()
	}

	// 导出历史记录
	const exportHistory = async () => {
		if (filteredHistory.value.length === 0) {
			ElMessage.warning('没有可导出的历史记录')
			return
		}

		try {
			const dataStr = JSON.stringify(filteredHistory.value, null, 2)
			const blob = new Blob([dataStr], { type: 'application/json' })
			const url = URL.createObjectURL(blob)

			// 创建下载链接
			const link = document.createElement('a')
			link.href = url
			link.download = `browser-history-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			URL.revokeObjectURL(url)

			ElMessage.success('已导出历史记录')
		} catch (err) {
			console.error('导出失败:', err)
			ElMessage.error('导出失败: ' + err.message)
		}
	}

	// 显示历史记录详情
	const showHistoryDetails = (row) => {
		selectedHistory.value = row
		showHistoryDetail.value = true
	}

	// 打开历史记录页面
	const openHistoryItem = async (item) => {
		try {
			await tabService.create({ url: item.url })
			ElMessage.success('已在新标签页打开')
		} catch (err) {
			console.error('打开页面失败:', err)
			ElMessage.error('打开页面失败: ' + err.message)
		}
	}

	// 复制分析结果
	const copyAnalysisResult = async () => {
		if (!historyAnalysis.value) return

		try {
			const resultText =
				`分析总结:\n${historyAnalysis.value.summary}\n\n` +
				(historyAnalysis.value.recommendations
					? `浏览习惯建议:\n${historyAnalysis.value.recommendations.join('\n')}`
					: '')

			await navigator.clipboard.writeText(resultText)
			ElMessage.success('分析结果已复制到剪贴板')
		} catch (error) {
			console.error('复制失败:', error)
			ElMessage.error('复制失败，请手动复制')
		}
	}

	// 发送到聊天
	const sendToChat = () => {
		if (!historyAnalysis.value) return

		// 向后台发送消息，切换到聊天标签并发送消息
		messageService.sendMessage('SEND_TO_CHAT', {
			message: historyAnalysis.value.summary,
			title: '浏览历史分析结果'
		})

		ElMessage.success('已发送到聊天窗口')
	}

	// 分页变化处理
	const handlePageChange = (page) => {
		currentPage.value = page
	}

	// 工具方法
	const getFaviconUrl = (url) => {
		try {
			const domain = new URL(url).hostname
			return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`
		} catch {
			return ''
		}
	}

	const getDomain = (url) => {
		try {
			return new URL(url).hostname
		} catch {
			return url
		}
	}

	const getVisitCountType = (count) => {
		if (count >= 10) return 'success'
		if (count >= 5) return 'warning'
		return 'info'
	}

	const formatVisitTime = (timestamp) => {
		return new Date(timestamp).toLocaleString('zh-CN', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		})
	}

	const formatDuration = (ms) => {
		if (!ms) return '0分钟'

		const totalMinutes = Math.floor(ms / (1000 * 60))
		const hours = Math.floor(totalMinutes / 60)
		const minutes = totalMinutes % 60

		if (hours > 0) {
			return `${hours}小时${minutes}分钟`
		}
		return `${minutes}分钟`
	}

	const formatAnalysisContent = (content) => {
		if (!content) return ''
		return content.replace(/\n/g, '<br>')
	}

	const getProgressColor = (index, isTime = false) => {
		const categoryColors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#C0C4CC']
		const timeColors = ['#F7BA1E', '#66B1FF', '#73C0DE', '#94BBFF', '#722ED1', '#EB2F96', '#FA541C']

		const colors = isTime ? timeColors : categoryColors
		return colors[index % colors.length]
	}

	// 初始化
	onMounted(() => {
		initTimeRange()
	})
</script>

<style scoped>
	.history-tab-container {
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

	.history-options,
	.analysis-options {
		margin-top: 10px;
	}

	.history-options h4,
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

	/* 统计信息 */
	.stats-section {
		flex-shrink: 0;
	}

	.stats-card {
		max-width: 100%;
	}

	.stats-content {
		padding: 10px 0;
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

	/* 历史记录列表 */
	.history-section {
		flex-shrink: 0;
	}

	.history-card {
		max-width: 100%;
	}

	.history-list {
		margin-top: 10px;
	}

	.history-title {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.favicon {
		width: 16px;
		height: 16px;
		border-radius: 2px;
	}

	.history-url {
		color: #606266;
		font-size: 13px;
	}

	.last-visit-time {
		font-size: 13px;
		color: #909399;
	}

	.pagination-container {
		margin-top: 15px;
		display: flex;
		justify-content: flex-end;
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

	/* 类别图表 */
	.category-chart,
	.time-chart {
		margin-top: 10px;
	}

	/* 搜索词 */
	.search-terms {
		display: flex;
		flex-wrap: wrap;
	}

	/* 最常访问列表 */
	.most-visited-list {
		margin-top: 10px;
	}

	/* 建议列表 */
	.analysis-recommendations {
		color: #606266;
		line-height: 1.6;
		margin: 0;
		padding-left: 20px;
	}

	.analysis-recommendations li {
		margin-bottom: 8px;
	}

	/* 详情对话框 */
	.history-detail-content {
		max-height: 60vh;
		overflow-y: auto;
	}

	/* 响应式设计 */
	@media (max-width: 768px) {
		.action-buttons {
			flex-direction: column;
		}

		.stat-item {
			margin-bottom: 10px;
		}

		.search-terms {
			justify-content: center;
		}
	}
</style>
