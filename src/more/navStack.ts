/** More destination stack — Back pops exactly one step. */

export type MoreRouteId = 'roster' | 'history' | 'settings' | 'dev' | 'sync'

export type MoreStack = MoreRouteId[]

export function pushRoute(stack: MoreStack, route: MoreRouteId): MoreStack {
  if (stack[stack.length - 1] === route) return stack
  return [...stack, route]
}

export function popRoute(stack: MoreStack): MoreStack {
  if (stack.length === 0) return stack
  return stack.slice(0, -1)
}

export function topRoute(stack: MoreStack): MoreRouteId | null {
  return stack[stack.length - 1] ?? null
}
