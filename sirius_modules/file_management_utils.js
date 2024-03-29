// CommonJS module: file_management_utils
const fs = require("fs");
const path = require("path");

/**
 * Returns true if given "filePath" points to a directory
 */
function isDirectory(filePath) {
  try {
    return fs.lstatSync(filePath).isDirectory();
  } catch (err) {
    console.error(`Error accessing ${filePath}:`, err);
    return false;
  }
}

/**
 * This function returns the relative version of a subPath with respect to a folder.
 * It also converts the path to a URL-style path (i.e., no backslashes, etc).
 *
 * @param {string} subPath - The subPath underneath the folder's path, asserted valid and as such.
 * @param {string} folder - The folder's path, asserted valid.
 * @return {string} The URL-style relative path.
 */
function makeRelative(subPath, folder) {
  let relativePath = path.relative(folder, subPath);
  let urlStylePath = relativePath.split(path.sep).join("/");
  return urlStylePath;
}

/**
 * This function deletes a file or directory at a given path. If the path is a directory, 
 * it will be deleted recursively, meaning all nested files and directories will also be deleted.
 * 
 * @param {string} path - The path of the file or directory to delete.
 */
function deletePathNode(path) {
    if (fs.existsSync(path)) {
        try {
            if (fs.lstatSync(path).isDirectory()) {
                fs.rmdirSync(path, { recursive: true });
            } else {
                fs.unlinkSync(path);
            }
            console.log(`Successfully deleted ${path}`);
        } catch (error) {
            console.error(`Error while deleting ${path}: `, error);
        }
    }
}


/**
 * Shortcut; returns an Array with folder paths found in the given "parentFolder" path.
 */
function listFolders(parentFolder) {
  return listFiles(parentFolder, ["FOLDERS_ONLY"]);
}

/**
 * This function removes the extension from a file path.
 *
 * @param {string} filePath - The original file path.
 * @returns {string} The file path without the extension.
 */
function cutOffExtension(filePath) {
  return (
    path.dirname(filePath) +
    "/" +
    path.basename(filePath, path.extname(filePath))
  );
}

const fs = require('fs');

/**
 * Tests whether two given paths are equal even if spelled differently.
 * This function also resolves symbolic links to their target paths before comparison.
 * @param {string} path1 - The first path to compare.
 * @param {string} path2 - The second path to compare.
 * @return {boolean} - Returns true if the paths are equal, false otherwise.
 */
function pathsAreEqual(path1, path2) {
    try {
        // Resolve the paths to their absolute paths, resolving symbolic links to their target paths
        path1 = fs.realpathSync(path.resolve(path1));
        path2 = fs.realpathSync(path.resolve(path2));

        // If the platform is Windows, compare the paths case-insensitively
        if (process.platform === "win32") {
            return path1.toLowerCase() === path2.toLowerCase();
        }

        // If the platform is not Windows, compare the paths as is
        return (path1 === path2);
    } catch (error) {
        // Log the error to the console and return false
        console.error(error);
        return false;
    }
}


/**
 * Reads and returns a specified number of bytes from the beginning of a file.
 *
 * @param {string} filePath - The path to the file.
 * @param {number} headerSize - The number of bytes to read.
 * @param {string} [encoding='utf-8'] - The encoding to use when converting the buffer to a string.
 * @returns {string|Buffer} - The content of the file header, or an empty string on error.
 */
function readFileHeader(filePath, headerSize, encoding) {
  try {
    const chunkBuffer = Buffer.alloc(headerSize);
    const fd = fs.openSync(filePath, "r");
    const bytesRead = fs.readSync(fd, chunkBuffer, 0, headerSize, 0);
    const fileContent = chunkBuffer.slice(0, bytesRead);
    fs.closeSync(fd);
    return fileContent.toString(encoding || "utf-8");
  } catch (error) {
    console.error(`Error reading file header: ${error.message}`);
    return "";
  }
}

/**
Synchronously reads the given `folder` (which must be a valid, absolute local directory path) and produces a 
list of paths, pointing to the files and/or folders it contains, to any level of nesting, subject to the given 
`filters` Array.

@param  folder {String}
        Valid and absolute path to a local folder. If `folder` fails to meet this criterion, an empty 
        list should be returned, and a note should be written to the console, also printing out the
        offending `folder` that was given.
   
@param  filters {Array of Strings}
        Optional. Array of search rules to determine what gets included in the resulting list.
   
        [1] If this argument is null or empty, the function should return everything inside the folder, 
        recursively descending into all subfolders.
   
        [2] If this argument is not empty, each of the Strings within the Array can either be:

            [2.1] a substring of the path to match (two wildcards are accepted: ' ' will match as many chars 
            as possible, up to the end of the path, and '?' will match one char only), or
   
            [2.2] one of the following exclusion values, which must be given verbatim:

                [2.2.i] "FILES_ONLY": will exclude all folders from the listing;
                [2.2.ii] "FOLDERS_ONLY": will exclude all files from the listing;
                [2.2.iii] "NO_DOT_NAMES": will exclude from the listing all files and folders whose name 
                start with a dot, e.g., ".cfg".
   
            Note that "FILES_ONLY" and "FOLDERS_ONLY" should not both be given, in which case the function 
            would return an empty Array. Note also, that these exclusions will only operate on the 
            resulting list, NOT on the search process itself, i.e., giving "FILES_ONLY" shall not prevent the 
            search to recurse into subdirectories.
   
            If both types of values (i.e., 2.1 & 2.2) are combined (e.g., ["FILES_ONLY", ".json"]) they shall 
            all apply, with all the exclusion values being applied first, resulting in progressively reducing 
            the list of items returned (the example above shall only list all JSON files within the given 
            `folder`). If several substring (i.e. 2.1) searches are given, they will be OR-ed together.
   
@param  useRelativePaths {Boolean}
        Optional, default `false`. If given, will result in all returned paths being presented in their 
        `folder`-relative form, e.g., "/package.json" instead of "C:\testApp\package.json" (in this 
        hypothetical case, the function was invoked with "C:\testApp" as `folder`; observe the os-specific 
        format used if `useRelativePaths ` is false).
   
@param  dropExtension {Boolean}
        Optional, default `false`. If given, will result in all returned paths "loose" their 
        extension, e.g., "package" instead of "package.json" (or, for a folder example,"Photoshop" instead of 
        "Photoshop.app" on macOS). This shall not apply to paths starting with a dot (e.g., ".config"), which 
        should pass through, unabated (unless `NO_DOT_FILES` was also given, see above).
   
@returns    An Array with path Strings, in the order the recursive search produced them, honoring all 
            restrictions and tweaks provided by means of the `filters`, `useRelativePaths` and `dropExtension `
            arguments.
  */
function listFiles(folder, filters, useRelativePaths, dropExtension) {
  // Validate folder path
  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
    console.error(`[Error] Invalid folder path: ${folder}`);
    return [];
  }

  useRelativePaths = !!useRelativePaths;
  dropExtension = !!dropExtension;

  const FOLDERS_ONLY = "FOLDERS_ONLY";
  const FILES_ONLY = "FILES_ONLY";
  const NO_DOT_NAMES = "NO_DOT_NAMES";
  const EXCLUSIONS = [FOLDERS_ONLY, FILES_ONLY, NO_DOT_NAMES];
  const allPaths = [];

  // Internal function to produce an unfiltered list of all files and folder within the folder.
  const walkSync = (currentDir) => {
    const filesInDir = fs.readdirSync(currentDir);
    for (const file of filesInDir) {
      const filePath = path.join(currentDir, file);
      allPaths.push(filePath);
      if (fs.statSync(filePath).isDirectory()) {
        walkSync(filePath);
      }
    }
  };

  // Internal function to convert a String that uses wildcard characters (* or ?) to a valid RegExp object.
  const wildcardToRegex = (s) => {
    s = s.replace(/\*/g, "___ANYCHARS___");
    s = s.replace(/\?/g, "___ANYCHAR___");
    s = regExpEscape(s);
    s = s.replace(/___ANYCHARS___/g, ".*");
    s = s.replace(/___ANYCHAR___/g, ".");
    return new RegExp("^" + s + "$");
  };

  // Internal function to escape RegExp-significant chars
  const regExpEscape = (s) => s.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");

  // Internal function allowing search of a substring that might contain the "*" or "?" wildcard.
  const searchWithWildcards = (text, pattern) => {
    var regex = wildcardToRegex(pattern);
    return regex.test(text);
  };

  // Internal function to check if a file or folder name starts with a dot.
  const startsWithDot = (absolutePath) =>
    path.basename(absolutePath).startsWith(".");

  // Internal function to produce a (possible empty) list of search filters not including the special ones
  // (e.g., "FOLDERS_ONLY", "FILES_ONLY", etc.).
  const getSearchPatterns = () =>
    filters.filter((item) => !EXCLUSIONS.includes(item));

  // Internal function to be use as the argument of Array.filter. It will return `false` for all
  // paths offending at least one exclusion rule or not matching any of the other paterns.
  const filterPaths = (filePath) => {
    const mustExcludeFiles = filters.includes(FOLDERS_ONLY);
    const mustExcludeFolders = filters.includes(FILES_ONLY);
    const mustExludeDotNames = filters.includes(NO_DOT_NAMES);
    const isDir = isDirectory(filePath);
    if (isDir && mustExcludeFolders) {
      return false;
    }
    if (!isDir && mustExcludeFiles) {
      return false;
    }
    if (startsWithDot(filePath) && mustExludeDotNames) {
      return false;
    }
    const patterns = getSearchPatterns();
    if (patterns.length) {
      return patterns.some((pattern) => searchWithWildcards(filePath, pattern));
    }

    // If nothing so far prevents us from including this path, let's include it.
    return true;
  };

  // Internal function to be used as the argument of Array.map. IT will return given `filePath` with any
  // applicable transformations applied.
  const refinePaths = (filePath) => {
    if (useRelativePaths) {
      filePath = makeRelative(filePath, folder);
    }
    if (dropExtension) {
      filePath = cutOffExtension(filePath);
    }
    return filePath;
  };

  // MAIN
  try {
    walkSync(folder);
    if (filters && filters.length != 0) {
      allPaths = allPaths.filter(filterPaths);
    }
    if (useRelativePaths || dropExtension) {
      allPaths = allPaths.map(refinePaths);
    }
  } catch (error) {
    console.error(
      `[Error] Errors while reading files in ${folder}:`,
      error,
      "\nContinuing.\n"
    );
  }
}

module.exports = {
  isDirectory,
  listFolders,
  readFileHeader,
  listFiles,
  deletePathNode,
  pathsAreEqual
};
