import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAppState } from './hooks/useAppState.tsx';
import type { ActiveView, FoodEntry, ExerciseEntry, DailyLog, ChatMessage, AppState, FoodAnalysis, UserProfile, MacronutrientGoals } from './types';
import { getAiAdvice, getAiFoodAnalysis } from './services/geminiService';
import { HomeIcon, ClipboardIcon, SparklesIcon, TrashIcon, SendIcon, SettingsIcon, CameraIcon, ChevronLeftIcon, ChevronRightIcon, UserCircleIcon, DownloadIcon, UploadIcon, RefreshIcon } from './components/Icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from './components/ui';
import { Button, Input, Label, Select } from './components/ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useTranslation } from './hooks/useTranslation';

// --- Helper Functions ---
const getDateString = (date: Date): string => date.toISOString().split('T')[0];
const isToday = (date: Date): boolean => getDateString(date) === getDateString(new Date());

// --- Recharts Pie Chart Label ---
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// --- Camera Component ---
const CameraView = ({ onClose, onScan, isScanning, t }: { onClose: () => void, onScan: (data: string) => Promise<void>, isScanning: boolean, t: (key: string) => string }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState('');
    const uploadInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let stream: MediaStream;
        const startCamera = async () => {
            try {
                if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    if(videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setError(t('camera.permission_error'));
            }
        };

        startCamera();
        
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [t]);

    const handleCapture = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg');
            onScan(dataUrl.split(',')[1]);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = (e.target?.result as string)?.split(',')[1];
                if (base64) {
                    onScan(base64);
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    if (error) {
        return <p className="text-red-400 text-center">{error}</p>
    }

    return (
        <div className="flex flex-col items-center">
            <div className="w-full bg-black rounded-lg overflow-hidden mb-4 relative">
                <video ref={videoRef} autoPlay playsInline className="w-full h-auto"></video>
                {isScanning && (
                     <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white">
                        <div className="w-8 h-8 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
                        <p className="mt-2">{t('camera.scanning')}</p>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
                <Button onClick={handleCapture} disabled={isScanning}>
                    <CameraIcon className="w-5 h-5 mr-2" />
                    {t('log.scan_food')}
                </Button>
                <Button onClick={() => uploadInputRef.current?.click()} disabled={isScanning} className="bg-green-600 hover:bg-green-700">
                    <UploadIcon className="w-5 h-5 mr-2" />
                    {t('log.upload_image')}
                </Button>
                <input type="file" accept="image/*" ref={uploadInputRef} onChange={handleFileUpload} className="hidden" />
            </div>
        </div>
    );
};

const DateNavigator = ({ selectedDate, changeDate, t, locale }: { selectedDate: Date; changeDate: (days: number) => void; t: (key: string) => string; locale: string; }) => {
    const displayDate = isToday(selectedDate) 
        ? t('general.today') 
        : selectedDate.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });

    return (
        <div className="flex items-center justify-center space-x-2 bg-white/5 p-1 rounded-full border border-white/10">
            <Button size="icon" className="h-8 w-8 flex-shrink-0 bg-transparent hover:bg-white/10 rounded-full shadow-none" onClick={() => changeDate(-1)}><ChevronLeftIcon className="w-5 h-5" /></Button>
            <span className="font-semibold text-center text-sm flex-grow px-2 text-gray-200 tracking-wide">{displayDate}</span>
            <Button size="icon" className="h-8 w-8 flex-shrink-0 bg-transparent hover:bg-white/10 rounded-full shadow-none" onClick={() => changeDate(1)} disabled={isToday(selectedDate)}><ChevronRightIcon className="w-5 h-5" /></Button>
        </div>
    );
}

// --- View Components ---

const DashboardView = ({ dailyGoal, logs, selectedDate, setSelectedDate, t, locale, macronutrientGoals }: { dailyGoal: number; logs: Record<string, DailyLog>; selectedDate: Date, setSelectedDate: (d: Date) => void, t: (key: string) => string, locale: string, macronutrientGoals: MacronutrientGoals }) => {
    const currentLog = logs[getDateString(selectedDate)] || { food: [], exercise: [] };
    const intake = currentLog.food.reduce((sum, item) => sum + item.calories, 0);
    const protein = currentLog.food.reduce((sum, item) => sum + item.protein, 0);
    const carbs = currentLog.food.reduce((sum, item) => sum + item.carbs, 0);
    const fat = currentLog.food.reduce((sum, item) => sum + item.fat, 0);
    const burned = currentLog.exercise.reduce((sum, item) => sum + item.calories, 0);
    const net = intake - burned;

    const pieData = [
        { name: t('dashboard.consumed'), value: intake > dailyGoal ? dailyGoal : intake },
        { name: t('dashboard.remaining'), value: intake > dailyGoal ? 0 : dailyGoal - intake },
    ];
    const PIE_COLORS = ['#3b82f6', '#374151'];

    const last7DaysData = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = getDateString(d);
            const log = logs[dateStr] || { food: [], exercise: [] };
            const dayIntake = log.food.reduce((s, item) => s + item.calories, 0);
            const dayBurned = log.exercise.reduce((s, item) => s + item.calories, 0);
            return {
                name: d.toLocaleDateString(locale, { month: '2-digit', day: '2-digit' }),
                [t('dashboard.net_calories')]: dayIntake - dayBurned,
                date: dateStr
            };
        }).reverse();
    }, [logs, t, locale]);

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    }
    
    return (
        <div className="p-4 space-y-4 animate-fade-in">
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 text-center sm:text-left">{t('dashboard.title')}</h1>
                <div className="self-center sm:self-auto">
                    <DateNavigator selectedDate={selectedDate} changeDate={changeDate} t={t} locale={locale} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <Card>
                    <CardHeader>
                        <CardDescription>{t('dashboard.intake')}</CardDescription>
                        <CardTitle className="text-blue-400 text-2xl">{intake.toLocaleString()}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                     <CardHeader>
                        <CardDescription>{t('dashboard.burned')}</CardDescription>
                        <CardTitle className="text-green-400 text-2xl">{burned.toLocaleString()}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t('dashboard.net')}</CardDescription>
                        <CardTitle className="text-yellow-400 text-2xl">{net.toLocaleString()}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>{t('dashboard.goal_progress')}</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" labelLine={false} label={renderCustomizedLabel}>
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip itemStyle={{ color: '#ffffff' }} contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: '1px solid #374151', borderRadius: '0.5rem', backdropFilter: 'blur(4px)' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                    <div className="text-center p-4">
                        <p className="text-xl">{t('dashboard.remaining')} <span className="font-bold text-blue-400">{Math.max(0, dailyGoal - intake).toLocaleString()}</span> {t('dashboard.of')}{dailyGoal.toLocaleString()} {t('dashboard.kcal')}</p>
                    </div>
                </Card>

                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle>{t('dashboard.net_calories_7_days')}</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={last7DaysData}>
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip itemStyle={{ color: '#ffffff' }} cursor={{fill: 'rgba(55, 65, 81, 0.5)'}} contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: '1px solid #374151', borderRadius: '0.5rem', backdropFilter: 'blur(4px)' }}/>
                                <Bar dataKey={t('dashboard.net_calories')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{t('dashboard.macronutrients')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-300">{t('log.protein')}</span>
                            <span className="text-sm font-medium text-gray-400">{protein.toFixed(0)}g / {macronutrientGoals.protein}g</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, (protein / macronutrientGoals.protein) * 100)}%` }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-300">{t('log.carbs')}</span>
                            <span className="text-sm font-medium text-gray-400">{carbs.toFixed(0)}g / {macronutrientGoals.carbs}g</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, (carbs / macronutrientGoals.carbs) * 100)}%` }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-300">{t('log.fat')}</span>
                            <span className="text-sm font-medium text-gray-400">{fat.toFixed(0)}g / {macronutrientGoals.fat}g</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, (fat / macronutrientGoals.fat) * 100)}%` }}></div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const presetExercises = [
    { nameKey: 'log.exercise_presets.running', met: 9.8 },
    { nameKey: 'log.exercise_presets.cycling', met: 8.0 },
    { nameKey: 'log.exercise_presets.swimming', met: 8.3 },
    { nameKey: 'log.exercise_presets.weight_lifting', met: 3.5 },
    { nameKey: 'log.exercise_presets.walking', met: 4.3 },
    { nameKey: 'log.exercise_presets.yoga', met: 2.5 },
];

import AddFoodForm from './components/food/AddFoodForm';
import FoodLog from './components/food/FoodLog';
import { AddExerciseForm } from './components/exercise/AddExerciseForm';
import { ExerciseLog } from './components/exercise/ExerciseLog';

const LogView = ({ currentLog, addFood, addExercise, removeFood, removeExercise, appState, t, setSelectedDate, selectedDate, locale }: { currentLog: DailyLog; addFood: (f: Omit<FoodEntry, 'id'>) => void; addExercise: (e: Omit<ExerciseEntry, 'id'>) => void; removeFood: (id: string) => void; removeExercise: (id: string) => void; appState: AppState, t: (key: string) => string, setSelectedDate: (d: Date) => void, selectedDate: Date; locale: string; }) => {
    const [activeTab, setActiveTab] = useState('food');
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState('');
    const [scannedFood, setScannedFood] = useState<{name?: string, calories?: string, protein?: string, carbs?: string, fat?: string}>({});
    const fileUploadRef = useRef<HTMLInputElement>(null);

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    }
    
    const handleScan = async (base64Image: string) => {
        if (!appState.apiKey) {
            setScanError(t('settings.api_key_required_error'));
            setIsCameraOpen(false);
            return;
        }
        setIsScanning(true);
        setScanError('');
        try {
            const analysis: FoodAnalysis = await getAiFoodAnalysis(base64Image, appState.apiKey, appState.aiModel, appState.language);
            
            if (analysis.foodName === 'UNIDENTIFIED') {
                setScannedFood({});
                setScanError(t('camera.unidentified'));
            } else {
                setScannedFood({
                    name: analysis.foodName,
                    calories: analysis.calories > 0 ? String(analysis.calories) : '',
                    protein: analysis.protein > 0 ? String(analysis.protein) : '',
                    carbs: analysis.carbs > 0 ? String(analysis.carbs) : '',
                    fat: analysis.fat > 0 ? String(analysis.fat) : '',
                });
                setIsCameraOpen(false);
            }
        } catch (error) {
            console.error(error);
            setScanError(t('camera.scan_error'));
        } finally {
            setIsScanning(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const base64String = (loadEvent.target?.result as string).split(',')[1];
                handleScan(base64String);
            };
            reader.readAsDataURL(file);
        }
     };
    
    
    return (
        <div className="p-4 space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 text-center sm:text-left">{t('log.title')}</h1>
                <div className="self-center sm:self-auto">
                    <DateNavigator selectedDate={selectedDate} changeDate={changeDate} t={t} locale={locale} />
                </div>
            </div>

            <div className="flex justify-center bg-white/5 rounded-full p-1 border border-white/10 max-w-xs mx-auto">
                <button onClick={() => setActiveTab('food')} className={`w-full p-2 rounded-full font-semibold transition-all duration-300 ${activeTab === 'food' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-white/10'}`}>{t('log.food')}</button>
                <button onClick={() => setActiveTab('exercise')} className={`w-full p-2 rounded-full font-semibold transition-all duration-300 ${activeTab === 'exercise' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:bg-white/10'}`}>{t('log.exercise')}</button>
            </div>
            
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{activeTab === 'food' ? t('log.add_food') : t('log.add_exercise')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {activeTab === 'food' ? <AddFoodForm onAddFood={addFood} scannedFood={scannedFood} /> : <AddExerciseForm />}
                        {scanError && <p className="text-red-400 text-center mt-2">{scanError}</p>}
                        <input type="file" ref={fileUploadRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{isToday(selectedDate) ? t('log.todays_log') : selectedDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) + t('log.date_log')} - {activeTab === 'food' ? t('log.food') : t('log.exercise')}</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[calc(100vh-28rem)] overflow-y-auto p-4">
                        {activeTab === 'food' ? (
                            <FoodLog entries={currentLog.food} onDelete={removeFood} />
                        ) : (
                           <ExerciseLog exercises={currentLog.exercise} />
                        )}
                    </CardContent>
                </Card>
            </div>
            <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
                <DialogContent onClose={() => setIsCameraOpen(false)}>
                    <DialogHeader>
                        <DialogTitle>{t('camera.modal_title')}</DialogTitle>
                    </DialogHeader>
                    {isCameraOpen && <CameraView onClose={() => setIsCameraOpen(false)} onScan={handleScan} isScanning={isScanning} t={t} />}
                    {scanError && <p className="text-red-400 text-center mt-2">{scanError}</p>}
                </DialogContent>
            </Dialog>
        </div>
    );
};

const AiAssistantView = ({ appState, setChatHistory, clearChatHistory, currentLog, onNav, t }: { appState: AppState, setChatHistory: (history: ChatMessage[]) => void, clearChatHistory: () => void, currentLog: DailyLog; onNav: (view: ActiveView) => void; t: (key: string) => string; }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [appState.chatHistory]);

    const handleSend = async () => {
        if (input.trim() === '' || isLoading || !appState.apiKey) return;
        
        const userMessage: ChatMessage = { role: 'user', text: input };
        const newHistory = [...appState.chatHistory, userMessage];
        setChatHistory(newHistory);
        
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        const aiResponse = await getAiAdvice(currentInput, appState.chatHistory, currentLog, appState.dailyGoal, appState.userProfile, appState.apiKey, appState.aiModel, appState.language);
        const modelMessage: ChatMessage = { role: 'model', text: aiResponse };
        
        setChatHistory([...newHistory, modelMessage]);
        setIsLoading(false);
    };
    
    if (!appState.apiKey) {
        return (
            <div className="p-4 md:p-6 animate-fade-in text-center flex flex-col items-center justify-center h-full">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>{t('ai.not_configured')}</CardTitle>
                        <CardDescription>{t('ai.not_configured_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => onNav('settings')}>{t('ai.go_to_settings')}</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full p-4 animate-fade-in">
             <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">{t('ai.title')}</h1>
                {appState.chatHistory.length > 0 && (
                    <Button
                        onClick={() => setIsAlertOpen(true)}
                        size="icon"
                        className="bg-transparent hover:bg-gray-700/50 text-gray-400 hover:text-white shadow-none"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </Button>
                )}
            </div>
            <Dialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('ai.new_chat_confirm_title')}</DialogTitle>
                        <DialogDescription>
                            {t('ai.new_chat_confirm_desc')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose>
                            <Button className="bg-transparent border border-gray-600 hover:bg-gray-700 text-white">
                                {t('general.cancel')}
                            </Button>
                        </DialogClose>
                        <Button onClick={() => {
                            clearChatHistory();
                            setIsAlertOpen(false);
                        }} className="bg-red-600 hover:bg-red-700 text-white shadow-[0_4px_14px_0_rgb(220,38,38,39%)] hover:shadow-[0_6px_20px_0_rgb(220,38,38,23%)]">
                            {t('general.confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-2">
                {appState.chatHistory.length === 0 && (
                    <div className="text-center text-gray-500 pt-16">
                        <SparklesIcon className="w-12 h-12 mx-auto mb-2" />
                        <p>{t('ai.welcome')}</p>
                        <p className="text-sm">{t('ai.example_prompt')}</p>
                    </div>
                )}
                {appState.chatHistory.map((msg, index) => (
                    <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-2xl shadow-md ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-xl' : 'bg-gray-700 text-gray-200 rounded-bl-xl'}`}>
                           <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-xl bg-gray-700 text-gray-200 flex items-center">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-2"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-2" style={{animationDelay: '75ms'}}></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
                        </div>
                    </div>
                )}
                 <div ref={endOfMessagesRef} />
            </div>
            <div className="flex-shrink-0 flex items-center space-x-2">
                <Input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={t('ai.ask_placeholder')}
                    className="flex-1"
                    disabled={isLoading}
                />
                <Button onClick={handleSend} disabled={isLoading || input.trim() === ''} size="icon">
                    <SendIcon className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
};

const SettingsView = ({ appState, setApiKey, setAiModel, setLanguage, updateUserProfile, setDailyGoal, importData, checkForUpdates, t, setMacronutrientGoals }: { appState: AppState; setApiKey: (key: string) => void; setAiModel: (model: string) => void; setLanguage: (lang: 'en' | 'zh-TW') => void; updateUserProfile: (profile: Partial<UserProfile>) => void; setDailyGoal: (goal: number) => void; importData: (state: AppState) => boolean; checkForUpdates: () => void; t: (key: string) => string; setMacronutrientGoals: (goals: MacronutrientGoals) => void; }) => {
    const [localState, setLocalState] = useState({
        apiKey: appState.apiKey || '',
        aiModel: appState.aiModel,
        language: appState.language,
        userProfile: appState.userProfile,
        dailyGoal: appState.dailyGoal,
        macronutrientGoals: appState.macronutrientGoals
    });
    const [saveMessage, setSaveMessage] = useState('');
    const importFileRef = useRef<HTMLInputElement>(null);

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocalState(prev => ({
            ...prev,
            userProfile: { ...prev.userProfile, [name]: value === '' ? null : (['age', 'weight', 'height'].includes(name) ? Number(value) : value) }
        }));
    };
    
    const handleSave = () => {
        setApiKey(localState.apiKey);
        setAiModel(localState.aiModel);
        setLanguage(localState.language);
        updateUserProfile(localState.userProfile);
        setDailyGoal(localState.dailyGoal);
        setMacronutrientGoals(localState.macronutrientGoals);
        setSaveMessage(t('settings.saved'));
        setTimeout(() => setSaveMessage(''), 3000);
    };

    const handleCalculateTDEE = () => {
        const { age, sex, weight, height, activityLevel } = localState.userProfile;
        if (!age || !sex || !weight || !height) {
            alert(t('settings.user_profile.validation_error'));
            return;
        }

        let bmr = 0;
        if (sex === 'male') {
            bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        } else {
            bmr = 10 * weight + 6.25 * height - 5 * age - 161;
        }
        
        const activityMultipliers = {
            sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, 'very_active': 1.9
        };
        const tdee = Math.round(bmr * activityMultipliers[activityLevel]);
        setLocalState(prev => ({ ...prev, dailyGoal: tdee }));
        alert(`${t('settings.user_profile.tdee_result_1')} ${tdee} ${t('dashboard.kcal')}. ${t('settings.user_profile.tdee_result_2')}`);
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(appState, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `calorie-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (window.confirm(t('settings.data_management.import_confirm'))) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const newState = JSON.parse(event.target?.result as string);
                        if (importData(newState)) {
                            alert(t('settings.data_management.import_success'));
                            window.location.reload();
                        } else {
                            throw new Error('Invalid data format');
                        }
                    } catch (err) {
                        alert(t('settings.data_management.import_error'));
                    }
                };
                reader.readAsText(file);
            }
        }
    };

    return (
        <div className="p-4 space-y-4 animate-fade-in">
            <h1 className="text-3xl font-bold text-white">{t('settings.title')}</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle><UserCircleIcon className="inline-block w-6 h-6 mr-2" />{t('settings.user_profile.title')}</CardTitle>
                    <CardDescription>{t('settings.user_profile.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="age">{t('settings.user_profile.age')}</Label>
                            <Input id="age" name="age" type="number" value={localState.userProfile.age || ''} onChange={handleProfileChange} />
                        </div>
                        <div>
                            <Label htmlFor="sex">{t('settings.user_profile.sex')}</Label>
                            <Select id="sex" name="sex" value={localState.userProfile.sex || ''} onChange={handleProfileChange}>
                                <option value="" disabled>{t('settings.user_profile.select_sex')}</option>
                                <option value="male">{t('settings.user_profile.male')}</option>
                                <option value="female">{t('settings.user_profile.female')}</option>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="weight">{t('settings.user_profile.weight')}</Label>
                            <Input id="weight" name="weight" type="number" value={localState.userProfile.weight || ''} onChange={handleProfileChange} />
                        </div>
                        <div>
                            <Label htmlFor="height">{t('settings.user_profile.height')}</Label>
                            <Input id="height" name="height" type="number" value={localState.userProfile.height || ''} onChange={handleProfileChange} />
                        </div>
                         <div>
                            <Label htmlFor="activityLevel">{t('settings.user_profile.activity_level')}</Label>
                            <Select id="activityLevel" name="activityLevel" value={localState.userProfile.activityLevel || 'moderate'} onChange={handleProfileChange}>
                                <option value="sedentary">{t('settings.user_profile.activity.sedentary')}</option>
                                <option value="light">{t('settings.user_profile.activity.light')}</option>
                                <option value="moderate">{t('settings.user_profile.activity.moderate')}</option>
                                <option value="active">{t('settings.user_profile.activity.active')}</option>
                                <option value="very_active">{t('settings.user_profile.activity.very_active')}</option>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="dailyGoal">{t('settings.user_profile.daily_goal')}</Label>
                            <Input id="dailyGoal" name="dailyGoal" type="number" value={localState.dailyGoal} onChange={(e) => setLocalState(prev => ({...prev, dailyGoal: Number(e.target.value)}))} />
                        </div>
                    </div>
                     <Button onClick={handleCalculateTDEE} className="bg-purple-600 hover:bg-purple-700">{t('settings.user_profile.calculate_goal')}</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.macronutrient_goals.title')}</CardTitle>
                    <CardDescription>{t('settings.macronutrient_goals.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="proteinGoal">{t('settings.macronutrient_goals.protein')}</Label>
                            <Input id="proteinGoal" name="protein" type="number" value={localState.macronutrientGoals.protein} onChange={(e) => setLocalState(prev => ({...prev, macronutrientGoals: {...prev.macronutrientGoals, protein: Number(e.target.value)}}))} />
                        </div>
                        <div>
                            <Label htmlFor="carbsGoal">{t('settings.macronutrient_goals.carbs')}</Label>
                            <Input id="carbsGoal" name="carbs" type="number" value={localState.macronutrientGoals.carbs} onChange={(e) => setLocalState(prev => ({...prev, macronutrientGoals: {...prev.macronutrientGoals, carbs: Number(e.target.value)}}))} />
                        </div>
                        <div>
                            <Label htmlFor="fatGoal">{t('settings.macronutrient_goals.fat')}</Label>
                            <Input id="fatGoal" name="fat" type="number" value={localState.macronutrientGoals.fat} onChange={(e) => setLocalState(prev => ({...prev, macronutrientGoals: {...prev.macronutrientGoals, fat: Number(e.target.value)}}))} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.ai_settings')}</CardTitle>
                    <CardDescription>{t('settings.ai_settings_desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="api-key">{t('settings.api_key')}</Label>
                        <Input id="api-key" type="password" value={localState.apiKey} onChange={(e) => setLocalState(p => ({...p, apiKey: e.target.value}))} placeholder={t('settings.api_key_placeholder')} />
                    </div>
                    <div>
                        <Label htmlFor="ai-model">{t('settings.ai_model')}</Label>
                        <Select id="ai-model" value={localState.aiModel} onChange={(e) => setLocalState(p => ({...p, aiModel: e.target.value}))}>
                            <option value="gemini-2.5-flash">{t('settings.model.flash')}</option>
                            <option value="gemini-1.5-pro">{t('settings.model.pro')}</option>
                            <option value="gemini-pro">{t('settings.model.gemini-pro')}</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="language">{t('settings.language.label')}</Label>
                        <Select id="language" value={localState.language} onChange={(e) => setLocalState(p => ({...p, language: e.target.value as 'en' | 'zh-TW'}))}>
                            <option value="en">{t('settings.language.en')}</option>
                            <option value="zh-TW">{t('settings.language.zh-TW')}</option>
                        </Select>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.data_management.title')}</CardTitle>
                    <CardDescription>{t('settings.data_management.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Button onClick={handleExport} className="w-full sm:w-auto"><DownloadIcon className="w-5 h-5 mr-2"/>{t('settings.data_management.export')}</Button>
                    <Button onClick={() => importFileRef.current?.click()} className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700"><UploadIcon className="w-5 h-5 mr-2"/>{t('settings.data_management.import')}</Button>
                    <input type="file" ref={importFileRef} onChange={handleImport} accept=".json" className="hidden" />
                </CardContent>
            </Card>


            <div className="flex items-center space-x-4 mt-4">
                <Button onClick={handleSave} className="w-full md:w-auto">{t('settings.save')}</Button>
                {saveMessage && <p className="text-green-400 text-sm animate-fade-in">{saveMessage}</p>}
            </div>
        </div>
    );
};


const NavButton = ({ Icon, label, isActive, onClick }: { Icon: React.ElementType, label: string, isActive: boolean, onClick: () => void }) => (
    <button onClick={onClick} className={`flex flex-col md:flex-row md:items-center md:w-full md:justify-start md:p-3 md:rounded-lg items-center justify-center w-full transition-all duration-200 ease-in-out group ${isActive ? 'text-white md:bg-blue-600/30 md:border md:border-white/20 shadow-lg' : 'text-gray-400 hover:text-white hover:md:bg-white/5'}`}>
        <Icon className={`h-6 w-6 mb-1 md:mb-0 md:mr-3 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}/>
        <span className="text-xs md:text-sm font-medium">{label}</span>
    </button>
);


export default function App() {
  const { appState, getLogForDate, addFood, addExercise, removeFood, removeExercise, setDailyGoal, setApiKey, setAiModel, isInitialized, selectedDate, setSelectedDate, setLanguage, updateUserProfile, setChatHistory, clearChatHistory, importData, checkForUpdates: checkSwUpdate, setMacronutrientGoals } = useAppState();
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const { t, isLoaded, currentLanguage, locale } = useTranslation(appState.language);
  const currentLog = useMemo(() => getLogForDate(getDateString(selectedDate)), [getLogForDate, selectedDate]);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const waitingWorker = useRef<ServiceWorker | null>(null);

  const onUpdateAvailable = (worker: ServiceWorker) => {
    waitingWorker.current = worker;
    setUpdateAvailable(true);
  };

  const handleUpdate = () => {
    if (waitingWorker.current) {
      waitingWorker.current.postMessage({ type: 'SKIP_WAITING' });
      setUpdateAvailable(false);
    }
  };
  
  const checkForUpdates = () => {
      checkSwUpdate(onUpdateAvailable);
  };

  useEffect(() => {
    document.title = t('appTitle');
    document.documentElement.lang = currentLanguage;
  }, [t, currentLanguage]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        console.log('SW registered: ', registration);
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            console.log('SW update found, new worker is installing.');
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                 onUpdateAvailable(newWorker);
              }
            });
          }
        });
      }).catch(error => {
        console.log('SW registration failed: ', error);
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          window.location.reload();
          refreshing = true;
        }
      });
    }
  }, []);

  if (!isInitialized || !isLoaded) {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
            <div className="flex items-center space-x-2">
                 <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                 <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
                 <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
                 <span className="ml-2">{t('loading')}</span>
            </div>
        </div>
    );
  }
  
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView dailyGoal={appState.dailyGoal} logs={appState.logs} selectedDate={selectedDate} setSelectedDate={setSelectedDate} t={t} locale={locale} macronutrientGoals={appState.macronutrientGoals} />;
      case 'log':
        return <LogView currentLog={currentLog} addFood={addFood} addExercise={addExercise} removeFood={removeFood} removeExercise={removeExercise} appState={appState} t={t} selectedDate={selectedDate} setSelectedDate={setSelectedDate} locale={locale} />;
      case 'ai':
        return <AiAssistantView appState={appState} setChatHistory={setChatHistory} clearChatHistory={clearChatHistory} currentLog={currentLog} onNav={setActiveView} t={t} />;
      case 'settings':
        return <SettingsView appState={appState} setApiKey={setApiKey} setAiModel={setAiModel} setLanguage={setLanguage} updateUserProfile={updateUserProfile} setDailyGoal={setDailyGoal} importData={importData} checkForUpdates={checkForUpdates} t={t} setMacronutrientGoals={setMacronutrientGoals} />;
      default:
        return <DashboardView dailyGoal={appState.dailyGoal} logs={appState.logs} selectedDate={selectedDate} setSelectedDate={setSelectedDate} t={t} locale={locale} macronutrientGoals={appState.macronutrientGoals} />;
    }
  };

  const navItems = [
      { view: 'dashboard', label: t('nav.dashboard'), Icon: HomeIcon },
      { view: 'log', label: t('nav.log'), Icon: ClipboardIcon },
      { view: 'ai', label: t('nav.ai_assistant'), Icon: SparklesIcon },
      { view: 'settings', label: t('nav.settings'), Icon: SettingsIcon },
  ];

  return (
      <div className="h-screen w-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] text-gray-200 font-sans flex flex-col md:flex-row">
          {updateAvailable && (
              <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 flex items-center gap-4 animate-fade-in">
                  <p>{t('update.new_version_available')}</p>
                  <Button onClick={handleUpdate} className="bg-white text-blue-600 hover:bg-gray-200">{t('update.update_now')}</Button>
              </div>
          )}
          {/* Desktop Sidebar */}
          <aside className="hidden md:flex flex-col w-64 bg-black/20 p-4 border-r border-white/10">
              <header className="text-center mb-10">
                  <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400 tracking-wider">{t('appTitle')}</h1>
              </header>
              <nav className="flex flex-col space-y-3">
                  {navItems.map(item => (
                      <NavButton
                          Icon={item.Icon}
                          label={item.label}
                          isActive={activeView === item.view}
                          onClick={() => setActiveView(item.view as ActiveView)}
                      />
                  ))}
              </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
              <header className="md:hidden flex-shrink-0 bg-black/30 backdrop-blur-md text-center p-4 shadow-lg z-10 border-b border-white/10">
                  <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400 tracking-wide">{t('appTitle')}</h1>
              </header>
              <main className="flex-grow overflow-y-auto">
                  <div className="max-w-7xl mx-auto w-full h-full">
                      {renderView()}
                  </div>
              </main>
          </div>

          {/* Mobile Bottom Nav */}
          <footer className="md:hidden flex-shrink-0 bg-black/30 backdrop-blur-md shadow-t-lg z-10 border-t border-white/10 pb-safe">
              <nav className="flex justify-around items-center h-20">
                  {navItems.map(item => (
                      <NavButton
                          Icon={item.Icon}
                          label={item.label}
                          isActive={activeView === item.view}
                          onClick={() => setActiveView(item.view as ActiveView)}
                      />
                  ))}
              </nav>
          </footer>
      </div>
  );
}