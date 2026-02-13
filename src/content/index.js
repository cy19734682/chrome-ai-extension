// 内容脚本 - 注入到目标页面，处理页面交互和DOM操作
import { useElementPicker, usePageContent, useScreenshotOCR } from '@/hooks'
import { messageService } from '@/services/chrome-api.js'

// 创建全局实例
const picker = useElementPicker()
const page = usePageContent()
const ocr = useScreenshotOCR()

/**
 * 监听元素选择
 */
messageService.onMessage('START_SELECTING', async (message, sender, sendResponse) => {
	return await picker.startSelecting()
})

/**
 * 监听获取页面内容
 */
messageService.onMessage('GET_PAGE_CONTENT', async (message, sender, sendResponse) => {
	return await page.extract({ fullHTML: !!message?.fullHTML })
})

/**
 * 监听截图
 */
messageService.onMessage('START_SCREENSHOT', async (message, sender, sendResponse) => {
	return await ocr.startCapture()
})

/**
 * 监听取消事件
 */
messageService.onMessage('ESC_EVENT', async (message, sender, sendResponse) => {
	picker.stopSelecting()
	ocr.stopCapture()
	return true
})
