// deno-lint-ignore ban-ts-comment
// @ts-ignore
import ora from "npm:ora";
import DevBundle from "./Source/DevBundle.ts";
import ReleaseBundle from "./Source/ReleaseBundle.ts";
import { startWSServer, wsRunning } from "./Source/WsServer.ts";
import chalk from "npm:chalk";
import { ResetScreen } from "./Source/Tools/ResetScreen.ts";

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

    const wsPreparingOra = ora(chalk.bgBlue("  Starting the Websocket server...  "))

    wsPreparingOra.start();

    startWSServer();

    await new Promise<void>(
        resolve => {
            const interval = setInterval(
                () => {
                    if (wsRunning === true) {
                        clearInterval(interval);
                        resolve();
                    };
                },
                10
            );
        }
    );

    ResetScreen();

    wsPreparingOra.stop();

    ResetScreen();

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