import React from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { TrashIcon } from '../Icons';
import { ExerciseEntry } from '../../types';

interface ExerciseLogProps {
  exercises: ExerciseEntry[];
}

export const ExerciseLog: React.FC<ExerciseLogProps> = ({ exercises }) => {
  const { removeExercise, appState } = useAppState();
  const { t } = useTranslation(appState.language);

  const totalCalories = exercises.reduce((sum, entry) => sum + entry.calories, 0);

  if (exercises.length === 0) {
    return <p className="text-gray-500 text-center py-8">{t('log.no_exercise')}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-800/50 rounded-xl">
        <h4 className="font-semibold text-white text-lg">{t('log.summary')}</h4>
        <p className="text-gray-300">{t('log.total_exercise_calories')}: <span className="font-bold text-green-400">{totalCalories.toLocaleString()} {t('dashboard.kcal')}</span></p>
      </div>
      <ul className="space-y-3">
        {exercises.map((exercise) => (
          <li key={exercise.id} className="flex items-center p-3 bg-gray-800/50 rounded-xl transition-all hover:bg-gray-800/80 hover:shadow-lg">
            <div className="flex-grow">
              <p className="font-bold text-white capitalize">{exercise.name}</p>
              <p className="text-sm text-gray-400">{exercise.duration} {t('log.duration_unit')}</p>
            </div>
            <div className="text-right flex-shrink-0 pr-3">
              <p className="font-bold text-lg text-green-400">{exercise.calories.toLocaleString()}</p>
            </div>
            <button onClick={() => removeExercise(exercise.id)} className="text-gray-600 hover:text-red-500 transition-colors opacity-50 hover:opacity-100">
              <TrashIcon className="w-5 h-5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};