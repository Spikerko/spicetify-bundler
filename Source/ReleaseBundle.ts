import chalk from "npm:chalk@5.6.0";
import { ResetScreen } from "./Tools/ResetScreen.ts";
import ora from "npm:ora@8.2.0";
import Bundle, { type CustomBuildOptionsType } from "./bundler.ts";

export type ReleaseBundleType = {
    Version: string;
    Name: string;
	MainFile: string;
    BuildDir: string;
    CustomBuildOptions?: CustomBuildOptionsType;
};

export default async function({
    Version,
    Name,
	MainFile,
    BuildDir,
    CustomBuildOptions
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
        BuildDir,
        CustomBuildOptions
    })

    bundleOra.stop();

    ResetScreen();

    console.log("");
    console.log(chalk.bgGreen("  Finished bundling for release!  "))
    console.log("")

    Deno.exit(0);
}