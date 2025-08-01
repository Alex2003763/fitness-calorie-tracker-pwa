import React, { useState } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { Button, Input } from '../ui';
import { getAiExerciseCalories } from '../../services/geminiService';

const presetExercises = [
    { nameKey: 'log.exercise_presets.running' },
    { nameKey: 'log.exercise_presets.cycling' },
    { nameKey: 'log.exercise_presets.swimming' },
    { nameKey: 'log.exercise_presets.weight_lifting' },
    { nameKey: 'log.exercise_presets.walking' },
    { nameKey: 'log.exercise_presets.yoga' },
];

export const AddExerciseForm = () => {
  const { addExercise, appState } = useAppState();
  const { t } = useTranslation(appState.language);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePresetSelect = (presetName: string) => {
    const presetDuration = 30; // Default to 30 minutes
    setName(presetName);
    setDuration(String(presetDuration));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !duration) return;

    setIsLoading(true);
    setError(null);

    try {
      const calories = await getAiExerciseCalories(
        name,
        parseInt(duration, 10),
        appState.userProfile,
        appState.apiKey!,
        appState.aiModel,
        appState.language
      );
      addExercise({
        name,
        duration: parseInt(duration, 10),
        calories,
      });
      setName('');
      setDuration('');
    } catch (err) {
      setError(t('camera.scan_error')); // Using a generic error message
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-2">
      <div className="space-y-2">
        <Input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('log.exercise_name')}
            required
        />
        <div className="grid grid-cols-1 gap-2">
            <Input
                type="number"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder={t('log.duration_mins')}
                required
            />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isLoading}>
          {isLoading ? t('loading') : t('log.add_exercise')}
      </Button>
      
      <div className="pt-4 border-t border-gray-700/50">
          <h4 className="text-center text-gray-400 mb-3 text-sm">{t('log.exercise_presets.title')}</h4>
          <div className="flex flex-wrap justify-center gap-2">
              {presetExercises.map(p => (
                  <Button
                      key={p.nameKey}
                      type="button"
                      onClick={() => handlePresetSelect(t(p.nameKey))}
                      className="bg-gray-700 hover:bg-gray-600 text-xs font-normal h-8 px-3"
                      size="sm"
                  >
                      {t(p.nameKey)}
                  </Button>
              ))}
          </div>
      </div>
    </form>
  );
};