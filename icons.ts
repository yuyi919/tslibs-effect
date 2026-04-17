import { runMain } from "@effect/platform-bun/BunRuntime";
import { isObj } from "@yuyi919/shared-proto/JsTypes";
import { Exit, Layer, pipe, Schema } from "effect";
import { FileSystem } from "effect/FileSystem";
import {} from "effect/Predicate";
// import { runMain } from "@effect/platform-node/NodeRuntime";
import {
	FetchHttpClient,
	HttpClient,
	HttpClientResponse,
} from "effect/unstable/http";
import { KeyValueStore, Persistence } from "effect/unstable/persistence";
import { isString, pascalCase } from "es-toolkit";
import * as Eff from "./src/effect-next";
// import { IconifyJSON } from "@iconify/types";
import { FsUtilsLive } from "./src/FsUtils";

// import { PlatformLoggerAlive } from "@server/effect/logger";

type IconifyJSON = { prefix: string; icons: any };
const SchemaIconifyJSON = Schema.Any.pipe(
	Schema.refine(
		(a): a is IconifyJSON => isObj(a) && isString(a.prefix), // && isObj(a.icons),
	),
);

// class FetchIconifyJsonRequest extends Schema.TaggedRequest<FetchIconifyJsonRequest>()(
//   "FetchIconifyJson",
//   {
//     failure: Schema.declare(HttpClientError.isHttpClientError),
//     success: SchemaIconifyJSON,
//     payload: {
//       id: Schema.String,
//     },
//   },
// ) {
//   [PrimaryKey.symbol]() {
//     return `@iconify/json:${this.id}`;
//   }
// }

const fetchWithId = (id: string) => {
	return Eff.gen(function* () {
		// console.log(`fetch https://esm.sh/@iconify/json/json/${id}.json`);
		// return yield* Eff.promise(() => fetch(`https://esm.sh/@iconify/json/json/${id}.json`).then(res => res.json()))
		return yield* HttpClient.get(
			`https://esm.sh/@iconify/json/json/${id}.json`,
		).pipe(
			Eff.flatMap(HttpClientResponse.filterStatusOk),
			Eff.flatMap(HttpClientResponse.schemaBodyJson(SchemaIconifyJSON)),
			Eff.retry({ times: 3 }),
			Eff.catchAll(
				(e) => (console.log("error", e), Eff.succeed({} as IconifyJSON)),
			),
		);
	});
};

// const fetchWith = (req: FetchIconifyJsonRequest) => {
//   return fetchWithId(req.id);
// };

const fetchIconifyJsonBatched = Eff.batched(
	(ids: string[]) => {
		return Eff.gen(function* () {
			yield* Eff.log(`Api.batched(fetchIconifyJsonBatched) ${ids.join("|")}`);
			return yield* Eff.all(ids.map(fetchWithId));
		});
	},
	{ cached: true },
);

const fetchIconifyJson = Eff.persistedBatch(
	(ids: string[]) => {
		return Eff.gen(function* () {
			yield* Eff.log(`Api.batched(fetchIconifyJsonBatchedP) ${ids.join("|")}`);
			return yield* Eff.all(ids.map(fetchWithId), {
				concurrency: 2,
			});
			// .pipe(Eff.map((a) => a.map((a) => ({ prefix: a.prefix }))));
		});
	},
	{
		// memCached: true,
		storeId: "@iconify/json",
		timeToLive: (_id, exit) =>
			Exit.isSuccess(exit) && Schema.is(SchemaIconifyJSON)(exit.value)
				? "10 minutes"
				: 0,
	},
);
// ApiHelper.persisted(fetchWithId, {
//   // memCached: true,
//   storeId: "@iconify/json",
//   timeToLive: (_id, exit) =>
//     Exit.isSuccess(exit) && Schema.validate(SchemaIconifyJSON)(exit.value)
//       ? Infinity
//       : 0,
// });

// const FetchIconifyJsonResolverBatched = RequestResolver.makeBatched(
//   (reqs: NonEmptyArray<FetchIconifyJsonRequest>) =>
//     Eff.log(
//       `[FetchIconifyJsonResolverBatched] @iconify/json/json/${reqs
//         .map((o) => o.id)
//         .join("|")}.json`,
//     ).pipe(
//       Eff.flatMap(() =>
//         Eff.all(
//           reqs.map((req) =>
//             fetchIconifyJsonBatched(req.id).pipe(
//               Eff.flatMap((res) => Eff.Request.succeed(req, res)),
//             ),
//           ),
//           { batching: true },
//         ),
//       ),
//     ),
// ).pipe(RequestResolver.contextFromEffect);

// const FetchIconifyJsonResolverSimple =
//   RequestResolver.fromEffectTagged<FetchIconifyJsonRequest>()({
//     FetchIconifyJson: (reqs) => {
//       console.log(
//         `[FetchIconifyJsonResolverSimple] @iconify/json/json/${reqs
//           .map((o) => o.id)
//           .join("|")}.json`,
//       );
//       return Eff.forEach(reqs, (req) => fetchIconifyJsonBatched(req.id), {
//         batching: true,
//       });
//     },
//   }).pipe(RequestResolver.contextFromEffect);

// const FetchIconifyJsonResolver = FetchIconifyJsonResolverSimple.pipe(
//   Eff.flatMap(
//     ApiHelper.persistedResolver({
//       storeId: "@iconify/json",
//       timeToLive: (_req, exit) =>
//         Exit.isSuccess(exit) && Schema.validate(SchemaIconifyJSON)(exit.value)
//           ? Infinity
//           : 0,
//     }),
//   ),
// );
// const fetchIconify = (id: string) =>
//   Eff.request(new FetchIconifyJsonRequest({ id }), FetchIconifyJsonResolver);

const program = Eff.gen(function* () {
	// const resolver = yield* FetchIconifyJsonResolver;
	// const fetchIconifyBatch = (id: string) =>
	//   FetchIconifyJsonResolver.pipe(
	//     Eff.flatMap((resolver) =>
	//       Eff.request(new FetchIconifyJsonRequest({ id }), resolver),
	//     ),
	//     Eff.map((e) => e.prefix),
	//   );
	// yield* destDts("ic", { convertId, exportName: "MuiIcons" });
	// yield* destDts("line-md", { exportName: "LineMdIcons" });

	// console.log(
	//   yield* Eff.all([fetchIconifyBatch("mdi"), fetchIconifyBatch("line-md")], {
	//     batching: true,
	//   }),
	// );
	// yield* Eff.all(
	//   [fetchIconifyJsonBatchedP("mdi"), fetchIconifyJsonBatchedP("line-md")],
	//   { batching: true },
	// ).pipe(Eff.catchAllCause(Eff.logError));
	// yield* Eff.all(
	//   [fetchIconifyJsonBatched("mdi"), fetchIconifyJsonBatched("line-md")],
	//   { batching: true },
	// );
	// yield* FsUtils.writeJSONL("./icons/mdi.jsonl", [{ a: 1 }], {
	//   recursive: true,
	// });
	const result = yield* Eff.all(
		[
			destDts("mdi", { exportName: "MdiIcons" }),
			destDts("mdi", { exportName: "MdiIcons" }),
			destDts("iconoir", { exportName: "Iconoir" }),
			destDts("line-md", { exportName: "LineMdIcons" }),
			destDts("ic", { convertId: convertId, exportName: "MuiIcons" }),
		],
		{ concurrency: 5 },
	);
	function destDts(
		iconSetId: string,
		{
			convertId,
			exportName,
		}: { convertId?: (id: string) => string; exportName?: string },
	) {
		const nromalize = (id: string): string => {
			if (/^\d/.test(id)) {
				const prefix = /^\d+/.exec(id)![0];
				return id.replace(prefix, iconSetId + prefix + "-");
			}
			return id;
		};
		return Eff.gen(function* () {
			const json = yield* fetchIconifyJson(iconSetId).pipe(
				Eff.withRequestCaching(false),
			);
			yield* Eff.logTrace(
				json.prefix + ":" + JSON.stringify(json).slice(0, 100) + "..",
			);
			const entries = yield* Eff.sync(() => Object.keys(json.icons));
			// console.log(json.prefix);
			let document = `import type SvgIcon from "@mui/material/SvgIcon";`;
			const keySets = new Set<string>();
			document += `\nexport declare const ${
				exportName ?? `${pascalCase(json.prefix)}Icon`
			}: {`;
			for (const id of entries) {
				//   document += `
				// declare export const ${pascalCase(id)}: typeof SvgIcon`;
				const replaceId = pascalCase(nromalize(convertId ? convertId(id) : id));
				//   if (replaceId === "WifiTetheringErrorRounded") {
				//     console.log("WifiTetheringErrorRounded", id);
				//   }
				if (!keySets.has(replaceId)) {
					keySets.add(replaceId);
					document += `
  ${replaceId}: typeof SvgIcon`;
				}
			}

			document += "\n}\n";
			const fs = yield* FileSystem;

			yield* fs.writeFileString(`./icons/${iconSetId}.d.ts`, document);
		});
	}
});

const HttpClientAlive = Eff.service(HttpClient.HttpClient).pipe(
	Eff.map(HttpClient.filterStatusOk),
	Eff.tap(() => Eff.logTrace("[HttpClientLayer] initialize")),
	HttpClient.layerMergedContext,
	Layer.provide(FetchHttpClient.layer),
);
pipe(
	program,
	Eff.scoped,
	// Eff.provide(
	//   Lmdb.layerResult({
	//     path: "./lmdb",
	//   }),
	// ),
	// Eff.provide(PlatformLoggerAlive({ minimumLogLevel: "Trace" })),
	Eff.provide(
		Persistence.layerKvs.pipe(
			Layer.provideMerge(KeyValueStore.layerFileSystem("./icons_cache")),
			Layer.provideMerge(FsUtilsLive),
			Layer.provideMerge(HttpClientAlive),
			Layer.provideMerge(Eff.Logger.layer([Eff.Logger.consolePretty()])),
			// Layer.provideMerge(Layer.succeed()),
		),
	),
	Eff.provideService(Eff.FiberRef.MinimumLogLevel, "Trace"),
	Eff.catchAll(Eff.logFatal),
	runMain({ disableErrorReporting: false }),
);
// import { Eff, RequestResolver } from "effect/exp"

const suffixMap = Object.entries({
	"-rounded": "round-",
	"-outlined": "outline-",
	"-sharp": "sharp-",
	"-two-tone": "twotone-",
	"": "baseline-",
});

function convertId(id: string): string {
	const prefix = "baseline-";
	for (const [suffix, prefix] of suffixMap) {
		if (id.startsWith(prefix)) {
			return id.replace(prefix, "") + suffix;
		}
	}
	return prefix + id; // 默认情况，未匹配到后缀
}
