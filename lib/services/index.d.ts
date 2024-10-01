import { Matcher } from '../matchers';
export interface TranslationResult {
    key: string;
    value: string;
    translated: string;
}
export interface TString {
    key: string;
    value: string;
}
export interface TranslationService {
    name: string;
    initialize: (config?: string, interpolationMatcher?: Matcher, decodeEscapes?: boolean, glossariesDir?: string | boolean, appName?: string, context?: string) => Promise<void>;
    supportsLanguage: (language: string) => boolean;
    translateStrings: (strings: TString[], from: string, to: string) => Promise<TranslationResult[]>;
}
export declare const serviceMap: {
    [k: string]: TranslationService;
};
export interface DeepLGlossary {
    glossary_id: string;
    name: string;
    ready: boolean;
    source_lang: string;
    target_lang: string;
    creation_time: string;
    entry_count: string;
}
