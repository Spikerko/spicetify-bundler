import { ToggleExtension, GetSpicetifyExtensionsDirectory, Apply, RemoveExtension } from "./Tools/SpicetifyTerminal.ts";
import Bundle, { resetCachedCodeValues } from "./bundler.ts";
import chalk from 'npm:chalk@5.6.0';
import { keypress, type KeyPressEvent } from "jsr:@codemonument/cliffy@1.0.0-rc.3/keypress"
import ora from 'npm:ora@8.2.0';
import { broadcastBundlingError, updateClientContent } from "./WsServer.ts";
import { join, fromFileUrl } from "jsr:@std/path@1.1.2"
import { MinifyJS } from "./Tools/MinifyCode.ts";
import { RequirementsPromiseCheckString, StylesInjectionString } from "./Tools/constants.ts";
import { ResetScreen } from "./Tools/ResetScreen.ts";

export default async function({
    Name,
    MainFile,
    RequireChangesToRefresh
}: { Name: string; MainFile: string; RequireChangesToRefresh: boolean; }) {

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

            if (cssChanged) {
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
            resetCachedCodeValues();

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

        const devReloadTemplatePrepared = `
            ${RequirementsPromiseCheckString}
            ${devReloadTemplate.replace("-1", `http://localhost:9235`).replace("-2", Name)}
        `;
        const devReloadTemplateMinified = devReloadTemplatePrepared;

		await Deno.writeTextFile(
			SpicetifyEntryPointPath,
			devReloadTemplateMinified || devReloadTemplatePrepared
		)

        applyingExtensionOra.stop();

        await Update(false);

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

                        const [cssResult, codeResult] = await Bundle({ Type: "Offline", Name, Version: "offline", MainFile });
                        
                        const cssInjectionCode = StylesInjectionString.replace("INSERT_CSS_HERE", cssResult);
                        const finalCodePrepared = `
                            ${cssInjectionCode}
                            ${RequirementsPromiseCheckString}
                            ${codeResult}
                        `;
                        const finalCodeResult = await MinifyJS(finalCodePrepared);

                        await Deno.writeTextFile(SpicetifyEntryPointPath, finalCodeResult || finalCodePrepared)
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