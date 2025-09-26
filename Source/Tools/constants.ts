import { _component_hash_cache } from "../caches.ts";
import { GlobalComponentCacheNaming } from "../global.ts";

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
);`.trim();

export const GetProjectHashesInjectionString = () => {
  return `
var _local_component_hash_cache_variable = {
  project_hash: "${_component_hash_cache.project_hash}",
  joined_code_hash: "${_component_hash_cache.joined_code_hash}",
  general_hash: "${_component_hash_cache.general_hash}"
};
  `.trim().replace(/\/\/.*$/gm, "").replace(/\s+/g, " ").replace(/\s*([{}();=:\[\],])\s*/g, "$1").trim()
}

export const GetComponentCacheString = () => {
  const projHash = _component_hash_cache.project_hash;
  const codeJoinHash = _component_hash_cache.joined_code_hash;
  const generalHash = _component_hash_cache.general_hash;

  return `
function _public_getComponentCache() {
  return window["${GlobalComponentCacheNaming}"]["${projHash}"]["${codeJoinHash}"];
}

(function _${generalHash}_ensure_component_cache() {
  if (window["${GlobalComponentCacheNaming}"] !== undefined) {
    if (window["${GlobalComponentCacheNaming}"]["${projHash}"]) {
      if (!window["${GlobalComponentCacheNaming}"]["${projHash}"]["${codeJoinHash}"]) {
        window["${GlobalComponentCacheNaming}"]["${projHash}"]["${codeJoinHash}"] = {}
      }
    } else {
      window["${GlobalComponentCacheNaming}"]["${projHash}"] = {};
      return _${generalHash}_ensure_component_cache();
    }
  } else {
    window["${GlobalComponentCacheNaming}"] = {};
    return _${generalHash}_ensure_component_cache();
  }
})();
`.trim().replace(/\/\/.*$/gm, "").replace(/\s+/g, " ").replace(/\s*([{}();=:\[\],])\s*/g, "$1").trim();
};


export const StylesInjectionString = `
{
  const style = document.createElement("style");
  style.textContent = \`INSERT_CSS_HERE\`;
  document.body.appendChild(style);
  _public_getComponentCache().styleElement = style;
};
`.trim()