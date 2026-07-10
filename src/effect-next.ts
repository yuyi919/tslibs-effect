/** biome-ignore-all assist/source/organizeImports: 无所谓 */
export * as Data from "effect/Data";

export {
  isArray,
  isArrayEmpty as isEmptyArray,
  isArrayEmpty,
  isArrayNonEmpty as isNonEmptyArray,
  isArrayNonEmpty,
  isReadonlyArrayEmpty as isEmptyReadonlyArray,
  isReadonlyArrayEmpty,
  isReadonlyArrayNonEmpty as isNonEmptyReadonlyArray,
  isReadonlyArrayNonEmpty,
  type NonEmptyArray,
  type NonEmptyReadonlyArray,
  type ReadonlyArray,
} from "effect/Array";

export * from "./core/effect.js";
export * from "./Kinds.js";
export { Effect } from "./Kinds.js";
export * as Types from "./Types.js";
export { GlobalScope } from "./GlobalScope.js";
