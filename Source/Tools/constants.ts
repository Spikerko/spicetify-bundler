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