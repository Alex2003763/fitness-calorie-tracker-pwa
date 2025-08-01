import React from 'react';
import { FoodEntry } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useAppState } from '../../hooks/useAppState';
import { TrashIcon } from '../Icons';

interface FoodLogProps {
  entries: FoodEntry[];
  onDelete: (id: string) => void;
}

const FoodLog: React.FC<FoodLogProps> = ({ entries, onDelete }) => {
  const { appState } = useAppState();
  const { t } = useTranslation(appState.language);

  const totalCalories = entries.reduce((sum, entry) => sum + entry.calories, 0);

  if (entries.length === 0) {
    return <p className="text-gray-500 text-center py-8">{t('log.no_food')}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-800/50 rounded-xl">
        <h4 className="font-semibold text-white text-lg">{t('log.summary')}</h4>
        <p className="text-gray-300">{t('log.total_food_calories')}: <span className="font-bold text-blue-400">{totalCalories.toLocaleString()} {t('dashboard.kcal')}</span></p>
      </div>
      <ul className="space-y-3">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-center p-3 bg-gray-800/50 rounded-xl transition-all hover:bg-gray-800/80 hover:shadow-lg">
            <div className="flex-grow">
              <p className="font-bold text-white capitalize">{entry.name}</p>
              <p className="text-sm text-gray-400 capitalize">{t(`log.meal.${entry.meal}`)}</p>
              <div className="text-xs text-gray-500 mt-1 flex space-x-2">
                  <span>P: {entry.protein}g</span>
                  <span>C: {entry.carbs}g</span>
                  <span>F: {entry.fat}g</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0 pr-3">
              <p className="font-bold text-lg text-blue-400">{entry.calories.toLocaleString()}</p>
              <p className="text-xs text-gray-400">{t('dashboard.kcal')}</p>
            </div>
            <button onClick={() => onDelete(entry.id)} className="text-gray-600 hover:text-red-500 transition-colors opacity-50 hover:opacity-100">
              <TrashIcon className="w-5 h-5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FoodLog;