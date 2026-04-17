/**
 * Node.js implementation of `ChildProcessSpawner`.
 *
 * @since 4.0.0
 */
import type * as Arr from "effect/Array";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as ChildProcess from "effect/unstable/process/ChildProcess";
import { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner";
/**
 * Layer providing the `NodeChildProcessSpawner` implementation.
 *
 * @since 4.0.0
 * @category Layers
 */
export declare const layer: Layer.Layer<ChildProcessSpawner, never, FileSystem.FileSystem | Path.Path>;
/**
 * Result of flattening a pipeline of commands.
 *
 * @since 4.0.0
 * @category Models
 */
export interface FlattenedPipeline {
    readonly commands: Arr.NonEmptyReadonlyArray<ChildProcess.StandardCommand>;
    readonly pipeOptions: ReadonlyArray<ChildProcess.PipeOptions>;
}
/**
 * Flattens a `Command` into an array of `StandardCommand`s along with pipe
 * options for each connection.
 *
 * @since 4.0.0
 * @category Utilities
 */
export declare const flattenCommand: (command: ChildProcess.Command) => FlattenedPipeline;
//# sourceMappingURL=NodeChildProcessSpawner.d.ts.map