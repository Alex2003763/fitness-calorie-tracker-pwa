import React, { useState } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { Button, Input } from '../ui';

const presetExercises = [
    { nameKey: 'log.exercise_presets.running', met: 9.8 },
    { nameKey: 'log.exercise_presets.cycling', met: 8.0 },
    { nameKey: 'log.exercise_presets.swimming', met: 8.3 },
    { nameKey: 'log.exercise_presets.weight_lifting', met: 3.5 },
    { nameKey: 'log.exercise_presets.walking', met: 4.3 },
    { nameKey: 'log.exercise_presets.yoga', met: 2.5 },
];

export const AddExerciseForm = () => {
  const { addExercise, appState } = useAppState();
  const { t } = useTranslation(appState.language);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');

  const handlePresetSelect = (met: number, presetName: string) => {
    const weight = appState.userProfile.weight || 70; // Default to 70kg if not set
    const presetDuration = 30; // Default to 30 minutes
    const calculatedCalories = Math.round((met * 3.5 * weight) / 200 * presetDuration);
    
    setName(presetName);
    setDuration(String(presetDuration));
    setCalories(String(calculatedCalories));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && duration && calories) {
      addExercise({
        name,
        duration: parseInt(duration, 10),
        calories: parseInt(calories, 10),
      });
      setName('');
      setDuration('');
      setCalories('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <Input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('log.exercise_name')}
            required
        />
        <div className="grid grid-cols-2 gap-4">
            <Input
                type="number"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder={t('log.duration_mins')}
                required
            />
            <Input
                type="number"
                value={calories}
                onChange={e => setCalories(e.target.value)}
                placeholder={t('log.calories_burned')}
                required
            />
        </div>
        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
            {t('log.add_exercise')}
        </Button>
        
        <div className="pt-4 border-t border-gray-700/50">
            <h4 className="text-center text-gray-400 mb-3 text-sm">{t('log.exercise_presets.title')}</h4>
            <div className="flex flex-wrap justify-center gap-2">
                {presetExercises.map(p => (
                    <Button
                        key={p.nameKey}
                        type="button"
                        onClick={() => handlePresetSelect(p.met, t(p.nameKey))}
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