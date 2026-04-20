import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Minus, X, Flame, Dumbbell, Wheat, Droplet,
  AlertCircle, ArrowRight, Sun, Utensils, Moon,
  Coffee, Camera, Loader2, ChevronDown, ChevronUp,
  Trash2
} from 'lucide-react';

const MEAL_TYPES = ['早餐', '午餐', '晚餐', '宵夜'];

const renderMealIcon = (meal, className) => {
  switch (meal) {
    case '早餐': return <Sun className={className} />;
    case '午餐': return <Utensils className={className} />;
    case '晚餐': return <Moon className={className} />;
    case '宵夜': return <Coffee className={className} />;
    default: return <Utensils className={className} />;
  }
};

function getTodayStr() {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}

function formatNum(num) {
  return Number(num || 0).toFixed(1).replace(/\.0$/, '');
}

async function parseFoodText(text) {
  const res = await fetch('/api/parse-food', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || '解析失败');
  }

  return data?.foods || [];
}

async function parseFoodImage(file) {
  const base64 = await fileToBase64(file);

  const res = await fetch('/api/parse-food', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType: file.type
    })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || '图片识别失败');
  }

  return data?.foods || [];
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('图片读取失败'));
        return;
      }
      resolve(result.split(',')[1]);
    };
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [inputText, setInputText] = useState('');
  const [selectedMeal, setSelectedMeal] = useState(MEAL_TYPES[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState('');
  const fileInputRef = useRef(null);

  const [activeCards, setActiveCards] = useState(() => {
    const savedStr = localStorage.getItem('nutrition_data_v3');
    if (!savedStr) return [];
    try {
      const saved = JSON.parse(savedStr);
      if (saved.date === getTodayStr()) return saved.cards || [];
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [expandedFolders, setExpandedFolders] = useState({
    早餐: true,
    午餐: true,
    晚餐: true,
    宵夜: true
  });

  useEffect(() => {
    localStorage.setItem('nutrition_data_v3', JSON.stringify({
      date: getTodayStr(),
      cards: activeCards
    }));
    document.documentElement.style.backgroundColor = '#0a0a0c';
    document.body.style.backgroundColor = '#0a0a0c';
  }, [activeCards]);

  const totals = useMemo(() => {
    return activeCards.reduce(
      (acc, card) => {
        const qty = card.quantity || 1;
        acc.calories += (card.calories || 0) * qty;
        acc.protein += (card.protein || 0) * qty;
        acc.carbs += (card.carbs || 0) * qty;
        acc.fat += (card.fat || 0) * qty;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [activeCards]);

  const addFoodsToCards = (foods) => {
    const newCards = foods
      .filter((food) => food?.isFood !== false)
      .map((food) => ({
        name: food.name || '未知食物',
        unit: food.unit || '1份',
        calories: Number(food.calories || 0),
        protein: Number(food.protein || 0),
        carbs: Number(food.carbs || 0),
        fat: Number(food.fat || 0),
        quantity: 1,
        meal: selectedMeal,
        uniqueId: `card-${Date.now()}-${Math.random()}`
      }));

    if (newCards.length === 0) {
      setApiError('未识别到具体食物，请换个写法。');
      return;
    }

    setActiveCards((prev) => [...newCards, ...prev]);
    setExpandedFolders((prev) => ({ ...prev, [selectedMeal]: true }));
    setInputText('');
  };

  const handleParseInput = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    setApiError('');

    try {
      const foods = await parseFoodText(inputText.trim());
      addFoodsToCards(foods);
    } catch (e) {
      setApiError(e.message || '解析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setApiError('');

    try {
      const foods = await parseFoodImage(file);
      addFoodsToCards(foods);
    } catch (e) {
      setApiError(e.message || '图片识别失败');
    } finally {
      setIsAnalyzing(false);
      e.target.value = '';
    }
  };

  const clearAllData = () => {
    if (window.confirm('确定要清空今日所有记录吗？')) {
      setActiveCards([]);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0c] text-white font-sans pb-20 selection:bg-[#ff5a1f]/30">
      <header className="pt-10 pb-6 px-6 max-w-5xl mx-auto flex justify-between items-start">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            追踪你的 <span className="text-[#ff5a1f]">营养素</span>
          </h1>
          <p className="text-gray-400 mt-2">智能解析，轻松管理每日摄入。</p>
        </div>

        <button
          onClick={clearAllData}
          className="p-3 bg-[#1c1d24] rounded-2xl border border-gray-800 text-gray-500 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 space-y-8">
        <section className="bg-[#15161a] rounded-3xl p-6 border border-gray-800 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#ff5a1f] opacity-10 rounded-full blur-3xl pointer-events-none"></div>

          <h2 className="text-gray-400 font-medium mb-4 flex items-center">
            <Flame className="w-4 h-4 mr-2 text-[#ff5a1f]" />
            今日营养总计
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <StatBox label="热量" value={formatNum(totals.calories)} unit="大卡" color="text-white" icon={<Flame className="w-5 h-5 opacity-50" />} />
            <StatBox label="蛋白质" value={formatNum(totals.protein)} unit="克" color="text-blue-400" icon={<Dumbbell className="w-5 h-5 opacity-50" />} />
            <StatBox label="碳水" value={formatNum(totals.carbs)} unit="克" color="text-green-400" icon={<Wheat className="w-5 h-5 opacity-50" />} />
            <StatBox label="脂肪" value={formatNum(totals.fat)} unit="克" color="text-yellow-400" icon={<Droplet className="w-5 h-5 opacity-50" />} />
          </div>
        </section>

        <section>
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
            {MEAL_TYPES.map((meal) => (
              <button
                key={meal}
                onClick={() => setSelectedMeal(meal)}
                className={`flex items-center shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  selectedMeal === meal
                    ? 'bg-[#ff5a1f] text-white shadow-lg'
                    : 'bg-[#1c1d24] text-gray-400 border border-gray-800'
                }`}
              >
                {renderMealIcon(meal, 'w-4 h-4 mr-2')}
                {meal}
              </button>
            ))}
          </div>

          <div className="bg-[#15161a] rounded-2xl border border-gray-800 p-2 focus-within:border-[#ff5a1f] transition-all shadow-inner group">
            <textarea
              className="w-full bg-transparent text-white p-4 outline-none resize-none h-28 placeholder:text-gray-600 leading-relaxed"
              placeholder={`输入${selectedMeal}吃了什么？例如：2粒鸡蛋 1杯牛奶 2片面包`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleParseInput();
                }
              }}
              disabled={isAnalyzing}
            />

            <div className="flex justify-between items-center px-2 pb-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-gray-500 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-all"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#ff5a1f]" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">
                  {isAnalyzing ? '分析中...' : '拍照识别'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
              </button>

              <button
                onClick={handleParseInput}
                disabled={!inputText.trim() || isAnalyzing}
                className="bg-[#ff5a1f] hover:bg-[#ff7a47] active:scale-95 text-white px-8 py-2.5 rounded-xl font-bold flex items-center disabled:opacity-50 transition-all"
              >
                生成卡片
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>

          {apiError && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 bg-red-950/30 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center text-sm">
              <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
              <span className="flex-1">{apiError}</span>
              <button
                onClick={() => setApiError('')}
                className="ml-2 hover:bg-white/10 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>

        <section className="space-y-4">
          {MEAL_TYPES.map((meal) => {
            const mealCards = activeCards.filter((card) => card.meal === meal);
            if (mealCards.length === 0) return null;

            const mealCals = mealCards.reduce(
              (acc, card) => acc + (card.calories || 0) * (card.quantity || 1),
              0
            );

            return (
              <div
                key={meal}
                className="bg-[#15161a] rounded-2xl border border-gray-800 overflow-hidden animate-in fade-in"
              >
                <div
                  onClick={() =>
                    setExpandedFolders((prev) => ({
                      ...prev,
                      [meal]: !prev[meal]
                    }))
                  }
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-[#1c1d24]"
                >
                  <h3 className="text-xl font-bold flex items-center">
                    <span className="text-[#ff5a1f] mr-3">
                      {renderMealIcon(meal, 'w-5 h-5')}
                    </span>
                    {meal}
                  </h3>

                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-400">
                      {formatNum(mealCals)} kcal
                    </span>
                    {expandedFolders[meal] ? (
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                </div>

                {expandedFolders[meal] && (
                  <div className="p-5 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-gray-800/50 bg-black/20">
                    {mealCards.map((card) => (
                      <FoodCard
                        key={card.uniqueId}
                        card={card}
                        onUpdateQty={(id, delta) => {
                          setActiveCards((prev) =>
                            prev.map((c) =>
                              c.uniqueId === id
                                ? { ...c, quantity: Math.max(1, c.quantity + delta) }
                                : c
                            )
                          );
                        }}
                        onRemove={(id) => {
                          setActiveCards((prev) =>
                            prev.filter((c) => c.uniqueId !== id)
                          );
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}

function StatBox({ label, value, unit, color, icon }) {
  return (
    <div className="bg-[#1c1d24] rounded-2xl p-5 border border-gray-800/50 transition-colors">
      <div className="flex items-center justify-between mb-3 text-[10px] uppercase tracking-widest text-gray-500 font-bold">
        {label}
        {icon}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-black ${color}`}>{value}</span>
        <span className="text-gray-600 text-xs font-medium">{unit}</span>
      </div>
    </div>
  );
}

function FoodCard({ card, onUpdateQty, onRemove }) {
  return (
    <div className="bg-[#1c1d24] border border-gray-800 rounded-2xl p-5 relative group transition-all">
      <button
        onClick={() => onRemove(card.uniqueId)}
        className="absolute top-3 right-3 text-gray-600 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="mb-4 pr-6">
        <h4 className="font-bold text-white truncate">{card.name}</h4>
        <p className="text-[10px] text-gray-500 font-medium uppercase mt-0.5">
          {card.unit}
        </p>
      </div>

      <div className="flex items-center bg-[#0a0a0c] rounded-xl w-max p-1 mb-5 border border-gray-800">
        <button
          onClick={() => onUpdateQty(card.uniqueId, -1)}
          className="p-2 hover:bg-gray-800 rounded-lg"
        >
          <Minus className="w-3 h-3" />
        </button>

        <span className="w-10 text-center font-black text-sm">{card.quantity}</span>

        <button
          onClick={() => onUpdateQty(card.uniqueId, 1)}
          className="p-2 hover:bg-gray-800 rounded-lg"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
        <NutrientLine label="热量" val={formatNum(card.calories * card.quantity)} unit="kcal" color="text-white" />
        <NutrientLine label="蛋白质" val={formatNum(card.protein * card.quantity)} unit="g" color="text-blue-400" />
        <NutrientLine label="碳水" val={formatNum(card.carbs * card.quantity)} unit="g" color="text-green-400" />
        <NutrientLine label="脂肪" val={formatNum(card.fat * card.quantity)} unit="g" color="text-yellow-400" />
      </div>
    </div>
  );
}

function NutrientLine({ label, val, unit, color }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] text-gray-600 font-bold uppercase">{label}</span>
      <div className="flex items-baseline gap-0.5">
        <span className={`text-xs font-bold ${color}`}>{val}</span>
        <span className="text-[9px] text-gray-600">{unit}</span>
      </div>
    </div>
  );
}
