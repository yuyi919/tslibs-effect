import { isFn } from "@yuyi919/shared-proto/JsTypes";
import type { Cause, Scope } from "effect";
import * as core from "effect/Effect";
import { type Effect, service } from "effect/Effect";
import { mapValues } from "es-toolkit";
import * as Context from "../../core/context.js";
import * as Eff from "../../core/effect.js";
import * as Layer from "../../core/layer.js";
import { GlobalScope } from "./GlobalScope.js";
import type { _, Kind, TypeLambda } from "./TypeLambda.js";

type ServiceProxyWith<Self, Type, ExcluedDeps = never, AdditionDeps = never> = {
  [k in keyof Type]: Type[k] extends (
    ...args: infer Args extends ReadonlyArray<any>
  ) => Effect<infer A, infer E, infer R>
    ? (
        ...args: Readonly<Args>
      ) => Effect<A, E, Exclude<R | AdditionDeps, ExcluedDeps>>
    : Type[k] extends (
          ...args: infer Args extends ReadonlyArray<any>
        ) => PromiseLike<infer A>
      ? (
          ...args: Readonly<Args>
        ) => Effect<A, Cause.UnknownError, Exclude<AdditionDeps, ExcluedDeps>>
      : Type[k] extends (
            ...args: infer Args extends ReadonlyArray<any>
          ) => infer A
        ? (
            ...args: Readonly<Args>
          ) => Effect<A, never, Exclude<AdditionDeps, ExcluedDeps>>
        : Type[k] extends Effect<infer A, infer E, infer R>
          ? Effect<A, E, Exclude<R | AdditionDeps, ExcluedDeps>>
          : Effect<Type[k], never, Exclude<AdditionDeps, ExcluedDeps>>;
};
/**
 * @since 3.9.0
 * @category Models
 */
export type ServiceProxy<Identifier, Shape, R = never> = ServiceProxyWith<
  Identifier,
  Shape,
  never,
  R
>;

export function makeServiceProxy<Identifier, Shape>(
  ServiceClass: Context.Service<Identifier, Shape>
): typeof ServiceClass & ServiceProxy<Identifier, Shape, Identifier>;
export function makeServiceProxy<Identifier, Shape, R = never>(
  ServiceClass: Context.Service<Identifier, Shape>,
  serviceEffect: core.Effect<Shape, never, R>
): typeof ServiceClass & ServiceProxy<Identifier, Shape, R>;
export function makeServiceProxy<Identifier, Shape, R = Identifier>(
  ServiceClass: Context.Service<Identifier, Shape>,
  serviceEffect?: core.Effect<Shape, never, R>
): typeof ServiceClass & ServiceProxy<Identifier, Shape, R> {
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
      const getService =
        serviceEffect ??
        (service(ServiceClass) as core.Effect<
          Shape,
          never,
          R extends Identifier ? never : R
        >);
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
  }) as typeof ServiceClass & ServiceProxy<Identifier, Shape, R>;
}

function layerWithMemoized<Id, Shape, E = never, R = never>(
  serviceTag: Context.Service<Id, Shape>,
  defaultLayer: Layer.Layer<Id, E, R>
): Layer.Layer<Id, E, GlobalScope | Exclude<R, Scope.Scope>> {
  return Layer.effectContext(
    GlobalScope.scoped(
      core.contextWith((context: Context.Context<never>) =>
        Context.getOrUndefined(context, serviceTag)
          ? (core.succeed(context) as never)
          : Layer.buildMemoized(defaultLayer)
      )
    )
  );
}

export function proxyWithDefaultLayer<Identifier, Shape, R = never>(
  serviceClass: Context.Service<Identifier, Shape>,
  defaultLayer: Layer.Layer<Identifier, never, R>
): typeof serviceClass &
  ServiceProxyWith<Identifier, Shape, never, GlobalScope | R> {
  const getService: core.Effect<
    Shape,
    never,
    GlobalScope | Exclude<R, Scope.Scope>
  > = service(serviceClass).pipe(
    Eff.provide(layerWithMemoized(serviceClass, defaultLayer))
  );
  return makeServiceProxy(serviceClass, getService);
}
export type PickShape<Shape> = Omit<
  Shape,
  `~${string}/${string}` | "pipe" | symbol | number
>;
export function makeServiceProxyPromise<Identifier, Shape>(
  target: Context.Service<Identifier, Shape>,
  record: {
    [K in keyof PickShape<Shape>]: true;
  }
) {
  const cache = new Map();
  const map = mapValues(record, (_, prop) => {
    const fn = (...args: Array<any>) => {
      return core.flatMapEager(service(target), (s: any) => {
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
  });
  return Eff.gen(function* () {
    const context = yield* Eff.context<Identifier>();
    return mapValues(
      map,
      (fn) =>
        (...args: any[]) =>
          fn(...args).pipe(Eff.runPromiseWith(context))
    ) as ServiceProxyPromise<Identifier, PickShape<Shape>>;
  });
}

export type ServiceProxyPromise<Identifier, Shape> = ServiceProxyOutputWith<
  Identifier,
  Shape,
  TypeLambda.TPromise
>;

export type ServiceProxyOutputWith<Self, Type, Lambda extends TypeLambda> = {
  [k in keyof Type]: Type[k] extends (
    ...args: infer Args extends ReadonlyArray<any>
  ) => Effect<infer A, infer E, infer R>
    ? Kind<Lambda, Readonly<Args>, E, R, A>
    : Type[k] extends (
          ...args: infer Args extends ReadonlyArray<any>
        ) => PromiseLike<infer A>
      ? Kind<Lambda, Readonly<Args>, Cause.UnknownError, Self, A>
      : Type[k] extends (
            ...args: infer Args extends ReadonlyArray<any>
          ) => infer A
        ? Kind<Lambda, Readonly<Args>, _, Self, A>
        : Type[k] extends Effect<infer A, infer E, infer R>
          ? Kind<Lambda, _, E, Self | R, A>
          : Kind<Lambda, _, _, Self, Type[k]>;
};
