import { _component_hash_cache } from "../caches.ts";
import { GlobalComponentCacheNaming, GlobalExposedComponentAPINaming } from "../global.ts";
import { MinifyJS } from "./MinifyCode.ts";

export const RequirementsPromiseCheckString = `
await new Promise(
  resolve => {
    const interval = setInterval(
      () => {
        if (Spicetify !== undefined && Spicetify.React !== undefined && Spicetify.ReactDOM !== undefined && Spicetify.ReactDOMServer !== undefined) {
          clearInterval(interval);
          resolve();
        };
      },
      10
    );
  }
)`.trim();

export const GetProjectHashesInjectionString = () => {
  return `
var _local_component_hash_cache_variable = {
  project_hash: "${_component_hash_cache.project_hash}",
  joined_code_hash: "${_component_hash_cache.joined_code_hash}",
  general_hash: "${_component_hash_cache.general_hash}"
}
  `.trim().replace(/\/\/.*$/gm, "").replace(/\s+/g, " ").replace(/\s*([{}();=:\[\],])\s*/g, "$1").trim()
}

export const GetComponentCacheString = () => {
  const codeJoinHash = _component_hash_cache.joined_code_hash;
  const generalHash = _component_hash_cache.general_hash;

  return `
function __${codeJoinHash}_public_getComponentCache() {
  return window["${GlobalComponentCacheNaming}"]["${generalHash}"];
}

(function __${codeJoinHash}_ensure_component_cache() {
  if (window["${GlobalComponentCacheNaming}"] !== undefined) {
    if (!window["${GlobalComponentCacheNaming}"]["${generalHash}"]) {
      window["${GlobalComponentCacheNaming}"]["${generalHash}"] = {};
    }
  } else {
    window["${GlobalComponentCacheNaming}"] = {};
    return __${codeJoinHash}_ensure_component_cache();
  }
})()
`.trim().replace(/\/\/.*$/gm, "").replace(/\s+/g, " ").replace(/\s*([{}();=:\[\],])\s*/g, "$1").trim();
};


export const GetStylesInjectionString = (css: string) => {
  const codeJoinHash = _component_hash_cache.joined_code_hash;

  const styleElementName = (() => {
    const letters = "abcdefghijklmnopqrstuvwxyz";
    const randLetter = () => letters[Math.floor(Math.random() * 26)];
    return randLetter() + randLetter();
  })();

  const str = `
{
const ${styleElementName} = document.createElement("style");
${styleElementName}.textContent = \`INSERT_CSS_HERE\`;
document.body.appendChild(${styleElementName});
__${codeJoinHash}_public_getComponentCache().styleElement = ${styleElementName};
}`.trim().replace(/\/\/.*$/gm, "").replace(/\s+/g, " ").replace(/\s*([{}();=:\[\],])\s*/g, "$1").trim();

  return str.replace("INSERT_CSS_HERE", css);
}

export const GetExposeComponentApisString = ({ projName, exposeMutation }: { projName: string, exposeMutation: boolean }) => {
  const codeJoinHash = _component_hash_cache.joined_code_hash;

  return `
(function __${codeJoinHash}_expose_component_cache_api() {
  if (window["${GlobalExposedComponentAPINaming}"] !== undefined) {
    if (!window["${GlobalExposedComponentAPINaming}"]["${projName}"]) {
      window["${GlobalExposedComponentAPINaming}"]["${projName}"] = {
        GetRootComponent: (componentName) => {
          const dir = __${codeJoinHash}_public_getComponentCache();
          return dir[componentName] ?? undefined;
        }${exposeMutation ? "," : ""}
        ${exposeMutation ?
        `AddRootComponent: (name, content) => {
          if (_reseved_component_names.includes(name)) {
            throw new Error('Cannot add reserved component name: "' + name + '"');
          }
          const dir = __${codeJoinHash}_public_getComponentCache();
          dir[name] = content;
        },
        RemoveRootComponent: (componentName) => {
          if (_reseved_component_names.includes(componentName)) {
            throw new Error('Cannot remove reserved component name: "' + componentName + '"');
          }
          const dir = __${codeJoinHash}_public_getComponentCache();
          try {
            delete dir[componentName];
          } catch (_) {}
        }` : ""}
      }
    }
  } else {
    window["${GlobalExposedComponentAPINaming}"] = {};
    return __${codeJoinHash}_expose_component_cache_api();
  }
})()
`.trim().replace(/\/\/.*$/gm, "").replace(/\s+/g, " ").replace(/\s*([{}();=:\[\],])\s*/g, "$1").trim();
}