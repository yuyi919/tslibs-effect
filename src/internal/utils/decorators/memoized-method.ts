export const DO_NOT_CACHE: object = Object.create(null);
export const cacheProperty = "~/Memoize/cache";

const globalMap = new Map<any, Map<any, any>>();

/**
 * The "MemoizeMethod" decorator is used to avoid multiple computations for multiple calls of the same method
 *
 * @param hashFunction Given the same arguments than the decorated method, computes the cache key
 */
export function MemoizeMethod<This, TArgs extends any[], THash, TReturn>(
  hashFunction?: (this: This, ...args: TArgs) => THash
): (
  target: (this: This, ...args: TArgs) => TReturn,
  context: ClassMethodDecoratorContext<
    This,
    (this: This, ...args: TArgs) => TReturn
  >
) => (this: This, ...args: TArgs) => TReturn {
  return (
    target: (this: This, ...args: TArgs) => TReturn,
    context: ClassMethodDecoratorContext<
      This,
      (this: This, ...args: TArgs) => TReturn
    >
  ) => {
    if (!hashFunction) {
      if (target.length > 1) {
        throw TypeError(
          `${String(context.name)}'s "@Memoize()" decorator needs a "hashFunction" to compute a cache key`
        );
      } else if (target.length === 1) {
        hashFunction = (...args: any) => args[0];
      }
    }

    if (hashFunction) {
      if (context.static) {
        context.addInitializer(function (this: This) {
          let caches = globalMap.get(this);
          if (!caches) {
            caches = new Map();
            globalMap.set(this, caches);
          }

          caches.set(context.name, new Map());
        });
      } else {
        context.addInitializer(function (this: This) {
          let caches = (this as any)[cacheProperty];
          if (!caches || !(caches instanceof Map)) {
            Object.defineProperty(this, cacheProperty, {
              value: (caches = new Map()),
            });
          }

          caches.set(context.name, new Map());
        });
      }
      const isStatic = context.static;
      return function (this: This, ...args: TArgs) {
        const key = hashFunction!.apply(this, args);
        if (key === DO_NOT_CACHE) {
          return target.apply(this, args);
        }

        const cache = (
          isStatic ? globalMap.get(this) : (this as any)[cacheProperty]
        )!.get(context.name)!;

        if (!cache.has(key)) {
          const value = target.apply(this, args);
          cache.set(key, value);

          return value;
        }

        return cache.get(key);
      };
    }

    return function (this: This, ...args: TArgs) {
      const value = target.apply(this, args);

      Object.defineProperty(this, context.name, {
        configurable: true,
        value: () => value,
      });

      return value;
    };
  };
}
