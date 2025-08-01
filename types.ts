// i18n Types
export type SupportedLanguage = 'en' | 'zh-TW';

export interface TranslationKeys {
  appTitle: string;
  loading: string;
  nav: {
    dashboard: string;
    log: string;
    ai_assistant: string;
    settings: string;
  };
  dashboard: {
    title: string;
    intake: string;
    burned: string;
    net: string;
    goal_progress: string;
    consumed: string;
    remaining: string;
    of: string;
    kcal: string;
    net_calories_7_days: string;
    net_calories: string;
  };
  log: {
    food: string;
    exercise: string;
    log_food: string;
    food_name: string;
    calories: string;
    meal: {
      breakfast: string;
      lunch: string;
      dinner: string;
      snack: string;
    };
    add_food: string;
    scan_food: string;
    upload_image: string;
    log_exercise: string;
    exercise_name: string;
    duration_mins: string;
    duration_unit: string;
    calories_burned: string;
    add_exercise: string;
    todays_log: string;
    no_food: string;
    no_exercise: string;
    date_log: string;
  };
  ai: {
    title: string;
    not_configured: string;
    not_configured_desc: string;
    go_to_settings: string;
    welcome: string;
    example_prompt: string;
    ask_placeholder: string;
  };
  settings: {
    title: string;
    ai_settings: string;
    ai_settings_desc: string;
    api_key: string;
    api_key_placeholder: string;
    api_key_required_error: string;
    ai_model: string;
    model: {
      flash: string;
      pro: string;
      'gemini-pro': string;
    };
    language: {
      label: string;
      en: string;
      'zh-TW': string;
    };
    save: string;
    saved: string;
    user_profile: {
      title: string;
      desc: string;
      age: string;
      sex: string;
      select_sex: string;
      male: string;
      female: string;
      weight: string;
      height: string;
      activity_level: string;
      activity: {
        sedentary: string;
        light: string;
        moderate: string;
        active: string;
        very_active: string;
      };
      calculate_goal: string;
      validation_error: string;
      tdee_result_1: string;
      tdee_result_2: string;
      daily_goal: string;
    };
    data_management: {
      title: string;
      desc: string;
      export: string;
      import: string;
      import_confirm: string;
      import_success: string;
      import_error: string;
    };
  };
  camera: {
    modal_title: string;
    scanning: string;
    scan_error: string;
    unidentified: string;
    permission_error: string;
  };
  general: {
    today: string;
  };
  update: {
    new_version_available: string;
    update_now: string;
  };
}

export interface TranslationOptions {
  [key: string]: string | number;
}

export interface UseTranslationReturn {
  t: (key: string, options?: TranslationOptions) => string;
  isLoaded: boolean;
  currentLanguage: SupportedLanguage;
  locale: string;
  isLoading: boolean;
  error: string | null;
}

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface ExerciseEntry {
  id: string;
  name: string;
  duration: number; // in minutes
  calories: number;
}

export interface DailyLog {
  food: FoodEntry[];
  exercise: ExerciseEntry[];
}

export interface FoodAnalysis {
    foodName: string;
    calories: number;
}

export interface UserProfile {
  age: number | null;
  sex: 'male' | 'female' | null;
  weight: number | null;
  height: number | null;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

export interface AppState {
  dailyGoal: number;
  logs: Record<string, DailyLog>;
  customFoods: Omit<FoodEntry, 'id' | 'meal'>[];
  apiKey: string | null;
  aiModel: string;
  language: SupportedLanguage;
  userProfile: UserProfile;
  chatHistory: ChatMessage[];
}

export type ActiveView = 'dashboard' | 'log' | 'ai' | 'settings';

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}