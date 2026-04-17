import type { LogLevel, Severity } from "effect/LogLevel";

export * from "effect/LogLevel";

export const None: LogLevel = "None";
export const Trace: LogLevel & Severity = "Trace";
export const Debug: LogLevel & Severity = "Debug";
export const Info: LogLevel & Severity = "Info";
export const Warn: LogLevel & Severity = "Warn";
export const Warning: LogLevel & Severity = "Warn";
export const Fatal: LogLevel & Severity = "Fatal";
export const Error: LogLevel & Severity = "Error";
export const All: LogLevel = "All";

export function fromLiteral(literal: LogLevel): LogLevel {
	return literal;
}
