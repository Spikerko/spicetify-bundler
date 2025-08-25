import { externalGlobalPlugin } from "./EsbuildPlugins/externalGlobalPlugin.ts";
import * as esbuild from "npm:esbuild@0.25.9";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.11.1";

import { compileAsync as SASSCompile } from "npm:sass@1.90.0";
import PostCSS from "npm:postcss@8.5.6";
import AutoPrefixer from "npm:autoprefixer@10.4.21";
import CSSNano from "npm:cssnano@7.1.1";
import CSSAdvancedNanoPreset from "npm:cssnano-preset-advanced@7.0.9";
import { dirname, join, resolve, relative } from "jsr:@std/path@1.1.2";
import { MinifyJS } from "./Tools/MinifyCode.ts";
import { RequirementsPromiseCheckString, StylesInjectionString } from "./Tools/constants.ts";

export type BuildType = {
    Type: "Development" | "Release" | "Offline";
    Version?: string;
    Name: string;
	MainFile: string;
    BuildDir?: string;
};

const WriteTextFile = (path: string, contents: string): Promise<void> => {
    return (
        Deno.mkdir(dirname(path), { recursive: true })
        .then(_ => Deno.writeTextFile(path, contents))
    );
};
const FormatCSSFile = (relativePath: string, css: string) => `/* ${relativePath} */\n${css}`;

// Store our namespaces
const SCSSInlineStyleNamespace = "SCSS-Inline-Styles";
const CSSInlineStyleNamespace = "CSS-Inline-Styles";

export let LastProcessedCSSString: string | undefined = undefined;
export let LastProcessedCodeString: string | undefined = undefined;

export const resetCachedCodeValues = () => {
	LastProcessedCSSString = undefined;
	LastProcessedCodeString = undefined;
}

export default function({
    Type,
    Version,
    Name,
	MainFile,
    BuildDir
}: BuildType) {

    // Setup all our plugins
    const plugins: esbuild.Plugin[] = [];
    const rawCSS: string[] = [];

    const applyOptimizations = (Type !== "Development");

    {
        plugins.push(...(denoPlugins({ configPath: resolve(Deno.cwd(), "./deno.json") }) as unknown as esbuild.Plugin[]));

        const postCSSProcessor = PostCSS(
            applyOptimizations
                ? [AutoPrefixer(), CSSNano({ preset: CSSAdvancedNanoPreset() })]
                : [AutoPrefixer()]
        );
        
        const absoluteSourcePath = resolve("./src");

        plugins.splice(
            1, 0,
            {
                name: SCSSInlineStyleNamespace,
                setup(build) {
                    // Handle SCSS files
                    build.onResolve(
                        { filter: /\.scss$/ },
                        args => ({
                            path: resolve(args.importer, "..", args.path),
                            namespace: SCSSInlineStyleNamespace
                        })
                    );

                    build.onLoad(
                        { filter: /.*/, namespace: SCSSInlineStyleNamespace },
                        async (args) => {
                            const result = await SASSCompile(args.path);
                            const processed = await postCSSProcessor.process(result.css, { from: args.path });
                            rawCSS.push(FormatCSSFile(relative(absoluteSourcePath, args.path), processed.css));

                            return { contents: "" };
                        }
                    );
                }
            },
            {
                name: CSSInlineStyleNamespace,
                setup(build) {
                    // Handle plain CSS files
                    build.onResolve(
                        { filter: /\.css$/ },
                        args => ({
                            path: resolve(args.importer, "..", args.path),
                            namespace: CSSInlineStyleNamespace
                        })
                    );

                    build.onLoad(
                        { filter: /.*/, namespace: CSSInlineStyleNamespace },
                        async (args) => {
                            const contents = await Deno.readTextFile(args.path);
                            const processed = await postCSSProcessor.process(contents, { from: args.path });
                            rawCSS.push(FormatCSSFile(relative(absoluteSourcePath, args.path), processed.css));

                            return { contents: "" };
                        }
                    );
                }
            }
        );
    }

    plugins.push(externalGlobalPlugin() as unknown as esbuild.Plugin);

    const buildDir = (BuildDir !== undefined && BuildDir !== "" ? BuildDir : "./dist");
    const buildDirectory = (Type === "Release" ? join(Deno.cwd(), buildDir) : undefined);
    //const buildDirectory = undefined;//(Type === "Dev" ? undefined : join(Deno.cwd(), "./dist"));

    return esbuild.build({
        entryPoints: [MainFile],
        outfile: (
            (buildDirectory === undefined) ? undefined
            : join(buildDirectory, `${Name}@${Version}.mjs`)
        ),
        plugins,
        platform: "browser",
        format: "esm",
        bundle: true,
        sourcemap: false,
        minify: applyOptimizations,
        legalComments: "none",
        write: false,
    }).then(async (buildResult) => {

        const code = buildResult.outputFiles?.[0]?.text ?? "";

        const css = rawCSS.join("\n");
        const preparedCss = css.replace(/`/g, "\\`");

		if (Type === "Release") {
			const preparedCode = `
				${StylesInjectionString.replace("INSERT_CSS_HERE", preparedCss)}
				${RequirementsPromiseCheckString}
				${code.toString()}
			`;

			const minifiedCode = await MinifyJS(preparedCode);

			await WriteTextFile(
				join(Deno.cwd(), buildDir, `${Name}@${Version}.mjs`),
				minifiedCode ?? preparedCode
			);
		}

        LastProcessedCSSString = preparedCss;
        LastProcessedCodeString = code;

        return [preparedCss, code];
    });
}
