<template>
	<div class="mcp-container">
		<!-- 功能标签页 -->
		<div class="mcp-tabs">
			<el-tabs v-model="activeTab" class="mcp-tabs-container">
				<el-tab-pane label="网页总结" name="summary">
					<SummaryTab @summary-completed="handleSummaryCompleted" />
				</el-tab-pane>
				<el-tab-pane label="样式修改" name="style">
					<StyleTab @style-applied="handleStyleApplied" />
				</el-tab-pane>
				<el-tab-pane label="网络分析" name="network">
					<NetworkTab @analysis-completed="handleNetworkAnalysisCompleted" />
				</el-tab-pane>
				<el-tab-pane label="浏览历史" name="history">
					<HistoryTab @analysis-completed="handleHistoryAnalysisCompleted" />
				</el-tab-pane>
			</el-tabs>
		</div>
	</div>
</template>

<script setup>
	import { ref } from 'vue'
	import { ElMessage } from 'element-plus'
	import SummaryTab from './tabs/SummaryTab.vue'
	import StyleTab from './tabs/StyleTab.vue'
	import NetworkTab from './tabs/NetworkTab.vue'
	import HistoryTab from './tabs/HistoryTab.vue'

	// 定义组件名称
	const __name__ = 'McpComponent'

	const activeTab = ref('summary')

	// 处理总结完成
	const handleSummaryCompleted = (summaryData) => {
		ElMessage.success('页面总结完成')
	}

	// 处理样式应用完成
	const handleStyleApplied = (styleData) => {
		ElMessage.success('页面样式已应用修改')
	}

	// 处理网络分析完成
	const handleNetworkAnalysisCompleted = (analysisData) => {
		ElMessage.success('网络请求分析完成')
	}

	// 处理历史分析完成
	const handleHistoryAnalysisCompleted = (analysisData) => {
		ElMessage.success('浏览历史分析完成')
	}
</script>

<style scoped>
	.mcp-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.mcp-tabs {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.mcp-tabs-container {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	:deep(.el-tabs__content) {
		flex: 1;
		overflow-y: auto;
		padding: 0;
	}

	:deep(.el-tab-pane) {
		height: 100%;
		overflow-y: auto;
		padding: 20px;
	}
</style>
