import { ref, unref, watch, onScopeDispose, isRef } from 'vue'

/**
 * 基础事件监听 Hook
 * @param target - 目标元素（可以是 ref 或直接传入）
 * @param event - 事件名称
 * @param handler - 事件处理函数
 * @param options - 监听选项 { capture, passive, once }
 *
 * @example
 * useEventListener(window, 'resize', (e) => console.log(e))
 * useEventListener(buttonRef, 'click', handleClick, { passive: true })
 */
export function useEventListener(target, event, handler, options = {}) {
	// 存储清理函数
	let cleanup = () => {}

	// 注册监听的逻辑
	const addEventListener = (el) => {
		if (!el || !el.addEventListener) return

		el.addEventListener(event, handler, options)

		cleanup = () => {
			el.removeEventListener(event, handler, options)
		}
	}

	// 如果目标是 ref，监听其变化
	if (isRef(target)) {
		watch(
			target,
			(newVal, oldVal) => {
				cleanup() // 清理旧的监听
				if (newVal) addEventListener(newVal)
			},
			{ immediate: true }
		)
	} else {
		// 直接传入的元素
		addEventListener(target)
	}

	// 组件卸载时自动清理
	onScopeDispose(cleanup)

	return {
		stop: cleanup // 手动停止监听
	}
}

/**
 * 键盘事件监听（支持特定按键）
 * @param key - 要监听的按键（如 'Escape', 'Enter', 'ArrowDown'）
 * @param handler - 回调函数
 * @param target - 目标元素，默认为 document
 */
export function useKeydown(key, handler, target = document) {
	return useEventListener(target, 'keydown', (e) => {
		if (e.key === key) {
			handler(e)
		}
	})
}

/**
 * 组合键监听（如 Ctrl+S）
 * @param keys - 按键数组，如 ['Control', 's']
 * @param handler - 回调函数
 * @param preventDefault - 是否阻止默认行为，默认 true
 */
export function useKeyCombo(keys, handler, preventDefault = true) {
	const pressedKeys = new Set()

	return useEventListener(document, 'keydown', (e) => {
		pressedKeys.add(e.key)

		// 检查是否所有需要的键都被按下
		const allKeysPressed = keys.every((k) => pressedKeys.has(k))

		if (allKeysPressed) {
			if (preventDefault) e.preventDefault()
			handler(e)
			pressedKeys.clear()
		}
	})
}

/**
 * 点击外部监听（常用于下拉菜单、模态框等）
 * @param target - 内部元素 ref
 * @param handler - 点击外部时的回调
 * @param events - 触发的事件类型，默认 ['click']
 */
export function useClickOutside(target, handler, events = ['click', 'touchstart']) {
	const stopFns = []

	const listener = (event) => {
		const el = unref(target)
		if (!el) return

		// 判断点击是否在目标元素之外
		if (el === event.target || el.contains(event.target)) {
			return
		}

		handler(event)
	}

	events.forEach((event) => {
		const { stop } = useEventListener(document, event, listener, {
			passive: true,
			capture: true
		})
		stopFns.push(stop)
	})

	return {
		stop: () => stopFns.forEach((fn) => fn())
	}
}

/**
 * 窗口大小变化监听（节流优化）
 * @param handler - 回调函数
 * @param wait - 节流等待时间(ms)，默认 150ms
 */
export function useResize(handler, wait = 150) {
	let timer = null

	const throttledHandler = (e) => {
		if (timer) return
		timer = setTimeout(() => {
			handler(e)
			timer = null
		}, wait)
	}

	return useEventListener(window, 'resize', throttledHandler)
}

/**
 * 滚动监听（带方向判断）
 * @param target - 滚动容器，默认为 window
 * @param options - 配置项 { onScroll, onScrollEnd, endDelay }
 */
export function useScroll(target = window, options = {}) {
	let isScrolling = false
	let scrollTimer = null
	let lastScrollTop = 0

	const handleScroll = (e) => {
		const scrollTop =
			e.target === document ? document.documentElement.scrollTop || document.body.scrollTop : e.target.scrollTop

		// 判断滚动方向
		const direction = scrollTop > lastScrollTop ? 'down' : 'up'
		lastScrollTop = scrollTop

		if (options.onScroll) {
			options.onScroll(e, { scrollTop, direction })
		}

		// 滚动结束判定
		if (!isScrolling) {
			isScrolling = true
		}

		if (scrollTimer) clearTimeout(scrollTimer)
		scrollTimer = setTimeout(() => {
			isScrolling = false
			if (options.onScrollEnd) {
				options.onScrollEnd(e, { scrollTop, direction })
			}
		}, options.endDelay || 200)
	}

	return useEventListener(target, 'scroll', handleScroll, { passive: true })
}

/**
 * 鼠标位置追踪
 */
export function useMouse() {
	const x = ref(0)
	const y = ref(0)

	useEventListener(window, 'mousemove', (e) => {
		x.value = e.clientX
		y.value = e.clientY
	})

	return { x, y }
}

/**
 * 页面可见性变化监听（离开/返回页面）
 * @param onShow - 页面可见时的回调
 * @param onHide - 页面隐藏时的回调
 */
export function useVisibilityChange(onShow, onHide) {
	return useEventListener(document, 'visibilitychange', () => {
		if (document.hidden) {
			onHide?.()
		} else {
			onShow?.()
		}
	})
}
