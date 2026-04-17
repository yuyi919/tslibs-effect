// import { NonEmptyReadonlyArray } from "effect/Array";
// import { Literal, Never, Class as SchemaClass } from "effect/Schema";
// import * as AST from "effect/SchemaAST";

export * from "effect/Schema";
export { TaggedErrorClass as TaggedError } from "effect/Schema";

// /**
//  * @category constructors
//  * @since 3.10.0
//  */
// export function Literals<
//   const Literals extends NonEmptyReadonlyArray<AST.LiteralValue>,
// >(literals: Literals): Literal<Literals>;
// // export function Literals(): Never;
// export function Literals<const Literals extends ReadonlyArray<AST.LiteralValue>>(
//   literals: Literals
// ): SchemaClass<Literals[number]>;
// export function Literals<const Literals extends ReadonlyArray<AST.LiteralValue>>(
//   literals: Literals
// ): SchemaClass<Literals[number]> | Never {
//   return Literal(...literals);
// }
