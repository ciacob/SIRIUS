'use strict';

/**
 * SIRIUS (Simple ActionScript Build System).
 * FEATURES:
 * - creates build scripts for a Flex AIR ActionScript 3 library. Running these scripts
 *   cause the library to be compiled into a SWC file;
 *
 * - creates build scripts for a Flex AIR ActionScript 3 application. Running these scripts
 *   cause the application to be compiled into a SWF file.
 *
 * - automatically handles dependencies and includes by inspecting the source files of
 *   the library or application.
 *
 * HOW TO USE:
 *  change into the library/application directory and execute:
 *  node path/to/sirius.js
 *
 * to run the uncompiled version, or:
 *    path/to/sirius.exe
 *
 * to run the compiled version. Optionally, you can add the sirius folder to the PATH
 * variable.
 *
 *
 * NOTES:
 * - when building a Flex AIR ActionScript 3 application, besides producing a SWF file from
 *   given MXML file and configuration file, SIRIUS also copies the <APPLICATION_NAME>-app.xml
 *   file, and all the files inside the ./src/assets folder, if it exists, while retaining the
 *   folder structure.
 *
 * - SIRIUS overrides the "<content>...</content>" tag inside <APPLICATION_NAME>-app.xml,
 *   while living the rest of the file untouched.
 *
 * - If a <APPLICATION_NAME>-app.xml is not found, SIRIUS automatically creates one.
 *
 * - When several applications (MXML files containing the "WindowApplication" root tag) are
 *   present in a project folder, SIRIUS will only create build scripts for the most recently
 *   modified one. To have SIRIUS create build scripts for another application instead, touch
 *   its MXML file prior to calling SIRIUS.
 * @version 0.1 alpha
 * @author Claudius Iacob <claudius.iacob@gmail.com>
 */

// IMPORTS
// -------
const process = require('process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const shell = require("shelljs");


const {listFolders, readFileHeader, listFiles, deletePathNode, pathsAreEqual} = require ('./sirius_modules/file_management_utils');
const {capitalize, smartQuotePath} = require ('./sirius_modules/string_utils');
const {changeXmlTag, resolveRepeatMarkers, formatXml, getUuid, getUserName} = require ('./sirius_modules/content_utils');


// GLOBALS
let projectApplications = [];
let isApplicationProject = false;
let currentProjectFolder = null;
let mustPrintLess = false;

// CONSTANTS
// ---------

const isWin = (os.platform() === 'win32');
const isMac = (os.platform() === 'darwin');
const OS_SLUG = (isWin? 'win' : isMac? 'mac' : 'lin');
const nativeFolderSuffix = 'native';
const documentationFolder = 'doc';

// Path related
const sourceFileTypes = ['as', 'mxml', 'fxg'];
const mxmlFileType = ['mxml'];
const swcFileType = ['swc'];
const swfFileType = ['swf'];
const allFilesAndFoldersType = ['*'];
const allFilesType = ['*.*'];
const allFoldersType = ['**'];
const sourceFolderPath = 'src';
const binFolderPath = 'bin';
const libFolderPath = 'lib';
const assetsFolderName = 'assets';
const buildScriptsFolderName = '.build-scripts';
const inclusionsFileName = 'sirius.inclusions.cache';

const lookIntoZipCmd = 'tar -xOf %s catalog.xml'
const libConfigFileName = 'lib-config.xml';
const libBuildFileName = 'lib-build.bat';
const appConfigFileName = 'app-config.xml';
const appBuildFileName = 'app-build.bat';
const appRunFileName = 'app-run.bat';
const adlFileName = 'adl';
const descriptorFileNameSuffix = '-app.xml';

const libConfigTemplateFile = 'templates/lib-config.xml.template';
const libBuildTemplateFile = 'templates/lib-build.bat.template';
const appConfigTemplateFile = 'templates/app-config.xml.template';
const appBuildTemplateFile = 'templates/app-build.bat.template';
const appRunTemplateFile = 'templates/app-run.bat.template';
const descriptorTemplateFile = 'templates/app-descriptor.template';

// TODO: make all of these configurable.
const defaultJavaPath = '../../../_BUILD_/JAVA/' + OS_SLUG + '/openjdk-11.0.10/bin';
const defaultSdkJarsPath = '../../../_BUILD_/AIR_SDK/' + OS_SLUG + '/_AIR-50-0-1--Flex-4-16-1_/lib';
const defaultSdkAdlPath = '../../../_BUILD_/AIR_SDK/' + OS_SLUG + '/_AIR-50-0-1--Flex-4-16-1_/bin';
const defaultFrameworksPath = '../../../_BUILD_/AIR_SDK/' + OS_SLUG + '/_AIR-50-0-1--Flex-4-16-1_/frameworks';

// Regular expressions
const swcDefPattern = /<def id="([^\"]+)"\s+\/>/;
const globalSwcDefPattern = new RegExp(swcDefPattern, 'g');
const libNameReplacePattern = /[\W_]+/g;
const importClassFqnPattern = /import\s+((?:[a-zA-Z_$][a-zA-Z\d_$]*\.)*[a-zA-Z_$][a-zA-Z\d_$]*)/g;
const xmlnsImportClassPattern = /xmlns\:[^=]+\=\x22((?:[a-zA-Z_$][a-zA-Z\d_$]*\.)*[a-zA-Z_$][a-zA-Z\d_$]*(\.\*)?)\x22/g;
const inlineClassFqnPattern = /[A-Za-z_\$\d\.]+\.[A-Za-z_\$\d]+\:[A-Za-z_\$\d]+/g;
const appFileNamePlaceholderPattern = /\{APP_FILE_NAME\}/g;
const creatorPlaceholderPattern = /\{CREATOR\}/g;
const appSwfPathPlaceholderPattern = /\{OUTPUT_APP_FILE_PATH\}/g;
const libNamePlaceHolderPattern = /\{LIB_NAME\}/g;
const appNamePlaceHolderPattern = /\{APP_NAME\}/g;
const siriusPathPlaceHolderPattern = /\{SIRIUS\}/g;
const sourcePathPlaceholderPattern = /\{SOURCE_PATH\}/g;
const folderPathPlaceholderPattern = /\{PROJECT_PATH\}/g;

// Placeholders
const copyStartMarker = '{FILE_COPY_START}';
const copyEndMarker = '{FILE_COPY_END}';
const depsStartMarker = '{DEPENDENCIES_SECTION_START}';
const depsEndMarker = '{DEPENDENCIES_SECTION_END}';
const javaPathPlaceholder = '{JAVA_DIR}';
const jarsPathPlaceholder = '{JARS_DIR}';
const frameworksPathPlaceholder = '{FRAMEWORKS_DIR}';
const adlPathPlaceholder = '{ADL_TOOL}';
const configFilePathPlaceholder = '{CONFIG_FILE}';
const appDescriptorPathPlaceholder = '{DESCRIPTOR_FILE_PATH}';
const appMxmlPathPlaceholder = '{APP_FILE_PATH}';
const appUniqueIdPlaceholder = '{APP_UNIQUE_ID}';
const appVersionNumberPlaceholder = '{APP_VERSION_NUMBER}';
const appDescriptionPlaceholder = '{APP_DESCRIPTION}';
const appCopyrightPlaceholder = '{APP_COPYRIGHT}';

const swcIncludesPlaceholder = '<path-element>{SWC_LIB_INCLUDES}</path-element>';
const libOutputSwcPathPlaceholder = '<output>{OUTPUT_FILE_PATH}</output>';
const libTitlePlaceHolder = '<title>{SWC_INTERNAL_NAME}</title>';
const libClassIncludesPlaceholder = '<class>{CLASS_INCLUDE_FQN}</class>';

// Misc.
const defaultVersionNumber = '1.0.0';
const mxmlHeaderSize = 180;
const mxApplicationTag = '<mx:WindowedApplication';
const sApplicationTag = '<s:WindowedApplication';
const unitTestingAppPrefix = 'FlexUnit';
const unitTestingClassPrefix = 'flexUnitTests';
const swfPathTagName = 'content';
const noDepsMessage = 'echo No dependencies found.'

/**
 * Global print function supporting color coding via markers, e.g., the
 * text following "[e]" will be printed in red(ish) color. If the global
 * "silent" flag is set, only messages beginning with "[e]", "[W]" or "[I]"
 * will be printed (i.e., errors and important warnings and info), and leading
 * white space will be suppressed.
 */
const $print = function (...args) {
    if (!args.length) {
        return;
    }
    const UNMUTEABLE_MARKER = /^\s*\[[eIW]\]/;
    if (mustPrintLess) {
        if (!UNMUTEABLE_MARKER.test(args[0])) {
            return;
        }
        args[0] = args[0].replace(/^[\s\r\n]+/, '');
    }

    const RESET = "\x1b[0m";
    const FG_CYAN = "\x1b[36m";
    const FG_MAGENTA = "\x1b[35m";
    const ERROR_MARKER = /\[e\]/g;
    const WARNING_MARKER = /\[w\]/g;
    const INFO_MARKER = /\[i\]/ig;
    args = args.map(arg => (arg && typeof (arg) == 'string') ?
        arg.replace(ERROR_MARKER, FG_MAGENTA + '[e]')
            .replace(WARNING_MARKER, FG_CYAN + '[w]')
            .replace(INFO_MARKER, RESET + '[i]') : arg);
    args.push(RESET);
};
//const $print = function(){};


// FUNCTIONS
// ---------

/*
 * Produce a canonical SWC name out of a given "raw" name
 */
function toBinaryFileName(rawName) {
    return rawName.trim().toLowerCase().replace(libNameReplacePattern, '-');
}

/*
 * Produce a canonical internal SWC name of of a given "raw" name.
 */
function toProjectSafeName(rawName) {
    let segments = rawName.trim().toLowerCase()
        .replace(libNameReplacePattern, ' ').split(' ');
    segments = segments.map(capitalize);
    return segments.join(' ');
}

/*
 * Returns an Array with the paths of all mxml applications in the given "sourceFolder",
 * provided this is an application project. The list will be empty if this is a library
 * project. If there are several applications inside the project, they will be ordered by 
 * their modification time, in reverse order. It is likely that the one most recently
 * changed is the one the user would be most interested in.
 *
 * A source folder is considered to host an application project if there are one or more
 * "*.mxml" files inside it, of which at least one has the "<WindowedApplication>" tag as
 * its root tag. We are only interested in building Flex AIR applications and libraries,
 * so this approach makes perfect sense.
 */
function getProjectApplications(sourceFolder) {
    const projectApplications = [];
    if (fs.existsSync(sourceFolder)) {
        const mxmlFiles = listFiles(sourceFolder, mxmlFileType)
            .filter(function (mxmlFile) {
                const appFileName = path.basename(mxmlFile, path.extname(mxmlFile));
                return (appFileName.indexOf(unitTestingAppPrefix) === -1);
            });
        if (mxmlFiles.length > 0) {
            let mxmlHeader;
            mxmlFiles.forEach(function (mxmlFile) {
                mxmlHeader = readFileHeader(mxmlFile, mxmlHeaderSize);
                if (mxmlHeader.indexOf(mxApplicationTag) !== -1 ||
                    mxmlHeader.indexOf(sApplicationTag) !== -1) {
                    let stats = fs.statSync(mxmlFile);
                    projectApplications.push({
                        filePath: mxmlFile,
                        fileModifiedTime: stats.mtime.getTime()
                    });
                }
            });
        }
    }
    projectApplications.sort(function (appA, appB) {
        return (appB.fileModifiedTime - appA.fileModifiedTime);
    });
    return projectApplications.map(function (applicationInfo) {
        return applicationInfo.filePath;
    });
}

/**
 * Produces an Array of class FQNs that are referred from either an *.as or *.mxml
 * file inside the given folder. The reference must be explicit, i.e., via an
 * "import" rule or a fully qualified class instantiation.
 */
function listClassImports(folder) {
    const sourceFilesInFolder = listFiles(folder, sourceFileTypes);
    const fqns = [];
    for (let i = 0; i < sourceFilesInFolder.length; i++) {
        let filePath = sourceFilesInFolder[i];
        let fileContent = fs.readFileSync(filePath, 'utf8');

        // Collect "import" includes
        let fqn;
        let match = fileContent.match(importClassFqnPattern);
        if (match && match.length > 0) {
            match.forEach(function (rawFqn) {
                fqn = rawFqn.split(' ').pop();
                if (fqns.indexOf(fqn) === -1) {
                    fqns.push(fqn);
                }
            });
        }

        // Collect inline fully qualified class instantiations
        match = fileContent.match(inlineClassFqnPattern);
        if (match && match.length > 0) {
            match.forEach(function (rawFqn) {
                fqn = rawFqn.replace(':', '.');
                if (fqns.indexOf(fqn) === -1) {
                    fqns.push(fqn);
                }
            });
        }

        // Collect "xmlns" includes (only used in *.mxml files)
        const fileExtension = path.extname(filePath).split('.').pop();
        if (fileExtension === mxmlFileType[0]) {
            while ((match = xmlnsImportClassPattern.exec(fileContent)) !== null) {
                if (match && match[1] && match[1].trim()) {
                    fqn = match[1];
                    if (fqns.indexOf(fqn) === -1) {
                        fqns.push(fqn);
                    }
                }
            }
        }
    }
    fqns.sort();
    return fqns;
}


/**
 * Integrates given "inclusionEntry" into given "inclusions". Does not
 * return a value.
 */
function consolidateInclusions(inclusionEntry, inclusions) {
    if (inclusionEntry) {
        if ((inclusionEntry.swcClasses && inclusionEntry.swcClasses.length > 0) ||
            (inclusionEntry.globalSwcClasses && inclusionEntry.globalSwcClasses.length > 0)) {
            inclusions.push(inclusionEntry);
        }
        inclusions.sort(function (inclusionA, inclusionB) {
        	const swcClassesA = (inclusionA && inclusionA.swcClasses)? inclusionA.swcClasses.length : 0;
        	const swcClassesB = (inclusionB && inclusionB.swcClasses)? inclusionB.swcClasses.length : 0;
            const swcClassesDelta = (swcClassesA - swcClassesB);
			const globalSwcClassesA = (inclusionA && inclusionA.globalSwcClasses)? inclusionA.globalSwcClasses.length : 0;
			const globalSwcClassesB = (inclusionB && inclusionB.globalSwcClasses)? inclusionB.globalSwcClasses.length : 0;
			const globalSwcClassesDelta = (globalSwcClassesA - globalSwcClassesB);
            return (swcClassesDelta || globalSwcClassesDelta);
        });
    }
}

/**
 * Unzips given SWC and reads the classes inside its manifest file as
 * an Array of FQNs.
 */
function readSwcClasses(swcPath) {
    const shellCmd = lookIntoZipCmd.replace('%s', smartQuotePath(swcPath));
    shell.config.silent = true;
    const result = shell.exec(shellCmd);
    if (result.code === 0) {
        const matches = result.stdout.match(globalSwcDefPattern);
        return matches.map(def => def.match(swcDefPattern)[1].replace(':', '.'))
            .filter(def => def[0] !== '_');
    }
    return [];
}

/**
 * Checks if the project residing at given path needs to be built or not.
 * Essentially checks whether any file in that folder's source path is more
 * recent than the project's binary file.
 * @param   projectFolderPath
 *          The path to the project folder, i.e., the folder containing a
 *          'src' sub-folder.
 * @return  boolean
 *          Returns `true` if there is a "src" folder and either of the following is true:
 *          (a) there is no "bin" folder; or
 *          (b) the "bin" folder contains no binary file (a "*.swc" or "*.swf" file with the library or application name); or
 *          (c) any of the files in the "src" folder is newer than the binary file in the "bin" folder.
 *          Returns `false` otherwise.
 */
function mustBuildProject(projectFolderPath) {
    if (projectFolderPath && fs.existsSync(projectFolderPath)) {
        const sourceFolder = getSrcFolderOf(projectFolderPath, true);
        if (sourceFolder && fs.existsSync(sourceFolder)) {
            const binFolder = path.resolve(path.dirname(sourceFolder), binFolderPath);
            if (!fs.existsSync(binFolder)) {
                return true;
            }

            // Check dependencies first. If at least one dependency needs to be rebuilt,
            // then the entire project must be rebuilt.
            const workspacePath = getWorkspacePaths(projectFolderPath)[0];
            const inclusionsMap = getInclusionsMap(workspacePath, true);
            const externalQualifiedClasses = listClassImports(sourceFolder);
            let externalSWCs = getMatchingSWCs(inclusionsMap, externalQualifiedClasses);
            for (let i = 0; i < externalSWCs.length; i++) {
                let swcPath = externalSWCs[i];
                let dependencyPath = path.dirname(path.dirname(swcPath));
                if (pathsAreEqual (dependencyPath, projectFolderPath)) {
                    continue;
                }
                if (mustBuildProject(dependencyPath)) {
                    return true;
                }
            }

            // Then check the project itself.
            const projectActiveApp = getProjectApplications(sourceFolder)[0];
            const isAppProject = !!projectActiveApp;
            let binaryFilePath;
            if (isAppProject) {
                const projectName = path.basename(projectActiveApp, path.extname(projectActiveApp));
                const swfFileName = (toBinaryFileName(projectName) + '.' + swfFileType[0]);
                binaryFilePath = path.resolve(binFolder, swfFileName);
            } else {
                const projectName = path.basename(projectFolderPath);
                const swcFileName = (toBinaryFileName(projectName) + '.' + swcFileType[0]);
                binaryFilePath = path.resolve(binFolder, swcFileName);
            }
            if (!binaryFilePath || !fs.existsSync(binaryFilePath)) {
                return true;
            }
            const binaryFileModificationTime = fs.statSync(binaryFilePath).mtime.getTime();
            const srcFiles = listFiles(sourceFolder, allFilesType);
            for (const srcFilePath of srcFiles) {
                const srcFileModificationTime = fs.statSync(srcFilePath).mtime.getTime();
                if (srcFileModificationTime > binaryFileModificationTime) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 *
 * @param projectFolderPath
 */
function deleteCache (projectFolderPath, keepInclusionsFile = false) {
    if (projectFolderPath && fs.existsSync(projectFolderPath)) {

        // As a safety measure, we will not touch projects without a source
        // folder.
        const workspacePath = getWorkspacePaths(projectFolderPath)[0];
        const sourceFolder = getSrcFolderOf(projectFolderPath, true);
        if (sourceFolder && fs.existsSync(sourceFolder)) {

            // Do dependencies first.
            const inclusionsMap = getInclusionsMap(workspacePath, true);
            const externalQualifiedClasses = listClassImports(sourceFolder);
            let externalSWCs = getMatchingSWCs(inclusionsMap, externalQualifiedClasses);
            for (let i = 0; i < externalSWCs.length; i++) {
                let swcPath = externalSWCs[i];
                let dependencyPath = path.dirname(path.dirname(swcPath));
                if (pathsAreEqual (dependencyPath, projectFolderPath)) {
                    continue;
                }
                deleteCache (dependencyPath, true);
            }

            // Then do the project itself.
            const binFolder = path.resolve(path.dirname(sourceFolder), binFolderPath);
            const projectActiveApp = getProjectApplications(sourceFolder)[0];
            const isAppProject = !!projectActiveApp;
            let binaryFilePath;
            if (isAppProject) {
                const projectName = path.basename(projectActiveApp, path.extname(projectActiveApp));
                const swfFileName = (toBinaryFileName(projectName) + '.' + swfFileType[0]);
                binaryFilePath = path.resolve(binFolder, swfFileName);
            } else {
                const projectName = path.basename(projectFolderPath);
                const swcFileName = (toBinaryFileName(projectName) + '.' + swcFileType[0]);
                binaryFilePath = path.resolve(binFolder, swcFileName);
            }
            if (binaryFilePath && fs.existsSync(binaryFilePath)) {
                $print('\n[i] Deleting binary file:', binaryFilePath);
                deletePathNode (binaryFilePath);
            }
        }

        // Finally, delete the "sirius.inclusions.cache" file.
        if (!keepInclusionsFile) {
            const cachedInclusionsFile = path.resolve(workspacePath, inclusionsFileName);
            if (fs.existsSync(cachedInclusionsFile)) {
                $print('\n[i] Deleting cache file:', cachedInclusionsFile);
                deletePathNode(cachedInclusionsFile);
            }
        }
    }
}

/**
 * Uses the (already built) inclusions map to resolve each given class FQN
 * to its parent (or containing) SWC.
 *
 * @param    inclusions
 *            The inclusions map to match against.
 *
 * @param    classFQNs
 *            Array of Strings, where each String is a (fully qualified)
 *            class name. A class name must match completely to cause its
 *            corresponding SWC path to be included in the returned list.
 *
 * @param    searchField
 *            The field name (inside an inclusion entry) to match against.
 *            Optional, defaults to "swcClasses".
 *
 * @return
 *            Array of Strings, where each string is a fully qualified SWC
 *            file path. Returns an empty Array on failure.
 */
function getMatchingSWCs(inclusions, classFQNs, searchField) {
    if (!inclusions || !Array.isArray(inclusions) || !inclusions.length) {
        return [];
    }
    if (!classFQNs || !Array.isArray(classFQNs) || !classFQNs.length) {
        return [];
    }
    if (searchField === undefined) {
        searchField = 'swcClasses';
    }

    // NOTE:
    // The standard actionscript behavior, for the situation where two included
    // SWCs provide a class with the very same FQN, is that the class in the SWC
    // that is first included takes precedence.
    //
    // There is no way for SIRIUS to automatically determine which SWC to include
    // first in this situation, so it will only include the first matching SWC and
    // will issue a warning, thus letting the user handle the situation manually
    // (by altering the generated build scripts) if needed.
    const swcPaths = [];
    classFQNs.forEach(function (fqn) {
        const havePartialFqn = (fqn[fqn.length - 1] === '*');
        const matchingSWCs = (inclusions.filter(function (record) {
            if (havePartialFqn) {
                const partialFqn = fqn.split('.').slice(0, -1).join('.');
                const testFQNs = record[searchField];
                const partialMatches = testFQNs.filter(function (testFQN) {
                    return (testFQN.indexOf(partialFqn) === 0);
                });
                return (partialMatches.length > 0);
            } else {
                return (record[searchField] && record[searchField].indexOf(fqn) !== -1);
            }
        }).map(function (matchingRecord) {
            return matchingRecord.swcPath;
        }));
        if (!havePartialFqn && matchingSWCs && matchingSWCs.length > 1) {
            $print('[w] This SWCs all contain a class named "' + fqn + '":\n' +
                matchingSWCs.join('\n') +
                '.\nThis is likely to cause issues and should be addressed if possible. Only the first SWC will be included.\nContinuing.');
            matchingSWCs.length = 1;
        }
        matchingSWCs.forEach(function (match) {
            if (match && swcPaths.indexOf(match) === -1) {
                swcPaths.push(match);
            }
        })
    });
    swcPaths.sort();
    swcPaths.reverse();
    return swcPaths;
}

/**
 * Returns a cached or freshly computed map of libraries and classes they
 * contain, given a "searchPath" folder path.
 *
 * The function recursively descends into all sub-folders inside
 * "searchPath", and when it detects a library project (application
 * projects are ignored) it lists all its "*.as" and "*.mxml" files, while
 * converting their paths in FQN format, e.g.:
 *
 *        "searchPath/libProject/src/path/to/file/MyClass.as" becomes:
 *        "path.to.file.MyClass"
 *
 * All classes whose (qualified) names begin with "FlexUnit" or "flexUnitTests"
 * are ignored, as are all projects that contain no "*.as" or "*.mxml" files.
 * This function caches its output in JSON format to the root of the
 * "searchPath" folder. This function produces a warning when "global classes"
 * are encountered.
 *
 * @param    searchPath
 *            String, path of a folder where library projects ar expected to be
 *            found.
 *
 * @return  Array with Objects in the format:
 *            {
 *				"swcPath": "searchPath/constructed/path/to/library.swc",
 *				"swcClasses": [
 *					'path.to.MyClass',
 *					'path.to.MyOtherClass',
 *				],
 *				"globalSwcClasses": [
 *					"MyGlobalClass"
 *				]
 *			}
 *            Returns an empty Array on failure.
 */
function getInclusionsMap(searchPath, silentMode = false) {

    // Try to reuse cached inclusions map if available
    let inclusions = [];
    let cacheExists = false;
    let cacheCorrupted = false;
    const cachedInclusionsFile = path.resolve(searchPath, inclusionsFileName);
    if (fs.existsSync(cachedInclusionsFile)) {
        cacheExists = true;
        const cachedInclusions = fs.readFileSync(cachedInclusionsFile, 'utf8').trim();
        if (cachedInclusions) {
            try {
                inclusions = JSON.parse(cachedInclusions);
                if (!silentMode) {
                    $print('\n[i] Reused cached inclusions map form "' + cachedInclusionsFile + '".');
                }
            } catch (e) {
                cacheCorrupted = true;
                if (!silentMode) {
                    $print('[w] Failed to parse cached inclusions file "' + cachedInclusionsFile + '". Will rebuild inclusions map. Continuing.');
                }
            }
        }
    }

    // Build the inclusions map otherwise
    if (!cacheExists || cacheCorrupted) {
        const workspaceDirs = listFolders(searchPath);
        let projectsApps;
        let isLib;
        for (let i = 0; i < workspaceDirs.length; i++) {
            let inclusionEntry;
            let dirPath = workspaceDirs[i];

            // We first look for SWC libraries. These can exist in both
            // application and library projects, and can be both in-house
            // and third party. We start by indexing these first. If they
            // prove to be in-house SWCs, their classes will not be added
            // twice to the index anyway (that is, first from scanning the
            // SWC and then from scanning the source classes that produce
            // them), so it does not harm to scan SWCs first.
            let libFolder = path.resolve(dirPath, libFolderPath);
            if (libFolder && fs.existsSync(libFolder)) {
                let libFiles = listFiles(libFolder, swcFileType);
                libFiles.forEach(function (swcPath) {
                    inclusionEntry = {
                        "swcPath": swcPath,
                        "swcClasses": readSwcClasses(swcPath)
                    };
                    consolidateInclusions(inclusionEntry, inclusions);
                });
            }

            // Then, go to scan the source files. If this is an application project
            // we can stop, because application projects produce no SWCs that could be
            // reused. Otherwise, infer an SWC name form the library project name,
            // and add all found classes to the index under that inferred SWC name.
            let dirName = path.basename(dirPath);
            let swcName = toBinaryFileName(dirName) + '.' + swcFileType[0];
            const isInsideCurrentProject = (currentProjectFolder.toLowerCase().indexOf(dirPath.toLowerCase()) === 0);
            let sourceFolder = getSrcFolderOf(dirPath, isInsideCurrentProject || silentMode);
            if (sourceFolder && fs.existsSync(sourceFolder)) {

                // If we reach here, we have a "src" folder. We will only look into
                // library projects (application projects yield no SWCs).
                const projectFolder = path.dirname(sourceFolder);
                projectsApps = getProjectApplications(sourceFolder);
                isLib = (projectsApps.length === 0);
                if (!isLib) {
                    continue;
                }
                const swcPath = path.join(dirPath, binFolderPath, swcName);
                const classFiles = listFiles(sourceFolder, sourceFileTypes, true, true);
                const classFQNames = getClassesFQNames(classFiles);
                inclusionEntry = {
                    "swcPath": swcPath,
                    "swcClasses": classFQNames.filter(function (className) {
                        return ((className.indexOf('.') !== -1) &&
                            (className.indexOf(unitTestingClassPrefix) === -1));
                    }),
                    "globalSwcClasses": classFQNames.filter(function (className) {
                        return ((className.indexOf('.') === -1) &&
                            (className.indexOf(unitTestingAppPrefix) === -1));
                    })
                };
                if (inclusionEntry.globalSwcClasses.length > 0) {
                    if (!silentMode) {
                        $print('\n[w] Found', inclusionEntry.globalSwcClasses.length,
                            ((inclusionEntry.globalSwcClasses.length > 1) ? 'classes' : 'class'),
                            'in the global package inside library project "' +
                            projectFolder + '":\n\t' +
                            inclusionEntry.globalSwcClasses.join('\n\t') +
                            '\nThis is bad practice. Those classes should be given fully qualified names.\nContinuing.');
                    }
                }
                consolidateInclusions(inclusionEntry, inclusions);
            }
        }

        // Cache built inclusions tree
        fs.writeFileSync(cachedInclusionsFile, JSON.stringify(inclusions, null, '\t'));
        if (!silentMode) {
            $print('\n[i] Wrote inclusions map cache to file "' + cachedInclusionsFile + '".');
        }
    }
    return inclusions;
}

/*
 * Converts given class file paths to canonical ActionScript class names.
 */
function getClassesFQNames(classFiles) {
    let pathToFQName = function (filePath) {
        return filePath.split(path.sep).join('.');
    }
    return classFiles.map(pathToFQName);
}

/**
 * Synchronously waits the set number of seconds, by temporarily blocking the
 * thread with an infinite loop. Maximum waiting time is 30 seconds.
 */
function wait(seconds) {
    seconds = parseInt(seconds);
    if (isNaN(seconds)) {
        seconds = 0;
    }
    seconds = Math.min(30, Math.max(0, seconds));
    $print('[i] Waiting for', seconds, 'second(s)...');

    function getCurrentTime() {
        return new Date().getTime() / 1000;
    }

    const startTime = getCurrentTime();
    let stopLoop = false;
    let currentTime;
    while (1 && !stopLoop) { // infinite loop with exit condition
        currentTime = Math.round(getCurrentTime() - startTime);
        if (currentTime >= seconds) {
            stopLoop = true;
        }
    }
}

/**
 * Returns a description stub suitable for placing in a generated
 * application descriptor file
 */
function makeDescription(appName, userName) {
    return ([
        [appName, 'application'],
        userName ? ['by', userName] : '',
    ]).reduce(function (description, currToken, iteration) {
        if (iteration === 1) {
            description = description.join(' ');
        }
        if (currToken && Array.isArray(currToken)) {
            const segment = currToken.join(' ');
            description += (' ' + segment);
        } else {
            description += currToken;
        }
        return description;
    });
}

/**
 * Gets the outermost "src" folder found inside the given "projectFolder".
 * Produces a warning if more than a single "src" folder are found within the
 * same project folder. Returns null on failure.
 */
function getSrcFolderOf(projectFolder, bypassWarning) {
    if (fs.existsSync(projectFolder)) {
        const allFolders = listFiles(projectFolder, allFoldersType)
            .filter(function (folderPath) {
                const folderName = path.basename(folderPath);
                return (folderName === sourceFolderPath);
            })
            .sort ((pathA, pathB) => (pathA? pathA.length : 0) - (pathB? pathB.length : 0));

        if (allFolders.length > 1 && !bypassWarning) {
            $print('\n[w] Found several directories named "src" inside directory "' + projectFolder + '":\n\n\t' +
                allFolders.join('\n\t') +
                '\n\nThere should be exactly one "src" directory inside any given project directory, and project directories should live directly under the WORKSPACE directory.\nContinuing.');
        }
        return allFolders[0];
    }
    return null;
}

/**
 * Produces a string pointing either to the path of the SIRIUS executable, or to the
 * path of the NodeJS executable to which SIRIUS.js is given as an argument (depending on
 * whether SIRIUS is run in its packed or unpacked form). All produced paths are absolute.
 */
function getSiriusCallPath () {
    // Compute qualified access path to SIRIUS packed executable or unpacked script
    let siriusPath = process.argv[1];
    const siriusIsUnpacked = (path.extname(siriusPath) === '.js');
    siriusPath = smartQuotePath(siriusPath);
    if (siriusIsUnpacked) {
        siriusPath = (smartQuotePath(process.execPath) + ' ' + siriusPath);
    }
    return siriusPath;
}

/**
 * Returns the path to the executable where the sirius executable resides.
 */
function getSiriusFolder () {
    return __dirname;
}

/**
 * Returns the path to the directory where all the project folders live and the path to
 * the directory where the current project live, i.e., the folder that contains a "src"
 * sub-folder). This makes sense for the situation where the actual code is deeply nested
 * in the project folder, e.g., my_project/prototype/code/src/[actual code lives here].
 *
 * @param   {string} targetFolder
 *          The path to the folder where SIRIUS is "told" to run. If SIRIUS was run
 *          without a path argument, then this will be assumed to be the current working
 *          folder.
 *
 * @return  {string[]}
 *          Array with the "workspace path" at index 0 and "project folder" at index 1.
 *          If the code in the current project is not deeply nested, then the
 *          "project folder" will be the same as the given `targetFolder`. Otherwise, it
 *          will be a sub-folder of it.
 */
function getWorkspacePaths (targetFolder) {
    targetFolder = targetFolder || process.cwd();
    const siriusFolder = getSiriusFolder();

    // TODO: make this configurable.
    const workspaceParentDir = path.resolve(siriusFolder, '../../');

    // We use that assumption to best effort detect the workspace directory.
    let workspacePath = path.dirname(targetFolder);
    let projectFolderBase = null;
    const safeProjectFolder = targetFolder.toLowerCase();
    const safeWorkspaceParentDir = workspaceParentDir.toLowerCase();
    if (safeProjectFolder.indexOf(safeWorkspaceParentDir) === 0) {
        const relWorkspacePathSegments = safeProjectFolder.replace(safeWorkspaceParentDir, '')
            .split(path.sep)
            .filter(function (pathSegment) {
                return (pathSegment.trim() !== '');
            });
        const relWorkspacePath = relWorkspacePathSegments[0];
        projectFolderBase = relWorkspacePathSegments[1];
        if (relWorkspacePath) {
            workspacePath = path.resolve(workspaceParentDir, relWorkspacePath);
        }
    }
    return [workspacePath, projectFolderBase];
}

/**
 * Deals with the scenario where some assets in the project source 
 * need to be copied unchanged to the resulting distribution.
 *
 * Computes and returns an Array with "copy rules", i.e., Objects 
 * containing a `src` and a `target` property. They both represent 
 * absolute paths, the only difference being that `src` paths point 
 * to files in some subfolder of the source folder, while `target` 
 * paths point to subfolders of the resulting distribution.
 *
 * @param  copiableDir
 *		   The name of a subfolder in the source folder, whose files 
 *         are to be mirrored in the binaries folder.
 *
 * @param  sourceFolder
 *		   Absolute path to project's source folder.
 *
 * @param  binFolder
 *         Absolute path to project's binaries folder.
 *
 * @return {object[]} 
 *         A (possibly empty) Array of Objects having the properties 
 *         `src` and a `target`.
 */
function buildCopyRules (copiableDir,sourceFolder, binFolder) {
	const copyOperations = [];
	const assetsFolderPath = path.resolve(sourceFolder, copiableDir);
	if (fs.existsSync(assetsFolderPath)) {
	    const assetFiles = listFiles(assetsFolderPath, allFilesType, true);
	    if (assetFiles.length) {
	        const binAssetsFolderPath = path.resolve(binFolder, copiableDir);
	        assetFiles.forEach(function (assetFile) {
	            const copyRule = {
	                src: smartQuotePath(path.resolve(assetsFolderPath, assetFile)),
	                target: smartQuotePath(path.resolve(binAssetsFolderPath, assetFile))
	            }
	            copyOperations.push(copyRule);
	        });
	    }
	}
	return copyOperations;
}

/**
 * Main entry point: resolves paths, populates templates and writes build scripts to
 * disk.
 * @param   {string|null} targetFolder
 *          The folder in which to execute. If missing, current working directory is
 *          used.
 *
 * @param   {boolean} cfgOnly
 *          Whether to only rebuild the configuration files, living the build (or
 *          run, or pack) scripts alone. Default false.
 *
 * @param   {boolean} silent
 *          Whether to mute most of console descriptive output, including warnings.
 *          Errors are always outputted.
 */
function generateBuildScripts(targetFolder = null,
                              cfgOnly = false,
                              silent = false) {

    // Toggle a global flag that controls the amount of information sent to the console.
    mustPrintLess = silent;

    // Start execution in given or current folder.
    targetFolder = targetFolder || process.cwd();
    $print('\n[i] Executing SIRIUS in directory "' + targetFolder + '"...');

    // Compute qualified access path to SIRIUS packed executable or unpacked script
    const siriusPath = getSiriusCallPath();
    const siriusFolder = getSiriusFolder();

    // Detect the workspace and actual project directory.
    const workspacePaths = getWorkspacePaths(targetFolder);
    const workspacePath = workspacePaths[0];
    $print('\n[i] Assuming workspace directory as "' + workspacePath + '";');
    const projectFolderBase = workspacePaths[1];
    if (!projectFolderBase) {
        $print('\n[e] Could not determine current project directory. Try running SIRIUS from inside your project\'s directory instead.\nAborting.');
        return;
    }

    // Ensure that the "src" folder of the project exists.
    const sourceFolder = getSrcFolderOf(targetFolder);
    if (!sourceFolder || !fs.existsSync(sourceFolder)) {
        $print('\n[e] Source directory "' + (sourceFolder || 'src') +
            '" not found.\nMake sure you call SIRIUS from inside a project directory.\nAborting.');
        return;
    }
    //targetFolder = path.dirname(sourceFolder);
    const projectFolderName = path.basename(targetFolder);
    $print('\n[i] Assuming project directory as "' + targetFolder + '";');
    $print('\n[i] Assuming source directory as "' + sourceFolder + '";');

    // The "bin" files should be a sibling of the "src" folder. We don't care
    // if it doesn't exist, we will have the build script create it there,
    // anyway.
    const binFolder = path.resolve(path.dirname(sourceFolder), binFolderPath);
    $print('\n[i] Assuming binary files directory as "' + binFolder + '";');

    // Determine whether this is a library or application project
    projectApplications = getProjectApplications(sourceFolder);
    isApplicationProject = (projectApplications.length > 0);
    $print('\n[i] This seems to be',
        (isApplicationProject ? 'an application' : 'a library'),
        'project. Will create',
        (isApplicationProject ? '"build", "run" and "pack" scripts;' :
            'a "build" script;'));

    // Resolve java folder
    const javaFolder = path.resolve(siriusFolder, defaultJavaPath);
    if (!fs.existsSync(javaFolder)) {
        $print('\n[e] Java directory "' + javaFolder +
            '" not found.\nCheck your BUILD directory structure.\nAborting.');
        return;
    }

    // Resolve SDK *.jar files folder
    const jarsFolder = path.resolve(siriusFolder, defaultSdkJarsPath);
    if (!fs.existsSync(jarsFolder)) {
        $print('\n[e] SDK *.jar files directory "' + jarsFolder +
            '" not found.\nCheck your BUILD directory structure.\nAborting.');
        return;
    }

    // Resolve SDK "frameworks" folder
    const frameworksFolder = path.resolve(siriusFolder, defaultFrameworksPath);
    if (!fs.existsSync(frameworksFolder)) {
        $print('\n[e] SDK "frameworks" directory "' + frameworksFolder +
            '" not found.\nCheck your BUILD directory structure.\nAborting.');
        return;
    }

    // Ensure build scripts home directory exists and is empty. This fails sometimes
    // for no apparent reason, therefore we retry two times before aborting.
    // NOTE: we will NOT try to recreate the build scripts folder if the "cfgOnly"
    // flag is set.
    const buildScriptsHome = path.resolve(targetFolder, buildScriptsFolderName);
    if (!cfgOnly) {
        if (fs.existsSync(buildScriptsHome)) {
            try {
                deletePathNode(buildScriptsHome);
            } catch (e) {
                $print('\n[e] Failed to delete directory: "' + buildScriptsHome +
                    '".\nCheck if any file in that directory is open in terminal or another application.\nAborting.');
            }
        }
    }
    let tries = 3;
    while (!fs.existsSync(buildScriptsHome) && (tries > 0)) {
        try {
            fs.mkdirSync(buildScriptsHome, '0777');
        } catch (e) {
            $print('\n' + ((tries > 1) ? '[w]' : '[e]'),
                'Failed to create directory: "' + buildScriptsHome + '".');
            if (tries > 1) {
                $print('[i] Retrying ' + (tries - 1) +
                    ' more time(s) in ' + '1 second.');
                wait(1);
            } else {
                $print('[e] Aborting.');
            }
        }
        tries--;
    }

    // Initialize a configuration file from template
    const cfgTemplatePath = path.resolve(siriusFolder,
        isApplicationProject ? appConfigTemplateFile : libConfigTemplateFile);
    const cfgFileName = isApplicationProject ? appConfigFileName : libConfigFileName;
    const cfgFilePath = path.resolve(buildScriptsHome, cfgFileName);
    let cfgFileContent = fs.readFileSync(cfgTemplatePath, 'utf8');

    // Initialize a build script file from template
    let buildScriptFilePath;
    let buildScriptFileContent;
    if (!cfgOnly) {
        const buildScriptTemplatePath = path.resolve(siriusFolder,
            isApplicationProject ? appBuildTemplateFile : libBuildTemplateFile);
        const buildScriptFileName = isApplicationProject ? appBuildFileName : libBuildFileName;
        buildScriptFilePath = path.resolve(buildScriptsHome, buildScriptFileName);
        buildScriptFileContent = fs.readFileSync(buildScriptTemplatePath, 'utf8');
    }
    let projectName;
    let libraryName;

    // HANDLE BUILD TASKS RELATED TO LIBRARY PROJECTS
    let swcPath = null;
    if (!isApplicationProject) {

        // Place source path inside the in-memory configuration
        cfgFileContent = cfgFileContent.replace(sourcePathPlaceholderPattern, sourceFolder);

        // Place library name inside the in-memory configuration
        libraryName = toProjectSafeName(projectFolderName);
        cfgFileContent = cfgFileContent.replace(libTitlePlaceHolder,
            '<title>' + libraryName + '</title>');

        // Place library name inside the in-memory build script
        if (!cfgOnly) {
            buildScriptFileContent = buildScriptFileContent.replace(libNamePlaceHolderPattern, libraryName);
        }

        // Place output file path inside the in-memory configuration
        const swcFileName = (toBinaryFileName(projectFolderName) + '.' + swcFileType[0]);
        swcPath = path.resolve(binFolder, swcFileName);
        cfgFileContent = cfgFileContent.replace(libOutputSwcPathPlaceholder,
            '<output>' + swcPath + '</output>');

        // Obtain list of classes to compile
        const classFiles = listFiles(sourceFolder, sourceFileTypes, true, true);
        const classFQNames = getClassesFQNames(classFiles);

        // Place list of classes to compile inside the in-memory configuration
        let classIncludes = [];
        for (let i = 0; i < classFQNames.length; i++) {
            let fqn = classFQNames[i];
            classIncludes.push('<class>' + fqn + '</class>');
        }
        const classIncludesXML = classIncludes.join('\n');
        cfgFileContent = cfgFileContent.replace(libClassIncludesPlaceholder, classIncludesXML);
    }

    // HANDLE BUILD TASKS RELATED TO APPLICATION PROJECTS
    else {
        const defaultProjectPath = projectApplications[0];
        projectName = path.basename(defaultProjectPath, path.extname(defaultProjectPath));
        if (!cfgOnly) {

            // Place application name inside the in-memory build script
            buildScriptFileContent = buildScriptFileContent.replace(appNamePlaceHolderPattern, projectName);

            // Place application file path inside the in-memory build script
            buildScriptFileContent = buildScriptFileContent.replace(appMxmlPathPlaceholder, smartQuotePath(defaultProjectPath));

            // Place output file name inside the in-memory build script
            const swfFileName = (toBinaryFileName(projectName) + '.' + swfFileType[0]);
            const swfPath = path.resolve(binFolder, swfFileName);
            buildScriptFileContent = buildScriptFileContent.replace(appSwfPathPlaceholderPattern, smartQuotePath(swfPath));


            // Check if descriptor file is present. If it is, modify it in place (change the
            // path to the main SWF file). Otherwise, create it from template.
            const descriptorFileName = (projectName + descriptorFileNameSuffix)
            const descriptorPath = path.resolve(sourceFolder, descriptorFileName);
            let descriptorFileContent;
            if (!fs.existsSync(descriptorPath)) {
                const descriptorTemplatePath = path.resolve(siriusFolder, descriptorTemplateFile);
                descriptorFileContent = fs.readFileSync(descriptorTemplatePath, 'utf8');
                descriptorFileContent = descriptorFileContent.replace(appUniqueIdPlaceholder, getUuid());
                descriptorFileContent = descriptorFileContent.replace(appFileNamePlaceholderPattern, projectName);
                descriptorFileContent = descriptorFileContent.replace(appVersionNumberPlaceholder, defaultVersionNumber);
                descriptorFileContent = descriptorFileContent.replace(appDescriptionPlaceholder, makeDescription(projectName, getUserName()));
                descriptorFileContent = descriptorFileContent.replace(appCopyrightPlaceholder, (new Date().getFullYear().toString()));
                descriptorFileContent = descriptorFileContent.replace(appSwfPathPlaceholderPattern, swfPath);
                fs.writeFileSync(descriptorPath, descriptorFileContent);
                $print('\n[i] Created and wrote application descriptor file "' + descriptorPath + '".');
            } else {
                descriptorFileContent = fs.readFileSync(descriptorPath, 'utf8');
                descriptorFileContent = changeXmlTag(descriptorFileContent, swfPathTagName, swfFileName);
                fs.writeFileSync(descriptorPath, descriptorFileContent);
                $print('\n[i] Modified and saved existing application descriptor file "' + descriptorPath + '".');
            }

            // Place file copy commands inside the in-memory build 
            // script. Files to be copied are:
            // - the application descriptor;
            // - and any file found inside the "src/assets/" folder,
            //   if there is one;
            // - any file found inside the [OS_SLUG]native (e.g., 
            //   "winnative"), if there is one.
            // - any file found inside the "src/doc/" folder, if 
            //   there is one.
			let copyOperations = buildCopyRules (assetsFolderName, sourceFolder, binFolder);
			const nativesFolder = (OS_SLUG + nativeFolderSuffix);
			copyOperations = copyOperations.concat (buildCopyRules(nativesFolder, sourceFolder, binFolder));
			copyOperations = copyOperations.concat (buildCopyRules(documentationFolder, sourceFolder, binFolder));
            const binDescriptorFilePath = path.resolve(binFolder, projectName + descriptorFileNameSuffix);
            copyOperations.unshift ({
                src: smartQuotePath(descriptorPath),
                target: smartQuotePath(binDescriptorFilePath)
            });
            buildScriptFileContent = resolveRepeatMarkers(buildScriptFileContent, copyStartMarker,
                copyEndMarker, copyOperations, true);

            // Create the "run" script from template
            const appRunScriptTemplatePath = path.resolve(siriusFolder, appRunTemplateFile);
            let appRunScriptFileContent = fs.readFileSync(appRunScriptTemplatePath, 'utf8');

            // Place the ADL executable path inside the in-memory "run" script.
            const adlFilePath = path.resolve(siriusFolder, defaultSdkAdlPath, adlFileName);
            appRunScriptFileContent = appRunScriptFileContent.replace(adlPathPlaceholder, smartQuotePath(adlFilePath));

            // Place the application descriptor path inside the in-memory "run" script.
            appRunScriptFileContent = appRunScriptFileContent.replace(appDescriptorPathPlaceholder, smartQuotePath(binDescriptorFilePath));

            // Write the "run" script to disk
            const appRunScriptPath = path.resolve(buildScriptsHome, appRunFileName);
            fs.writeFileSync(appRunScriptPath, appRunScriptFileContent);
            $print('\n[i] Wrote "run" script file "' + appRunScriptPath + '".');
        }
    }

    // Obtain list of SWCs dependencies:
    // 1. fully qualified class names that are explicitly referred in code;
    const inclusionsMap = getInclusionsMap(workspacePath);
    const externalQualifiedClasses = listClassImports(sourceFolder);
    let externalSWCs = getMatchingSWCs(inclusionsMap, externalQualifiedClasses);

    // 2. unqualified class names (classes found in the "global" package) that
    // *seem* to be referred in code.
    const flatGlobalClassesList = [];
    inclusionsMap.forEach(function (inclusionEntry) {
        if (inclusionEntry.globalSwcClasses && inclusionEntry.globalSwcClasses.length > 0) {
            flatGlobalClassesList.push(...inclusionEntry.globalSwcClasses);
        }
    });
    const usedGlobalClasses = [];
    const classFilePaths = listFiles(sourceFolder, sourceFileTypes);
    classFilePaths.forEach(function (classFilePath) {
        const classFileContent = fs.readFileSync(classFilePath, 'utf8');
        flatGlobalClassesList.forEach(function (className) {
            if (!usedGlobalClasses.includes(className)) {
                const testPattern = new RegExp('\\:\\s*' + className + '\\b' +
                    '|getQualifiedClassName\\s*\\(\\s*' + className + '\\s*\\)');
                const match = classFileContent.match(testPattern);
                if (match) {
                    const matchIndex = match.index;
                    if (matchIndex !== -1) {
                        usedGlobalClasses.push(className);
                    }
                }
            }
        });
    });
    const matchingSWCs = getMatchingSWCs(inclusionsMap, usedGlobalClasses, 'globalSwcClasses');
    externalSWCs.push(...matchingSWCs);

    // Filter out the current library's SWC path, so that we do not cause infinite recursions.
    externalSWCs = externalSWCs.filter(externalSwc => externalSwc !== swcPath);

    // 3. classes that live in the same package as the current class - although in an external library.
    // [TODO: decide whether there is need to implement such a scenario]

    // HANDLE COMMON BUILD TASKS
    if (!cfgOnly) {

        // Place commands to update and build dependencies inside the in-memory build script.
        const depsSectionData = externalSWCs.map(externalSwc => {
            const depHome = path.dirname(path.dirname(externalSwc));
            if (depHome === targetFolder) {
                return null;
            }
            const depBuildFile = path.resolve(depHome, buildScriptsFolderName, libBuildFileName);
            return {
                sirius: siriusPath,
                dependency_path: depHome,
                dependency_build_file: depBuildFile
            };
        }).filter(dep => !!dep);
        buildScriptFileContent = resolveRepeatMarkers(buildScriptFileContent, depsStartMarker, depsEndMarker, depsSectionData, true, noDepsMessage);

        // Place the Java home directory inside the in-memory build script
        buildScriptFileContent = buildScriptFileContent.replace(javaPathPlaceholder, smartQuotePath(javaFolder));

        // Place the SDK *.jar files home directory inside the in-memory build script
        buildScriptFileContent = buildScriptFileContent.replace(jarsPathPlaceholder, smartQuotePath(jarsFolder));

        // Place the SDK "frameworks" directory inside the in-memory build script
        buildScriptFileContent = buildScriptFileContent.replace(frameworksPathPlaceholder, smartQuotePath(frameworksFolder));

        // Place configuration file name inside the in-memory build script
        buildScriptFileContent = buildScriptFileContent.replace(configFilePathPlaceholder,
            smartQuotePath(cfgFilePath));

        // Place SIRIUS executable path inside the in-memory build script
        buildScriptFileContent = buildScriptFileContent.replace(siriusPathPlaceHolderPattern, siriusPath);

        // Place source path inside the in-memory build script
        buildScriptFileContent = buildScriptFileContent.replace(folderPathPlaceholderPattern,
            smartQuotePath(targetFolder));

        // Write build script file to disk
        fs.writeFileSync(buildScriptFilePath, buildScriptFileContent);
        $print('\n[i] Wrote "build" script file "' + buildScriptFilePath + '".');
    }

    // Place list of SWCs dependencies inside the in-memory configuration
    let swcDependencies = [];
    for (let i = 0; i < externalSWCs.length; i++) {
        let externalSwc = externalSWCs[i];
        swcDependencies.push('<path-element>' + externalSwc + '</path-element>')
    }
    const externalSWCsXML = swcDependencies.join('\n');
    cfgFileContent = cfgFileContent.replace(swcIncludesPlaceholder, externalSWCsXML);

    // Place creator name inside the in-memory configuration
    cfgFileContent = cfgFileContent.replace(creatorPlaceholderPattern, getUserName());

    // If applicable, place application name and description inside the in-memory configuration
    if (projectName) {
        cfgFileContent = cfgFileContent.replace(appFileNamePlaceholderPattern, projectName)
            .replace(appDescriptionPlaceholder, makeDescription(projectName, getUserName()));
    }

    // Write the configuration file to disk
    cfgFileContent = formatXml(cfgFileContent);
    fs.writeFileSync(cfgFilePath, cfgFileContent);
    $print('\n[i] Wrote configuration file "' + cfgFilePath + '".');

    $print('\n[i] SIRIUS terminated normally.');
}

// ----
// MAIN
// ----

// Retrieve, parse and apply arguments (if any)
const args = process.argv.slice(2);
const KNOWN_FLAGS = ['--cfg-only', '--silent', '--dirty-check-only', '--del-cache-only', '--release'];
const flagValues = {};
let targetFolder;
for (const [i, arg] of args.entries()) {
    if (!!arg) {

        // Any argument can be a flag, including the first one.
        if (KNOWN_FLAGS.includes(arg)) {
            flagValues[arg] = true;
        } else {

            // The first argument can also be the path to a folder
            if (i === 0) {
                const testAbsPath = path.resolve(process.cwd(), arg);
                if (fs.existsSync(testAbsPath) &&
                    fs.lstatSync(testAbsPath).isDirectory()) {
                    let canAccess = true;
                    try {
                        fs.accessSync(testAbsPath, fs.constants.R_OK);
                    } catch (e) {
                        canAccess = false;
                    }
                    if (canAccess) {
                        targetFolder = testAbsPath;
                    }
                }
                if (!targetFolder) {
                    $print('[w] Could not interpret first given argument "' + testAbsPath +
                        '" neither as a flag nor as an absolute path to an accessible directory (also check permissions). SIRIUS will use the current working directory instead.');
                }
            } else {
                $print('[w] Ignoring unknown flag "' + arg + '".');
            }
        }
    }
}

let cfgOnly = !!flagValues['--cfg-only'];
let silent = !!flagValues['--silent'];
let dirtyCheckOnly = !!flagValues['--dirty-check-only'];
let delCache = !!flagValues['--del-cache-only'];
let release = !!flagValues['--release'];
currentProjectFolder = targetFolder = (targetFolder || process.cwd());

// If flag "--del-cache-only" was given, main function will NOT be called. Instead,
// SIRIUS will only delete its "sirius.inclusions.cache" file, and any SWC/SWF files
// found in "bin" folders across the project and its dependencies (recursively)..
if (delCache) {
    deleteCache(targetFolder);
}

// If flag "--dirty-check-only" was given, main function will NOT be called. Instead,
// SIRIUS will only check whether the project path given as first argument needs to be
// (re)compiled, then produce one of two possible strings, "clean" or "dirty", then exit.
else if (dirtyCheckOnly) {
    process.stdout.write(mustBuildProject(targetFolder) ? 'dirty' : 'clean');
}

// Otherwise, we'll call main function with gathered arguments.
else {
    generateBuildScripts(targetFolder, cfgOnly, silent);
}
