import { isFn } from "@yuyi919/shared-proto/JsTypes";
import { Effect, Layer } from "effect";
import * as Context from "../../../core/context.js";

const Tag = Context.Reference<Effect.Effect<string | void>>(
  "@backend/CurrentWorkingDirectory",
  {
    defaultValue: () => Effect.sync(() => process.cwd()),
  }
);

export const CurrentWorkingDirectory = Object.assign(
  Tag.use((cwd) => cwd),
  {
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
