/** True for same-site paths like "/admin/products"; false for "//host", "/\host" or full URLs. */
export function isSafeRedirect(target: string): boolean {
  return target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\');
}
