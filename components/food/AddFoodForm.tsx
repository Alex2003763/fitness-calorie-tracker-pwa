import React, { useState, useEffect, useRef } from 'react';
import { FoodEntry } from '../../types';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { CameraIcon, UploadIcon } from '../Icons';
import { Button, Input, Select } from '../ui';


interface AddFoodFormProps {
  onAddFood: (food: Omit<FoodEntry, 'id'>) => void;
  onScan: () => void;
  onUpload: () => void;
  scannedFood: { name: string; calories: string };
}

const AddFoodForm: React.FC<AddFoodFormProps> = ({ onAddFood, onScan, onUpload, scannedFood }) => {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [meal, setMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const { appState } = useAppState();
  const { t } = useTranslation(appState.language);

  useEffect(() => {
    if (scannedFood) {
      setName(scannedFood.name);
      setCalories(scannedFood.calories);
    }
  }, [scannedFood]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && calories) {
      onAddFood({
        name,
        calories: parseInt(calories, 10),
        meal,
      });
      setName('');
      setCalories('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <h3 className="text-lg font-semibold text-center mb-4">{t('log.log_food')}</h3>
      <Input
        type="text"
        placeholder={t('log.food_name')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        type="number"
        placeholder={t('log.calories')}
        value={calories}
        onChange={(e) => setCalories(e.target.value)}
        required
      />
      <Select
        value={meal}
        onChange={(e) => setMeal(e.target.value as any)}
      >
        <option value="breakfast">{t('log.meal.breakfast')}</option>
        <option value="lunch">{t('log.meal.lunch')}</option>
        <option value="dinner">{t('log.meal.dinner')}</option>
        <option value="snack">{t('log.meal.snack')}</option>
      </Select>
      <Button type="submit" className="w-full">
        {t('log.add_food')}
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" onClick={onScan} className="bg-purple-600 hover:bg-purple-700">
          <CameraIcon className="w-5 h-5 mr-2" /> {t('log.scan_food')}
        </Button>
        <Button type="button" onClick={onUpload} className="bg-green-600 hover:bg-green-700">
          <UploadIcon className="w-5 h-5 mr-2" /> {t('log.upload_image')}
        </Button>
      </div>
    </form>
  );
};

export default AddFoodForm;