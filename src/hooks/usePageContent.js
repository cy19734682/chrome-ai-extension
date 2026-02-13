import { ref, computed } from 'vue'
import { Readability } from '@mozilla/readability'

export default function () {
	const isLoading = ref(false)
	const progress = ref(0)
	const error = ref(null)
	const content = ref(null)

	// 分块传输配置
	const CHUNK_SIZE = 1024 * 1024 // 1MB 每块（Chrome消息限制约4MB，留余量）

	/**
	 * 提取元数据
	 */
	const extractMetadata = () => {
		const getMeta = (name) => {
			const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
			return meta?.getAttribute('content') || undefined
		}
		return {
			ogTitle: getMeta('og:title'),
			ogDescription: getMeta('og:description'),
			ogImage: getMeta('og:image'),
			author: getMeta('author') || getMeta('article:author'),
			publishedTime: getMeta('article:published_time'),
			siteName: getMeta('og:site_name'),
			favicon: getFavicon(),
			canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || undefined
		}
	}

	/**
	 * 创建首字母 SVG 图标（数据 URI）
	 */
	function createLetterIcon(letter, size = 30, bgColor = '#e2e8f0', textColor = '#64748b') {
		const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
      <rect width="100" height="100" rx="20" fill="${bgColor}"/>
      <text x="50" y="68" font-family="Arial, sans-serif" font-size="50"
            font-weight="bold" text-anchor="middle" fill="${textColor}">
        ${letter}
      </text>
    </svg>
  `
			.trim()
			.replace(/\s+/g, ' ')
		return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
	}

	/**
	 * 获取 Favicon
	 */
	const getFavicon = () => {
		const favicon = document.querySelector('link[rel*="icon"]')
		if (favicon) {
			const href = favicon.getAttribute('href')
			if (href) return new URL(href, window.location.href).href
		}
		return createLetterIcon(document?.title?.charAt(0) || '?')
	}

	/**
	 * 提取结构化内容
	 */
	const extractStructured = () => {
		const headings = []
		document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el, index) => {
			headings.push({
				level: parseInt(el.tagName[1]),
				text: el.textContent?.trim() || '',
				id: el.id || `heading-${index}`
			})
		})

		const paragraphs = Array.from(document.querySelectorAll('p'))
			.map((p) => p.textContent?.trim())
			.filter((text) => text && text.length > 20)

		const lists = []
		document.querySelectorAll('ul, ol').forEach((list) => {
			const items = Array.from(list.querySelectorAll('li'))
				.map((li) => li.textContent?.trim())
				.filter(Boolean)
			if (items.length > 0) {
				lists.push({
					type: list.tagName.toLowerCase(),
					items
				})
			}
		})

		return { headings, paragraphs, lists, tables: [], codeBlocks: [] }
	}

	/**
	 * 获取所有图片
	 */
	const extractImages = () => {
		return Array.from(document.images)
			.filter((img) => img.width > 100 && img.height > 100) // 过滤小图标
			.map((img) => ({
				src: img.src,
				alt: img.alt,
				width: img.naturalWidth,
				height: img.naturalHeight,
				isVisible: isElementVisible(img)
			}))
	}

	/**
	 * 提取所有链接
	 */
	const extractLinks = () => {
		return Array.from(document.links)
			.map((link) => ({
				href: link.href,
				text: link.textContent?.trim() || '',
				isExternal: !link.href.includes(window.location.hostname)
			}))
			.filter((link) => link.href.startsWith('http'))
	}

	/**
	 * 检查元素是否可见
	 */
	const isElementVisible = (el) => {
		const rect = el.getBoundingClientRect()
		return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight
	}
	
	/**
	 * 清理 document 内容（移除脚本、样式、导航等）
	 */
	const cleanDocumentContent = () => {
		// 创建克隆，避免修改原 DOM
		const clone = document.documentElement.cloneNode(true)
		// 定义要移除的选择器（与样式无关的元素）
		const selectorsToRemove = [
			'script',
			'noscript',
			'[hidden]',
			'[style*="display: none"]',
			'[style*="visibility: hidden"]',
			'input[type="password"]',
			'video',
			'audio',
			'canvas'
		]
		// 批量移除无关元素
		selectorsToRemove.forEach((selector) => {
			clone.querySelectorAll(selector).forEach((el) => el.remove())
		})
		// 定义保留的属性白名单
		const keepAttrs = new Set([
			'class',
			'id',
			'style',
			'width',
			'height',
			'src',
			'srcset',
			'alt',
			'href',
			'target',
			'type',
			'placeholder'
		])
		const elements = clone.querySelectorAll('*')
		elements.forEach((el) => {
			Array.from(el.attributes).forEach((attr) => {
				const name = attr.name
				// 移除事件属性（on*）
				if (name.startsWith('on')) {
					el.removeAttribute(name)
				}
				// 保留特定的 data-* 属性（样式相关钩子）
				else if (name.startsWith('data-')) {
					if (!['data-class', 'data-style', 'data-theme', 'data-variant'].some((p) => name.includes(p))) {
						el.removeAttribute(name)
					}
				}
				// 只保留白名单中的属性
				else if (!keepAttrs.has(name)) {
					el.removeAttribute(name)
				}
			})
			// 清理 input 值（保留 placeholder 和结构）
			if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
				if (el.type !== 'submit' && el.type !== 'button') {
					el.removeAttribute('value')
					el.value = ''
				}
			}
		})
		// 移除注释节点
		const walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT)
		const comments = []
		while (walker.nextNode()) comments.push(walker.currentNode)
		comments.forEach((c) => c.remove())
		return clone.outerHTML
	}
	
	/**
	 * 分块获取完整 HTML（处理大数据）
	 */
	const getFullHTML = async () => {
		const html = cleanDocumentContent()
		const totalChunks = Math.ceil(html.length / CHUNK_SIZE)

		// 如果内容小，直接返回
		if (totalChunks === 1) return html

		// 大数据分块（需要在 Background 重组）
		const chunks = []
		for (let i = 0; i < totalChunks; i++) {
			progress.value = Math.round((i / totalChunks) * 100)
			chunks.push(html.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))
			// 给事件循环喘息机会，避免阻塞
			await new Promise((resolve) => setTimeout(resolve, 0))
		}

		return chunks.join('')
	}

	/**
	 * 主提取函数
	 */
	const extract = async (options) => {
		isLoading.value = true
		error.value = null
		try {
			let html = ''
			let text = ''
			if (options.fullHTML) {
				html = await getFullHTML()
				text = document.body.innerText.replace(/\s+/g, ' ').slice(0, options.maxTextLength || 50000)
			} else {
				const htmlContent = document.documentElement.outerHTML
				const cleanDoc = new DOMParser().parseFromString(htmlContent, 'text/html')
				const reader = new Readability(cleanDoc)
				const article = reader.parse()
				html = article?.content
				text = article?.textContent
			}
			content.value = {
				title: document.title,
				url: window.location.href,
				description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
				keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '',
				html,
				text,
				structured: extractStructured(),
				metadata: extractMetadata(),
				images: extractImages(),
				links: extractLinks(),
				stats: {
					wordCount: text.split(/\s+/).length,
					charCount: text.length,
					imageCount: document.images.length,
					linkCount: document.links.length
				}
			}
			return content.value
		} catch (e) {
			error.value = e instanceof Error ? e.message : '提取失败'
			throw e
		} finally {
			isLoading.value = false
			progress.value = 100
		}
	}

	return {
		isLoading: computed(() => isLoading.value),
		progress: computed(() => progress.value),
		error: computed(() => error.value),
		content: computed(() => content.value),
		extract
	}
}
