import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { AppState, DailyLog, FoodEntry, ExerciseEntry, UserProfile, ChatMessage, MacronutrientGoals } from '../types';

const getInitialLanguage = (): 'en' | 'zh-TW' => {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.includes('zh-tw') || browserLang.includes('zh-hk')) {
    return 'zh-TW';
  }
  return 'en';
};

const getDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const initialAppState: AppState = {
  dailyGoal: 2000,
  macronutrientGoals: {
    protein: 150,
    carbs: 250,
    fat: 60
  },
  logs: {},
  customFoods: [],
  apiKey: null,
  aiModel: 'gemini-2.5-flash',
  language: getInitialLanguage(),
  userProfile: {
    age: null,
    sex: null,
    weight: null,
    height: null,
    activityLevel: 'moderate'
  },
  chatHistory: []
};

// 1. Create a context
const AppStateContext = createContext<any>(null);

// 2. Create a provider component
export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dateString = getDateString(selectedDate);

  useEffect(() => {
    try {
      const storedState = localStorage.getItem('calorieTrackerState');
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        const language = parsedState.language || getInitialLanguage();
        const userProfile = parsedState.userProfile || initialAppState.userProfile;
        const chatHistory = parsedState.chatHistory || [];
        const macronutrientGoals = parsedState.macronutrientGoals || initialAppState.macronutrientGoals;
        setAppState({ ...initialAppState, ...parsedState, language, userProfile, chatHistory, macronutrientGoals });
      } else {
        setAppState(initialAppState);
      }
    } catch (error) {
      console.error("Could not load state from localStorage", error);
      setAppState(initialAppState);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem('calorieTrackerState', JSON.stringify(appState));
      } catch (error) {
        console.error("Could not save state to localStorage", error);
      }
    }
  }, [appState, isInitialized]);

  const updateState = useCallback((updater: (prevState: AppState) => AppState) => {
    setAppState(updater);
  }, []);

  const getLogForDate = useCallback((date: string): DailyLog => {
    return appState.logs[date] || { food: [], exercise: [] };
  }, [appState.logs]);

  const addFood = useCallback((food: Omit<FoodEntry, 'id'>) => {
    updateState(prev => {
      const newFoodEntry: FoodEntry = { ...food, id: Date.now().toString() };
      const currentLog = prev.logs[dateString] || { food: [], exercise: [] };
      const newLog = { ...currentLog, food: [...currentLog.food, newFoodEntry] };
      return { ...prev, logs: { ...prev.logs, [dateString]: newLog } };
    });
  }, [updateState, dateString]);

  const addExercise = useCallback((exercise: Omit<ExerciseEntry, 'id'>) => {
    updateState(prev => {
      const newExerciseEntry: ExerciseEntry = { ...exercise, id: Date.now().toString() };
      const currentLog = prev.logs[dateString] || { food: [], exercise: [] };
      const newLog = { ...currentLog, exercise: [...currentLog.exercise, newExerciseEntry] };
      return { ...prev, logs: { ...prev.logs, [dateString]: newLog } };
    });
  }, [updateState, dateString]);
  
  const removeFood = useCallback((foodId: string) => {
    updateState(prev => {
        const currentLog = prev.logs[dateString];
        if (!currentLog) return prev;
        const newFood = currentLog.food.filter(f => f.id !== foodId);
        const newLog = { ...currentLog, food: newFood };
        return { ...prev, logs: { ...prev.logs, [dateString]: newLog } };
    });
  }, [updateState, dateString]);

  const removeExercise = useCallback((exerciseId: string) => {
      updateState(prev => {
          const currentLog = prev.logs[dateString];
          if (!currentLog) return prev;
          const newExercise = currentLog.exercise.filter(e => e.id !== exerciseId);
          const newLog = { ...currentLog, exercise: newExercise };
          return { ...prev, logs: { ...prev.logs, [dateString]: newLog } };
      });
  }, [updateState, dateString]);

  const setDailyGoal = useCallback((goal: number) => {
    updateState(prev => ({...prev, dailyGoal: goal}));
  }, [updateState]);

  const setApiKey = useCallback((apiKey: string | null) => {
    updateState(prev => ({ ...prev, apiKey }));
  }, [updateState]);

  const setMacronutrientGoals = useCallback((goals: MacronutrientGoals) => {
    updateState(prev => ({ ...prev, macronutrientGoals: goals }));
  }, [updateState]);

  const setAiModel = useCallback((aiModel: string) => {
    updateState(prev => ({ ...prev, aiModel }));
  }, [updateState]);

  const setLanguage = useCallback((language: 'en' | 'zh-TW') => {
    updateState(prev => ({ ...prev, language }));
  }, [updateState]);

  const updateUserProfile = useCallback((profile: Partial<UserProfile>) => {
    updateState(prev => ({ ...prev, userProfile: { ...prev.userProfile, ...profile }}));
  }, [updateState]);

  const setChatHistory = useCallback((history: ChatMessage[]) => {
    updateState(prev => ({...prev, chatHistory: history}));
  }, [updateState]);

  const clearChatHistory = useCallback(() => {
    updateState(prev => ({...prev, chatHistory: []}));
  }, [updateState]);

  const importData = useCallback((newState: AppState) => {
    if (newState && newState.logs && typeof newState.dailyGoal === 'number') {
        setAppState(newState);
        return true;
    }
    return false;
  }, [setAppState]);

  const checkForUpdates = useCallback((onUpdateAvailable: (worker: ServiceWorker) => void) => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
            if (reg) {
                reg.update();
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                onUpdateAvailable(newWorker);
                            }
                        });
                    }
                });
            } else {
                console.log('No service worker registered.');
            }
        }).catch(err => console.error('Error during service worker update check:', err));
    } else {
        console.log('Service workers are not supported in this browser.');
    }
}, []);

  const value = {
    appState,
    updateState,
    getLogForDate,
    addFood,
    addExercise,
    removeFood,
    removeExercise,
    setDailyGoal,
    setApiKey,
    setAiModel,
    setMacronutrientGoals,
    isInitialized,
    selectedDate,
    setSelectedDate,
    setLanguage,
    updateUserProfile,
    setChatHistory,
    clearChatHistory,
    importData,
    checkForUpdates,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

// 3. Create a custom hook to use the context
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};