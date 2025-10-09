import { ToggleExtension, GetSpicetifyExtensionsDirectory, Apply, RemoveExtension } from "./Tools/SpicetifyTerminal.ts";
import Bundle, { type CustomBuildOptionsType } from "./bundler.ts";
import chalk from 'npm:chalk@5.6.0';
import { keypress, type KeyPressEvent } from "jsr:@codemonument/cliffy@1.0.0-rc.3/keypress"
import ora from 'npm:ora@8.2.0';
import { broadcastBundlingError, updateClientContent } from "./WsServer.ts";
import { join, fromFileUrl } from "jsr:@std/path@1.1.2"
import { MinifyJS } from "./Tools/MinifyCode.ts";
import { RequirementsPromiseCheckString } from "./Tools/constants.ts";
import { ResetScreen } from "./Tools/ResetScreen.ts";
import { _clear_code_cache } from "./caches.ts";
import { currentPort } from "../cli.ts";
import { hash } from "./Tools/random.ts";

export default async function({
    Name,
    MainFile,
    RequireChangesToRefresh,
    CustomBuildOptions
}: { Name: string; MainFile: string; RequireChangesToRefresh: boolean; CustomBuildOptions?: CustomBuildOptionsType; }) {

    const SpicetifyEntryPoint: string = `${Name}.mjs`;
    const SpicetifyEntryPointPath: string = join(await GetSpicetifyExtensionsDirectory(), SpicetifyEntryPoint)

    let lastCss: string | undefined = undefined;
    let lastCode: string | undefined = undefined;
 
    let testVersion = 0;

    let bundling = false;

    const DisplayDoneStatus = () => {
		console.log("")
		console.log(chalk.bgGreen("  Done!  "))
	}

    const DisplayPrompt = () => {
		console.log("")
		console.log(
			chalk.green("[Enter] to bundle"), "|",
			chalk.red("[Q] to Exit"), "|",
			chalk.white("[L] to Exit and Store Locally")
		)
	}

    const bundlingOra = ora(chalk.bgGrey("  Bundling...  "));
    const applyingExtensionOra = ora(chalk.bgBlack("  Applying Extension...  "));
    const unapplyingExtension = ora(chalk.bgBlack(`  Unapplying Extension...  `));
    const storingExtensionOra = ora(chalk.bgBlack(`  Storing Extension...  `));

    const Update = async (displayStatuses: boolean = true) => {
        if (bundling) return undefined;

        bundling = true;

        ResetScreen();

        console.log("");
        bundlingOra.start();

        testVersion++

        try {
            const bundleResult = await Bundle(
                {
                    Type: "Development",
                    Version: testVersion.toString(),
                    Name,
                    MainFile,
                    CustomBuildOptions,
                }
            );

            const [css, code] = bundleResult;
            bundlingOra.stop();

            //ResetScreen();

            if (displayStatuses) DisplayDoneStatus();

            const cssChanged = (testVersion === 1 ? false : (lastCss !== css));
            const codeChanged = (testVersion === 1 ? false : (lastCode !== code));
            
            if (RequireChangesToRefresh === true && !cssChanged && !codeChanged && testVersion !== 1) {
                console.log("");
                console.log(chalk.bgGrey("  Nothing changed. Doing nothing.  "));
            }

            if (cssChanged && !codeChanged) {
                updateClientContent("StyleChange", css);
            }

            if (codeChanged || !RequireChangesToRefresh) {
                updateClientContent("CodeChange", undefined)
            }

            lastCss = css;
            lastCode = code;

            if (displayStatuses) DisplayPrompt();

            bundling = false
        } catch (error) {
            _clear_code_cache();

            ResetScreen();

            bundlingOra.stop();
            console.log("")
            console.log(chalk.bgRed("  Failed to bundle. See error below  "))
            console.log(error);
            console.log("")
            console.log(chalk.bgRed("  Failed to bundle. See error above  "))

            broadcastBundlingError();

            DisplayPrompt()

            bundling = false
        }
    }

    ResetScreen();


    {
		console.log("")
		applyingExtensionOra.start();

		const url = new URL("./Templates/DevReload.mjs", import.meta.url)
		const devReloadTemplate = await (
			(url.protocol === "file:")
			? Deno.readTextFile(fromFileUrl(url))
			: (
				fetch(url.href)
				.then(response => response.text())
			)
		)

        applyingExtensionOra.stop();

        await Update(false);

        const extHash = await hash(Name);

        const devReloadTemplatePrepared = `
            ${RequirementsPromiseCheckString}
            ${devReloadTemplate.replace("-1", `http://localhost:${currentPort}`).replace("-2", Name).replace("-3", extHash)}
        `;
        const devReloadTemplateMinified = devReloadTemplatePrepared;

		await Deno.writeTextFile(
			SpicetifyEntryPointPath,
			devReloadTemplateMinified || devReloadTemplatePrepared
		)

        applyingExtensionOra.start();

		await ToggleExtension(SpicetifyEntryPoint, true);
        await Apply(true);

        applyingExtensionOra.stop();

		DisplayDoneStatus();

        DisplayPrompt();
	}

    {
        const kp = keypress();
		kp.addEventListener(
			"keydown",
			async (event: KeyPressEvent) => {
				if (
					(event.ctrlKey && event.key === "c")
					|| (event.key === "q")
					|| (event.key === "l")
				) {
					kp.dispose()

					ResetScreen()

					if (event.key === "l") {
						console.log("")
						storingExtensionOra.start();

                        const [_cssResult, codeResult] = await Bundle({ Type: "Offline", Name, Version: "offline", MainFile });

                        await Deno.writeTextFile(SpicetifyEntryPointPath, codeResult)
						await Apply();

						storingExtensionOra.stop();
					} else {
						console.log("")
						unapplyingExtension.start();

						await RemoveExtension(SpicetifyEntryPoint);

						unapplyingExtension.stop();
					}

					console.log("")
					console.log(chalk.bgBlack(`  Finished Cleanup Process. Exiting...  `))
					console.log("")

					Deno.exit(0);
				} else if (event.key === "return") {
					Update(true)
				}
			}
		)
	}
}
