import { createPinia } from 'pinia'
import piniaPersist from 'pinia-plugin-persist'

export * from './mcp.js'
export * from './chat.js'

const store = createPinia()
store.use(piniaPersist)

export function setupStore(app) {
	app.use(store)
}

export { store }
