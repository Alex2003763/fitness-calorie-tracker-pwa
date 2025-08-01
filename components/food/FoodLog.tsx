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

  if (entries.length === 0) {
    return <p className="text-gray-500 text-center py-8">{t('log.no_food')}</p>;
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li key={entry.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-colors">
          <div>
            <p className="font-medium text-white capitalize">{entry.name}</p>
            <p className="text-sm text-gray-400">{t(`log.meal.${entry.meal}`)}</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-blue-400 font-semibold">{entry.calories} {t('dashboard.kcal')}</span>
            <button onClick={() => onDelete(entry.id)} className="text-gray-500 hover:text-red-500 transition-colors">
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default FoodLog;