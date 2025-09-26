import { externalGlobalPlugin } from "./EsbuildPlugins/externalGlobalPlugin.ts";
import * as esbuild from "npm:esbuild@0.25.9";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.11.1";

import { compileAsync as SASSCompile } from "npm:sass@1.90.0";
import PostCSS from "npm:postcss@8.5.6";
import AutoPrefixer from "npm:autoprefixer@10.4.21";
import CSSNano from "npm:cssnano@7.1.1";
import CSSAdvancedNanoPreset from "npm:cssnano-preset-advanced@7.0.9";
import { dirname, join, resolve, relative, fromFileUrl } from "jsr:@std/path@1.1.2";
import { MinifyJS } from "./Tools/MinifyCode.ts";
import { GetComponentCacheString, GetProjectHashesInjectionString, RequirementsPromiseCheckString, StylesInjectionString } from "./Tools/constants.ts";
import { code_cache } from "./caches.ts";
import { SetProjectHashes } from "./Tools/setProjectHashes.ts";

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
const FormatCSSFile = (_relativePath: string, css: string) => `${css}`;

// Store our namespaces
const SCSSInlineStyleNamespace = "SCSS-Inline-Styles";
const CSSInlineStyleNamespace = "CSS-Inline-Styles";

const r = (s: string) => fromFileUrl(import.meta.resolve(`npm:${s}`));

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

    plugins.push(
        {
            name: "url-shim",
            setup(build) {
                // Catch bare "url" imports
                build.onResolve({ filter: /^url$/ }, () => ({
                    path: "url-shim",
                    namespace: "url-shim",
                }));

                // Serve an ESM module as a virtual shim
                build.onLoad({ filter: /.*/, namespace: "url-shim" }, () => {
                    const contents = `
export function parse(input, parseQueryString = false) {
    try {
        const base = (typeof input === 'string' && /^[a-zA-Z][a-zA-Z\\d+.-]*:/.test(input)) 
        ? undefined 
        : (typeof location !== 'undefined' ? location.origin : 'http://localhost');
        const u = base ? new URL(input, base) : new URL(input);
        return {
        href: u.href,
        protocol: u.protocol,
        auth: null,
        host: u.host,
        hostname: u.hostname,
        port: u.port,
        pathname: u.pathname,
        search: u.search,
        query: parseQueryString ? Object.fromEntries(u.searchParams.entries()) : (u.search ? u.search.slice(1) : null),
        hash: u.hash
        };
    } catch (e) {
        return { href: String(input), pathname: String(input) };
    }
}

export function format(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    if (obj instanceof URL) return obj.toString();
    if (obj.href) return obj.href;
    try {
        const base = obj.protocol ? \`\${obj.protocol}//\${obj.host || obj.hostname || ''}\` : (typeof location !== 'undefined' ? location.origin : 'http://localhost');
        const u = new URL(obj.pathname || '', base);
        if (obj.search) u.search = typeof obj.search === 'string' ? obj.search : (obj.query ? new URLSearchParams(obj.query).toString() : '');
        return u.toString();
    } catch (e) {
        return obj.path || obj.pathname || '';
    }
}

export function resolve(from, to) {
    try {
        const base = /^[a-zA-Z][a-zA-Z\\d+.-]*:/.test(from) 
        ? from 
        : (typeof location !== 'undefined' ? location.origin + (from.startsWith('/') ? '' : '/') + from : from);
        return new URL(to, base).toString();
    } catch (e) {
        return to;
    }
}
                    `.trim();

                    return { contents, loader: "js" };
                });
            }
        }
    );

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
            2, 0,
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
        /* loader: {
            ".wasm": "binary"
        } */
    }).then(async (buildResult) => {

        const buildResultCode = buildResult.outputFiles?.[0]?.text ?? "";
        const preCode = buildResultCode.replace(/\(void 0\)\(\)/g, "").replace(/\(void 0\)/g, "").replace(
            /new Array\(128\)\.fill;/g,
            "new Array(128).fill(undefined);"
        );

        const css = rawCSS.join("\n");
        const preparedCss = css.replace(/`/g, "\\`");

        await SetProjectHashes(Name, { code_string: preCode.toString() })
        
        const projHashCacheInj = GetProjectHashesInjectionString();
        const componentCacheString = GetComponentCacheString();

        const code = [
            ...(Type !== "Development" ? [RequirementsPromiseCheckString] : []),
            projHashCacheInj,
            componentCacheString,
            ...(Type !== "Development" ? [StylesInjectionString.replace("INSERT_CSS_HERE", preparedCss)] : []),
            preCode
        ].join("\n")

		if (Type === "Release") {
			const minifiedCode = await MinifyJS(code);

			await WriteTextFile(
				join(Deno.cwd(), buildDir, `${Name}@${Version}.mjs`),
				minifiedCode ?? code
			);
		}

        code_cache.css_string = preparedCss;
        code_cache.code_string = code;

        return [preparedCss, code];
    });
}
