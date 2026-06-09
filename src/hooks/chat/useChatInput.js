import { ref, shallowRef, onMounted, onUnmounted, computed } from 'vue'
import { useChatStore } from '@/store'
import { messageService, tabService } from '@/services/chrome-api.js'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { PictureFilled, Management, Aim, Document } from '@element-plus/icons-vue'

/**
 * 会话相关hooks
 */
export default function () {
	// 响应式数据用 storeToRefs 解构
	const { inpDisabled } = storeToRefs(useChatStore())
	// 方法直接从原 store 取，不需要解构
	const { send } = useChatStore()

	// 响应式数据
	const inputMessage = ref('')
	const inputRef = ref(null)
	const selectedCode = ref('')
	const selectedElmData = ref({})
	const popoverVisible = ref(false)

	const activeList = computed(() => moreActions.value?.find((e) => selectedCode.value === e.code)?.list || [])

	let screenshotCancel = null
	let elementCancel = null

	const moreActions = ref([
		{
			code: 'CURRENT_PAGE',
			name: '当前网页',
			icon: shallowRef(Management),
			action: () => handleSelectPage(true),
			list: [
				{
					title: '总结网页内容',
					content: '请对以下网页内容进行详细总结，确保结构清晰、要点完整：\n\n{{prompt}}'
				},
				{
					title: '解释关键数据与概念',
					content: '请解释以下网页内容中的关键数据和核心概念：\n\n{{prompt}}'
				},
				{
					title: '生成简短摘要',
					content: '请为以下网页内容生成一段简洁的摘要：\n\n{{prompt}}'
				}
			]
		},
		{
			code: 'PAGE_CONTENT',
			name: '网页正文',
			icon: shallowRef(Document),
			action: () => handleSelectPage(false),
			list: [
				{
					title: '总结正文内容',
					content: '请详细总结以下网页正文，要求条理清晰、重点突出：\n\n{{prompt}}'
				},
				{
					title: '解释核心信息',
					content: '请解释以下网页正文中的关键数据和重要概念：\n\n{{prompt}}'
				},
				{
					title: '生成内容摘要',
					content: '请为以下网页正文生成简明扼要的摘要：\n\n{{prompt}}'
				}
			]
		},
		{
			code: 'SELECT_ELEMENT',
			name: '选中内容',
			icon: shallowRef(Aim),
			action: () => handleStartSelect(),
			list: [
				{
					title: '总结选中文本',
					content: '请总结以下选中的文本内容：\n\n{{prompt}}'
				},
				{
					title: '解释选中内容',
					content: '请解释以下选中文本中的关键数据和概念：\n\n{{prompt}}'
				}
			]
		},
		{
			code: 'SCREENSHOT_QUESTION',
			name: '截图识别',
			icon: shallowRef(PictureFilled),
			action: () => handleStartScreenshot(),
			list: [
				{
					title: '整理并总结截图文字',
					content: '以下是从图片中识别出的文字，可能存在错别字或语句不通顺，请帮我修正并总结内容：\n\n{{prompt}}'
				},
				{
					title: '解释截图中的内容',
					content:
						'以下是从图片中识别出的文字，可能存在错误或不顺，请帮我修正并解释其中的关键信息与概念：\n\n{{prompt}}'
				}
			]
		}
	])

	/**
	 * 快捷对话
	 */
	const handleShortcut = async (item) => {
		const content = item.content.replace('{{prompt}}', selectedElmData.value.text)
		inputMessage.value = ''
		await send(content, { ...selectedElmData.value, shortcutTitle: item.title })
		handleCloseElm()
	}

	/**
	 * 回车事件
	 * @param e
	 * @returns {Promise<void>}
	 */
	const handleEnter = async (e) => {
		// 忽略输入法编辑状态（避免中文输入时回车选字触发发送）
		if (e.isComposing || e.keyCode === 229) {
			return
		}
		// Shift + Enter ：不阻止默认行为，让浏览器换行
		if (e.shiftKey) {
			return
		}
		// 纯 Enter：阻止默认换行，执行发送
		e.preventDefault()
		await sendMessage()
	}

	/**
	 * 发送消息
	 */
	const sendMessage = async () => {
		const inputContent = inputMessage.value.trim()
		if (!inputContent || inpDisabled.value) return
		inputMessage.value = ''
		let shortcutTitle =  ''
		let content = inputContent
		if(selectedElmData.value?.title){
			shortcutTitle = inputContent
			content = inputContent + '\n\n 以下是网页提取内容：\n\n' + selectedElmData.value.text
		}
		await send(content, { ...selectedElmData.value, shortcutTitle })
		handleCloseElm()
	}

	/**
	 * 选择页面内容
	 */
	async function handleSelectPage(fullHTML = false) {
		try {
			popoverVisible.value = false
			const tab = await tabService.getCurrentTab()
			if (!tab?.id) return
			const { data, error } = await messageService.sendMessageTab(tab.id, { action: 'GET_PAGE_CONTENT', fullHTML })
				.promise
			if (data) {
				const icon = data?.metadata?.favicon || ''
				selectedElmData.value = {
					iconUrl: icon,
					url: data?.url || '',
					title: data?.title || '',
					text: data?.text || '',
					html: data?.html || ''
				}
				selectedCode.value = fullHTML ? 'CURRENT_PAGE' : 'PAGE_CONTENT'
			} else {
				ElMessage.error('获取页面内容出错:' + error || '')
			}
		} catch (error) {
			ElMessage.error('获取页面内容失败:' + error.message)
			console.error('获取页面内容失败:', error)
		}
	}

	/**
	 * 开始截图
	 */
	async function handleStartScreenshot() {
		try {
			popoverVisible.value = false
			const tab = await tabService.getCurrentTab()
			if (!tab?.id) return
			const { promise, cancel } = messageService.sendMessageTab(tab.id, { action: 'START_SCREENSHOT' })
			screenshotCancel = cancel
			const { data, error } = await promise
			if (data) {
				const { imgUrl, text } = data
				selectedElmData.value = {
					imgUrl,
					title: text?.slice(0, 50) || '',
					text
				}
				selectedCode.value = 'SCREENSHOT_QUESTION'
			} else {
				ElMessage.error('页面截图出错:' + error || '')
			}
		} catch (error) {
			ElMessage.error('页面截图失败:' + error.message)
			console.error('页面截图失败:', error)
		}
	}

	/**
	 * 开始选择元素
	 */
	async function handleStartSelect() {
		try {
			popoverVisible.value = false
			const tab = await tabService.getCurrentTab()
			if (!tab?.id) return
			const { promise, cancel } = messageService.sendMessageTab(tab.id, { action: 'START_SELECTING' })
			elementCancel = cancel
			const { data, error } = await promise
			if (data) {
				selectedElmData.value = {
					title: data?.text?.slice(0, 50) || '',
					text: data?.text || '',
					html: data?.html || ''
				}
				selectedCode.value = 'SELECT_ELEMENT'
			} else {
				ElMessage.error('选择元素出错:' + error || '')
			}
		} catch (error) {
			ElMessage.error('选择元素失败:' + error.message)
			console.error('选择元素失败:', error)
		}
	}

	/**
	 * 关闭选择元素
	 */
	const handleCloseElm = () => {
		selectedCode.value = ''
		selectedElmData.value = {}
	}

	/**
	 * 按键事件监听
	 * @param {KeyboardEvent} e - 按键事件对象
	 */
	const handleKeyDown = async (e) => {
		if (e.key === 'Escape') {
			e.preventDefault()
			const tab = await tabService.getCurrentTab()
			if (!tab?.id) return
			await messageService.sendMessageTab(tab.id, { action: 'ESC_EVENT' }).promise
			if (elementCancel) {
				elementCancel()
			}
			if (screenshotCancel) {
				screenshotCancel()
			}
		}
	}

	// 初始化
	onMounted(() => {
		setTimeout(() => {
			// 重置输入框高度
			inputRef.value?.resizeTextarea?.()
		}, 50)
		document.addEventListener('keydown', handleKeyDown)
	})

	onUnmounted(() => {
		document.removeEventListener('keydown', handleKeyDown)
	})

	return {
		popoverVisible,
		inputMessage,
		inputRef,
		inpDisabled,
		moreActions,
		activeList,
		selectedElmData,
		handleCloseElm,
		handleShortcut,
		handleEnter,
		sendMessage
	}
}
