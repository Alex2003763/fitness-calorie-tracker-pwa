import React, { useState, useEffect } from 'react';
import { FoodEntry } from '../../types';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { CameraIcon, UploadIcon } from '../Icons';
import { Button, Input, Select } from '../ui';
import { getAiFoodCalories } from '../../services/geminiService';


interface AddFoodFormProps {
  onAddFood: (food: Omit<FoodEntry, 'id'>) => void;
  onScan: () => void;
  onUpload: () => void;
  scannedFood: { name?: string; calories?: string; protein?: string; carbs?: string; fat?: string; };
}
const AddFoodForm: React.FC<AddFoodFormProps> = ({ onAddFood, onScan, onUpload, scannedFood }) => {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [meal, setMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { appState } = useAppState();
  const { t } = useTranslation(appState.language);

  useEffect(() => {
    if (scannedFood) {
      setName(scannedFood.name || '');
      setCalories(scannedFood.calories || '');
      setProtein(scannedFood.protein || '');
      setCarbs(scannedFood.carbs || '');
      setFat(scannedFood.fat || '');
    }
  }, [scannedFood]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsLoading(true);
    setError(null);

    try {
      let finalCalories: number;
      if (calories) {
        finalCalories = parseInt(calories, 10);
      } else {
        finalCalories = await getAiFoodCalories(name, appState.apiKey!, appState.aiModel, appState.language);
      }
      
      onAddFood({
        name,
        calories: finalCalories,
        protein: parseInt(protein, 10) || 0,
        carbs: parseInt(carbs, 10) || 0,
        fat: parseInt(fat, 10) || 0,
        meal,
      });
      setName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
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
        <div className="grid grid-cols-2 gap-2">
        <Input
          type="text"
          placeholder={t('log.food_name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="col-span-2"
        />
        <Input
          type="number"
          placeholder={t('log.calories')}
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          required
          className="col-span-2"
        />
        <Input
          type="number"
          placeholder={t('log.protein')}
          value={protein}
          onChange={(e) => setProtein(e.target.value)}
          className="col-span-2"
        />
        <Input
          type="number"
          placeholder={t('log.carbs')}
          value={carbs}
          onChange={(e) => setCarbs(e.target.value)}
          className="col-span-2"
        />
        <Input
          type="number"
          placeholder={t('log.fat')}
          value={fat}
          onChange={(e) => setFat(e.target.value)}
          className="col-span-2"
        />
          <Select
            value={meal}
            onChange={(e) => setMeal(e.target.value as any)}
            className="col-span-2"
          >
            <option value="breakfast">{t('log.meal.breakfast')}</option>
            <option value="lunch">{t('log.meal.lunch')}</option>
            <option value="dinner">{t('log.meal.dinner')}</option>
            <option value="snack">{t('log.meal.snack')}</option>
          </Select>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t('loading') : t('log.add_food')}
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