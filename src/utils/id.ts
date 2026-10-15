/** 生成本地唯一 id：优先用 crypto.randomUUID，非安全上下文（局域网 IP 访问）下退回随机串 */
export function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'q-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}
