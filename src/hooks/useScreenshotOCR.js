import { ref, computed } from 'vue'
import Tesseract from 'tesseract.js'
import html2canvas from 'html2canvas'

export default function () {
	// 状态管理
	const isCapturing = ref(false)
	const isProcessing = ref(false)
	const progress = ref(0)
	const screenshotDataUrl = ref(null)
	const extractedText = ref('')
	const error = ref(null)
	const selectedLanguage = ref('chi_sim+eng')

	let overlay = null
	let handleMouseDown = null
	let handleMouseMove = null
	let handleMouseUp = null
	let handleKeyDown = null

	let worker = null
	const cropArea = ref(null)

	// 拖动相关状态
	let isDragging = false
	let isResizing = false
	let dragStartX = 0
	let dragStartY = 0
	let dragStartLeft = 0
	let dragStartTop = 0
	let resizeHandle = null
	let currentRect = null

	const hasScreenshot = computed(() => !!screenshotDataUrl.value)
	const hasText = computed(() => !!extractedText.value.trim())
	const isLoading = computed(() => isCapturing.value || isProcessing.value)

	const screenshotOptions = {
		scale: window.devicePixelRatio || 1,
		useCORS: true,
		allowTaint: true,
		backgroundColor: null,
		logging: false
	}

	/**
	 * 创建截图遮罩层
	 */
	const createCaptureOverlay = () => {
		const div = document.createElement('div')
		div.id = 'screenshot-capture-overlay'
		div.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.3);
      cursor: crosshair;
      z-index: 2147483646;
      user-select: none;
    `

		// 选区边框
		const selectionBox = document.createElement('div')
		selectionBox.id = 'screenshot-selection-box'
		selectionBox.style.cssText = `
      position: fixed;
      border: 2px dotted #4285f4;
      background: transparent;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
      z-index: 2147483647;
      cursor: move;
      display: none;
    `
		div.appendChild(selectionBox)

		// 创建八个调整大小的手柄
		const handles = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']
		handles.forEach((pos) => {
			const handle = document.createElement('div')
			handle.className = `resize-handle resize-handle-${pos}`
			handle.dataset.handle = pos
			handle.style.cssText = `
        position: absolute;
        width: 10px;
        height: 10px;
        background: #fff;
        border: 2px solid #4285f4;
        border-radius: 50%;
        z-index: 2147483648;
        display: none;
      `
			// 设置手柄位置
			const handlePositions = {
				nw: { top: '-8px', left: '-8px', cursor: 'nw-resize' },
				n: { top: '-8px', left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' },
				ne: { top: '-8px', right: '-8px', cursor: 'ne-resize' },
				w: { top: '50%', left: '-8px', transform: 'translateY(-50%)', cursor: 'w-resize' },
				e: { top: '50%', right: '-8px', transform: 'translateY(-50%)', cursor: 'e-resize' },
				sw: { bottom: '-8px', left: '-8px', cursor: 'sw-resize' },
				s: { bottom: '-8px', left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' },
				se: { bottom: '-8px', right: '-8px', cursor: 'se-resize' }
			}
			Object.assign(handle.style, handlePositions[pos])
			selectionBox.appendChild(handle)
		})

		// 尺寸提示
		const sizeTip = document.createElement('div')
		sizeTip.id = 'screenshot-size-tip'
		sizeTip.style.cssText = `
      position: fixed;
      background: #4285f4;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
      pointer-events: none;
      z-index: 2147483647;
      white-space: nowrap;
      display: none;
    `
		div.appendChild(sizeTip)

		// 顶部提示
		const topTip = document.createElement('div')
		topTip.innerHTML = '按住鼠标左键拖动选择区域，ESC取消，完成后可拖动选区'
		topTip.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.5);
      color: #fff;
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 14px;
      pointer-events: none;
      z-index: 2147483647;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: opacity 0.3s;
    `
		div.appendChild(topTip)

		// 工具栏
		const toolbar = document.createElement('div')
		toolbar.id = 'screenshot-toolbar'
		toolbar.style.cssText = `
      position: fixed;
      display: none;
      flex-direction: row;
      gap: 8px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      z-index: 2147483647;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
      animation: toolbarSlideIn 0.3s ease;
    `

		const style = document.createElement('style')
		style.textContent = `
      @keyframes toolbarSlideIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .screenshot-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border: none;
        border-radius: 8px;
        color: white;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .screenshot-btn:hover {
        opacity: 0.85;
        transform: translateY(-1px);
      }
      .screenshot-btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      .screenshot-btn-secondary {
        background: #409eff;
      }
      .screenshot-btn-danger {
        background: #fee;
        color: #c53030;
      }
      .screenshot-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
      }
      .spinner {
        width: 10px;
        height: 10px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .resize-handle:hover {
        background: #4285f4;
        transform: scale(1.2);
      }
    `
		document.head.appendChild(style)
		div.appendChild(toolbar)

		div._selectionBox = selectionBox
		div._sizeTip = sizeTip
		div._topTip = topTip
		div._toolbar = toolbar

		return div
	}

	/**
	 * 创建工具栏按钮
	 */
	const createToolbarButtons = (overlay, resolve, reject, getArea) => {
		const toolbar = overlay._toolbar
		toolbar.innerHTML = ''

		const buttons = [
			{
				id: 'extract',
				text: '🔍提取文字',
				class: 'screenshot-btn screenshot-btn-primary',
				action: async () => {
					// 按钮加载中
					setButtonLoading('extract', true)
					try {
						const area = getArea()
						// 判断按钮是否位于选中区域内，如果位于则隐藏
						restoreToolbar(overlay, true)
						// 等待一帧确保UI已隐藏
						await new Promise((resolve) => requestAnimationFrame(resolve))
						// 截图当前可见区域
						const dataUrl = await captureVisibleTab(area)
						// 截图完成后恢复工具栏显示状态
						restoreToolbar(overlay, false)
						screenshotDataUrl.value = dataUrl
						const text = await performOCR(dataUrl)
						resolve({ imgUrl: dataUrl, text: text?.replace(/\s+/g, '') || '' })
					} catch (err) {
						setButtonLoading('extract', false)
						reject(err)
					} finally {
						stopCapture()
						isCapturing.value = false
					}
				}
			},
			{
				id: 'download',
				text: '💾下载',
				class: 'screenshot-btn screenshot-btn-secondary',
				action: async () => {
					// 按钮加载中
					setButtonLoading('download', true)
					try {
						const area = getArea()
						// 判断按钮是否位于选中区域内，如果位于则隐藏
						restoreToolbar(overlay, true)
						// 等待一帧确保UI已隐藏
						await new Promise((resolve) => requestAnimationFrame(resolve))
						// 截图当前可见区域
						const dataUrl = await captureVisibleTab(area)
						// 截图完成后恢复工具栏显示状态
						restoreToolbar(overlay, false)
						const link = document.createElement('a')
						link.download = `screenshot-${Date.now()}.png`
						link.href = dataUrl
						link.click()
					} catch (err) {
						reject(new Error('下载失败'))
					} finally {
						setButtonLoading('download', false)
					}
				}
			},
			{
				id: 'cancel',
				text: '✕ 取消',
				class: 'screenshot-btn screenshot-btn-danger',
				action: () => {
					stopCapture()
					isCapturing.value = false
				}
			}
		]

		buttons.forEach((btn) => {
			const button = document.createElement('button')
			button.id = `btn-${btn.id}`
			button.className = btn.class
			button.innerHTML = btn.text
			button.setAttribute('data-text', btn.text)
			button.onclick = (e) => {
				e.stopPropagation()
				btn?.action?.()
			}
			toolbar.appendChild(button)
		})
	}

	/**
	 * 显示工具栏
	 */
	const showToolbar = (overlay, x, y, width, height) => {
		const toolbar = overlay._toolbar
		overlay._topTip.style.opacity = '0'
		toolbar.style.display = 'flex'

		// 强制重排获取实际尺寸
		toolbar.style.visibility = 'hidden'
		const toolbarRect = toolbar.getBoundingClientRect()
		const toolbarWidth = toolbarRect.width
		const toolbarHeight = toolbarRect.height
		toolbar.style.visibility = 'visible'

		// 默认在选区外面
		toolbar.setAttribute('data-inside', '0')

		const margin = 12 // 与选区的间距
		const insideMargin = 20
		// 计算上下空间
		const spaceBelow = window.innerHeight - (y + height)
		const spaceAbove = y

		let toolbarTop, toolbarLeft

		// 下方空间足够，显示在下方
		if (spaceBelow >= toolbarHeight + margin) {
			toolbarTop = y + height + margin
			toolbarLeft = x + (width - toolbarWidth) / 2
		}
		// 下方不够但上方够，显示在上方
		else if (spaceAbove >= toolbarHeight + margin) {
			toolbarTop = y - toolbarHeight - margin
			toolbarLeft = x + (width - toolbarWidth) / 2
		}
		// 上下都不够，显示在选区底部居中，距离屏幕底部20px
		else {
			toolbarTop = y + height - toolbarHeight - insideMargin
			toolbarLeft = x + (width - toolbarWidth) / 2
			toolbar.setAttribute('data-inside', '1')
		}

		// 水平边界检查
		toolbarLeft = Math.max(20, Math.min(toolbarLeft, window.innerWidth - toolbarWidth - 20))

		toolbar.style.top = `${toolbarTop}px`
		toolbar.style.left = `${toolbarLeft}px`
	}

	/**
	 * 设置按钮加载状态
	 */
	const setButtonLoading = (btnId, loading) => {
		const btn = document.getElementById(`btn-${btnId}`)
		if (btn) {
			btn.disabled = loading
			btn.innerHTML = loading ? '<span class="spinner"></span> 处理中...' : btn.getAttribute('data-text')
		}
	}

	/**
	 * 恢复工具栏显示状态
	 * @param overlayT
	 * @param loading
	 */
	const restoreToolbar = (overlayT, loading) => {
		const toolbar = overlayT._toolbar
		toolbar.style.display = loading && toolbar.getAttribute('data-inside') === '1' ? 'none' : 'flex'
		// 截图时隐藏边框和手柄
		const box = overlayT._selectionBox
		box.style.borderColor = loading ? 'transparent' : '#4285f4'
		const handles = box.querySelectorAll('.resize-handle')
		handles.forEach((h) => (h.style.display = loading ? 'none' : 'block'))
	}

	/**
	 * 更新选区显示
	 */
	const updateSelection = (overlayT, x, y, width, height) => {
		const box = overlayT._selectionBox
		const tip = overlayT._sizeTip

		overlayT.style.background = 'transparent'

		// 显示并定位选框
		box.style.display = 'block'
		box.style.left = `${x}px`
		box.style.top = `${y}px`
		box.style.width = `${width}px`
		box.style.height = `${height}px`

		// 显示调整手柄
		const handles = box.querySelectorAll('.resize-handle')
		handles.forEach((h) => (h.style.display = 'block'))

		tip.style.display = 'block'
		tip.textContent = `${Math.round(width)} × ${Math.round(height)}`

		const tipHeight = 30
		tip.style.top = y > tipHeight + 10 ? `${y - tipHeight - 4}px` : `${y + height + 4}px`
		tip.style.left = `${x}px`
	}

	/**
	 * 更新裁剪区域数据
	 */
	const updateCropArea = (rect) => {
		const dpr = window.devicePixelRatio || 1
		cropArea.value = {
			x: rect.x * dpr + 2,
			y: rect.y * dpr + 2,
			width: rect.width * dpr - 2,
			height: rect.height * dpr - 2
		}
	}

	/**
	 * 获取当前选区矩形
	 */
	const getCurrentRect = () => {
		const box = overlay._selectionBox
		return {
			x: parseInt(box.style.left) || 0,
			y: parseInt(box.style.top) || 0,
			width: parseInt(box.style.width) || 0,
			height: parseInt(box.style.height) || 0
		}
	}

	/**
	 * 限制选区在屏幕内
	 */
	const clampRectToScreen = (rect) => {
		const maxX = window.innerWidth - rect.width
		const maxY = window.innerHeight - rect.height

		return {
			x: Math.max(0, Math.min(rect.x, maxX)),
			y: Math.max(0, Math.min(rect.y, maxY)),
			width: rect.width,
			height: rect.height
		}
	}

	/**
	 * 限制调整大小时不超出屏幕
	 */
	const clampResizeToScreen = (rect) => {
		let { x, y, width, height } = rect
		// 确保不超出左边界
		if (x < 0) {
			width += x
			x = 0
		}
		// 确保不超出上边界
		if (y < 0) {
			height += y
			y = 0
		}
		// 确保不超出右边界
		if (x + width > window.innerWidth) {
			width = window.innerWidth - x
		}
		// 确保不超出下边界
		if (y + height > window.innerHeight) {
			height = window.innerHeight - y
		}
		return { x, y, width: Math.max(50, width), height: Math.max(50, height) }
	}

	/**
	 * 开始区域截图流程
	 */
	const startCapture = async () => {
		return new Promise((resolve, reject) => {
			try {
				if (isCapturing.value) return

				isCapturing.value = true
				error.value = null
				isDragging = false
				isResizing = false

				overlay = createCaptureOverlay()
				document.body.appendChild(overlay)

				let startX,
					startY,
					isDrawing = false,
					hasSelected = false

				// 获取点击的目标元素
				const getTargetElement = (e) => {
					if (e.target.closest('.resize-handle')) return 'handle'
					if (e.target.id === 'screenshot-selection-box') return 'box'
					if (e.target.closest('#screenshot-toolbar')) return 'toolbar'
					return 'overlay'
				}

				handleMouseDown = (e) => {
					if (e.button !== 0) return

					const target = getTargetElement(e)

					// 如果点击工具栏，忽略
					if (target === 'toolbar') return

					// 如果已经选区完成，处理拖动或调整大小
					if (hasSelected) {
						if (target === 'handle') {
							// 开始调整大小
							isResizing = true
							resizeHandle = e.target.dataset.handle
							dragStartX = e.clientX
							dragStartY = e.clientY
							currentRect = getCurrentRect()
						} else if (target === 'box') {
							// 开始拖动
							isDragging = true
							dragStartX = e.clientX
							dragStartY = e.clientY
							const rect = getCurrentRect()
							dragStartLeft = rect.x
							dragStartTop = rect.y
							overlay.style.cursor = 'grabbing'
						}
						return
					}

					// 开始绘制新选区
					if (target === 'overlay') {
						isDrawing = true
						startX = e.clientX
						startY = e.clientY
						updateSelection(overlay, startX, startY, 0, 0)
					}
				}

				handleMouseMove = (e) => {
					// 处理调整大小
					if (isResizing && currentRect) {
						const dx = e.clientX - dragStartX
						const dy = e.clientY - dragStartY
						let newRect = { ...currentRect }

						// 根据手柄位置调整大小
						if (resizeHandle.includes('e')) newRect.width = Math.max(50, currentRect.width + dx)
						if (resizeHandle.includes('w')) {
							const newWidth = Math.max(50, currentRect.width - dx)
							newRect.x = currentRect.x + currentRect.width - newWidth
							newRect.width = newWidth
						}
						if (resizeHandle.includes('s')) newRect.height = Math.max(50, currentRect.height + dy)
						if (resizeHandle.includes('n')) {
							const newHeight = Math.max(50, currentRect.height - dy)
							newRect.y = currentRect.y + currentRect.height - newHeight
							newRect.height = newHeight
						}
						// 限制在屏幕内
						newRect = clampResizeToScreen(newRect)

						updateSelection(overlay, newRect.x, newRect.y, newRect.width, newRect.height)
						updateCropArea(newRect)
						// 实时更新工具栏位置
						showToolbar(overlay, newRect.x, newRect.y, newRect.width, newRect.height)
						return
					}

					// 处理拖动
					if (isDragging) {
						const dx = e.clientX - dragStartX
						const dy = e.clientY - dragStartY
						const newX = dragStartLeft + dx
						const newY = dragStartTop + dy
						const rect = getCurrentRect()
						// 限制在屏幕内
						const clamped = clampRectToScreen({
							x: newX,
							y: newY,
							width: rect.width,
							height: rect.height
						})
						updateSelection(overlay, clamped.x, clamped.y, rect.width, rect.height)
						updateCropArea({ x: clamped.x, y: clamped.y, width: rect.width, height: rect.height })
						// 实时更新工具栏位置
						showToolbar(overlay, clamped.x, clamped.y, rect.width, rect.height)
						return
					}

					// 处理绘制
					if (!isDrawing || hasSelected) return

					const currentX = e.clientX
					const currentY = e.clientY
					const left = Math.min(startX, currentX)
					const top = Math.min(startY, currentY)
					const width = Math.abs(currentX - startX)
					const height = Math.abs(currentY - startY)

					updateSelection(overlay, left, top, width, height)
					updateCropArea({ x: left, y: top, width, height })
				}

				handleMouseUp = () => {
					// 结束拖动或调整大小
					if (isDragging) {
						isDragging = false
						overlay.style.cursor = 'crosshair'
						return
					}
					if (isResizing) {
						isResizing = false
						resizeHandle = null
						currentRect = null
						return
					}

					// 结束绘制
					if (!isDrawing) return
					isDrawing = false

					if (cropArea.value && cropArea.value.width > 10 && cropArea.value.height > 10) {
						hasSelected = true
						const rect = getCurrentRect()

						setTimeout(() => {
							createToolbarButtons(overlay, resolve, reject, () => cropArea.value)
							showToolbar(overlay, rect.x, rect.y, rect.width, rect.height)
							overlay.style.cursor = 'default'
						}, 150)
					}
				}

				handleKeyDown = (e) => {
					if (!isCapturing.value) return
					if (e.key === 'Escape' || e.key === 'Esc') {
						e.preventDefault()
						e.stopPropagation()
						stopCapture()
					}
				}

				document.addEventListener('mousedown', handleMouseDown)
				document.addEventListener('mousemove', handleMouseMove)
				document.addEventListener('mouseup', handleMouseUp)
				document.addEventListener('keydown', handleKeyDown, true)
			} catch (err) {
				reject(err)
			}
		})
	}

	/**
	 * 清理函数
	 */
	const stopCapture = () => {
		if (!isCapturing.value) return
		isCapturing.value = false
		isDragging = false
		isResizing = false
		;[handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown].forEach((handler) => {
			if (handler) {
				document.removeEventListener('mousedown', handler)
				document.removeEventListener('mousemove', handler)
				document.removeEventListener('mouseup', handler)
				document.removeEventListener('keydown', handler)
			}
		})

		handleMouseDown = null
		handleMouseMove = null
		handleMouseUp = null
		handleKeyDown = null

		if (overlay?.parentNode) {
			overlay.remove()
			overlay = null
		}
	}

	/**
	 * 截取当前标签页可见区域
	 */
	const captureVisibleTab = async (crop) => {
		return new Promise((resolve, reject) => {
			if (typeof chrome !== 'undefined' && chrome.tabs) {
				chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
					if (chrome.runtime.lastError) {
						reject(new Error(chrome.runtime.lastError.message))
						return
					}
					cropImage(dataUrl, crop).then(resolve).catch(reject)
				})
			} else {
				html2canvas(document.documentElement, screenshotOptions)
					.then((canvas) => resolve(cropCanvas(canvas, crop)))
					.catch(reject)
			}
		})
	}

	/**
	 * 裁剪图片
	 */
	const cropImage = (dataUrl, crop) => {
		return new Promise((resolve, reject) => {
			const img = new Image()
			img.crossOrigin = 'anonymous'
			img.onload = () => {
				const canvas = document.createElement('canvas')
				canvas.width = crop.width
				canvas.height = crop.height
				const ctx = canvas.getContext('2d')
				ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)
				resolve(canvas.toDataURL('image/png'))
			}
			img.onerror = reject
			img.src = dataUrl
		})
	}

	/**
	 * 裁剪Canvas
	 */
	const cropCanvas = (sourceCanvas, crop) => {
		const canvas = document.createElement('canvas')
		canvas.width = crop.width
		canvas.height = crop.height
		const ctx = canvas.getContext('2d')
		ctx.drawImage(sourceCanvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)
		return canvas.toDataURL('image/png')
	}

	/**
	 * 初始化Tesseract Worker
	 */
	async function initWorker(lang = selectedLanguage.value) {
		if (!worker) {
			worker = await Tesseract.createWorker(lang, 1, {
				logger: () => {},
				errorHandler: () => {}
			})
			await worker.setParameters({
				tessedit_pageseg_mode: '6',
				tessedit_char_whitelist: '',
				user_defined_dpi: '300',
				preserve_interword_spaces: '1'
			})
		}
		return worker
	}

	/**
	 * 执行OCR识别
	 */
	const performOCR = async (imageDataUrl = screenshotDataUrl.value, lang = selectedLanguage.value) => {
		if (!imageDataUrl) {
			error.value = '没有可识别的图片'
			return
		}
		try {
			isProcessing.value = true
			error.value = null
			progress.value = 0
			extractedText.value = ''

			const workerR = await initWorker(lang)
			const { data } = await workerR.recognize(imageDataUrl)
			extractedText.value = data.text
			return data.text
		} catch (err) {
			error.value = `OCR识别失败: ${err.message}`
			throw err
		} finally {
			isProcessing.value = false
			progress.value = 0
		}
	}

	const reRecognize = (lang) => performOCR(screenshotDataUrl.value, lang || selectedLanguage.value)

	const clear = () => {
		screenshotDataUrl.value = null
		extractedText.value = ''
		error.value = null
		progress.value = 0
		cropArea.value = null
	}

	const copyText = async () => {
		if (!extractedText.value) return false
		try {
			await navigator.clipboard.writeText(extractedText.value)
			return true
		} catch (err) {
			console.error('复制失败:', err)
			return false
		}
	}

	return {
		isCapturing,
		isProcessing,
		isLoading,
		progress,
		screenshotDataUrl,
		extractedText,
		error,
		selectedLanguage,
		hasScreenshot,
		hasText,
		startCapture,
		stopCapture,
		performOCR,
		reRecognize,
		clear,
		copyText
	}
}
