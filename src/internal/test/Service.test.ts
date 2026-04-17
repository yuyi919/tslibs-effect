import { Effect } from "../..";
import { describe, expect, it } from "../../BunTester";

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
});
