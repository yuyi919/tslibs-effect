import { isFn } from "@yuyi919/shared-proto/JsTypes";
import { Effect, Layer } from "effect";
import * as Context from "../../../core/context.js";

const defaultCwd = () => process.cwd();
const Tag = Context.Reference<Effect.Effect<string | null>>(
  "@backend/CurrentWorkingDirectory",
  {
    defaultValue: () => Effect.sync(defaultCwd),
  }
);
export const CurrentWorkingDirectory = Object.assign(
  Effect.suspend(() =>
    Effect.flatten(Tag.asEffect()).pipe(
      Effect.map((cwd) => cwd ?? defaultCwd())
    )
  ),
  {
    defaultCwd,
    layerWith(inject: (() => Effect.Effect<string>) | Effect.Effect<string>) {
      return Layer.succeed(
        Tag,
        (isFn(inject)
          ? Effect.suspend(inject)
          : inject) as Effect.Effect<string>
      );
    },
    layer(inject: (() => string) | string) {
      return Layer.succeed(
        Tag,
        isFn(inject) ? Effect.sync(inject) : Effect.succeed(inject)
      );
    },
  }
);
