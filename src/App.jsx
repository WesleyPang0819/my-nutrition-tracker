import React, { useState, useMemo, useRef } from 'react';
import { Plus, Minus, X, Flame, Dumbbell, Wheat, Droplet, AlertCircle, ArrowRight, Sun, Utensils, Moon, Coffee, Camera, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

// ==========================================
// 1. 本地食物数据库
// ==========================================
const FOOD_DB = [
  { id: 'f1', name: '鸡蛋', unit: '1 颗 (50g)', calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3 },
  { id: 'f2', name: '牛奶', unit: '1 杯 (250ml)', calories: 150, protein: 8.0, carbs: 12.0, fat: 8.0 },
  { id: 'f3', name: '包菜', unit: '100g', calories: 25, protein: 1.3, carbs: 5.8, fat: 0.1 },
  { id: 'f4', name: '猪肉', unit: '100g (瘦)', calories: 143, protein: 26.0, carbs: 0.0, fat: 4.0 },
  { id: 'f5', name: '鸡胸肉', unit: '100g', calories: 165, protein: 31.0, carbs: 0.0, fat: 3.6 },
  { id: 'f6', name: '白饭', unit: '1 碗 (150g)', calories: 205, protein: 4.3, carbs: 45.0, fat: 0.4 },
  { id: 'f7', name: '面包', unit: '1 片 (30g)', calories: 79, protein: 2.7, carbs: 15.0, fat: 1.0 },
  { id: 'f8', name: '香蕉', unit: '1 根 (118g)', calories: 105, protein: 1.3, carbs: 27.0, fat: 0.3 },
  { id: 'f9', name: '燕麦', unit: '1 份 (40g)', calories: 150, protein: 5.0, carbs: 27.0, fat: 2.5 },
  { id: 'f10', name: '豆腐', unit: '100g (板豆腐)', calories: 144, protein: 16.0, carbs: 2.8, fat: 8.7 },
];

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

const INITIAL_CARDS = [
  { ...FOOD_DB[0], uniqueId: 'init-1', quantity: 2, meal: '早餐' },
  { ...FOOD_DB[8], uniqueId: 'init-2', quantity: 1, meal: '早餐' },
  { ...FOOD_DB[1], uniqueId: 'init-3', quantity: 1, meal: '早餐' },
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [selectedMeal, setSelectedMeal] = useState(MEAL_TYPES[0]);
  const [activeCards, setActiveCards] = useState(INITIAL_CARDS);
  const [unmatchedFoods, setUnmatchedFoods] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState('');
  
  const fileInputRef = useRef(null);
  
  const [expandedFolders, setExpandedFolders] = useState({
    '早餐': true, '午餐': true, '晚餐': true, '宵夜': true
  });

  const toggleFolder = (mealId) => {
    setExpandedFolders(prev => ({ ...prev, [mealId]: !prev[mealId] }));
  };

  const totals = useMemo(() => {
    return activeCards.reduce(
      (acc, card) => {
        acc.calories += card.calories * card.quantity;
        acc.protein += card.protein * card.quantity;
        acc.carbs += card.carbs * card.quantity;
        acc.fat += card.fat * card.quantity;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [activeCards]);

  const fetchNutritionFromAI = async (foodNames) => {
    const apiKey = ""; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        parts: [{ text: `估算营养成分：${foodNames.join(", ")}` }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            foods: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  unit: { type: "STRING" },
                  calories: { type: "NUMBER" },
                  protein: { type: "NUMBER" },
                  carbs: { type: "NUMBER" },
                  fat: { type: "NUMBER" },
                  isFood: { type: "BOOLEAN" }
                },
                required: ["name", "unit", "calories", "protein", "carbs", "fat", "isFood"]
              }
            }
          }
        }
      }
    };

    try {
      const res = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      return JSON.parse(data.candidates[0].content.parts[0].text).foods;
    } catch { return []; }
  };

  const handleParseInput = async (customText) => {
    const textToParse = typeof customText === 'string' ? customText : inputText;
    if (!textToParse.trim()) return;

    setIsAnalyzing(true);
    setApiError('');

    try {
      const rawTokens = textToParse.split(/[\s,，、\n]+/);
      const uniqueTokens = [...new Set(rawTokens.filter(t => t.trim() !== ''))];
      const newCards = [];
      const notFoundTokens = [];

      uniqueTokens.forEach(token => {
        const matchedFood = FOOD_DB.find(f => f.name.includes(token) || token.includes(f.name));
        if (matchedFood) {
          newCards.push({ ...matchedFood, uniqueId: `card-${Date.now()}-${Math.random()}`, quantity: 1, meal: selectedMeal });
        } else {
          notFoundTokens.push(token);
        }
      });

      if (notFoundTokens.length > 0) {
        const aiFoods = await fetchNutritionFromAI(notFoundTokens);
        aiFoods.forEach(aiFood => {
          if (aiFood.isFood) {
            newCards.push({ ...aiFood, uniqueId: `card-${Date.now()}-${Math.random()}`, quantity: 1, meal: selectedMeal });
          }
        });
      }

      setActiveCards(prev => [...newCards, ...prev]);
      setExpandedFolders(prev => ({ ...prev, [selectedMeal]: true }));
      setInputText('');
    } catch {
      setApiError("解析失败，请稍后重试。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      const apiKey = "";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{
          parts: [{ text: "识别图中食物名称，空格分隔" }, { inlineData: { mimeType: file.type, data: base64 } }]
        }]
      };
      const res = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      const text = data.candidates[0].content.parts[0].text;
      if (text) await handleParseInput(text);
      setIsAnalyzing(false);
    };
    reader.readAsDataURL(file);
  };

  const formatNum = (num) => Number(num).toFixed(1).replace(/\.0$/, '');

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans pb-20">
      <header className="pt-10 pb-6 px-6 max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          追踪你的 <span className="text-[#ff5a1f]">营养素</span>
        </h1>
        <p className="text-gray-400 mt-2">智能解析食物名称，轻松管理每日营养摄入。</p>
      </header>

      <main className="max-w-5xl mx-auto px-6 space-y-8">
        <section className="bg-[#15161a] rounded-3xl p-6 border border-gray-800 shadow-xl relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#ff5a1f] opacity-10 rounded-full blur-3xl pointer-events-none"></div>
          <h2 className="text-gray-400 font-medium mb-4 flex items-center">
            <Flame className="w-4 h-4 mr-2 text-[#ff5a1f]" /> 今日营养总计
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <StatBox label="热量" value={formatNum(totals.calories)} unit="大卡" color="text-white" icon={<Flame className="w-5 h-5 opacity-50"/>} />
            <StatBox label="蛋白质" value={formatNum(totals.protein)} unit="克" color="text-blue-400" icon={<Dumbbell className="w-5 h-5 opacity-50"/>}/>
            <StatBox label="碳水" value={formatNum(totals.carbs)} unit="克" color="text-green-400" icon={<Wheat className="w-5 h-5 opacity-50"/>}/>
            <StatBox label="脂肪" value={formatNum(totals.fat)} unit="克" color="text-yellow-400" icon={<Droplet className="w-5 h-5 opacity-50"/>}/>
          </div>
        </section>

        <section>
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {MEAL_TYPES.map((meal) => (
              <button key={meal} onClick={() => setSelectedMeal(meal)} className={`flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedMeal === meal ? 'bg-[#ff5a1f] text-white shadow-lg' : 'bg-[#1c1d24] text-gray-400 border border-gray-800'}`}>
                {renderMealIcon(meal, "w-4 h-4 mr-1.5")} {meal}
              </button>
            ))}
          </div>

          <div className="bg-[#15161a] rounded-2xl border border-gray-800 p-2 focus-within:border-[#ff5a1f] transition-colors shadow-inner flex flex-col gap-2">
            <textarea className="w-full bg-transparent text-white p-4 outline-none resize-none h-24" placeholder={`输入${selectedMeal}吃了什么...`} value={inputText} onChange={(e) => setInputText(e.target.value)} disabled={isAnalyzing} />
            <div className="flex justify-between items-center px-2 pb-2">
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin text-[#ff5a1f]" /> : <Camera className="w-5 h-5" />}
                <span className="text-sm">{isAnalyzing ? 'AI 识别中...' : '拍照识别'}</span>
                <input type="file" accept="image/*" hidden ref={fileInputRef} onChange={handleImageUpload} />
              </button>
              <button onClick={() => handleParseInput()} className="bg-[#ff5a1f] text-white px-6 py-2 rounded-xl font-bold flex items-center">
                生成卡片 <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {MEAL_TYPES.map(meal => {
            const mealCards = activeCards.filter(card => card.meal === meal);
            if (mealCards.length === 0) return null;
            const mealCals = mealCards.reduce((acc, card) => acc + card.calories * card.quantity, 0);
            return (
              <div key={meal} className="bg-[#15161a] rounded-2xl border border-gray-800 overflow-hidden">
                <div onClick={() => toggleFolder(meal)} className="flex items-center justify-between p-5 cursor-pointer hover:bg-[#1c1d24] transition-colors">
                  <h3 className="text-xl font-bold flex items-center">
                    <span className="text-[#ff5a1f] mr-3">{renderMealIcon(meal, "w-5 h-5")}</span>{meal}
                  </h3>
                  <div className="flex items-center gap-5">
                    <span className="text-sm font-bold">{formatNum(mealCals)} 大卡</span>
                    {expandedFolders[meal] ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                  </div>
                </div>
                {expandedFolders[meal] && (
                  <div className="p-5 border-t border-gray-800 bg-[#0f1013] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mealCards.map((card) => (
                      <FoodCard key={card.uniqueId} card={card} onUpdateQty={(id, d) => setActiveCards(prev => prev.map(c => c.uniqueId === id ? {...c, quantity: Math.max(1, c.quantity + d)} : c))} onRemove={(id) => setActiveCards(prev => prev.filter(c => c.uniqueId !== id))} />
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
    <div className="bg-[#1c1d24] rounded-2xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-2 text-xs text-gray-400 font-medium">{label} {icon}</div>
      <div className="flex items-baseline"><span className={`text-2xl font-bold ${color}`}>{value}</span><span className="text-gray-500 text-xs ml-1">{unit}</span></div>
    </div>
  );
}

function FoodCard({ card, onUpdateQty, onRemove }) {
  const formatNum = (num) => Number(num).toFixed(1).replace(/\.0$/, '');
  return (
    <div className="bg-[#15161a] border border-gray-800 rounded-2xl p-5 relative group">
      <button onClick={() => onRemove(card.uniqueId)} className="absolute top-3 right-3 text-gray-600 hover:text-red-500"><X className="w-4 h-4" /></button>
      <div className="mb-4"><h4 className="font-bold text-white">{card.name}</h4><p className="text-xs text-gray-500">{card.unit}</p></div>
      <div className="flex items-center bg-[#1c1d24] rounded-xl w-max p-1 mb-4 border border-gray-800">
        <button onClick={() => onUpdateQty(card.uniqueId, -1)} className="p-2"><Minus className="w-3 h-3" /></button>
        <span className="w-8 text-center font-bold">{card.quantity}</span>
        <button onClick={() => onUpdateQty(card.uniqueId, 1)} className="p-2"><Plus className="w-3 h-3" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400">
        <div>热量: <span className="text-white">{formatNum(card.calories * card.quantity)}</span></div>
        <div>蛋白: <span className="text-blue-400">{formatNum(card.protein * card.quantity)}g</span></div>
        <div>碳水: <span className="text-green-400">{formatNum(card.carbs * card.quantity)}g</span></div>
        <div>脂肪: <span className="text-yellow-400">{formatNum(card.fat * card.quantity)}g</span></div>
      </div>
    </div>
  );
}
