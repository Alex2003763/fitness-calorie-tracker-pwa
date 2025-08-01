import { useState, useEffect, useCallback } from 'react';
import { SupportedLanguage, TranslationOptions, UseTranslationReturn, TranslationKeys } from '../types';
import { validateTranslations, logValidationResults } from '../utils/translationValidator';

// Cache for loaded translations
const translationCache: Record<SupportedLanguage, TranslationKeys | null> = {
  'en': null,
  'zh-TW': null
};

// Loading states for each language
const loadingStates: Record<SupportedLanguage, boolean> = {
  'en': false,
  'zh-TW': false
};

// Validation state
let validationRun = false;

export const useTranslation = (language: SupportedLanguage): UseTranslationReturn => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const locale = language === 'en' ? 'en-US' : 'zh-TW';

    useEffect(() => {
        const loadTranslations = async () => {
            // If already loaded, just update state
            if (translationCache[language]) {
                setIsLoaded(true);
                setIsLoading(false);
                setError(null);
                return;
            }

            // If already loading this language, wait for it
            if (loadingStates[language]) {
                const checkLoaded = () => {
                    if (translationCache[language]) {
                        setIsLoaded(true);
                        setIsLoading(false);
                        setError(null);
                    } else {
                        setTimeout(checkLoaded, 100);
                    }
                };
                checkLoaded();
                return;
            }

            setIsLoading(true);
            setIsLoaded(false);
            setError(null);
            loadingStates[language] = true;

            try {
                const response = await fetch(`/locales/${language}.json`);
                if (!response.ok) {
                    throw new Error(`Failed to load ${language}.json: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                translationCache[language] = data;
                setIsLoaded(true);
                setError(null);

                // Run validation in development mode when both languages are loaded
                if (process.env.NODE_ENV === 'development' && !validationRun &&
                    translationCache['en'] && translationCache['zh-TW']) {
                    validationRun = true;
                    validateTranslations().then(logValidationResults);
                }
            } catch (loadError) {
                console.error(`Failed to load translations for ${language}:`, loadError);
                setError(`Failed to load ${language} translations`);

                // Fallback to English if loading non-English fails
                if (language !== 'en' && !translationCache['en']) {
                    try {
                        const fallbackResponse = await fetch('/locales/en.json');
                        if (fallbackResponse.ok) {
                            const fallbackData = await fallbackResponse.json();
                            translationCache['en'] = fallbackData;
                            console.warn(`Loaded English fallback translations due to ${language} failure`);
                        }
                    } catch (fallbackError) {
                        console.error('Failed to load fallback English translations:', fallbackError);
                    }
                }

                setIsLoaded(true); // Set loaded even on error to prevent infinite loading
            } finally {
                setIsLoading(false);
                loadingStates[language] = false;
            }
        };

        loadTranslations();
    }, [language]);

    const t = useCallback((key: string, options?: TranslationOptions): string => {
        if (!isLoaded) {
            return key; // Return key if not loaded yet to avoid blank UI
        }

        // Get translation from cache
        const langData = translationCache[language] || translationCache['en'] || {};
        let text = key.split('.').reduce((obj: any, k: string) => obj && obj[k], langData);

        if (typeof text !== 'string') {
            // Try fallback to English if current language doesn't have the key
            if (language !== 'en' && translationCache['en']) {
                const fallbackText = key.split('.').reduce((obj: any, k: string) => obj && obj[k], translationCache['en']);
                if (typeof fallbackText === 'string') {
                    console.warn(`Translation key "${key}" not found for ${language}, using English fallback`);
                    text = fallbackText;
                } else {
                    console.warn(`Translation key "${key}" not found in ${language} or English fallback`);
                    return key;
                }
            } else {
                console.warn(`Translation key "${key}" not found for language ${language}`);
                return key;
            }
        }

        // Replace placeholders with options
        if (options) {
            Object.keys(options).forEach(k => {
                text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(options[k]));
            });
        }

        return text;
    }, [language, isLoaded]);

    return {
        t,
        isLoaded,
        currentLanguage: language,
        locale,
        isLoading,
        error
    };
};