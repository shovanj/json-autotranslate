#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = __importDefault(require("commander"));
const flat_1 = require("flat");
const fs = __importStar(require("fs"));
const lodash_1 = require("lodash");
const path = __importStar(require("path"));
const deep_object_diff_1 = require("deep-object-diff");
const ncp_1 = __importDefault(require("ncp"));
const services_1 = require("./services");
const file_system_1 = require("./util/file-system");
const matchers_1 = require("./matchers");
require('dotenv').config();
commander_1.default
    .option('-i, --input <inputDir>', 'the directory containing language directories', '.')
    .option('--cache <cacheDir>', 'set the cache directory', '.json-autotranslate-cache')
    .option('-l, --source-language <sourceLang>', 'specify the source language', 'en')
    .option('-t, --type <key-based|natural|auto>', `specify the file structure type`, /^(key-based|natural|auto)$/, 'auto')
    .option('-a, --with-arrays', `enables support for arrays in files, but removes support for keys named 0, 1, 2, etc.`)
    .option('-s, --service <service>', `selects the service to be used for translation`, 'google-translate')
    .option('-g, --glossaries [glossariesDir]', `set the glossaries folder to be used by DeepL. Keep empty for automatic determination of matching glossary`)
    .option('-a, --appName <appName>', `specify the name of your app to distinguish DeepL glossaries (if sharing an API key between multiple projects)`, 'json-autotranslate')
    .option('--context <context>', `set the context that is used by DeepL for translations`)
    .option('--list-services', `outputs a list of available services`)
    .option('-m, --matcher <matcher>', `selects the matcher to be used for interpolations`, 'icu')
    .option('--list-matchers', `outputs a list of available matchers`)
    .option('-c, --config <value>', 'supply a config parameter (e.g. path to key file) to the translation service')
    .option('-f, --fix-inconsistencies', `automatically fixes inconsistent key-value pairs by setting the value to the key`)
    .option('-d, --delete-unused-strings', `deletes strings in translation files that don't exist in the template`)
    .option('--directory-structure <default|ngx-translate>', 'the locale directory structure')
    .option('--decode-escapes', 'decodes escaped HTML entities like &#39; into normal UTF-8 characters')
    .parse(process.argv);
const translate = async (inputDir = '.', cacheDir = '.json-autotranslate-cache', sourceLang = 'en', deleteUnusedStrings = false, fileType = 'auto', withArrays = false, dirStructure = 'default', fixInconsistencies = false, service = 'google-translate', matcher = 'icu', decodeEscapes = false, config, glossariesDir, appName, context) => {
    const workingDir = path.resolve(process.cwd(), inputDir);
    const resolvedCacheDir = path.resolve(process.cwd(), cacheDir);
    const availableLanguages = (0, file_system_1.getAvailableLanguages)(workingDir, dirStructure);
    const targetLanguages = availableLanguages.filter((f) => f !== sourceLang);
    if (!fs.existsSync(resolvedCacheDir)) {
        fs.mkdirSync(resolvedCacheDir);
        console.log(`🗂 Created the cache directory.`);
    }
    if (!availableLanguages.includes(sourceLang)) {
        throw new Error(`The source language ${sourceLang} doesn't exist.`);
    }
    if (typeof services_1.serviceMap[service] === 'undefined') {
        throw new Error(`The service ${service} doesn't exist.`);
    }
    if (typeof matchers_1.matcherMap[matcher] === 'undefined') {
        throw new Error(`The matcher ${matcher} doesn't exist.`);
    }
    const translationService = services_1.serviceMap[service];
    const templateFilePath = (0, file_system_1.evaluateFilePath)(workingDir, dirStructure, sourceLang);
    const templateFiles = (0, file_system_1.loadTranslations)(templateFilePath, fileType, withArrays);
    (0, file_system_1.syncDirStucture)(templateFiles, templateFilePath, cacheDir, targetLanguages);
    if (templateFiles.length === 0) {
        throw new Error(`The source language ${sourceLang} doesn't contain any JSON files.`);
    }
    console.log((0, chalk_1.default) `Found {green.bold ${String(targetLanguages.length)}} target language(s):`);
    console.log(`-> ${targetLanguages.join(', ')}`);
    console.log();
    console.log(`🏭 Loading source files...`);
    for (const file of templateFiles) {
        console.log((0, chalk_1.default) `├── ${String(file.name)} (${file.type})`);
    }
    console.log((0, chalk_1.default) `└── {green.bold Done}`);
    console.log();
    console.log(`✨ Initializing ${translationService.name}...`);
    await translationService.initialize(config, matchers_1.matcherMap[matcher], decodeEscapes, glossariesDir, appName, context);
    console.log((0, chalk_1.default) `└── {green.bold Done}`);
    console.log();
    if (!translationService.supportsLanguage(sourceLang)) {
        throw new Error(`${translationService.name} doesn't support the source language ${sourceLang}`);
    }
    console.log(`🔍 Looking for key-value inconsistencies in source files...`);
    const inconsistentFiles = [];
    for (const file of templateFiles.filter((f) => f.type === 'natural')) {
        const inconsistentKeys = Object.keys(file.content).filter((key) => key !== file.content[key]);
        if (inconsistentKeys.length > 0) {
            inconsistentFiles.push(file.name);
            console.log((0, chalk_1.default) `├── {yellow.bold ${file.name} contains} {red.bold ${String(inconsistentKeys.length)}} {yellow.bold inconsistent key(s)}`);
        }
    }
    if (inconsistentFiles.length > 0) {
        console.log((0, chalk_1.default) `└── {yellow.bold Found key-value inconsistencies in} {red.bold ${String(inconsistentFiles.length)}} {yellow.bold file(s).}`);
        console.log();
        if (fixInconsistencies) {
            console.log(`💚 Fixing inconsistencies...`);
            (0, file_system_1.fixSourceInconsistencies)(templateFilePath, (0, file_system_1.evaluateFilePath)(resolvedCacheDir, dirStructure, sourceLang));
            console.log((0, chalk_1.default) `└── {green.bold Fixed all inconsistencies.}`);
        }
        else {
            console.log((0, chalk_1.default) `Please either fix these inconsistencies manually or supply the {green.bold -f} flag to automatically fix them.`);
        }
    }
    else {
        console.log((0, chalk_1.default) `└── {green.bold No inconsistencies found}`);
    }
    console.log();
    console.log(`🔍 Looking for invalid keys in source files...`);
    const invalidFiles = [];
    for (const file of templateFiles.filter((f) => f.type === 'key-based')) {
        const invalidKeys = Object.keys(file.originalContent).filter((k) => typeof file.originalContent[k] === 'string' && k.includes(' '));
        if (invalidKeys.length > 0) {
            invalidFiles.push(file.name);
            console.log((0, chalk_1.default) `├── {yellow.bold ${file.name} contains} {red.bold ${String(invalidKeys.length)}} {yellow.bold invalid key(s)}`);
        }
    }
    if (invalidFiles.length) {
        console.log((0, chalk_1.default) `└── {yellow.bold Found invalid keys in} {red.bold ${String(invalidFiles.length)}} {yellow.bold file(s).}`);
        console.log();
        console.log((0, chalk_1.default) `It looks like you're trying to use the key-based mode on natural-language-style JSON files.`);
        console.log((0, chalk_1.default) `Please make sure that your keys don't contain periods (.) or remove the {green.bold --type} / {green.bold -t} option.`);
        console.log();
        process.exit(1);
    }
    else {
        console.log((0, chalk_1.default) `└── {green.bold No invalid keys found}`);
    }
    console.log();
    let totalAddedTranslations = 0;
    let totalRemovedTranslations = 0;
    for (const language of targetLanguages) {
        if (!translationService.supportsLanguage(language)) {
            console.log((0, chalk_1.default) `🙈 {yellow.bold ${translationService.name} doesn't support} {red.bold ${language}}{yellow.bold . Skipping this language.}`);
            console.log();
            continue;
        }
        console.log((0, chalk_1.default) `💬 Translating strings from {green.bold ${sourceLang}} to {green.bold ${language}}...`);
        const translateContent = createTranslator(translationService, service, sourceLang, language, cacheDir, workingDir, dirStructure, deleteUnusedStrings, withArrays);
        switch (dirStructure) {
            case 'default':
                const existingFiles = (0, file_system_1.loadTranslations)((0, file_system_1.evaluateFilePath)(workingDir, dirStructure, language), fileType, withArrays);
                if (deleteUnusedStrings) {
                    const templateFileNames = templateFiles.map((t) => t.name);
                    const deletableFiles = existingFiles.filter((f) => !templateFileNames.includes(f.name));
                    for (const file of deletableFiles) {
                        console.log((0, chalk_1.default) `├── {red.bold ${file.name} is no longer used and will be deleted.}`);
                        fs.unlinkSync(path.resolve((0, file_system_1.evaluateFilePath)(workingDir, dirStructure, language), file.name));
                        const cacheFile = path.resolve((0, file_system_1.evaluateFilePath)(workingDir, dirStructure, language), file.name);
                        if (fs.existsSync(cacheFile)) {
                            fs.unlinkSync(cacheFile);
                        }
                    }
                }
                for (const templateFile of templateFiles) {
                    process.stdout.write(`├── Translating ${templateFile.name}`);
                    const [addedTranslations, removedTranslations] = await translateContent(templateFile, existingFiles.find((f) => f.name === templateFile.name));
                    totalAddedTranslations += addedTranslations;
                    totalRemovedTranslations += removedTranslations;
                }
                break;
            case 'ngx-translate':
                const sourceFile = templateFiles.find((f) => f.name === `${sourceLang}.json`);
                if (!sourceFile) {
                    throw new Error('Could not find source file. This is a bug.');
                }
                const [addedTranslations, removedTranslations] = await translateContent(sourceFile, templateFiles.find((f) => f.name === `${language}.json`));
                totalAddedTranslations += addedTranslations;
                totalRemovedTranslations += removedTranslations;
                break;
        }
        console.log((0, chalk_1.default) `└── {green.bold All strings have been translated.}`);
        console.log();
    }
    if (service !== 'dry-run') {
        console.log('🗂 Caching source translation files...');
        await new Promise((res, rej) => (0, ncp_1.default)((0, file_system_1.evaluateFilePath)(workingDir, dirStructure, sourceLang), (0, file_system_1.evaluateFilePath)(resolvedCacheDir, dirStructure, sourceLang), (err) => (err ? rej() : res(null))));
        console.log((0, chalk_1.default) `└── {green.bold Translation files have been cached.}`);
        console.log();
    }
    console.log(chalk_1.default.green.bold(`${totalAddedTranslations} new translations have been added!`));
    if (totalRemovedTranslations > 0) {
        console.log(chalk_1.default.green.bold(`${totalRemovedTranslations} translations have been removed!`));
    }
};
if (commander_1.default.listServices) {
    console.log('Available services:');
    console.log(Object.keys(services_1.serviceMap).join(', '));
    process.exit(0);
}
if (commander_1.default.listMatchers) {
    console.log('Available matchers:');
    console.log(Object.keys(matchers_1.matcherMap).join(', '));
    process.exit(0);
}
translate(commander_1.default.input, commander_1.default.cache, commander_1.default.sourceLanguage, commander_1.default.deleteUnusedStrings, commander_1.default.type, commander_1.default.withArrays, commander_1.default.directoryStructure, commander_1.default.fixInconsistencies, commander_1.default.service, commander_1.default.matcher, commander_1.default.decodeEscapes, commander_1.default.config, commander_1.default.glossaries, commander_1.default.appName, commander_1.default.context).catch((e) => {
    console.log();
    console.log(chalk_1.default.bgRed('An error has occurred:'));
    console.log(chalk_1.default.bgRed(e.message));
    console.log(chalk_1.default.bgRed(e.stack));
    console.log();
    process.exit(1);
});
function createTranslator(translationService, service, sourceLang, targetLang, cacheDir, workingDir, dirStructure, deleteUnusedStrings, withArrays) {
    return async (sourceFile, destinationFile) => {
        const cachePath = path.resolve((0, file_system_1.evaluateFilePath)(cacheDir, dirStructure, sourceLang), sourceFile ? sourceFile.name : '');
        let cacheDiff = [];
        if (fs.existsSync(cachePath) && !fs.statSync(cachePath).isDirectory()) {
            const cachedFile = (0, flat_1.flatten)(JSON.parse(fs.readFileSync(cachePath).toString().trim()));
            const cDiff = (0, deep_object_diff_1.diff)(cachedFile, sourceFile.content);
            cacheDiff = Object.keys(cDiff).filter((k) => cDiff[k]);
            const changedItems = Object.keys(cacheDiff).length.toString();
            process.stdout.write((0, chalk_1.default) ` ({green.bold ${changedItems}} changes from cache)`);
        }
        const existingKeys = destinationFile
            ? Object.keys(destinationFile.content)
            : [];
        const templateStrings = Object.keys(sourceFile.content);
        const stringsToTranslate = templateStrings
            .filter((key) => !existingKeys.includes(key) || cacheDiff.includes(key))
            .map((key) => ({
            key,
            value: sourceFile.type === 'key-based' ? sourceFile.content[key] : key,
        }));
        const unusedStrings = existingKeys.filter((key) => !templateStrings.includes(key));
        const translatedStrings = await translationService.translateStrings(stringsToTranslate, sourceLang, targetLang);
        const newKeys = translatedStrings.reduce((acc, cur) => ({ ...acc, [cur.key]: cur.translated }), {});
        if (service !== 'dry-run') {
            const existingTranslations = destinationFile
                ? destinationFile.content
                : {};
            const translatedFile = {
                ...(0, lodash_1.omit)(existingTranslations, deleteUnusedStrings ? unusedStrings : []),
                ...newKeys,
            };
            const newContent = JSON.stringify(sourceFile.type === 'key-based'
                ? (0, flat_1.unflatten)(translatedFile, { object: !withArrays })
                : translatedFile, null, 2) + `\n`;
            fs.writeFileSync(path.resolve((0, file_system_1.evaluateFilePath)(workingDir, dirStructure, targetLang), destinationFile?.name ?? sourceFile.name), newContent);
            const languageCachePath = (0, file_system_1.evaluateFilePath)(cacheDir, dirStructure, targetLang);
            if (!fs.existsSync(languageCachePath)) {
                fs.mkdirSync(languageCachePath);
            }
            fs.writeFileSync(path.resolve(languageCachePath, destinationFile?.name ?? sourceFile.name), JSON.stringify(translatedFile, null, 2) + '\n');
        }
        console.log(deleteUnusedStrings && unusedStrings.length > 0
            ? (0, chalk_1.default) ` ({green.bold +${String(translatedStrings.length)}}/{red.bold -${String(unusedStrings.length)}})`
            : (0, chalk_1.default) ` ({green.bold +${String(translatedStrings.length)}})`);
        // Added translations and removed translations
        return [
            translatedStrings.length,
            deleteUnusedStrings ? unusedStrings.length : 0,
        ];
    };
}
