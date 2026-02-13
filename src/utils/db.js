import { openDB } from 'idb'
import { DB_CHAT_VERSION, DB_CHAT_NAME, DB_STORE_META, DB_STORE_MSG } from '@/utils/constant.js'

export async function getDB() {
	return openDB(DB_CHAT_NAME, DB_CHAT_VERSION, {
		upgrade(db, oldVersion, newVersion, tx) {
			// 建表（表不存在才建，防止重复）
			if (!db.objectStoreNames.contains(DB_STORE_MSG)) db.createObjectStore(DB_STORE_MSG)
			if (!db.objectStoreNames.contains(DB_STORE_META)) db.createObjectStore(DB_STORE_META)

			// 旧版本 → 新版本的迁移脚本（示例）
			if (oldVersion < 2) {
				// 例如给 v1 补建 sessionsMeta
				if (!db.objectStoreNames.contains(DB_STORE_META)) db.createObjectStore(DB_STORE_META)
			}
			if (oldVersion < 3) {
				// 例如给 v2 加索引（需要索引时）
				// const metaStore = tx.objectStore(DB_STORE_META)
				// metaStore.createIndex('updated_idx', 'updated')
			}
		},
		blocked() {
			// 其它标签页占用数据库时提示
			console.warn('[DB] 被旧版本阻塞，请关闭其它扩展标签页后刷新')
		}
	})
}
