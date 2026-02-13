import { messageService } from '@/services/chrome-api.js'

/**
 * 获取当前活动标签页
 * @returns {Promise<Tab>} 当前活动标签页对象
 */
messageService.onMessage('GET_CURRENT_TAB', async (message, sender, sendResponse) => {
	const tab = await getCurrentTab()
	sendResponse({
		success: true,
		tab
	})
})

/**
 * 在当前标签页执行脚本
 * @param tabId 标签页ID
 * @param script 要执行的脚本字符串
 * @returns {Promise<any>} 脚本执行结果
 */
messageService.onMessage('EXECUTE_SCRIPT', async (message, sender, sendResponse) => {
	try {
		const result = await executeScriptInTab(sender.tab.id, message.script)
		sendResponse({ result })
	} catch (e) {
		sendResponse({ error: e.message })
	}
})


/**
 * 获取当前活动标签页
 * @returns {Promise<Tab>} 当前活动标签页对象
 */
async function getCurrentTab() {
	return new Promise((resolve) => {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			resolve(tabs[0])
		})
	})
}
/**
 * 在标签页中执行脚本
 * @param tabId 标签页ID
 * @param script 要执行的脚本字符串
 * @returns {Promise<any>} 脚本执行结果
 */
async function executeScriptInTab(tabId, script) {
	return new Promise((resolve, reject) => {
		chrome.scripting.executeScript(
			{
				target: { tabId },
				function: script
			},
			(results) => {
				if (chrome.runtime.lastError) {
					reject(new Error(chrome.runtime.lastError.message))
				} else {
					resolve(results[0]?.result)
				}
			}
		)
	})
}