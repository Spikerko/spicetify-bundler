// deno-lint-ignore-file no-explicit-any no-empty
export type { default as SpicetifyType } from "./Source/Types/Spicetify.ts";
import { GlobalComponentCacheNaming } from "./Source/global.ts";
import type SpicetifyTypes from "./Source/Types/Spicetify.ts";

// Type for the _local_component_hash_cache_variable object
type ComponentHashCache = {
  project_hash: string;
  joined_code_hash: string;
  general_hash: string;
};

// Declare _local_component_hash_cache_variable as a const with the correct type
declare const _local_component_hash_cache_variable: ComponentHashCache;

export const _local_hashes: ComponentHashCache = _local_component_hash_cache_variable;

export const Spicetify: typeof SpicetifyTypes = (globalThis as any).Spicetify;

export function buildCacheDirectoryName(project_hash: string, joined_code_hash: string) {
  return (window as any)[GlobalComponentCacheNaming][project_hash][joined_code_hash];
}

const _internal_getDir = () => {
  return buildCacheDirectoryName(_local_hashes.project_hash, _local_hashes.joined_code_hash);
}

const _reseved_component_names = ["styleElement"];

export const Component = {
  GetRootComponent: (componentName: string) => {
    const dir = _internal_getDir();
    return dir[componentName] ?? undefined;
  },
  GetDir: () => _internal_getDir(),
  AddRootComponent: (name: string, content: any) => {
    if (_reseved_component_names.includes(name)) {
      throw new Error(`Cannot add reserved component name: "${name}"`);
    }
    const dir = _internal_getDir();
    dir[name] = content;
  },
  RemoveRootComponent: (componentName: string) => {
    if (_reseved_component_names.includes(componentName)) {
      throw new Error(`Cannot remove reserved component name: "${componentName}"`);
    }
    const dir = _internal_getDir();
    try {
      delete dir[componentName];
    } catch (_) {}
  }
}
