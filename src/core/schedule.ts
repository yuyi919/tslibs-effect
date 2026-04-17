import * as Effect from "effect/Effect";
import { dual, pipe } from "effect/Function";
import * as Schedule from "effect/Schedule";
import * as SynchronizedRef from "effect/SynchronizedRef";
import { structEntries } from "./_helper";
import * as Duration from "./duration";

export * from "effect/Schedule";
export { type Schedule as t } from "effect/Schedule";

// /** @internal */
// export const isSchedule = (u: unknown): u is Schedule.Schedule<any, any, any> =>
//   hasProperty(u, Schedule.ScheduleTypeId);
export type MatchOption<
  K extends PropertyKey,
  E extends Record<K, PropertyKey>,
  T = any,
> = {
  [_K in E[K]]?: T;
};

const toOption = <E, R1>(
  option?: RetryMatchOption<E> | Schedule.Schedule<any, E, R1>
) => {
  return Schedule.isSchedule(option)
    ? { schedule: option }
    : {
        ...option,
        schedule: option?.schedule ?? Schedule.forever,
      };
};

export type RetryMatchOption<A> = Pick<
  Effect.Repeat.Options<A>,
  "times" | "schedule"
>;

export function retryMatchWith<
  K extends PropertyKey,
  E extends Record<K, PropertyKey>,
  R1 = never,
>(
  key: K,
  matcher: MatchOption<K, E, number>,
  options: RetryMatchOption<E>
): <A, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R1 | R>;
export function retryMatchWith<
  K extends PropertyKey,
  E extends Record<K, PropertyKey>,
  R1 = never,
>(
  key: K,
  matcher: MatchOption<K, E, number>,
  schedule?: Schedule.Schedule<any, E, R1>
): <A, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R1 | R>;
export function retryMatchWith<
  K extends PropertyKey,
  E extends Record<K, PropertyKey>,
  R1 = never,
>(
  key: K,
  matcher: MatchOption<K, E, number>,
  options2?: RetryMatchOption<E> | Schedule.Schedule<any, E, R1>
): <A, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R1 | R> {
  const configMap = structEntries(matcher).map(
    (kv) => [kv[0], { times: kv[1] ?? 1 }] as const
  );

  const init = Object.fromEntries(
    configMap.map(([k]) => [k, 0])
  ) as MatchOption<K, E, number>;
  const matchTimes = Object.fromEntries(
    configMap.map(
      ([key, opt]) =>
        [
          key,
          (
            timesRef: SynchronizedRef.SynchronizedRef<MatchOption<K, E, number>>
          ) =>
            pipe(
              SynchronizedRef.get(timesRef),
              Effect.map((e) => e[key]! >= 0 && e[key]! < opt.times),
              Effect.tap((allow) =>
                allow
                  ? SynchronizedRef.update(timesRef, (e) => ({
                      ...e,
                      [key]: e[key]! + 1,
                    }))
                  : Effect.void
              )
            ),
        ] as const
    )
  ) as MatchOption<
    K,
    E,
    (
      timesRef: SynchronizedRef.SynchronizedRef<MatchOption<K, E, number>>
    ) => Effect.Effect<boolean, never, never>
  >;

  const options = toOption(options2);
  return <A, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R1 | R> =>
    Effect.flatMap(SynchronizedRef.make(init), (refs) =>
      Effect.retry(self, {
        ...options,
        while: (error) => matchTimes[error[key]!]?.(refs) ?? false,
      })
    );
}

/**
 * 重试，但可根据Tagged Error的tag决定重试最大次数
 * @param matcher
 * @param options - 可指定总计重试的最大次数，所有tag类型的错误总和不能超过`options.times`;
 * 也可指定时间表，用法参照{@link Effect.retry}
 */
export function retryMatchTagged<
  const E extends { readonly _tag: PropertyKey },
  Options extends RetryMatchOption<E> = RetryMatchOption<E>,
>(
  matcher: {
    readonly [K in E["_tag"]]?: number;
  },
  options?: Options
): <A, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
/**
 * 重试，但可根据Tagged Error的tag决定重试最大次数
 * @param matcher
 * @param schedule - 指定时间表，用法参照{@link Effect.retry}
 */
export function retryMatchTagged<
  E extends { readonly _tag: string },
  Schedule extends Schedule.Schedule<any, E, any> = Schedule.Schedule<
    any,
    E,
    any
  >,
>(
  matcher: {
    readonly [K in E["_tag"]]?: number;
  },
  schedule?: Schedule
): <A, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
export function retryMatchTagged<
  E extends { readonly _tag: PropertyKey },
  R1 = never,
>(
  matcher: {
    [K in E["_tag"]]?: number;
  },
  options?: RetryMatchOption<E> | Schedule.Schedule<any, E, R1>
): <A, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R1 | R> {
  return retryMatchWith("_tag", matcher, options as RetryMatchOption<E>);
}

export function exponentialWithIndex(
  base: Duration.DurationInput,
  factor: number = 2.0
) {
  return Schedule.forever.pipe(
    Schedule.map((i) => ({
      i,
      delay: Duration.times(
        Duration.fromInputUnsafe(base),
        Math.pow(factor, i)
      ),
    })),
    Schedule.addDelay((i) => Effect.succeed(i.delay))
  );
}

export const addExponentialDelay: {
  (
    base: Duration.DurationInput,
    factor?: number
  ): <In, R>(
    self: Schedule.Schedule<number, In, R>
  ) => Schedule.Schedule<number, In, R>;
  <In, R>(
    self: Schedule.Schedule<number, In, R>,
    base: Duration.DurationInput,
    factor?: number
  ): Schedule.Schedule<number, In, R>;
} = dual(
  (arg) => Schedule.isSchedule(arg[0]),
  function <In, R>(
    self: Schedule.Schedule<number, In, R>,
    base: Duration.DurationInput,
    factor: number = 2.0
  ) {
    return self.pipe(
      Schedule.addDelay((i) =>
        Effect.succeed(
          Duration.times(Duration.fromInputUnsafe(base), Math.pow(factor, i))
        )
      )
    );
  }
);
