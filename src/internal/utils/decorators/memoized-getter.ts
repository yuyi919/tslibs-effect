import { pureMemoize } from "@yuyi919/shared-proto/Functions";
import { useThis } from "@yuyi919/shared-proto/Proto";

export interface Lazy<A> {
  (): A;
}

export function lazy<F extends () => any>(init: F): F;
export function lazy<A>(init: () => A): Lazy<A>;
export function lazy<A>(init: () => A): Lazy<A> {
  return ((value?: A) =>
    function (this: any) {
      return (
        init && ((value = init.call(this)), ((init as any) = null!)), value!
      );
    })();
}

/**
 * The "MemoizeGetter" decorator is used to avoid multiple computations for multiple calls of the same getter
 */
export function MemoizeGetter<This, TReturn>(
  target: (this: This) => TReturn,
  context: ClassGetterDecoratorContext<This, TReturn>
): (this: This) => TReturn {
  if (context.static) {
    return lazy(target);
  }
  return useThis(pureMemoize((self: This) => target.call(self)));
}
