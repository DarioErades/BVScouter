const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'renderer.js');
let content = fs.readFileSync(file, 'utf8');
content = `window.onerror = function(msg, url, line, col, error) {
    window.api.logError(msg + " " + (error ? error.stack : ""));
};
window.onunhandledrejection = function(event) {
    window.api.logError("Unhandled Rejection: " + (event.reason ? event.reason.stack : event.reason));
};\n` + content;
fs.writeFileSync(file, content);
