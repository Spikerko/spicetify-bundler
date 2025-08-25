import { minify } from "npm:terser@5.43.1";

export const MinifyJS = async (code: string) => {
    const minified = await minify(code, {
        ecma: 2020,           // support modern syntax
        module: true,         // parse as ES module
        parse: {
            ecma: 2020,
            bare_returns: false
        },
        keep_classnames: true,
        keep_fnames: false,    // optional: keep function names
        compress: true,
        mangle: true
    });

    // Trim and guard against empty or all-whitespace output
    const out = minified.code?.trim();
    return out && out.length > 0 ? out : code;
};


/* export const MinifyJS = (code: string) => {
    let isInString = false;
    let stringChar = '';
    let result = '';
  
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        const next = code[i + 1];

        // Handle entering/exiting strings
        if (!isInString && (char === '"' || char === "'" || char === "`")) {
            isInString = true;
            stringChar = char;
            result += char;
            continue;
        } else if (isInString) {
            result += char;
            if (char === stringChar && code[i - 1] !== "\\") {
                isInString = false;
                stringChar = '';
            }
            continue;
        }

        // Remove single-line comments
        if (char === '/' && next === '/') {
            while (i < code.length && code[i] !== '\n') i++;
            continue;
        }

        // Remove block comments
        if (char === '/' && next === '*') {
            i += 2;
            while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++;
            i++;
            continue;
        }

        result += char;
    }

    return result
        .replace(/\n+/g, ' ')   // collapse newlines
        .replace(/\s{2,}/g, ' ') // collapse multiple spaces
        .trim();
}; */
