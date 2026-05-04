import type * as Exit from "effect/Exit";
import type { TypeLambda as HKTTypeLambda, Kind, TypeClass } from "effect/HKT";
import type * as Result from "effect/Result";

export type { Kind, TypeClass };
export type TypeLambda = HKTTypeLambda;

export declare namespace TypeLambda {
  interface Promise_1 extends TypeLambda {
    readonly type: (
      ...args: this["In"] extends readonly unknown[] ? this["In"] : []
    ) => Promise<this["Target"]>;
  }
  export type { Promise_1 as Promise };

  export interface PromiseExit extends TypeLambda {
    readonly type: (
      ...args: this["In"] extends readonly unknown[] ? this["In"] : []
    ) => Promise<Exit.Exit<this["Out2"], this["Target"]>>;
  }
  export interface AsyncResult extends TypeLambda {
    readonly type: (
      ...args: this["In"] extends readonly unknown[] ? this["In"] : []
    ) => Promise<Result.Result<this["Target"], this["Out2"]>>;
  }
}

export type _ = never;
