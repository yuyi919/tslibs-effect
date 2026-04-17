import * as Context from "./context";

export abstract class KVStorePath extends Context.TaggedBrandContext(
  "@app/contract/KVPathConfig"
)<KVStorePath, string>() {}

export abstract class FileLoggerPath extends Context.TaggedBrandContext(
  "@app/contract/FileLogPath"
)<FileLoggerPath, string>() {}
