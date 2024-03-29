// CommonJS module: string_utils

/*
 * Capitalize the first letter of a string
 */
function capitalize(s) {
  if (typeof s !== "string") {
    return "";
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/*
 * Wraps given "path" in quotes, but only if it contains spaces. Returns
 * the path unchanged otherwise. On failure, returns a string containing two
 * double quotes.
 */
function smartQuotePath(path) {
  if (typeof path === "string" && path !== "") {
    // If there are spaces within `path`, or double quotes that do not start,
    // nor end the path, escape the quotes, and wrap the string in quotes.
    if (
      path.indexOf(" ") !== -1 ||
      (path.indexOf('"') !== -1 &&
        path[0] !== '"' &&
        path[path.length - 1] !== '"')
    ) {
      // Escape existing double quotes and add quotes if needed
      path = '"' + path.replace(/"/g, '\\"') + '"';
    }
    return path;
  }
  return '""';
}

module.exports = {
  capitalize,
  smartQuotePath
};
