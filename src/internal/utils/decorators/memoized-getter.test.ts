import { describe, it } from "node:test";
import { Memoize as MemoizeGetter } from "./memoized.js";

describe("Getter", () => {
  it("works without decorator, for reference", (t) => {
    class Foo {
      public callCount: number = 0;

      public get testedGetter(): string {
        this.callCount++;

        return "OK";
      }
    }

    const instance = new Foo();
    t.assert.equal(instance.callCount, 0);

    t.assert.equal(instance.testedGetter, "OK");
    t.assert.equal(instance.callCount, 1);

    t.assert.equal(instance.testedGetter, "OK");
    t.assert.equal(instance.callCount, 2);
  });

  it("works with decorator", (t) => {
    class Foo {
      public callCount: number = 0;

      @MemoizeGetter
      public get testedGetter(): string {
        this.callCount++;

        return "OK";
      }
    }

    const instanceA = new Foo();
    t.assert.equal(instanceA.callCount, 0);

    const instanceB = new Foo();
    t.assert.equal(instanceB.callCount, 0);

    t.assert.equal(instanceA.testedGetter, "OK");
    t.assert.equal(instanceA.callCount, 1);
    t.assert.equal(instanceB.callCount, 0);

    t.assert.equal(instanceA.testedGetter, "OK");
    t.assert.equal(instanceA.callCount, 1);
    t.assert.equal(instanceB.callCount, 0);

    t.assert.equal(instanceB.testedGetter, "OK");
    t.assert.equal(instanceA.callCount, 1);
    t.assert.equal(instanceB.callCount, 1);

    t.assert.equal(instanceB.testedGetter, "OK");
    t.assert.equal(instanceA.callCount, 1);
    t.assert.equal(instanceB.callCount, 1);
  });
  it("works with static decorator", (t) => {
    class Foo {
      public static callCount: number = 0;

      @MemoizeGetter
      public static get testedGetter(): string {
        this.callCount++;

        return "OK";
      }
    }

    const instanceA = Foo;
    t.assert.equal(instanceA.callCount, 0);

    t.assert.equal(instanceA.testedGetter, "OK");
    t.assert.equal(instanceA.callCount, 1);

    t.assert.equal(instanceA.testedGetter, "OK");
    t.assert.equal(instanceA.callCount, 1);

    t.assert.equal(instanceA.testedGetter, "OK");
    t.assert.equal(instanceA.callCount, 1);
  });
});
