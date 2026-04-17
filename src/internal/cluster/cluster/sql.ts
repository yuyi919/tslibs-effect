import { SqliteClient } from "@effect/sql-sqlite-bun";

export const SqliteLayer = SqliteClient.layer({
	filename: "./.data/effect_cluster.db",
	create: true,
});

export const SqlLayer = SqliteLayer;
