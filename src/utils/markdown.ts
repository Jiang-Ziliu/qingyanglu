import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })

/** 极简消毒：去掉脚本 / 样式 / 事件属性 / javascript: 协议，防止注入 */
function sanitize(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '')
}

export function renderMarkdown(src: string): string {
  if (!src) return ''
  const html = marked.parse(src) as string
  return sanitize(html)
}

/** 纯文本摘要，用于列表展示 */
export function plainExcerpt(src: string, max = 60): string {
  const text = (src || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*`_~\-]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? text.slice(0, max) + '…' : text
}
