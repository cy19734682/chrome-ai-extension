/**
 * 数据库版本
 * @type {number}
 */
export const DB_CHAT_VERSION = 2
/**
 * 数据库名称
 * @type {string}
 */
export const DB_CHAT_NAME = 'ai_chat_db'
/**
 * 会话元数据表名
 * @type {string}
 */
export const DB_STORE_META = 'chat_items'
/**
 * 会话消息数据表名
 * @type {string}
 */
export const DB_STORE_MSG = 'chat_history'
/**
 * 连接端口名称
 * @type {string}
 */
export const CONNECT_PORT_NAME = 'AI_CHAT'
/**
 * 连接端口消息键名
 */
export const CHAT_PORT_KEYS = {
	SWITCH: 'switch',
	START: 'start',
	CHAT: 'chat',
	STOP: 'stop',
	HISTORY: 'history',
	DELTA: 'delta',
	DONE: 'done',
	ERROR: 'error'
}
