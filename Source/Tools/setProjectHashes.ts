import { _component_hash_cache } from "../caches.ts";
import { GlobalComponentCacheNaming } from "../global.ts";
import { hash as hashFunc } from "./random.ts";

export async function SetProjectHashes(projectName: string, code_strings: { code_string: string; }) {
  const joinedCode = `\n\n${code_strings.code_string}\n${GlobalComponentCacheNaming}\n\n`

  // Compute and cache hashes
  _component_hash_cache.project_hash = await hashFunc(projectName);
  _component_hash_cache.joined_code_hash = await hashFunc(joinedCode);
  _component_hash_cache.general_hash = await hashFunc(`${_component_hash_cache.project_hash}\n${_component_hash_cache.joined_code_hash}`);
}