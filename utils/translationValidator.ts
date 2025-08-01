import { SupportedLanguage, TranslationKeys } from '../types';

export interface ValidationResult {
  isValid: boolean;
  missingKeys: {
    language: SupportedLanguage;
    keys: string[];
  }[];
  extraKeys: {
    language: SupportedLanguage;
    keys: string[];
  }[];
  warnings: string[];
}

/**
 * Validates that all translation keys exist in both languages
 */
export const validateTranslations = async (): Promise<ValidationResult> => {
  const result: ValidationResult = {
    isValid: true,
    missingKeys: [],
    extraKeys: [],
    warnings: []
  };

  try {
    // Load both translation files
    const [enResponse, zhResponse] = await Promise.all([
      fetch('/locales/en.json'),
      fetch('/locales/zh-TW.json')
    ]);

    if (!enResponse.ok) {
      result.warnings.push(`Failed to load English translations: ${enResponse.status}`);
      result.isValid = false;
      return result;
    }

    if (!zhResponse.ok) {
      result.warnings.push(`Failed to load Chinese translations: ${zhResponse.status}`);
      result.isValid = false;
      return result;
    }

    const enData = await enResponse.json();
    const zhData = await zhResponse.json();

    // Get all keys from both languages
    const enKeys = getAllKeys(enData);
    const zhKeys = getAllKeys(zhData);

    // Find missing keys in Chinese
    const missingInZh = enKeys.filter(key => !zhKeys.includes(key));
    if (missingInZh.length > 0) {
      result.missingKeys.push({
        language: 'zh-TW',
        keys: missingInZh
      });
      result.isValid = false;
    }

    // Find missing keys in English
    const missingInEn = zhKeys.filter(key => !enKeys.includes(key));
    if (missingInEn.length > 0) {
      result.missingKeys.push({
        language: 'en',
        keys: missingInEn
      });
      result.isValid = false;
    }

    // Find extra keys (keys that exist in one language but not the other)
    const extraInZh = zhKeys.filter(key => !enKeys.includes(key));
    if (extraInZh.length > 0) {
      result.extraKeys.push({
        language: 'zh-TW',
        keys: extraInZh
      });
    }

    const extraInEn = enKeys.filter(key => !zhKeys.includes(key));
    if (extraInEn.length > 0) {
      result.extraKeys.push({
        language: 'en',
        keys: extraInEn
      });
    }

    // Check for empty values
    const emptyEnKeys = findEmptyValues(enData);
    const emptyZhKeys = findEmptyValues(zhData);

    if (emptyEnKeys.length > 0) {
      result.warnings.push(`English translations have empty values: ${emptyEnKeys.join(', ')}`);
    }

    if (emptyZhKeys.length > 0) {
      result.warnings.push(`Chinese translations have empty values: ${emptyZhKeys.join(', ')}`);
    }

    return result;
  } catch (error) {
    result.warnings.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.isValid = false;
    return result;
  }
};

/**
 * Recursively gets all keys from a nested object using dot notation
 */
function getAllKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys.push(...getAllKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }
  
  return keys;
}

/**
 * Finds keys with empty or whitespace-only values
 */
function findEmptyValues(obj: any, prefix = ''): string[] {
  const emptyKeys: string[] = [];
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        emptyKeys.push(...findEmptyValues(obj[key], fullKey));
      } else if (typeof obj[key] === 'string' && obj[key].trim() === '') {
        emptyKeys.push(fullKey);
      }
    }
  }
  
  return emptyKeys;
}

/**
 * Logs validation results to console in development
 */
export const logValidationResults = (result: ValidationResult): void => {
  if (process.env.NODE_ENV === 'development') {
    if (result.isValid) {
      console.log('✅ Translation validation passed');
    } else {
      console.warn('⚠️ Translation validation failed');
    }

    result.missingKeys.forEach(({ language, keys }) => {
      console.warn(`Missing keys in ${language}:`, keys);
    });

    result.extraKeys.forEach(({ language, keys }) => {
      console.warn(`Extra keys in ${language}:`, keys);
    });

    result.warnings.forEach(warning => {
      console.warn(`Translation warning: ${warning}`);
    });
  }
};
