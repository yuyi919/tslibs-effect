import { isFn } from "@yuyi919/shared-proto/JsTypes";
import { GlobalScope } from "@yuyi919/tslibs-effect/GlobalScope";
import { type Cause, type Scope } from "effect";
import * as core from "effect/Effect";
import { type Effect, service } from "effect/Effect";
import { layer, Path as PlatformPath } from "effect/Path";
import * as Context from "../../core/context";
import * as Eff from "../../core/effect";
import * as Layer from "../../core/layer";

/**
 * @since 3.9.0
 * @category Models
 */
export type ServiceProxy<Self, Type> = {
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

type ServiceProxyWithReference<
  Self,
  Type,
  ExcluedDeps = never,
  AdditionDeps = never,
> = {
  [k in keyof Type]: Type[k] extends (
    ...args: infer Args extends ReadonlyArray<any>
  ) => Effect<infer A, infer E, infer R>
    ? (
        ...args: Readonly<Args>
      ) => Effect<A, E, Exclude<Self | R, ExcluedDeps> | AdditionDeps>
    : Type[k] extends (
          ...args: infer Args extends ReadonlyArray<any>
        ) => Promise<infer A>
      ? (
          ...args: Readonly<Args>
        ) => Effect<
          A,
          Cause.UnknownError,
          Exclude<Self, ExcluedDeps> | AdditionDeps
        >
      : Type[k] extends (
            ...args: infer Args extends ReadonlyArray<any>
          ) => infer A
        ? (
            ...args: Readonly<Args>
          ) => Effect<A, never, Exclude<Self, ExcluedDeps> | AdditionDeps>
        : Type[k] extends Effect<infer A, infer E, infer R>
          ? Effect<A, E, Exclude<Self | R, ExcluedDeps> | AdditionDeps>
          : Effect<Type[k], never, Exclude<Self, ExcluedDeps> | AdditionDeps>;
};

export function makeServiceProxy<Identifier, Shape>(
  ServiceClass: Context.Service<Identifier, Shape>
) {
  const cache = new Map();
  return new Proxy(ServiceClass, {
    get(target: any, prop: any, receiver) {
      if (prop in target) {
        const value = Reflect.get(target, prop, receiver);
        return isFn(value) ? value.bind(receiver) : value;
      }
      if (cache.has(prop)) {
        return cache.get(prop);
      }
      const fn = (...args: Array<any>) => {
        return core.flatMapEager(Eff.service(target), (s: any) => {
          if (typeof s[prop] === "function") {
            cache.set(prop, (...args: Array<any>) =>
              core.flatMapEager(service(target), (s: any) =>
                Eff.from(s[prop](...args))
              )
            );
            return Eff.from(s[prop](...args));
          }
          cache.set(
            prop,
            core.flatMapEager(service(target), (s: any) => Eff.from(s[prop]))
          );
          return Eff.from(s[prop]);
        });
      };
      const cn = target.use((s: any) => Eff.from(s[prop]));
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
  }) as ServiceProxy<Identifier, Shape>;
}

export function layerWithMemoized<Id, Shape, E = never, R = never>(
  tag: Context.Service<Id, Shape>,
  layer: Layer.Layer<Shape, E, R>
): Layer.Layer<Shape, E, GlobalScope | Exclude<R, Scope.Scope>> {
  return Layer.effectContext(
    core.contextWith((context: Context.Context<never>) =>
      Context.getOrUndefined(context, tag)
        ? (core.succeed(context) as never)
        : Layer.buildMemoized(layer)
    )
  ).pipe();
}

export function proxyWithDefaultLayer<Identifier, Shape, E = never, R = never>(
  tag: Context.Service<Identifier, Shape>,
  defaultLayer: Layer.Layer<Shape, E, R>
) {
  const cache = new Map();
  return new Proxy(tag, {
    get(target: any, prop: any, receiver) {
      if (prop in target) {
        const value = Reflect.get(target, prop, receiver);
        return isFn(value) ? value.bind(receiver) : value;
      }
      if (cache.has(prop)) {
        return cache.get(prop);
      }
      const getService = service(target).pipe(
        Eff.provide(layerWithMemoized(tag, defaultLayer))
      );
      const fn = (...args: Array<any>) => {
        return core.flatMapEager(getService, (s: any) => {
          if (typeof s[prop] === "function") {
            cache.set(prop, (...args: Array<any>) =>
              core.flatMapEager(getService, (s: any) =>
                Eff.from(s[prop](...args))
              )
            );
            return Eff.from(s[prop](...args));
          }
          cache.set(
            prop,
            core.flatMapEager(getService, (s: any) => Eff.from(s[prop]))
          );
          return Eff.from(s[prop]);
        });
      };
      const cn = core.flatMapEager(getService, (s: any) => Eff.from(s[prop]));
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
  }) as ServiceProxyWithReference<Identifier, Shape, Identifier, GlobalScope>;
}
