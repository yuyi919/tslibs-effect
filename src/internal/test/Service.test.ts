import { describe, expect, it } from "../../BunTester.js";
import { Effect } from "../../index.js";

describe("Service", () => {
  it("isEffect", () => {
    class Prefix extends Effect.Service<Prefix>()("Prefix", {
      sync: () => ({ prefix: "PRE" }),
      accessors: true,
    }) {}

    expect(Effect.isEffect(Prefix)).toBe(true);
  });

  it.gen("accessors", function* () {
    class Prefix extends Effect.Service<Prefix>()("Prefix", {
      effect: Effect.gen(function* () {
        return { prefix: "PRE", eff: Effect.succeed("A") };
      }),
      accessors: true,
    }) {}

    const prefix = yield* Prefix.prefix.pipe(Effect.provide(Prefix.Default));
    expect(prefix).toBe("PRE");
    const eff = yield* Prefix.eff.pipe(Effect.provide(Prefix.Default));
    expect(eff).toBe("A");
  });

  it.gen("make", function* () {
    class Prefix extends Effect.Service<Prefix>()("Prefix", {
      effect: Effect.gen(function* () {
        return { prefix: "PRE" };
      }),
      accessors: true,
    }) {}
    const make = Prefix.make;
    const prefix = make({ prefix: "PRE" });
    expect(prefix).toEqual(new Prefix({ prefix: "PRE" }));
  });

  it.gen("this", function* () {
    const thisRef: { this: any } = { this: null };
    class LogThis extends Effect.Service<LogThis>()("LogThis", {
      effect: Effect.gen(function* () {
        return {
          logThis: async function () {
            return function (this: any) {
              thisRef.this = this;
            };
          },
        };
      }),
      accessors: true,
    }) {}
    yield* Effect.gen(function* () {
      const logThis = yield* LogThis;
      (yield* Effect.promise(() => logThis.logThis())).call(1);
    }).pipe(Effect.provide(LogThis.Default));
    expect(thisRef.this).toEqual(1);
    yield* Effect.gen(function* () {
      const log2 = yield* LogThis.logThis();
      log2.call(2);
    }).pipe(Effect.provide(LogThis.Default));
    expect(thisRef.this).toEqual(2);
  });
  it.gen("this 2", function* () {
    const thisRef: { this: any } = { this: null };
    function define() {
      return Effect.gen(function*() {
        yield* Effect.logDebug(2);
        return async function (this: any) {
          thisRef.this = this;
        };
      })
    }
    class LogThis extends Effect.Service<LogThis>()("LogThis", {
      effect: Effect.gen(function* () {
        return {
          logThis() {
            return define()
          }
        };
      }),
      accessors: true,
    }) {}
    // yield* Effect.gen(function* () {
    //   const logThis = yield* LogThis;
    //   (yield* Effect.sync(() => logThis.logThis())).call(1);
    // }).pipe(Effect.provide(LogThis.Default));
    // expect(thisRef.this).toEqual(1);
    yield* Effect.gen(function* () {
      const consts = {
        log: yield* LogThis.logThis()
      };
      consts.log.apply(2, []);
    }).pipe(Effect.provide(LogThis.Default));
    expect(thisRef.this).toEqual(2);
  });
});
