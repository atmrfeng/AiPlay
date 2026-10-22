// 站内确认框（替代 window.confirm，避免宿主弹窗打断页面）
import { reactive } from 'vue'

interface ConfirmOptions {
  title?: string
  text?: string
  okText?: string
  cancelText?: string
  danger?: boolean
}

export const confirmState = reactive({
  open: false,
  title: '确认操作',
  text: '',
  okText: '确定',
  cancelText: '取消',
  danger: false,
  resolve: null as null | ((v: boolean) => void),
})

export function confirmDialog(opts: ConfirmOptions = {}): Promise<boolean> {
  // 若已有弹窗，先当作取消，避免叠加
  if (confirmState.resolve) confirmState.resolve(false)
  confirmState.title = opts.title ?? '确认操作'
  confirmState.text = opts.text ?? ''
  confirmState.okText = opts.okText ?? '确定'
  confirmState.cancelText = opts.cancelText ?? '取消'
  confirmState.danger = opts.danger ?? false
  confirmState.open = true
  return new Promise<boolean>((resolve) => {
    confirmState.resolve = resolve
  })
}

export function resolveConfirm(value: boolean) {
  const fn = confirmState.resolve
  confirmState.resolve = null
  confirmState.open = false
  fn?.(value)
}
