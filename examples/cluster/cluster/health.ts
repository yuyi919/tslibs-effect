import { BunHttpServer } from "@effect/platform-bun";
import { Layer } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/unstable/http";

// Define the router with a single route for the root URL
const router = HttpRouter.layer.pipe(
	Layer.provideMerge(
		HttpRouter.add("GET", "/health", HttpServerResponse.text("ok")),
	),
	Layer.provideMerge(Layer.effect(HttpRouter.HttpRouter, HttpRouter.make)),
);

// Specify the port
const port = process.env.HEALTH_CHECK_PORT
	? parseInt(process.env.HEALTH_CHECK_PORT)
	: 3000;

// Create a server layer with the specified port
const ServerLive = BunHttpServer.layer({ port });

export const HealthServerLive = Layer.provide(router, ServerLive);

