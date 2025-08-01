import { GoogleGenAI, GenerateContentResponse, Type, Part } from "@google/genai";
import { DailyLog, FoodAnalysis, UserProfile, ChatMessage } from '../types';

// Custom fetch function to redirect requests to the proxy
const createProxyFetch = (baseUrl: string, originalFetch: typeof globalThis.fetch) => {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        let url: string;

        if (typeof input === 'string') {
            url = input;
        } else if (input instanceof URL) {
            url = input.toString();
        } else {
            url = input.url;
        }

        // Replace the Google API base URL with our proxy
        if (url.includes('generativelanguage.googleapis.com')) {
            url = url.replace('https://generativelanguage.googleapis.com', baseUrl);
        }

        return originalFetch(url, init);
    };
};

const getSystemInstruction = (todayLog: DailyLog, dailyGoal: number, userProfile: UserProfile, language: 'en' | 'zh-TW'): string => {
    const totalIntake = todayLog.food.reduce((sum, item) => sum + item.calories, 0);
    const totalBurned = todayLog.exercise.reduce((sum, item) => sum + item.calories, 0);
    const netCalories = totalIntake - totalBurned;

    let profileInfo = '';
    if (language === 'zh-TW') {
        profileInfo = '用戶個人資料:\n';
        if (userProfile.age) profileInfo += `- 年齡: ${userProfile.age}\n`;
        if (userProfile.sex) profileInfo += `- 性別: ${userProfile.sex === 'male' ? '男性' : '女性'}\n`;
        if (userProfile.weight) profileInfo += `- 體重: ${userProfile.weight} kg\n`;
        if (userProfile.height) profileInfo += `- 身高: ${userProfile.height} cm\n`;

        return `你是一位友善且鼓勵人心的健身與營養助理。根據用戶的數據和個人資料，為他們的對話提供有幫助且簡潔的回答。請用繁體中文回答。

${profileInfo}
用戶的每日卡路里目標: ${dailyGoal} 大卡

今日記錄:
- 攝取食物:
${todayLog.food.length > 0 ? todayLog.food.map(f => `  - ${f.name} (${f.calories} 大卡)`).join('\n') : '  - 尚未記錄'}
- 完成的運動:
${todayLog.exercise.length > 0 ? todayLog.exercise.map(e => `  - ${e.name} (${e.duration} 分鐘, 燃燒 ${e.calories} 大卡)`).join('\n') : '  - 尚未記錄'}

總攝取量: ${totalIntake} 大卡
總燃燒量: ${totalBurned} 大卡
淨卡路里: ${netCalories} 大卡

基於以上資訊和對話歷史，回答用戶。`;
    }

    profileInfo = "User's Profile:\n";
    if (userProfile.age) profileInfo += `- Age: ${userProfile.age}\n`;
    if (userProfile.sex) profileInfo += `- Sex: ${userProfile.sex}\n`;
    if (userProfile.weight) profileInfo += `- Weight: ${userProfile.weight} kg\n`;
    if (userProfile.height) profileInfo += `- Height: ${userProfile.height} cm\n`;

    return `You are a friendly and encouraging fitness and nutrition assistant. Provide helpful and concise answers to the user's conversation based on their data and profile. Respond in English.

${profileInfo}
User's Daily Calorie Goal: ${dailyGoal} kcal

Today's Log:
- Food Intake:
${todayLog.food.length > 0 ? todayLog.food.map(f => `  - ${f.name} (${f.calories} kcal)`).join('\n') : '  - Not logged yet'}
- Exercises Completed:
${todayLog.exercise.length > 0 ? todayLog.exercise.map(e => `  - ${e.name} (${e.duration} min, burned ${e.calories} kcal)`).join('\n') : '  - Not logged yet'}

Total Intake: ${totalIntake} kcal
Total Burned: ${totalBurned} kcal
Net Calories: ${netCalories} kcal

Based on the information above and the conversation history, answer the user.`;
};

export const getAiAdvice = async (
    prompt: string, 
    chatHistory: ChatMessage[],
    todayLog: DailyLog, 
    dailyGoal: number, 
    userProfile: UserProfile,
    apiKey: string,
    model: string,
    language: 'en' | 'zh-TW'
): Promise<string> => {
  if (!apiKey) {
    return language === 'zh-TW' 
        ? "請在「設定」頁面中輸入您的 Google Gemini API 金鑰以啟用此功能。"
        : "Please enter your Google Gemini API Key in the Settings page to enable this feature.";
  }

  // Store original fetch and create proxy fetch
  const originalFetch = globalThis.fetch;
  const proxyFetch = createProxyFetch('https://ai-proxy.chatkit.app/generativelanguage', originalFetch);

  try {
    // Override global fetch to use proxy
    globalThis.fetch = proxyFetch;

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = getSystemInstruction(todayLog, dailyGoal, userProfile, language);

    const contents = [...chatHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }],
    })), { role: 'user', parts: [{ text: prompt }]}];

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
            thinkingConfig: { thinkingBudget: 0 }
        }
    });

    return response.text;
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    let errorMessage = language === 'zh-TW' ? "抱歉，無法從 AI 助理獲取回應。請稍後再試。" : "Sorry, couldn't get a response from the AI assistant. Please try again later.";
    if (error.message.includes('API key not valid')) {
        errorMessage = language === 'zh-TW' ? "API 金鑰無效。請在「設定」中檢查您的金鑰。" : "The API key is not valid. Please check your key in Settings.";
    } else if (error.message.toLowerCase().includes('model') && (error.message.toLowerCase().includes('not found') || error.message.toLowerCase().includes('is not supported'))) {
        errorMessage = language === 'zh-TW' ? `您選擇的模型 "${model}" 無法使用或不受支援。請在「設定」中選擇另一個模型。` : `The model you selected, "${model}", is not available or supported. Please choose another model in Settings.`;
    }
    return errorMessage;
  } finally {
    // Always restore original fetch
    globalThis.fetch = originalFetch;
  }
};


export const getAiFoodAnalysis = async (
    base64Image: string,
    apiKey: string,
    model: string,
    language: 'en' | 'zh-TW'
): Promise<FoodAnalysis> => {
    if (!apiKey) {
        throw new Error("API Key is not set.");
    }

    // Store original fetch and create proxy fetch
    const originalFetch = globalThis.fetch;
    const proxyFetch = createProxyFetch('https://ai-proxy.chatkit.app/generativelanguage', originalFetch);

    try {
        // Override global fetch to use proxy
        globalThis.fetch = proxyFetch;

        const ai = new GoogleGenAI({ apiKey });

    const imagePart: Part = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
        },
    };

    const textPart: Part = {
        text: language === 'zh-TW'
            ? "分析這張圖片裡的食物。辨識主要的食物品項，並估算其卡路里、蛋白質、碳水化合物和脂肪（以克為單位）。如果有多種食物，專注於最主要的一項。如果無法辨識食物，請將 foodName 設為 'UNIDENTIFIED' 且所有數值設為 0。"
            : "Analyze the food in this image. Identify the main food item and estimate its calories, protein, carbs, and fat in grams. If there are multiple items, focus on the most prominent one. If you cannot identify a food, set foodName to 'UNIDENTIFIED' and all numeric values to 0."
    };

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            foodName: {
                type: Type.STRING,
                description: language === 'zh-TW' ? '食物的名稱，如果無法辨識則為 "UNIDENTIFIED"' : 'The name of the food, or "UNIDENTIFIED" if it cannot be recognized',
            },
            calories: {
                type: Type.NUMBER,
                description: language === 'zh-TW' ? '估算的卡路里' : 'The estimated calories',
            },
            protein: {
                type: Type.NUMBER,
                description: language === 'zh-TW' ? '估算的蛋白質（克）' : 'The estimated protein in grams',
            },
            carbs: {
                type: Type.NUMBER,
                description: language === 'zh-TW' ? '估算的碳水化合物（克）' : 'The estimated carbohydrates in grams',
            },
            fat: {
                type: Type.NUMBER,
                description: language === 'zh-TW' ? '估算的脂肪（克）' : 'The estimated fat in grams',
            },
        },
        required: ['foodName', 'calories', 'protein', 'carbs', 'fat'],
    };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);
        return result as FoodAnalysis;

    } catch(error) {
        console.error("Error analyzing food image:", error);
        // Return a default error object that matches the FoodAnalysis structure
        return { foodName: "UNIDENTIFIED", calories: 0, protein: 0, carbs: 0, fat: 0 };
    } finally {
        // Always restore original fetch
        globalThis.fetch = originalFetch;
    }
}

export const getAiFoodCalories = async (
    foodName: string,
    apiKey: string,
    model: string,
    language: 'en' | 'zh-TW'
): Promise<number> => {
    if (!apiKey) {
        throw new Error("API Key is not set.");
    }

    const originalFetch = globalThis.fetch;
    const proxyFetch = createProxyFetch('https://ai-proxy.chatkit.app/generativelanguage', originalFetch);

    try {
        globalThis.fetch = proxyFetch;
        const ai = new GoogleGenAI({ apiKey });

        const textPart: Part = {
            text: language === 'zh-TW'
                ? `估算 "${foodName}" 的卡路里。請只回傳一個數字。`
                : `Estimate the calories for "${foodName}". Return only a number.`
        };

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                calories: {
                    type: Type.NUMBER,
                    description: language === 'zh-TW' ? '估算的卡路里' : 'The estimated calories',
                },
            },
            required: ['calories'],
        };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: { parts: [textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);
        return result.calories as number;

    } catch (error) {
        console.error("Error getting food calories:", error);
        throw new Error(language === 'zh-TW' ? "無法估算食物卡路里。" : "Failed to estimate food calories.");
    } finally {
        globalThis.fetch = originalFetch;
    }
};

export const getAiExerciseCalories = async (
    exerciseName: string,
    duration: number,
    userProfile: UserProfile,
    apiKey: string,
    model: string,
    language: 'en' | 'zh-TW'
): Promise<number> => {
    if (!apiKey) {
        throw new Error("API Key is not set.");
    }

    const originalFetch = globalThis.fetch;
    const proxyFetch = createProxyFetch('https://ai-proxy.chatkit.app/generativelanguage', originalFetch);

    try {
        globalThis.fetch = proxyFetch;
        const ai = new GoogleGenAI({ apiKey });

        const weight = userProfile.weight || 70; // Default to 70kg if not set

        const textPart: Part = {
            text: language === 'zh-TW'
                ? `估算一個體重 ${weight} 公斤的人做 "${exerciseName}" ${duration} 分鐘所燃燒的卡路里。請只回傳一個數字。`
                : `Estimate the calories burned for a ${weight}kg person doing "${exerciseName}" for ${duration} minutes. Return only a number.`
        };

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                calories: {
                    type: Type.NUMBER,
                    description: language === 'zh-TW' ? '估算的燃燒卡路里' : 'The estimated calories burned',
                },
            },
            required: ['calories'],
        };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: { parts: [textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);
        return result.calories as number;

    } catch (error) {
        console.error("Error getting exercise calories:", error);
        throw new Error(language === 'zh-TW' ? "無法估算運動燃燒的卡路里。" : "Failed to estimate exercise calories.");
    } finally {
        globalThis.fetch = originalFetch;
    }
};