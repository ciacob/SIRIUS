// CommonJS module: content_utils

const xml2js = require("xml2js");
const { v4: uuidv4 } = require("uuid");

/*
 * Replaces the content inside the first occurrence of given "tagName" tag with given
 * "newValue", inside given 'xmlContent'. On failure to match, returns "xmlContent"
 * unchanged.
 */
async function changeXmlTag(xmlContent, tagName, newValue) {
  try {
    const parser = new xml2js.Parser();
    const builder = new xml2js.Builder();
    const jsonObj = await parser.parseStringPromise(xmlContent);
    if (jsonObj[tagName]) {
      jsonObj[tagName] = newValue;
      const modifiedXml = builder.buildObject(jsonObj);
      return modifiedXml;
    } else {
      // If the tagName is not found, return the original content
      return xmlContent;
    }
  } catch (error) {
    console.error("Error processing XML:", error);
    return xmlContent;
  }
}

/**
 * Uses the "uuid" library to produce a "universally-unique" ID.
 * @returns A UUID String that is RFC4122 version 4 compliant.
 */
function getUuid() {
  return uuidv4();
}

/**
 * Returns the executing user's "username", or null if it cannot be found.
 * If an error occurs while retrieving the username, the error is logged to the console.
 *
 * @returns {string|null} The username, or null if it cannot be found.
 */
function getUserName() {
    try {
        return os.userInfo().username.trim();
    } catch (e) {
        console.error(e);
        return null;
    }
}

/**
 * Fills a "content" template by repeating a portion of it and populating it
 * with given "data". Returns the template with changes applied.
 *
 * @param {string} content - String, content to do a search and replace within.
 *
 * @param {string} startMarker - String, markup, denoting the start of the section to be
 *                               modified.
 *
 * @param {string} endMarker - String, markup, denoting the end of the section to be
 *                             modified.
 *
 * @param {Array<Object>} data - Array of Objects, with each object containing
 *                               <placeholder>:<new content> value-name pairs.
 *
 * @param {boolean} addNewLines - Boolean, whether to join buffered texts by a new line
 *                                ("true") or empty string ("false").
 *
 * @param {string} fallbackContent - String to be used when "data" is empty.
 *
 * @returns {string} Returns the given "content" with the section between "startMarker"
 *                   and "endMarker" (including the markers) replaced by the buffered
 *                   texts. Returns "content" unchanged on failure.
 *
 * @note The portion of the given "content" between "startMarker" and "endMarker"
 *       will only be included in the output if at least one successful replacement is made.
 *
 * @note There must be at least one replacement made for the original content to be altered.
 */
function resolveRepeatMarkers(
  content,
  startMarker,
  endMarker,
  data,
  addNewLines,
  fallbackContent
) {
  const isValidString = (str) => str && typeof str === "string" && str.trim();

  if (
    isValidString(content) &&
    isValidString(startMarker) &&
    isValidString(endMarker)
  ) {
    addNewLines = !!addNewLines;
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(
      endMarker,
      startIndex + startMarker.length
    );

    if (startIndex !== -1 && endIndex !== -1) {
      const sectionTemplate = content.substring(
        startIndex + startMarker.length,
        endIndex
      );

      if (Array.isArray(data) && data.length) {
        const replacements = data.map((replacementRule) => {
          if (replacementRule && typeof replacementRule === "object") {
            let madeChanges = false;
            const modifiedSection = Object.keys(replacementRule).reduce(
              (template, placeholder) => {
                const value = replacementRule[placeholder];
                const pattern = new RegExp(`\\{${placeholder}\\}`, "g");
                if (pattern.test(template)) {
                  template = template.replace(pattern, value);
                  madeChanges = true;
                }
                return template;
              },
              sectionTemplate
            );

            return madeChanges ? modifiedSection : null;
          }
        });

        const validReplacements = replacements.filter(Boolean);
        const replacement = validReplacements.length
          ? validReplacements.join(addNewLines ? "\n" : "")
          : fallbackContent || "";

        content =
          content.substring(0, startIndex) +
          replacement +
          content.substring(endIndex + endMarker.length);
      } else {
        content = fallbackContent || content;
      }
    }
  }

  return content;
}

/**
 * Formats the given XML string using xml2js library synchronously.
 *
 * @param {string} xml - The XML string to format.
 * @param {Object} [options] - Options for xml2js.
 * @returns {string} - The formatted XML string, or the original XML if formatting fails.
 *
 * @throws {Error} If there is an error during the XML formatting process.
 *
 * @example
 * // Example usage:
 * const unformattedXml = '<root><item>Hello</item><item>World</item></root>';
 * const formattedXml = formatXml(unformattedXml);
 * console.log(formattedXml);
 */
function formatXml(xml, options = {}) {
  try {
    const parser = new xml2js.Parser(options);
    const builder = new xml2js.Builder({
      renderOpts: { pretty: true, indent: "  " },
    });
    const result = parser.parseStringSync(xml);
    const formattedXml = builder.buildObject(result);
    return formattedXml;
  } catch (error) {
    console.error("Error formatting XML: " + error.message);
    return xml; // Return the original XML in case of an error
  }
}

module.exports = {
  changeXmlTag,
  resolveRepeatMarkers,
  formatXml,
  getUuid,
  getUserName
};
