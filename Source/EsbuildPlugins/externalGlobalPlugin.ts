/* 
    Original code source:
    https://github.com/sanoojes/spicetify-glassify/blob/main/builder/plugin/externalGlobalPlugin.ts
*/

import type { PluginBuild } from 'npm:esbuild@0.25.9';

export const externalGlobalPlugin = (externals: Record<string, string> = {
    react: 'Spicetify.React',
    'react-dom': 'Spicetify.ReactDOM',
    'react-dom/client': 'Spicetify.ReactDOM',
    'react-dom/server': 'Spicetify.ReactDOMServer'
}) => {
  const namespace = 'external-global';
  return {
    name: namespace,
    setup(build: PluginBuild) {
      build.onResolve(
        {
          filter: new RegExp(`^(${Object.keys(externals).join('|')})$`),
        },
        (args) => ({
          path: args.path,
          namespace,
        })
      );
      build.onLoad(
        {
          filter: /.*/,
          namespace,
        },
        (args) => {
          const contents = `module.exports = ${externals[args.path]}`;
          return {
            contents,
          };
        }
      );
    },
  };
};