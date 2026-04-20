import * as Context from "effect/Context";

export * from "effect/Context";

export type Tag<Identifier, Shape> = import("effect/Context").Service<
  Identifier,
  Shape
>;
/**
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Context, Layer } from "effect"
 *
 * class MyTag extends Context.Tag("MyTag")<
 *  MyTag,
 *  { readonly myNum: number }
 * >() {
 *  static Live = Layer.succeed(this, { myNum: 108 })
 * }
 * ```
 *
 * @since 2.0.0
 * @category constructors
 */
export function Tag<const Id extends string>(
  id: Id
): <Self, Shape>() => TagClass<Self, Id, Shape> {
  return <Self, Shape>() => Context.Service<Self, Shape>()(id);
}

export interface TagClass<Self, Id extends string, Type>
  extends Context.ServiceClass<Self, Id, Type> {}

/**
 * Creates a new `Tag` instance with an optional key parameter.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Context } from "effect"
 *
 * assert.strictEqual(Context.GenericTag("PORT").key === Context.GenericTag("PORT").key, true)
 * ```
 *
 * @since 2.0.0
 * @category constructors
 */
export const GenericTag: <Identifier, Shape = Identifier>(
  key: string
) => Tag<Identifier, Shape> = (key) => Context.Service(key);

export type { Context as t } from "effect/Context";
export * from "effect/Context";

export * from "./TaggedBrandContext";
