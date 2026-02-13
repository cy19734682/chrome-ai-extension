import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('python',   python)

const md = new MarkdownIt({
	html: false,                    // 关闭 HTML 标签，安全
	linkify: true,                  // 自动识别链接
	highlight(str, lang) {
		if (lang && hljs.getLanguage(lang)) {
			try {
				return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}` +
					`</code></pre>`
			} catch (_) {}
		}
		return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
	}
})

export default (text = '') => md.render(text)