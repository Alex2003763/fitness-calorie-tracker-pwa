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

  if (exercises.length === 0) {
    return <p className="text-gray-500 text-center py-8">{t('log.no_exercise')}</p>;
  }

  return (
    <ul className="space-y-2">
      {exercises.map((exercise) => (
        <li key={exercise.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-colors">
          <div>
            <p className="font-medium text-white capitalize">{exercise.name}</p>
            <p className="text-sm text-gray-400">{exercise.duration} {t('log.duration_unit')}</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-green-400 font-semibold">{exercise.calories} {t('dashboard.kcal')}</span>
            <button onClick={() => removeExercise(exercise.id)} className="text-gray-500 hover:text-red-500 transition-colors">
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};