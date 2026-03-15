export async function register() {
  if (typeof (global as any).__dirname === 'undefined') {
    (global as any).__dirname = process.cwd()
  }
  if (typeof (global as any).__filename === 'undefined') {
    (global as any).__filename = ''
  }
}
