import React, { useState, useEffect } from 'react';
import { FoodEntry } from '../../types';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { CameraIcon, UploadIcon } from '../Icons';
import { Button, Input, Select } from '../ui';
import { getAiFoodNutrition } from '../../services/geminiService';


interface AddFoodFormProps {
  onAddFood: (food: Omit<FoodEntry, 'id'>) => void;
  onUpload: () => void;
  scannedFood: { name?: string; calories?: string; protein?: string; carbs?: string; fat?: string; };
}
const AddFoodForm: React.FC<AddFoodFormProps> = ({ onAddFood, onUpload, scannedFood }) => {
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
      let foodData;
      if (calories && protein && carbs && fat) {
          foodData = {
              name,
              calories: parseInt(calories, 10),
              protein: parseInt(protein, 10) || 0,
              carbs: parseInt(carbs, 10) || 0,
              fat: parseInt(fat, 10) || 0,
              meal,
          };
      } else {
          const nutrition = await getAiFoodNutrition(name, appState.apiKey!, appState.aiModel, appState.language);
          foodData = {
              name: nutrition.foodName,
              calories: nutrition.calories,
              protein: nutrition.protein,
              carbs: nutrition.carbs,
              fat: nutrition.fat,
              meal,
          };
      }
      
      onAddFood(foodData);
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
      <div className="space-y-4">
        <Input
          type="text"
          placeholder={t('log.food_name_placeholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full"
        />
        <p className="text-xs text-gray-400 -mt-2 text-center">{t('log.ai_fill_tip')}</p>
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            placeholder={t('log.calories')}
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
          <Input
            type="number"
            placeholder={`${t('log.protein')} (g)`}
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
          />
          <Input
            type="number"
            placeholder={`${t('log.carbs')} (g)`}
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
          />
          <Input
            type="number"
            placeholder={`${t('log.fat')} (g)`}
            value={fat}
            onChange={(e) => setFat(e.target.value)}
          />
        </div>
        
        <Select
            value={meal}
            onChange={(e) => setMeal(e.target.value as any)}
            className="w-full"
        >
            <option value="breakfast">{t('log.meal.breakfast')}</option>
            <option value="lunch">{t('log.meal.lunch')}</option>
            <option value="dinner">{t('log.meal.dinner')}</option>
            <option value="snack">{t('log.meal.snack')}</option>
        </Select>
        
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>
      
      <div className="space-y-2 pt-2">
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t('loading') : t('log.add_food')}
        </Button>
        <Button type="button" onClick={onUpload} className="w-full bg-green-600 hover:bg-green-700">
          <UploadIcon className="w-5 h-5 mr-2" /> {t('log.upload_image')}
        </Button>
      </div>
    </form>
  );
};

export default AddFoodForm;