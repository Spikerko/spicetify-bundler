import { join } from 'jsr:@std/path@1.1.2';

export const isWindows = Deno.build.os === 'windows';

export const HOME_PATH = (isWindows
  ? Deno.env.get('APPDATA')
  : join(Deno.env.get('HOME') ?? '/home/jack', '.config')) ?? "";


export const SPICETIFY_PATH = join(HOME_PATH, 'spicetify');
export const SPOTIFY_PATH = isWindows ? join(HOME_PATH, 'Spotify') : '/opt/spotify';

export const EXTENSION_PATH = join(SPICETIFY_PATH, 'Extensions');
export const XPUI_PATH = join(SPOTIFY_PATH, 'Apps/xpui');
export const XPUI_EXTENSION_PATH = join(XPUI_PATH, 'extensions');

export const EXTENSION_ENTRY_POINTS = [join(Deno.cwd(), 'src/index.tsx')];
export const LIVERELOAD_JS_PATH = join(Deno.cwd(), 'builder/client/liveReload.js');

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

export const StylesInjectionString = `
{
  const style = document.createElement("style");
  style.textContent = \`INSERT_CSS_HERE\`;
  document.body.appendChild(style);
};
`.trim()