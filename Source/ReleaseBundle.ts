import chalk from "npm:chalk";
import { ResetScreen } from "./Tools/ResetScreen.ts";
import ora from "npm:ora";
import Bundle from "./bundler.ts";

export type ReleaseBundleType = {
    Version: string;
    Name: string;
	MainFile: string;
    BuildDir: string;
};

export default async function({
    Version,
    Name,
	MainFile,
    BuildDir
}: ReleaseBundleType) {
    ResetScreen();

    const bundleOra = ora(chalk.bgWhite("  Bundling for Release...  "));

    console.log("")
	bundleOra.start();

    await Bundle({
        Type: "Release",
        Version,
        Name,
        MainFile,
        BuildDir
    })

    bundleOra.stop();

    ResetScreen();

    console.log("");
    console.log(chalk.bgGreen("  Finished bundling for release!  "))
    console.log("")

    Deno.exit(0);
}