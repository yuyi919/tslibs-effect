import { lazy, pureMemoize } from "@yuyi919/shared-proto/Functions";
import { useThis } from "@yuyi919/shared-proto/Proto";

/**
 * The "MemoizeGetter" decorator is used to avoid multiple computations for multiple calls of the same getter
 */
export function MemoizeGetter<This, TReturn>(
  target: (this: This) => TReturn,
  context: ClassGetterDecoratorContext<This, TReturn>
): (this: This) => TReturn {
  if (context.static) return lazy(target);
  return useThis(pureMemoize((self: This) => target.call(self)));
}
