/* 
    Original code source:
    https://jsr.io/@socali/spices/4.1.1/Spicetify/Terminal.ts
*/

import { dirname, join } from "jsr:@std/path@1.1.2"

let storedSpicetifyDirectory: (Promise<string> | undefined)
export const GetSpicetifyDirectory = (): Promise<string> => {
	if (storedSpicetifyDirectory === undefined) {
		return storedSpicetifyDirectory = (
			(
				new Deno.Command(
					"spicetify",
					{
						args: ["-c"],
					}
				)
			).output()
			.then(({ success, stdout, stderr }) => {
				if (!success) {
					const err = new TextDecoder('utf-8').decode(stderr);
					throw new Error(`Failed to locate Spicetify directory: ${err || 'unknown error'}`);
				}
				return dirname(new TextDecoder('utf-8').decode(stdout).trim());
			})
		)
	} else {
		return storedSpicetifyDirectory
	}
}
export const GetSpicetifyExtensionsDirectory = (
	(): Promise<string> => GetSpicetifyDirectory().then(directory => join(directory, "Extensions"))
)

export const ToggleExtension = (fileName: string, apply: boolean): Promise<void> => (
	new Deno.Command(
		"spicetify",
		{
			args: ["config", "extensions", (apply ? fileName : `${fileName}-`)],
		}
	)
	.output()
	.then(() => undefined)
)

export const RemoveExtension = (path: string, withDevtools?: true): Promise<void> => (
	ToggleExtension(path, false)
	.then(() => Apply(withDevtools))
	.then(GetSpicetifyExtensionsDirectory)
	.then((extensionsDirectory) => Deno.remove(join(extensionsDirectory, path)))
)

export const Apply = (withDevtools?: true): Promise<void> => (
	new Deno.Command(
		"spicetify",
		{
			args: (withDevtools ? ["apply", "enable-devtools"] : ["apply"]),
		}
	)
	.output()
	.then(() => undefined)
)