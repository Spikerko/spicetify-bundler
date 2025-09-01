// deno-lint-ignore-file
const WS_URL = "-1";
const EXTENSION_NAME = "-2";

const ShowNotification = (content, variant, autoHideDuration = 5000) => {
  Spicetify.Snackbar.enqueueSnackbar(
    Spicetify.React.createElement(
      "div",
      {
        dangerouslySetInnerHTML: {
          __html: `
            <h3>${EXTENSION_NAME} - DevReload</h3>
					  <span style='opacity: 0.75;'>${content}</span>
          `.trim()
        }
      }
    ), {
      variant,
      autoHideDuration
    }
  )
}


const log = (...args) =>
  console.log(
    "%c[@spicetify/bundler - DevReload]",
    "color: white; background-color: #158b3f; font-weight: bold; padding: 2px 6px; border-radius: 6px;",
    ...args
  );

const warn = (...args) =>
  console.warn(
    "%c[@spicetify/bundler - DevReload]",
    "color: black; background-color: orange; font-weight: bold; padding: 2px 6px; border-radius: 6px;",
    ...args
  );

const error = (...args) =>
  console.error(
    "%c[@spicetify/bundler - DevReload]",
    "color: white; background-color: red; font-weight: bold; padding: 2px 6px; border-radius: 6px;",
    ...args
  );

const socket = new WebSocket(WS_URL);
let reconnectionAttempts = 0;

const generateRandomString = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const formatSocketMessage = ({
    type,
    content,
    requestIdentifier,
    isContentRequest
}) => {
    return JSON.stringify({
        Type: (isContentRequest ? "request" : "message"),
        ContentType: type,
        Content: content,
        Identifier: requestIdentifier
    });
}

let currentStylesElement = undefined;

let isCssEmpty = false;

function truncate(str, maxLength, suffix = "...") {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - suffix.length) + suffix;
}


socket.addEventListener("open", () => {
  log("Connected");
  reconnectionAttempts = 0;

  const codeRequestId = generateRandomString();
  const stylesRequestId = generateRandomString();

  log("Requesting code bundle with ID:", codeRequestId);
  socket.send(formatSocketMessage({
    type: "bundle_request",
    content: "code",
    requestIdentifier: codeRequestId,
    isContentRequest: true,
  }))

  log("Requesting styles bundle with ID:", stylesRequestId);
  socket.send(formatSocketMessage({
    type: "bundle_request",
    content: "styles",
    requestIdentifier: stylesRequestId,
    isContentRequest: true,
  }))

  socket.addEventListener("message", (e) => {
    const unparsedMessage = e.data;
    const message = JSON.parse(unparsedMessage);
    log("Received message:", truncate(unparsedMessage, 200));

    if (message.Type === "response") {
        log("Received response for identifier:", message.Identifier);
        if (message.Identifier === codeRequestId) {
            log("Injecting code bundle script");

            if (!message.Content) {
              error("Received empty Code (MJS) bundle");
              ShowNotification("Received empty Code (MJS) bundle", "error", 15000);
              return;
            }

            const blob = new Blob([message.Content], { type: "application/javascript" });

            // Turn Blob into a URL
            const url = URL.createObjectURL(blob);

            log("Importing URL", url);

            import(url)
              .then(() => {
                ShowNotification("Loaded Code (MJS) bundle successfully", "success");
                URL.revokeObjectURL(url);
              })
              .catch((err) => {
                error("Loading Code (MJS) bundle was unsuccessful", err)
                ShowNotification("Loading Code (MJS) bundle was unsuccessful", "error");
              })
            
        } else if (message.Identifier === stylesRequestId) {
            log("Injecting styles bundle");
            if (!message.Content) {
              error("Received empty CSS bundle");
              ShowNotification("Received empty CSS bundle", "error", 15000);
            }
            const styles = document.createElement("style");
            styles.textContent = message.Content ?? "";
            document.body.appendChild(styles);
            currentStylesElement = styles;
            if (message.Content) {
              ShowNotification("Loaded CSS bundle successfully", "success");
            }
        }
    }
    

    if (message.Type === "event") {
        log("Received event:", message.Content.EventType);
        if (message.Content.EventType === "css_reload") {
            log("CSS reload event received");
            if (currentStylesElement !== undefined) {
                log("Updating currentStylesElement with new CSS");
                if (!message.Content && !message.Content.UpdateTo) {
                  error("Received empty Update CSS bundle");
                  ShowNotification("Received empty Update CSS bundle", "error", 15000);
                  return;
                }
                currentStylesElement.textContent = message.Content.UpdateTo;

                ShowNotification("Updated CSS", "info");
            } else {
                warn("No currentStylesElement to update for CSS reload");
            }
        } else if (message.Content.EventType === "code_reload") {
            log("Reloading full page...");
            ShowNotification("Code (MJS) Updated. Reloading page", "info");
            location.reload();
        } else if (message.Content.EventType === "bundle_error") {
          log("An error happened while trying to bundle your code. Check the logs, in the command line (not here)");
          ShowNotification("An error happened while trying to bundle your code. Check the logs, in the command line", "error", 15000);
        }
    }
  });
});



socket.addEventListener("close", () => {
  log("Disconnected. Reload to reconnect");
});

socket.addEventListener("error", (err) => {
  error("WebSocket error:", err);
});
