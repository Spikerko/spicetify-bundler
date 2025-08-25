// deno-lint-ignore ban-ts-comment
// @ts-ignore
import DevBundle from "./Source/DevBundle.ts";
import ReleaseBundle from "./Source/ReleaseBundle.ts";
import { startWSServer } from "./Source/WsServer.ts";

export type RunBundlerType =
    | {
        Type: "Release";
        Version: string;
        Name: string;
        EntrypointFile?: string;
        OutputDir?: string;
    }
    | {
        Type: "Development";
        Version?: string;
        Name: string;
        EntrypointFile?: string;
        RequireChangesToRefresh?: boolean;
    };


// deno-lint-ignore require-await
export async function Bundle({
    Type,
    Version,
    Name,
    EntrypointFile,
    // @ts-expect-error RequireChangesToRefresh only exists on Development or Offline type
    RequireChangesToRefresh,
    // @ts-expect-error BuildDir only exists on Release type
    OutputDir
}: RunBundlerType) {

    const mainFileProcessed = EntrypointFile ?? "./src/index.tsx";

    startWSServer();

    if (Type === "Development") {
        if (!Type || !Name) {
            throw new Error("Missing required properties");
        }
        const requireChangesToRefresh = RequireChangesToRefresh ?? true;
        DevBundle({ Name, MainFile: mainFileProcessed, RequireChangesToRefresh: requireChangesToRefresh });
    } else if (Type === "Release") {
        if (!Type || !Version || !Name) {
            throw new Error("Missing required properties");
        }
        ReleaseBundle({ Version, Name, MainFile: mainFileProcessed, BuildDir: (OutputDir ?? "./dist") })
    } else {
        throw new Error("Type Unavailable");
    }
}