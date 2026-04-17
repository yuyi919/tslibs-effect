import * as Brand from "effect/Brand";
import * as Config from "effect/Config";
import * as Redacted from "effect/Redacted";
import { deepAssign } from "./_helper";
import * as Context from "./context";
import * as Effect from "./effect";
import * as Layer from "./layer";
import * as Option from "./option";

export type BrandedContextType<T, P extends string> =
  T extends Brand.Branded<unknown, P>
    ? T & Brand.Brand<P>
    : Brand.Branded<T, P>;

export type BrandedContextTypeOption<T, P extends string> =
  T extends Brand.Branded<unknown, `${P}:option`>
    ? T & Brand.Brand<`${P}:option`>
    : Brand.Branded<T, `${P}:option`>;

export declare namespace Operators {
  export type GetOption<P extends string, Self, Shape> = Effect.Effect<
    Option.Option<BrandedContextType<Shape, P>>,
    never,
    Self
  >;
  export type GetOrElse<P extends string, Self, Shape> = Effect.Effect<
    BrandedContextType<Shape, P>,
    never,
    Self
  >;
}

export class TaggedBrandContextHelper<P extends string, Self, Shape> {
  private _tagOption: Context.TagClass<
    Self,
    string,
    Option.Option<BrandedContextTypeOption<Shape, P>>
  > | null = null;
  private _brandedOption: Brand.Constructor<
    BrandedContextTypeOption<Shape, P>
  > | null = null;
  private _getOption: Operators.GetOption<P, Self, Shape> | null = null;
  //   new (_: void): Context.TagClassShape<P, Shape>;
  constructor(
    public path: P,
    public tag: Context.TagClass<Self, P, BrandedContextType<Shape, P>>,
    public layer: Layer.LayerWithHelper<Self, never, Self> = Layer.effect(
      tag,
      tag.asEffect()
    ).pipe(Layer.withHelper),
    public branded: Brand.Constructor<
      BrandedContextType<Shape, P>
    > = Brand.nominal<BrandedContextType<Shape, P>>()
  ) {}

  /**
   * 类似于{@link Effect.serviceOption}，但会显示指定依赖
   * @returns
   */
  getOption(): Operators.GetOption<P, Self, Shape> {
    return (this._getOption ||= Effect.serviceOption(this.tag).pipe(
      Effect.flatMap((o) =>
        Option.match(o, {
          onNone: () =>
            this.tagOption.asEffect() as Effect.Effect<
              Option.Option<BrandedContextType<Shape, P>>,
              never,
              Self
            >,
          onSome: (a) => Effect.succeed(o),
        })
      )
    ) as Operators.GetOption<P, Self, Shape>);
  }

  asBranded(shape: Shape): BrandedContextType<Shape, P> {
    return this.branded(
      shape as Brand.Brand.Unbranded<BrandedContextType<Shape, P>>
    );
  }

  getOrElse(or: () => Shape): Operators.GetOrElse<P, Self, Shape> {
    return this.getOption().pipe(
      Effect.map(Option.getOrElse(() => this.asBranded(or())))
    );
  }

  getOrElseEffect(
    or: () => Effect.Effect<Shape>
  ): Operators.GetOrElse<P, Self, Shape> {
    return this.getOption().pipe(
      Effect.flatMap((opt) =>
        Option.getOrElse(opt.pipe(Option.map(Effect.succeed)), () =>
          or().pipe(Effect.map((shape) => this.asBranded(shape)))
        )
      )
    );
  }

  private get brandedOption(): Brand.Constructor<
    BrandedContextTypeOption<Shape, P>
  > {
    return (this._brandedOption ||=
      Brand.nominal<BrandedContextTypeOption<Shape, P>>());
  }

  private get tagOption(): Context.TagClass<
    Self,
    string,
    Option.Option<BrandedContextTypeOption<Shape, P>>
  > {
    return (this._tagOption ||= Context.Tag(this.path + ":option")<
      Self,
      Option.Option<BrandedContextTypeOption<Shape, P>>
    >());
  }

  fromOption(value: Option.Option<Shape>): BrandedContextTypeOption<Shape, P>;
  fromOption(value: Option.Option<Shape>): BrandedContextTypeOption<Shape, P> {
    return this.brandedOption(
      value as Brand.Brand.Unbranded<BrandedContextTypeOption<Shape, P>>
    );
  }

  from(value: Shape): BrandedContextType<Shape, P>;
  from(value: Shape): BrandedContextType<Shape, P> {
    return this.asBranded(value);
  }

  /**
   * @param value
   * 参照
   * ```ts
   * export type Branded = Brand.Branded<{}, "Tag/id">;
   * export class Tag extends Context.Tag("Tag/id")<Tag, Branded>() {}
   * export const Branded = Brand.nromal<Branded>("Tag/id")
   *
   * // 相当于
   * Layer.sync(Tag, () => Branded({}))
   * ```
   */
  sync(value: Shape): Layer.LayerWithHelper<Self, never, never>;
  sync(value: Shape): Layer.LayerWithHelper<Self, never, never> {
    return Layer.sync(this.tag, () => this.from(value)).pipe(Layer.withHelper);
  }

  syncOption(value?: Shape): Layer.LayerWithHelper<Self, never, never>;
  syncOption(value?: Shape): Layer.LayerWithHelper<Self, never, never> {
    return Layer.sync(this.tagOption, () =>
      Option.fromNullable(value).pipe(
        Option.map((value) =>
          this.brandedOption(
            value as Brand.Brand.Unbranded<BrandedContextTypeOption<Shape, P>>
          )
        )
      )
    ).pipe(Layer.withHelper);
  }

  fromRedactedConfig(
    this: Shape extends Redacted.Redacted<string> ? this : never,
    name: string
  ): Layer.LayerWithHelper<Self, Config.ConfigError, never> {
    return Config.redacted(name)
      .asEffect()
      .pipe(
        Effect.map((value) => this.from(value as any)),
        (eff) => Layer.effect(this.tag, eff).pipe(Layer.withHelper)
      );
  }

  fromEffect<V extends Shape, E, R>(
    eff: Effect.Effect<V, E, R>
  ): Layer.LayerWithHelper<Self, E, R> {
    return Layer.effect(
      this.tag,
      eff.pipe(Effect.map((value) => this.from(value)))
    ).pipe(Layer.withHelper);
  }

  fromEffectOption<V extends Shape, E, R>(
    eff: Effect.Effect<Option.Option<V>, E, R>
  ) {
    // const m = eff.pipe(
    //   Effect.map(
    //     Option.map((value) => {
    //       value;
    //       const v = this.from(value);

    //       return v;
    //     }),
    //   ),
    // );
    const m2 = eff.pipe(
      Effect.map((value) => {
        return Option.some(this.fromOption(value));
      })
    );
    return Layer.effect(this.tagOption, m2);
  }

  fromConfig(
    name: string,
    map: (Shape: string) => Shape
  ): Layer.LayerWithHelper<Self, Config.ConfigError, never>;
  fromConfig(
    name: string
  ): Layer.LayerWithHelper<Self, Config.ConfigError, never>;
  fromConfig(
    config: Config.Config<Shape>
  ): Layer.LayerWithHelper<Self, Config.ConfigError, never>;
  fromConfig<C>(
    config: Config.Config<C>,
    map: (Shape: C) => Shape
  ): Layer.LayerWithHelper<Self, Config.ConfigError, never>;
  fromConfig(
    name: string | Config.Config<Shape>,
    map?: (Shape: any) => Shape
  ): Layer.LayerWithHelper<Self, Config.ConfigError, never> {
    const eff = (
      Config.isConfig(name)
        ? name
        : (Config.string(name) as Config.Config<Shape>)
    )
      .asEffect()
      .pipe(Effect.map((val) => this.from(map ? map(val) : (val as Shape))));
    return Layer.effect(this.tag, eff).pipe(Layer.withHelper);
  }

  flatMap<ROut, E = never, RIn = never>(
    f: (value: BrandedContextType<Shape, P>) => Layer.Layer<ROut, E, RIn>
  ): Layer.Layer<ROut, E, Self | RIn>;
  flatMap<ROut, E = never, RIn = never>(
    f: (value: BrandedContextType<Shape, P>) => Layer.Layer<ROut, E, RIn>
  ): Layer.Layer<ROut, E, Self | RIn> {
    return this.layer.pipe(
      Layer.flatMap((e) =>
        f(Context.getUnsafe(e, this.tag) as BrandedContextType<Shape, P>)
      )
    );
  }
}

export type BrandedContextClass<
  Path extends string,
  Identity,
  Shape,
> = Context.TagClass<Identity, Path, BrandedContextType<Shape, Path>> &
  TaggedBrandContextHelper<Path, Identity, Shape>;

export function TaggedBrandContext<const Path extends string>(
  name: Path = crypto.randomUUID() as Path
): <Self, Shape>() => BrandedContextClass<Path, Self, Shape> {
  return <Self, Shape>(): BrandedContextClass<Path, Self, Shape> => {
    const tag = Context.Tag(name)<Self, BrandedContextType<Shape, Path>>();
    return deepAssign(
      tag,
      new TaggedBrandContextHelper<Path, Self, Shape>(name, tag)
    );
  };
}
