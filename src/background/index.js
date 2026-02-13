// 后台脚本 - 处理扩展的核心逻辑、API调用和消息传递
import './common/chat.js'

/**
 * 扩展安装时执行
 * 设置点击行为为打开侧边栏
 */
chrome.runtime.onInstalled.addListener(() => {
	chrome.sidePanel.setPanelBehavior({
		openPanelOnActionClick: true
	});
});


console.log('Background script loaded')
