// MCP功能状态管理
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api.js'

export const useMcpStore = defineStore(
	'mcpStore',
	() => {
		// 网页总结相关状态
		const summaries = ref([])
		const currentSummary = ref(null)
		const isSummarizing = ref(false)

		// 样式修改相关状态
		const styleModifications = ref([])
		const currentModification = ref(null)
		const isModifyingStyle = ref(false)

		// 网络请求相关状态
		const networkRequests = ref([])
		const isMonitoringNetwork = ref(false)
		const networkAnalysis = ref(null)
		const isAnalyzingNetwork = ref(false)

		// 浏览历史相关状态
		const historyItems = ref([])
		const historyAnalysis = ref(null)
		const isAnalyzingHistory = ref(false)

		// 通用状态
		const error = ref(null)
		// MCP操作历史
		const operationHistory = ref([])

		// 计算属性（getters）
		const recentSummaries = computed(() => {
			return [...summaries.value].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)
		})

		const recentModifications = computed(() => {
			return [...styleModifications.value].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)
		})

		const recentOperations = computed(() => {
			return [...operationHistory.value].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20)
		})

		// 操作方法（actions）

		/**
		 * 总结网页内容
		 * @param {String} content - 页面内容
		 * @param {String} title - 页面标题
		 * @param {Object} options - 总结选项
		 * @returns {Promise} - 总结结果
		 */
		async function summarizePage(content, title, options = {}) {
			try {
				isSummarizing.value = true
				error.value = null

				// 调用AI总结服务
				const response = await api.aiApi.summarize(content, {
					title,
					maxLength: options.maxLength || 500,
					focus: options.focus || 'main_points',
					format: options.format || 'text'
				})

				// 创建总结记录
				const summaryRecord = {
					id: Date.now().toString(),
					title,
					url: options.url || '',
					summary: response.summary,
					timestamp: Date.now(),
					options
				}

				currentSummary.value = summaryRecord
				summaries.value.unshift(summaryRecord)

				// 记录操作历史
				addOperationHistory({
					type: 'summarize',
					description: `总结了页面: ${title}`,
					result: response.summary.substring(0, 50) + '...'
				})

				return response.summary
			} catch (err) {
				error.value = err.message || '总结页面失败'
				console.error('Summarize page error:', err)
				throw err
			} finally {
				isSummarizing.value = false
			}
		}

		/**
		 * 生成并应用样式修改
		 * @param {String} requirement - 用户需求描述
		 * @param {Object} context - 上下文信息
		 * @returns {Promise} - 修改脚本
		 */
		async function modifyPageStyle(requirement, context = {}) {
			try {
				isModifyingStyle.value = true
				error.value = null

				// 调用AI生成修改脚本
				const response = await api.aiApi.generateScript(requirement, context)

				// 创建修改记录
				const modificationRecord = {
					id: Date.now().toString(),
					requirement,
					pageUrl: context.pageUrl || '',
					script: response.script,
					explanation: response.explanation,
					timestamp: Date.now()
				}

				currentModification.value = modificationRecord
				styleModifications.value.unshift(modificationRecord)

				// 记录操作历史
				addOperationHistory({
					type: 'style_modify',
					description: `修改页面样式: ${requirement.substring(0, 50)}...`,
					result: '样式修改已应用'
				})

				return response.script
			} catch (err) {
				error.value = err.message || '生成样式修改脚本失败'
				console.error('Modify page style error:', err)
				throw err
			} finally {
				isModifyingStyle.value = false
			}
		}

		/**
		 * 分析网络请求
		 * @param {Array} requests - 网络请求数据
		 * @param {String} prompt - 分析提示
		 * @returns {Promise} - 分析结果
		 */
		async function analyzeNetworkRequests(requests, prompt = '') {
			try {
				isAnalyzingNetwork.value = true
				error.value = null

				// 调用AI分析服务
				const response = await api.aiApi.analyzeNetwork(requests, prompt)

				networkAnalysis.value = {
					...response,
					timestamp: Date.now(),
					requestCount: requests.length
				}

				// 记录操作历史
				addOperationHistory({
					type: 'network_analyze',
					description: `分析了${requests.length}个网络请求`,
					result: response.summary.substring(0, 100) + '...'
				})

				return response
			} catch (err) {
				error.value = err.message || '分析网络请求失败'
				console.error('Analyze network requests error:', err)
				throw err
			} finally {
				isAnalyzingNetwork.value = false
			}
		}

		/**
		 * 分析浏览历史
		 * @param {Array} historyItems - 浏览历史项
		 * @param {Object} options - 分析选项
		 * @returns {Promise} - 分析结果
		 */
		async function analyzeBrowsingHistory(historyItems, options = {}) {
			try {
				isAnalyzingHistory.value = true
				error.value = null

				// 调用AI分析服务
				const response = await api.aiApi.analyzeHistory(historyItems, options)

				historyAnalysis.value = {
					...response,
					timestamp: Date.now(),
					daysAnalyzed: options.days || 7
				}

				// 记录操作历史
				addOperationHistory({
					type: 'history_analyze',
					description: `分析了最近${options.days || 7}天的浏览历史`,
					result: response.summary.substring(0, 100) + '...'
				})

				return response
			} catch (err) {
				error.value = err.message || '分析浏览历史失败'
				console.error('Analyze browsing history error:', err)
				throw err
			} finally {
				isAnalyzingHistory.value = false
			}
		}
		

		/**
		 * 添加操作历史记录
		 * @param {Object} operation - 操作信息
		 */
		function addOperationHistory(operation) {
			const historyItem = {
				id: Date.now().toString(),
				timestamp: Date.now(),
				...operation
			}

			operationHistory.value.unshift(historyItem)

			// 限制历史记录数量
			if (operationHistory.value.length > 100) {
				operationHistory.value = operationHistory.value.slice(0, 100)
			}
		}

		/**
		 * 清除所有MCP数据
		 */
		async function clearAllMcpData() {
			try {
				summaries.value = []
				styleModifications.value = []
				operationHistory.value = []
				currentSummary.value = null
				currentModification.value = null
				networkAnalysis.value = null
				historyAnalysis.value = null
			} catch (err) {
				console.error('Clear MCP data error:', err)
				error.value = '清除MCP数据失败'
			}
		}

		/**
		 * 设置网络监控状态
		 * @param {Boolean} isMonitoring - 是否监控
		 */
		function setNetworkMonitoringState(isMonitoring) {
			isMonitoringNetwork.value = isMonitoring
		}

		/**
		 * 更新网络请求数据
		 * @param {Array} requests - 网络请求数组
		 */
		function updateNetworkRequests(requests) {
			networkRequests.value = requests
		}

		/**
		 * 清空错误
		 */
		function clearError() {
			error.value = null
		}
		

		// 返回所有需要暴露的属性和方法
		return {
			// 状态
			summaries,
			currentSummary,
			isSummarizing,
			styleModifications,
			currentModification,
			isModifyingStyle,
			networkRequests,
			isMonitoringNetwork,
			networkAnalysis,
			isAnalyzingNetwork,
			historyItems,
			historyAnalysis,
			isAnalyzingHistory,
			error,
			operationHistory,
			// 计算属性
			recentSummaries,
			recentModifications,
			recentOperations,
			// 方法
			summarizePage,
			modifyPageStyle,
			analyzeNetworkRequests,
			analyzeBrowsingHistory,
			addOperationHistory,
			clearAllMcpData,
			setNetworkMonitoringState,
			updateNetworkRequests,
			clearError
		}
	},
	{
		persist: {
			enabled: true,
			strategies: [
				{
					storage: localStorage
				}
			]
		}
	}
)
