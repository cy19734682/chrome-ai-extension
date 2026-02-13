import { ref } from 'vue'

export default function () {
	const isSelecting = ref(false)
	const selectedElement = ref(null)
	let mouseMoveHandler = null
	let clickHandler = null
	let keydownHandler = null
	let overlay = null

	/**
	 * 创建选择器遮罩层
	 */
	const createOverlay = () => {
		const div = document.createElement('div')
		div.id = 'vue-element-picker-overlay'
		// 使用 Vue 的 CSS 变量或直接内联样式
		div.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: 2147483647;
      border: 2px dotted #4a5568;
      border-radius: 4px;
      transition: all 0.05s ease;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    `
		// 添加提示文字
		const tip = document.createElement('div')
		tip.innerHTML = '鼠标左键拖动选择区域，ESC取消'
		tip.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      pointer-events: none;
      z-index: 2147483648;
    `
		div.appendChild(tip)
		return div
	}

	/**
	 * 生成元素选择器
	 * @param {Element} el - 目标元素
	 * @returns {string} 元素选择器
	 */
	const generateSelector = (el) => {
		if (el.id) return `#${el.id}`

		const path = []
		let current = el

		while (current && current.nodeType === Node.ELEMENT_NODE) {
			let selector = current.tagName.toLowerCase()

			if (current.id) {
				selector += `#${current.id}`
				path.unshift(selector)
				break
			} else {
				const classes = Array.from(current.classList).slice(0, 2)
				if (classes.length) {
					selector += '.' + classes.join('.')
				}

				const siblings = Array.from(current.parentNode?.children || []).filter((e) => e.tagName === current?.tagName)
				if (siblings.length > 1) {
					const index = siblings.indexOf(current) + 1
					selector += `:nth-of-type(${index})`
				}
			}

			path.unshift(selector)
			current = current.parentElement
		}

		return path.join(' > ')
	}

	/**
	 * 提取元素数据
	 * @param {Element} el - 目标元素
	 * @returns {Object} 元素数据对象
	 */
	const extractData = (el) => {
		const attributes = {}
		for (const attr of el.attributes) {
			attributes[attr.name] = attr.value
		}
		return {
			tagName: el.tagName.toLowerCase(),
			selector: generateSelector(el),
			text: el.innerText?.replace(/\s+/g, ' ').trim().slice(0, 5000) || '',
			html: el.outerHTML.slice(0, 10000),
			attributes,
			rect: el.getBoundingClientRect(),
			href: el.href || undefined,
			src: el.src || undefined
		}
	}

	/**
	 * 开始元素选择器
	 * @returns {Promise<Object>} 选中的元素数据对象
	 */
	const startSelecting = () => {
		return new Promise((resolve, reject) => {
			try {
				if (isSelecting.value) return

				isSelecting.value = true
				overlay = createOverlay()
				document.body.appendChild(overlay)
				document.body.style.cursor = 'default'

				mouseMoveHandler = (e) => {
					const elements = document.elementsFromPoint(e.clientX, e.clientY)
					const target = elements.find((el) => el.id !== 'vue-element-picker-overlay')

					if (target && overlay) {
						const rect = target.getBoundingClientRect()
						const scrollX = window.scrollX
						const scrollY = window.scrollY

						overlay.style.width = `${rect.width}px`
						overlay.style.height = `${rect.height}px`
						overlay.style.top = `${rect.top + scrollY - 2}px`
						overlay.style.left = `${rect.left + scrollX - 2}px`
						overlay.currentTarget = target
					}
				}

				clickHandler = async (e) => {
					e.preventDefault()
					e.stopPropagation()
					if (overlay) {
						const target = overlay.currentTarget
						if (target) {
							stopSelecting()
							try {
								const elementData = extractData(target)
								selectedElement.value = elementData
								resolve(elementData)
							} catch (err) {
								reject(err)
							}
						}
					}
				}

				keydownHandler = (e) => {
					if (!isSelecting.value) return
					if (e.key === 'Escape' || e.key === 'Esc') {
						e.preventDefault() // 阻止默认 ESC 行为
						e.stopPropagation() // 阻止事件冒泡
						stopSelecting()
					}
				}

				document.addEventListener('mousemove', mouseMoveHandler)
				document.addEventListener('click', clickHandler)
				document.addEventListener('keydown', keydownHandler)
			} catch (err) {
				reject(err)
			}
		})
	}

	/**
	 * 停止元素选择器
	 */
	const stopSelecting = () => {
		if (!isSelecting.value) return

		isSelecting.value = false
		document.body.style.cursor = ''

		// 移除鼠标事件
		if (mouseMoveHandler) {
			document.removeEventListener('mousemove', mouseMoveHandler)
			mouseMoveHandler = null
		}
		if (clickHandler) {
			document.removeEventListener('click', clickHandler)
			clickHandler = null
		}

		// 移除键盘事件
		if (keydownHandler) {
			window.removeEventListener('keydown', keydownHandler)
			document.removeEventListener('keydown', keydownHandler)
			keydownHandler = null
		}

		if (overlay && overlay.parentNode) {
			overlay.remove()
			overlay = null
		}
	}

	return {
		isSelecting,
		selectedElement,
		startSelecting,
		stopSelecting
	}
}
