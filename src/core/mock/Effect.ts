import { pureMemoize } from "@yuyi919/shared-proto/Functions";
import { isFn } from "@yuyi919/shared-proto/JsTypes";
import { type Cause, Context, Fiber, type Scope } from "effect";
import * as core from "effect/Effect";
import { type Effect, map, service } from "effect/Effect";
import type { Equivalence } from "effect/Equivalence";
import type { LazyArg } from "effect/Function";
import type {
  Contravariant,
  Covariant,
  NoExcessProperties,
} from "effect/Types";
import { deepAssign } from "../_helper.js";
import { from } from "../effect.js";
import * as Layer from "../layer.js";

/**
 * @internal
 */
export const EffectTypeId = "~effect/Effect";
export type EffectTypeId = typeof EffectTypeId;

/**
 *
 * @param f
 * @param eq
 * @returns
 * @since 2.0.0
 * @category Caching
 */
export const cachedFunction: <A, B, E, R>(
  f: (a: A) => Effect<B, E, R>,
  eq?: Equivalence<A>
) => Effect<(a: A) => Effect<B, E, R>> = (f, eq) => {
  return core.gen(function* () {
    const ctx = yield* core.context<never>();
    // const map = yield* FiberMap.make<never>();
    const keys = pureMemoize(
      (a: any) => core.runForkWith(ctx)(core.cached(f(a))),
      {
        key: (a) => JSON.stringify(a),
      }
    );
    const get = (a: any) => Fiber.join(keys(a)).pipe(core.flatten);
    return get;
  });
};

/**
 * @since 2.0.0
 * @category Models
 */
export declare namespace Tag {
  /**
   * @since 2.0.0
   * @category Models
   */
  export interface ProhibitedType {
    Service?: `property "Service" is forbidden`;
    Identifier?: `property "Identifier" is forbidden`;
    _op?: `property "_op" is forbidden`;
    of?: `property "of" is forbidden`;
    context?: `property "context" is forbidden`;
    key?: `property "key" is forbidden`;
    stack?: `property "stack" is forbidden`;
    name?: `property "name" is forbidden`;
    pipe?: `property "pipe" is forbidden`;
    use?: `property "use" is forbidden`;
  }

  /**
   * @since 2.0.0
   * @category Models
   */
  export type AllowedType =
    | (Record<PropertyKey, any> & ProhibitedType)
    | string
    | number
    | symbol;

  /**
   * @since 3.9.0
   * @category Models
   */
  export type Proxy<Self, Type> = {
    [k in keyof Type as Type[k] extends (
      ...args: infer Args extends ReadonlyArray<any>
    ) => infer Ret
      ? ((...args: Readonly<Args>) => Ret) extends Type[k]
        ? k
        : never
      : k]: Type[k] extends (
      ...args: infer Args extends ReadonlyArray<any>
    ) => Effect<infer A, infer E, infer R>
      ? (...args: Readonly<Args>) => Effect<A, E, Self | R>
      : Type[k] extends (
            ...args: infer Args extends ReadonlyArray<any>
          ) => Promise<infer A>
        ? (...args: Readonly<Args>) => Effect<A, Cause.UnknownError, Self>
        : Type[k] extends (
              ...args: infer Args extends ReadonlyArray<any>
            ) => infer A
          ? (...args: Readonly<Args>) => Effect<A, never, Self>
          : Type[k] extends Effect<infer A, infer E, infer R>
            ? Effect<A, E, Self | R>
            : Effect<Type[k], never, Self>;
  };
}

/**
 * @since 3.9.0
 * @category Context
 */
export declare namespace Service {
  /**
   * @since 3.9.0
   */
  export interface ProhibitedType {
    Service?: `property "Service" is forbidden`;
    Identifier?: `property "Identifier" is forbidden`;
    Default?: `property "Default" is forbidden`;
    DefaultWithoutDependencies?: `property "DefaultWithoutDependencies" is forbidden`;
    _op_layer?: `property "_op_layer" is forbidden`;
    _op?: `property "_op" is forbidden`;
    of?: `property "of" is forbidden`;
    make?: `property "make" is forbidden`;
    context?: `property "context" is forbidden`;
    key?: `property "key" is forbidden`;
    stack?: `property "stack" is forbidden`;
    name?: `property "name" is forbidden`;
    pipe?: `property "pipe" is forbidden`;
    use?: `property "use" is forbidden`;
    _tag?: `property "_tag" is forbidden`;
  }

  /**
   * @since 3.9.0
   */
  export type AllowedType<Key extends string, Make> =
    MakeAccessors<Make> extends true
      ? Record<PropertyKey, any> & {
          readonly [K in Extract<
            keyof MakeService<Make>,
            keyof ProhibitedType
          >]: K extends "_tag" ? Key : ProhibitedType[K];
        }
      : Record<PropertyKey, any> & { readonly _tag?: Key };

  /**
   * @since 3.9.0
   */
  export type Class<Self, Key extends string, Make> = {
    "~proxy": Tag.Proxy<Self, MakeService<Make>>;
    new (
      _: MakeService<Make>
    ): MakeService<Make> & {
      readonly _tag: Key;
    };
    readonly use: <X>(
      body: (_: Self) => X
    ) => [X] extends [Effect<infer A, infer E, infer R>]
      ? Effect<A, E, R | Self>
      : [X] extends [PromiseLike<infer A>]
        ? Effect<A, Cause.UnknownError, Self>
        : Effect<X, never, Self>;
    readonly make: (_: MakeService<Make>) => Self;
  } & Context.Service<Self, Self> &
    Effect<Self, never, Self> & {
      key: Key;
    } & (MakeAccessors<Make> extends true
      ? Tag.Proxy<Self, MakeService<Make>>
      : {}) &
    (MakeDeps<Make> extends never
      ? {
          readonly Default: HasArguments<Make> extends true
            ? (
                ...args: MakeArguments<Make>
              ) => Layer.Layer<Self, MakeError<Make>, MakeContext<Make>>
            : Layer.Layer<Self, MakeError<Make>, MakeContext<Make>>;
        }
      : {
          readonly DefaultWithoutDependencies: HasArguments<Make> extends true
            ? (
                ...args: MakeArguments<Make>
              ) => Layer.Layer<Self, MakeError<Make>, MakeContext<Make>>
            : Layer.Layer<Self, MakeError<Make>, MakeContext<Make>>;

          readonly Default: HasArguments<Make> extends true
            ? (
                ...args: MakeArguments<Make>
              ) => Layer.Layer<
                Self,
                MakeError<Make> | MakeDepsE<Make>,
                Exclude<MakeContext<Make>, MakeDepsOut<Make>> | MakeDepsIn<Make>
              >
            : Layer.Layer<
                Self,
                MakeError<Make> | MakeDepsE<Make>,
                Exclude<MakeContext<Make>, MakeDepsOut<Make>> | MakeDepsIn<Make>
              >;
        });

  /**
   * @since 3.9.0
   */
  export type MakeService<Make> = Make extends {
    readonly effect: Effect<infer _A, infer _E, infer _R>;
  }
    ? _A
    : Make extends { readonly scoped: Effect<infer _A, infer _E, infer _R> }
      ? _A
      : Make extends {
            readonly effect: (
              ...args: infer _Args
            ) => Effect<infer _A, infer _E, infer _R>;
          }
        ? _A
        : Make extends {
              readonly scoped: (
                ...args: infer _Args
              ) => Effect<infer _A, infer _E, infer _R>;
            }
          ? _A
          : Make extends { readonly sync: LazyArg<infer A> }
            ? A
            : Make extends { readonly succeed: infer A }
              ? A
              : never;

  /**
   * @since 3.9.0
   */
  export type MakeError<Make> = Make extends {
    readonly effect: Effect<infer _A, infer _E, infer _R>;
  }
    ? _E
    : Make extends { readonly scoped: Effect<infer _A, infer _E, infer _R> }
      ? _E
      : Make extends {
            readonly effect: (
              ...args: infer _Args
            ) => Effect<infer _A, infer _E, infer _R>;
          }
        ? _E
        : Make extends {
              readonly scoped: (
                ...args: infer _Args
              ) => Effect<infer _A, infer _E, infer _R>;
            }
          ? _E
          : never;

  /**
   * @since 3.9.0
   */
  export type MakeContext<Make> = Make extends {
    readonly effect: Effect<infer _A, infer _E, infer _R>;
  }
    ? _R
    : Make extends { readonly scoped: Effect<infer _A, infer _E, infer _R> }
      ? Exclude<_R, Scope.Scope>
      : Make extends {
            readonly effect: (
              ...args: infer _Args
            ) => Effect<infer _A, infer _E, infer _R>;
          }
        ? _R
        : Make extends {
              readonly scoped: (
                ...args: infer _Args
              ) => Effect<infer _A, infer _E, infer _R>;
            }
          ? Exclude<_R, Scope.Scope>
          : never;

  /**
   * @since 3.9.0
   */
  export type MakeDeps<Make> = Make extends {
    readonly dependencies: ReadonlyArray<Layer.Any>;
  }
    ? Make["dependencies"][number]
    : never;

  /**
   * @since 3.9.0
   */
  export type MakeDepsOut<Make> = Contravariant.Type<
    MakeDeps<Make>[Layer.LayerTypeId]["_ROut"]
  >;

  /**
   * @since 3.9.0
   */
  export type MakeDepsE<Make> = Covariant.Type<
    MakeDeps<Make>[Layer.LayerTypeId]["_E"]
  >;

  /**
   * @since 3.9.0
   */
  export type MakeDepsIn<Make> = Covariant.Type<
    MakeDeps<Make>[Layer.LayerTypeId]["_RIn"]
  >;

  /**
   * @since 3.9.0
   */
  export type MakeAccessors<Make> = Make extends { readonly accessors: true }
    ? true
    : false;

  /**
   * @since 3.16.0
   */
  export type MakeArguments<Make> = Make extends {
    readonly effect: (
      ...args: infer Args
    ) => Effect<infer _A, infer _E, infer _R>;
  }
    ? Args
    : Make extends {
          readonly scoped: (
            ...args: infer Args
          ) => Effect<infer _A, infer _E, infer _R>;
        }
      ? Args
      : never;

  /**
   * @since 3.16.0
   */
  export type HasArguments<Make> = Make extends {
    readonly scoped: (
      ...args: ReadonlyArray<any>
    ) => Effect<infer _A, infer _E, infer _R>;
  }
    ? true
    : Make extends {
          readonly effect: (
            ...args: ReadonlyArray<any>
          ) => Effect<infer _A, infer _E, infer _R>;
        }
      ? true
      : false;
}

type MissingSelfGeneric =
  `Missing \`Self\` generic - use \`class Self extends Effect.Service<Self>()...\``;

/**
 * Simplifies the creation and management of services in Effect by defining both
 * a `Tag` and a `Layer`.
 *
 * **Details**
 *
 * This function allows you to streamline the creation of services by combining
 * the definition of a `Context.Tag` and a `Layer` in a single step. It supports
 * various ways of providing the service implementation:
 * - Using an `effect` to define the service dynamically.
 * - Using `sync` or `succeed` to define the service statically.
 * - Using `scoped` to create services with lifecycle management.
 *
 * It also allows you to specify dependencies for the service, which will be
 * provided automatically when the service is used. Accessors can be optionally
 * generated for the service, making it more convenient to use.
 *
 * **Example**
 *
 * ```ts
 * import { Effect } from 'effect';
 *
 * class Prefix extends Effect.Service<Prefix>()("Prefix", {
 *  sync: () => ({ prefix: "PRE" })
 * }) {}
 *
 * class Logger extends Effect.Service<Logger>()("Logger", {
 *  accessors: true,
 *  effect: Effect.gen(function* () {
 *    const { prefix } = yield* Prefix
 *    return {
 *      info: (message: string) =>
 *        Effect.sync(() => {
 *          console.log(`[${prefix}][${message}]`)
 *        })
 *    }
 *  }),
 *  dependencies: [Prefix.Default]
 * }) {}
 * ```
 *
 * @since 3.9.0
 * @category Context
 * @experimental might be up for breaking changes
 */
export const Service: <Self = never>() => [Self] extends [never]
  ? MissingSelfGeneric
  : {
      <
        const Key extends string,
        const Make extends
          | {
              readonly scoped:
                | Effect<Service.AllowedType<Key, Make>, any, any>
                | ((
                    ...args: any
                  ) => Effect<Service.AllowedType<Key, Make>, any, any>);
              readonly dependencies?: ReadonlyArray<Layer.Any>;
              readonly accessors?: boolean;
            }
          | {
              readonly effect:
                | Effect<Service.AllowedType<Key, Make>, any, any>
                | ((
                    ...args: any
                  ) => Effect<Service.AllowedType<Key, Make>, any, any>);
              readonly dependencies?: ReadonlyArray<Layer.Any>;
              readonly accessors?: boolean;
            }
          | {
              readonly sync: LazyArg<Service.AllowedType<Key, Make>>;
              readonly dependencies?: ReadonlyArray<Layer.Any>;
              readonly accessors?: boolean;
            }
          | {
              readonly succeed: Service.AllowedType<Key, Make>;
              readonly dependencies?: ReadonlyArray<Layer.Any>;
              readonly accessors?: boolean;
            },
      >(
        key: Key,
        make: Make
      ): Service.Class<Self, Key, Make>;
      <
        const Key extends string,
        const Make extends NoExcessProperties<
          {
            readonly scoped:
              | Effect<Service.AllowedType<Key, Make>, any, any>
              | ((
                  ...args: any
                ) => Effect<Service.AllowedType<Key, Make>, any, any>);
            readonly dependencies?: ReadonlyArray<Layer.Any>;
            readonly accessors?: boolean;
          },
          Make
        >,
      >(
        key: Key,
        make: Make
      ): Service.Class<Self, Key, Make>;
      <
        const Key extends string,
        const Make extends NoExcessProperties<
          {
            readonly effect:
              | Effect<Service.AllowedType<Key, Make>, any, any>
              | ((
                  ...args: any
                ) => Effect<Service.AllowedType<Key, Make>, any, any>);
            readonly dependencies?: ReadonlyArray<Layer.Any>;
            readonly accessors?: boolean;
          },
          Make
        >,
      >(
        key: Key,
        make: Make
      ): Service.Class<Self, Key, Make>;
      <
        const Key extends string,
        const Make extends NoExcessProperties<
          {
            readonly sync: LazyArg<Service.AllowedType<Key, Make>>;
            readonly dependencies?: ReadonlyArray<Layer.Any>;
            readonly accessors?: boolean;
          },
          Make
        >,
      >(
        key: Key,
        make: Make
      ): Service.Class<Self, Key, Make>;
      <
        const Key extends string,
        const Make extends NoExcessProperties<
          {
            readonly succeed: Service.AllowedType<Key, Make>;
            readonly dependencies?: ReadonlyArray<Layer.Any>;
            readonly accessors?: boolean;
          },
          Make
        >,
      >(
        key: Key,
        make: Make
      ): Service.Class<Self, Key, Make>;
    } = () => _Service as any;
function _Service() {
  const [id, maker] = arguments;
  const proxy = "accessors" in maker ? maker["accessors"] : false;

  const TagClass: any = class extends Context.Service()(id, {
    make(this: any, ...args) {
      return new this(...(args as any[]));
    },
  }) {
    constructor(self: any) {
      super(void 0 as never);
      Object.assign(this, self);
    }
  };
  const hasDeps = "dependencies" in maker && maker.dependencies.length > 0;
  const layerName = hasDeps ? "DefaultWithoutDependencies" : "Default";
  let layerCache: Layer.Any | undefined;
  let isFunction = false;
  if ("effect" in maker) {
    isFunction = typeof maker.effect === "function";
    Object.defineProperty(TagClass, layerName, {
      get(this: any) {
        if (isFunction) {
          return function (this: typeof TagClass) {
            return Layer.effect(
              TagClass,
              map(maker.effect.apply(null, arguments), (_) => new this(_))
            );
          }.bind(this);
        }
        return (layerCache ??= Layer.effect(
          TagClass,
          map(maker.effect, (_) => new this(_))
        ));
      },
    });
  } else if ("scoped" in maker) {
    isFunction = typeof maker.scoped === "function";
    Object.defineProperty(TagClass, layerName, {
      get(this: any) {
        if (isFunction) {
          return function (this: typeof TagClass) {
            return Layer.effect(
              TagClass,
              map(maker.scoped.apply(null, arguments), (_) => new this(_))
            );
          }.bind(this);
        }
        return (layerCache ??= Layer.effect(
          TagClass,
          map(maker.scoped, (_) => new this(_))
        ));
      },
    });
  } else if ("sync" in maker) {
    Object.defineProperty(TagClass, layerName, {
      get(this: any) {
        return (layerCache ??= Layer.sync(
          TagClass,
          () => new this(maker.sync())
        ));
      },
    });
  } else {
    Object.defineProperty(TagClass, layerName, {
      get(this: any) {
        return (layerCache ??= Layer.succeed(
          TagClass,
          new this(maker.succeed)
        ));
      },
    });
  }

  if (hasDeps) {
    let layerWithDepsCache: Layer.Any | undefined;
    Object.defineProperty(TagClass, "Default", {
      get(this: any) {
        if (isFunction) {
          return function (this: typeof TagClass) {
            return Layer.provide(
              this.DefaultWithoutDependencies.apply(null, arguments),
              maker.dependencies
            );
          };
        }
        return (layerWithDepsCache ??= Layer.provide(
          this.DefaultWithoutDependencies,
          maker.dependencies
        ));
      },
    });
  }
  deepAssign(TagClass, TagClass.asEffect());
  return proxy === true ? makeTagProxy(TagClass) : TagClass;
}
const makeTagProxy = (
  TagClass: Context.Service<any, any> & Record<PropertyKey, any>
) => {
  const cache = new Map();
  return new Proxy(TagClass, {
    get(target: any, prop: any, receiver) {
      if (prop in target) {
        const value = Reflect.get(target, prop, receiver);
        return isFn(value) ? value.bind(receiver) : value;
      }
      if (cache.has(prop)) {
        return cache.get(prop);
      }
      const fn = (...args: Array<any>) => {
        return core.flatMap(service(target), (s: any) => {
          if (typeof s[prop] === "function") {
            cache.set(prop, (...args: Array<any>) =>
              core.flatMap(service(target), (s: any) => from(s[prop](...args)))
            );
            return from(s[prop](...args));
          }
          cache.set(
            prop,
            core.flatMap(service(target), (s: any) => from(s[prop]))
          );
          return from(s[prop]);
        });
      };
      const cn = target.use((s: any) => from(s[prop]));
      // @effect-diagnostics-next-line floatingEffect:off
      Object.assign(fn, cn);
      const apply = fn.apply;
      const bind = fn.bind;
      const call = fn.call;
      const proto = Object.setPrototypeOf({}, Object.getPrototypeOf(cn));
      proto.apply = apply;
      proto.bind = bind;
      proto.call = call;
      Object.setPrototypeOf(fn, proto);
      cache.set(prop, fn);
      return fn;
    },
  });
};
