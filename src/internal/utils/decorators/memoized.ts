import { MemoizeGetter } from "./memoized-getter";
import { MemoizeMethod } from "./memoized-method";
/**
 * The "MemoizeGetter" decorator is used to avoid multiple computations for multiple calls of the same getter
 * @example
 * ```ts
 * @Memoize
 * get layerReal() {
 *   return PlatformFS.Default.pipe(Layer.provideMerge(layerRealFs()));
 * }
 * ```
 */
export function Memoize<This, TReturn>(
  target: (this: This) => TReturn,
  context: ClassGetterDecoratorContext<This, TReturn>
): (this: This) => TReturn;
/**
 * The "MemoizeMethod" decorator is used to avoid multiple computations for multiple calls of the same method
 *
 * @param hashFunction - Given the same arguments than the decorated method, computes the cache key
 *
 * @example
 * ```ts
 * class Domain {
 *   @Memoize()
 *   once(): string {
 *     this.callCount++;
 *     return "OK";
 *   }
 * }
 * ```
 * */
export function Memoize<This, TArgs extends unknown[], THash, TReturn>(
  hashFunction?: (this: This, ...args: TArgs) => THash
): (
  target: (this: This, ...args: TArgs) => TReturn,
  context: ClassMethodDecoratorContext<
    This,
    (this: This, ...args: TArgs) => TReturn
  >
) => (this: This, ...args: TArgs) => TReturn;
export function Memoize<This, TReturn>(
  unknownTarget?: any,
  context?: ClassGetterDecoratorContext<This, TReturn>
) {
  if (unknownTarget && context?.kind === "getter") {
    return MemoizeGetter(unknownTarget, context);
  }
  return MemoizeMethod(unknownTarget);
}
