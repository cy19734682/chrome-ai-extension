<template>
	<div class="style-tab-container">
		<!-- 操作区域 -->
		<div class="action-section">
			<el-card class="action-card">
				<template #header>
					<div class="card-header">
						<span>页面样式修改</span>
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

					<div class="style-requirements">
						<h4>样式修改需求</h4>
						<el-input
							v-model="styleRequirement"
							type="textarea"
							:rows="4"
							placeholder="请描述您想要的样式修改，例如：'将页面背景改为深色模式'或'增大文章字体并调整为舒适的阅读体验'"
							resize="none"
						></el-input>
					</div>

					<div class="style-options">
						<h4>修改选项</h4>

						<el-form :model="styleForm" label-width="80px">
							<el-form-item label="修改范围">
								<el-radio-group v-model="styleForm.scope">
									<el-radio label="entire">整个页面</el-radio>
									<el-radio label="specific">特定元素</el-radio>
									<el-radio label="selected">选中元素</el-radio>
								</el-radio-group>
							</el-form-item>

							<el-form-item label="优先级" v-if="styleForm.scope === 'specific'">
								<el-select v-model="styleForm.priority" placeholder="选择样式优先级">
									<el-option label="普通" value="normal"></el-option>
									<el-option label="高 (使用 !important)" value="high"></el-option>
								</el-select>
							</el-form-item>

							<el-form-item label="元素选择器" v-if="styleForm.scope === 'specific'">
								<el-input v-model="styleForm.selector" placeholder="例如: .article, #main-content"></el-input>
							</el-form-item>

							<el-form-item>
								<el-checkbox v-model="styleForm.includeSuggestions"> 包含样式建议说明 </el-checkbox>
							</el-form-item>

							<el-form-item>
								<el-checkbox v-model="styleForm.applyInstantly"> 生成后立即应用样式 </el-checkbox>
							</el-form-item>
						</el-form>
					</div>

					<div class="action-buttons">
						<el-button
							type="primary"
							:loading="isModifyingStyle"
							@click="generateStyleModification"
							:disabled="!currentPageInfo || !styleRequirement.trim() || isModifyingStyle"
							icon="MagicStick"
						>
							生成样式修改
						</el-button>

						<el-button
							type="default"
							@click="resetCurrentStyle"
							:disabled="!currentModification || isModifyingStyle"
							icon="Refresh"
						>
							恢复原始样式
						</el-button>
					</div>
				</div>
			</el-card>
		</div>

		<!-- 样式预览区域 -->
		<div class="preview-section" v-if="currentModification">
			<el-card class="preview-card">
				<template #header>
					<div class="card-header">
						<span>样式修改预览</span>
						<div class="header-actions">
							<el-button
								type="primary"
								size="small"
								@click="applyStyleModification"
								:disabled="isModifyingStyle"
								icon="Check"
							>
								应用样式
							</el-button>
							<el-button type="default" size="small" @click="copyStyleScript" icon="CopyDocument"> 复制脚本 </el-button>
						</div>
					</div>
				</template>

				<div class="preview-content">
					<div v-if="isModifyingStyle" class="loading-container">
						<el-skeleton :rows="10" animated />
					</div>

					<div v-else-if="currentModification" class="style-modification-details">
						<!-- 需求描述 -->
						<div class="modification-section">
							<h5>修改需求</h5>
							<div class="requirement-text">{{ currentModification.requirement }}</div>
						</div>

						<!-- 解释说明 -->
						<div class="modification-section" v-if="currentModification.explanation">
							<h5>修改说明</h5>
							<div class="explanation-text">{{ currentModification.explanation }}</div>
						</div>

						<!-- 生成的CSS -->
						<div class="modification-section">
							<h5>生成的样式代码</h5>
							<el-scrollbar wrap-class="code-scrollbar">
								<pre class="css-code">{{ formatStyleScript(currentModification.script) }}</pre>
							</el-scrollbar>
						</div>
					</div>

					<div v-else-if="error" class="error-message">
						<el-alert :title="error" type="error" show-icon :closable="false" />
					</div>
				</div>
			</el-card>
		</div>

		<!-- 历史记录区域 -->
		<div class="history-section" v-if="recentModifications.length > 0">
			<el-card class="history-card">
				<template #header>
					<div class="card-header">
						<span>历史修改记录</span>
					</div>
				</template>

				<div class="history-list">
					<div
						v-for="modification in recentModifications"
						:key="modification.id"
						class="history-item"
						@click="loadModification(modification)"
					>
						<div class="history-item-header">
							<div class="history-title">{{ truncateText(modification.requirement, 80) }}</div>
							<div class="history-time">{{ formatTime(modification.timestamp) }}</div>
						</div>
						<div class="history-preview">{{ truncateText(modification.explanation || '无说明', 100) }}</div>
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

	// 定义事件
	const emit = defineEmits(['style-applied'])

	// 定义组件名称
	const __name__ = 'StyleTab'

	const mcpStore = useMcpStore()
	const currentPageInfo = ref(null)
	const styleRequirement = ref('')
	const isModifyingStyle = computed(() => mcpStore.isModifyingStyle)
	const currentModification = computed(() => mcpStore.currentModification)
	const recentModifications = computed(() => mcpStore.recentModifications)
	const error = computed(() => mcpStore.error)

	// 样式修改表单
	const styleForm = ref({
		scope: 'entire',
		priority: 'normal',
		selector: '',
		includeSuggestions: true,
		applyInstantly: true
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

	// 生成样式修改
	const generateStyleModification = async () => {
		if (!currentPageInfo.value || !styleRequirement.value.trim() || isModifyingStyle.value) return

		try {
			// 准备上下文信息
			const context = {
				pageUrl: currentPageInfo.value.url,
				pageTitle: currentPageInfo.value.title,
				scope: styleForm.value.scope,
				priority: styleForm.value.priority,
				selector: styleForm.value.selector,
				includeSuggestions: styleForm.value.includeSuggestions
			}

			// 如果是选中元素模式，获取选中元素信息
			if (styleForm.value.scope === 'selected') {
				const selectedElementInfo = await messageService.sendMessage('GET_SELECTED_ELEMENT', {
					tabId: (await tabService.getCurrentTab())[0].id
				})

				if (selectedElementInfo && selectedElementInfo.selector) {
					context.selectedElement = selectedElementInfo
				} else {
					ElMessage.warning('请先在页面中选择要修改的元素')
					return
				}
			}

			// 调用AI生成样式修改脚本
			const script = await mcpStore.modifyPageStyle(styleRequirement.value.trim(), context)

			// 如果设置了立即应用，则应用样式
			if (styleForm.value.applyInstantly) {
				await applyStyleModification()
			}
		} catch (err) {
			console.error('生成样式修改失败:', err)
			ElMessage.error('生成样式修改失败: ' + err.message)
		}
	}

	// 应用样式修改
	const applyStyleModification = async () => {
		if (!currentModification.value) return

		try {
			// 向内容脚本发送消息，应用样式修改
			const result = await messageService.sendMessage('APPLY_STYLE_MODIFICATION', {
				tabId: (await tabService.getCurrentTab())[0].id,
				script: currentModification.value.script
			})

			if (result && result.success) {
				ElMessage.success('样式修改已成功应用')
				// 触发样式应用完成事件
				emit('style-applied', currentModification.value)
			} else {
				ElMessage.error('样式应用失败: ' + ((result && result.error) || '未知错误'))
			}
		} catch (err) {
			console.error('应用样式修改失败:', err)
			ElMessage.error('应用样式修改失败: ' + err.message)
		}
	}

	// 重置当前样式
	const resetCurrentStyle = async () => {
		try {
			// 向内容脚本发送消息，重置样式
			const result = await messageService.sendMessage('RESET_STYLE_MODIFICATIONS', {
				tabId: (await tabService.getCurrentTab())[0].id
			})

			if (result && result.success) {
				ElMessage.success('已恢复页面原始样式')
			} else {
				ElMessage.error('重置样式失败: ' + ((result && result.error) || '未知错误'))
			}
		} catch (err) {
			console.error('重置样式失败:', err)
			ElMessage.error('重置样式失败: ' + err.message)
		}
	}

	// 格式化样式脚本
	const formatStyleScript = (script) => {
		if (!script) return ''

		// 尝试美化CSS代码
		let formatted = script.trim()

		// 简单格式化，添加缩进等
		formatted = formatted.replace(/\{/g, ' {\n  ')
		formatted = formatted.replace(/\}/g, '\n}\n')
		formatted = formatted.replace(/;/g, ';\n  ')
		formatted = formatted.replace(/,\s*/g, ',\n  ')
		formatted = formatted.replace(/\s*{/g, ' {')
		formatted = formatted.replace(/\s*:\s*/g, ': ')

		// 移除多余的空行
		formatted = formatted.replace(/\n{3,}/g, '\n\n')

		return formatted.trim()
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

	// 复制样式脚本
	const copyStyleScript = async () => {
		if (!currentModification.value) return

		try {
			await navigator.clipboard.writeText(currentModification.value.script)
			ElMessage.success('样式代码已复制到剪贴板')
		} catch (error) {
			console.error('复制失败:', error)
			ElMessage.error('复制失败，请手动复制')
		}
	}

	// 加载历史修改
	const loadModification = async (modification) => {
		try {
			// 设置为当前修改
			mcpStore.currentModification = modification
			// 恢复表单状态
			styleRequirement.value = modification.requirement
			ElMessage.success('已加载历史样式修改')
		} catch (error) {
			console.error('加载历史修改失败:', error)
			ElMessage.error('加载失败')
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
	})
</script>

<style scoped>
	.style-tab-container {
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

	.style-requirements {
		margin-top: 10px;
	}

	.style-requirements h4,
	.style-options h4 {
		margin: 0 0 15px 0;
		font-size: 15px;
		color: #303133;
	}

	.action-buttons {
		display: flex;
		gap: 10px;
		margin-top: 10px;
	}

	/* 预览区域 */
	.preview-section {
		flex: 1;
		min-height: 400px;
	}

	.preview-card {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.preview-content {
		flex: 1;
		min-height: 300px;
	}

	.loading-container {
		padding: 20px 0;
	}

	.style-modification-details {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.modification-section {
		padding: 15px;
		background-color: #fafafa;
		border-radius: 8px;
		border: 1px solid #ebeef5;
	}

	.modification-section h5 {
		margin: 0 0 10px 0;
		font-size: 14px;
		font-weight: 500;
		color: #303133;
	}

	.requirement-text,
	.explanation-text {
		color: #606266;
		line-height: 1.6;
		white-space: pre-wrap;
	}

	.css-code {
		margin: 0;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 13px;
		line-height: 1.5;
		background-color: #f6f8fa;
		padding: 15px;
		border-radius: 6px;
		overflow-x: auto;
		color: #333;
	}

	.code-scrollbar {
		max-height: 300px;
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

	/* 响应式设计 */
	@media (max-width: 768px) {
		.action-buttons {
			flex-direction: column;
		}

		.history-item-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 5px;
		}
	}
</style>
