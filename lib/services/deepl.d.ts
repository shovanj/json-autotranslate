import fetch from 'node-fetch';
import { TranslationService, TranslationResult, DeepLGlossary } from '.';
import { Matcher } from '../matchers';
export declare class DeepL implements TranslationService {
    name: string;
    private apiEndpoint;
    private glossariesDir;
    private automaticGlossary;
    private appName;
    private context;
    private apiKey;
    /**
     * Number to tokens to translate at once
     */
    private batchSize;
    private supportedLanguages;
    private formalityLanguages;
    private interpolationMatcher;
    private decodeEscapes;
    private formality;
    /**
     * Creates a new instance of the DeepL translation service
     * @param useFreeApi Use the free vs paid api
     */
    constructor(useFreeApi: boolean);
    initialize(config?: string, interpolationMatcher?: Matcher, decodeEscapes?: boolean, glossariesDir?: string | boolean, appName?: string, context?: string): Promise<void>;
    fetchLanguages(): Promise<{
        language: string;
        name: string;
        supports_formality: boolean;
    }[]>;
    getFormalityLanguages(languages: Array<{
        language: string;
        name: string;
        supports_formality: boolean;
    }>): Set<string>;
    formatLanguages(languages: Array<{
        language: string;
        name: string;
        supports_formality: boolean;
    }>): Set<string>;
    supportsLanguage(language: string): boolean;
    supportsFormality(language: string): boolean;
    translateStrings(strings: {
        key: string;
        value: string;
    }[], from: string, to: string): Promise<TranslationResult[]>;
    /**
     * Delete a glossary.
     */
    deleteGlossary(glossary_id: string): Promise<fetch.Response>;
    listGlossaries(): Promise<DeepLGlossary[]>;
    /**
     * https://www.deepl.com/docs-api/glossaries/create-glossary
     */
    createGlossaryFromFile(filePath: string): Promise<DeepLGlossary>;
    getGlossary(from: string, to: string, recreate: boolean): Promise<DeepLGlossary>;
    runTranslation(strings: {
        key: string;
        value: string;
    }[], from: string, to: string, triesLeft?: number): Promise<TranslationResult[]>;
}
