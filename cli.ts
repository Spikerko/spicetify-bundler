import DevBundle from "./Source/DevBundle.ts";
import ReleaseBundle from "./Source/ReleaseBundle.ts";
import { startWSServer, wsRunning } from "./Source/WsServer.ts";
import chalk from 'npm:chalk@5.6.0';
import ora from 'npm:ora@8.2.0';
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
        Port?: number
    };

export let currentPort = 9235;

export async function Bundle({
    Type,
    Version,
    Name,
    EntrypointFile,
    // @ts-expect-error RequireChangesToRefresh only exists on Development type
    RequireChangesToRefresh,
    // @ts-expect-error BuildDir only exists on Release type
    OutputDir,
    // @ts-expect-error Port only exists on Development type
    Port,
}: RunBundlerType) {

    if (Port !== undefined && typeof Port === "number") {
        currentPort = Port;
    }

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