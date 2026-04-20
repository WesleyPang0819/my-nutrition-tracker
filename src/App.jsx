import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, Minus, X, Flame, Dumbbell, Wheat, Droplet, 
  AlertCircle, ArrowRight, Sun, Utensils, Moon, 
  Coffee, Camera, Loader2, ChevronDown, ChevronUp,
  History, Trash2, Save
} from 'lucide-react';

// ==========================================
// 0. 配置中心 (安全环境变量模式)
// ==========================================
// ⚠️ 重要提示：在您将代码复制到 VS Code 后，请务必将下面这行修改回：
// const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// 外网真实部署统一使用 1.5-flash 稳定模型
const GEMINI_MODEL = "gemini-1.5-flash";

// ==========================================
// 1. 食物数据库 (基础参考)
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

export default function App() {
  // ------------------------------------------
  // 状态管理
  // ------------------------------------------
  const [inputText, setInputText] = useState('');
  const [selectedMeal, setSelectedMeal] = useState(MEAL_TYPES[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // 获取今天的本地日期字符串 (格式: YYYY-M-D)
  const getTodayStr = () => {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  };

  // 从本地存储加载数据，如果是新的一天则完全为空
  const [activeCards, setActiveCards] = useState(() => {
    const savedStr = localStorage.getItem('nutrition_data_v2');
    if (savedStr) {
      try {
        const saved = JSON.parse(savedStr);
        // 如果保存的数据日期是今天，才加载出来；否则返回空数组
        if (saved.date === getTodayStr()) {
          return saved.cards || [];
        }
      } catch (e) {
        console.error("数据解析失败", e);
      }
    }
    return []; // 默认完全空白，没有示例食物
  });

  const fileInputRef = useRef(null);
  const [expandedFolders, setExpandedFolders] = useState({
    '早餐': true, '午餐': true, '晚餐': true, '宵夜': true
  });

  // ------------------------------------------
  // 副作用：保存数据到本地 & 跨天自动清零
  // ------------------------------------------
  useEffect(() => {
    // 保存时连同今天的日期一起存进去 (改用新 key 避免旧数据冲突)
    localStorage.setItem('nutrition_data_v2', JSON.stringify({
      date: getTodayStr(),
      cards: activeCards
    }));
    
    // 修复手机端上下滑动时露出的白边（将网页最底层的背景也设为深色）
    document.documentElement.style.backgroundColor = '#0a0a0c';
    document.body.style.backgroundColor = '#0a0a0c';
  }, [activeCards]);

  // 定时器：如果用户一直开着网页过了半夜 12 点，自动清空数据
  useEffect(() => {
    const interval = setInterval(() => {
      const today = getTodayStr();
      const savedStr = localStorage.getItem('nutrition_data_v2');
      if (savedStr) {
        try {
          const saved = JSON.parse(savedStr);
          if (saved.date !== today) {
            setActiveCards([]); // 跨天了，自动清空列表！
          }
        } catch (e) {}
      }
    }, 60000); // 每分钟检查一次当前时间

    return () => clearInterval(interval);
  }, []);

  // ------------------------------------------
  // 核心计算逻辑
  // ------------------------------------------
  const totals = useMemo(() => {
    return activeCards.reduce(
      (acc, card) => {
        acc.calories += (card.calories || 0) * (card.quantity || 1);
        acc.protein += (card.protein || 0) * (card.quantity || 1);
        acc.carbs += (card.carbs || 0) * (card.quantity || 1);
        acc.fat += (card.fat || 0) * (card.quantity || 1);
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [activeCards]);

  // ------------------------------------------
  // AI 交互逻辑
  // ------------------------------------------
  const fetchNutritionFromAI = async (userInput) => {
    if (!GEMINI_API_KEY) {
      throw new Error("MISSING_KEY");
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    // 全新升级的 Prompt：支持自然语言理解、多语言、自动提取分量
    const prompt = `
      作为世界顶级的营养学专家，请分析用户的这句饮食记录："${userInput}"。
      用户可能使用任何语言（如中文、英文、马来文、日文等），也可能是一段随意的日常描述。
      请提取出句子中提及的所有食物及其对应数量，并估算它们的营养成分。
      
      必须严格按 JSON 格式返回，格式如下：
      {
        "foods": [
          {
            "name": "食物名 (请优先用中文显示，如果是当地特色食物可保留原文或加括号说明，如 Nasi Lemak)",
            "unit": "用户描述的分量 (例如：1碗、2个、200g、1 piece)",
            "calories": 该分量下的总热量(数字),
            "protein": 该分量下的总蛋白质克数(数字),
            "carbs": 该分量下的总碳水克数(数字),
            "fat": 该分量下的总脂肪克数(数字),
            "isFood": true
          }
        ]
      }
      如果输入完全不包含食物，请返回 {"foods": []}。
    `;

    try {
      const res = await fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        }) 
      });
      const data = await res.json();
      
      if (data.error) {
        console.error("API Error Response:", data.error);
        throw new Error("API_ERROR");
      }

      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return [];
      
      // 增强稳定性：自动清除可能出现的 markdown json 符号
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      return JSON.parse(text).foods || [];
    } catch (e) {
      console.error("AI Fetch Error:", e);
      throw e;
    }
  };

  const handleParseInput = async (customText) => {
    const textToParse = typeof customText === 'string' ? customText : inputText;
    if (!textToParse.trim()) return;

    setIsAnalyzing(true);
    setApiError('');

    try {
      // 直接将整句自然语言交给 AI 处理
      const aiFoods = await fetchNutritionFromAI(textToParse);
      
      if (aiFoods && aiFoods.length > 0) {
        const newCards = [];
        aiFoods.forEach(aiFood => {
          if (aiFood.isFood) {
            // AI 返回的已经是该分量的总计，所以初始 quantity 设为 1
            newCards.push({ ...aiFood, uniqueId: `card-${Date.now()}-${Math.random()}`, quantity: 1, meal: selectedMeal });
          }
        });

        if (newCards.length > 0) {
          setActiveCards(prev => [...newCards, ...prev]);
          setExpandedFolders(prev => ({ ...prev, [selectedMeal]: true }));
          setInputText('');
        } else {
          setApiError("未识别到具体的食物成分，请换个描述方式试试。");
        }
      } else {
        setApiError("未能从您的话中提取出食物信息，请重试。");
      }
    } catch (e) {
      console.error("Parse Error:", e);
      if (e.message === "MISSING_KEY") {
        setApiError("⚠️ 请先在代码第 14 行的 GEMINI_API_KEY 填入你的 Key！");
      } else {
        setApiError("解析请求出错，请检查网络或 API Key 是否正确。");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!GEMINI_API_KEY) {
       setApiError("⚠️ 缺少 API Key，无法使用拍照功能");
       return;
    }
    
    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      
      try {
        const res = await fetch(url, { 
          method: 'POST',
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "请列出图中的所有食物名称，以空格分隔。如果不是食物请回答'无'。" },
                { inlineData: { mimeType: file.type, data: base64 } }
              ]
            }]
          })
        });
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim() !== '无') {
          await handleParseInput(text);
        } else {
          setApiError("未能识别图中的食物。");
        }
      } catch {
        setApiError("图片分析失败。");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearAllData = () => {
    if (window.confirm("确定要清空今日所有记录吗？")) {
      setActiveCards([]);
    }
  };

  const formatNum = (num) => Number(num).toFixed(1).replace(/\.0$/, '');

  // ------------------------------------------
  // UI 渲染
  // ------------------------------------------
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
          title="清空记录"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 space-y-8">
        {/* 仪表盘 */}
        <section className="bg-[#15161a] rounded-3xl p-6 border border-gray-800 shadow-2xl relative overflow-hidden">
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

        {/* 输入区 */}
        <section>
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
            {MEAL_TYPES.map((meal) => (
              <button 
                key={meal} 
                onClick={() => setSelectedMeal(meal)} 
                className={`flex items-center shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedMeal === meal ? 'bg-[#ff5a1f] text-white shadow-lg' : 'bg-[#1c1d24] text-gray-400 border border-gray-800'}`}
              >
                {renderMealIcon(meal, "w-4 h-4 mr-2")} {meal}
              </button>
            ))}
          </div>

          <div className="bg-[#15161a] rounded-2xl border border-gray-800 p-2 focus-within:border-[#ff5a1f] transition-all shadow-inner group">
            <textarea 
              className="w-full bg-transparent text-white p-4 outline-none resize-none h-28 placeholder:text-gray-600 leading-relaxed" 
              placeholder={`输入${selectedMeal}吃了什么？\n例如：2个鸡蛋，一碗燕麦片...`} 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleParseInput())}
              disabled={isAnalyzing} 
            />
            <div className="flex justify-between items-center px-2 pb-2">
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="flex items-center gap-2 text-gray-500 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-all"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin text-[#ff5a1f]" /> : <Camera className="w-5 h-5" />}
                <span className="text-sm font-medium">{isAnalyzing ? '分析中...' : '拍照识别'}</span>
                <input type="file" accept="image/*" hidden ref={fileInputRef} onChange={handleImageUpload} />
              </button>
              <button 
                onClick={() => handleParseInput()} 
                disabled={!inputText.trim() || isAnalyzing} 
                className="bg-[#ff5a1f] hover:bg-[#ff7a47] active:scale-95 text-white px-8 py-2.5 rounded-xl font-bold flex items-center disabled:opacity-50 disabled:scale-100 transition-all"
              >
                生成卡片 <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>

          {apiError && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 bg-red-950/30 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center text-sm">
              <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
              <span className="flex-1">{apiError}</span>
              <button onClick={() => setApiError('')} className="ml-2 hover:bg-white/10 p-1 rounded"><X className="w-4 h-4" /></button>
            </div>
          )}
        </section>

        {/* 食物卡片列表 */}
        <section className="space-y-4">
          {MEAL_TYPES.map(meal => {
            const mealCards = activeCards.filter(card => card.meal === meal);
            if (mealCards.length === 0) return null;
            const mealCals = mealCards.reduce((acc, card) => acc + (card.calories || 0) * (card.quantity || 1), 0);
            
            return (
              <div key={meal} className="bg-[#15161a] rounded-2xl border border-gray-800 overflow-hidden animate-in fade-in duration-500">
                <div 
                  onClick={() => setExpandedFolders(prev => ({...prev, [meal]: !prev[meal]}))} 
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-[#1c1d24] transition-colors"
                >
                  <h3 className="text-xl font-bold flex items-center">
                    <span className="text-[#ff5a1f] mr-3">{renderMealIcon(meal, "w-5 h-5")}</span>{meal}
                  </h3>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-400">{formatNum(mealCals)} kcal</span>
                    {expandedFolders[meal] ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
                  </div>
                </div>
                {expandedFolders[meal] && (
                  <div className="p-5 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-gray-800/50 bg-black/20">
                    {mealCards.map((card) => (
                      <FoodCard 
                        key={card.uniqueId} 
                        card={card} 
                        onUpdateQty={(id, d) => setActiveCards(prev => prev.map(c => c.uniqueId === id ? {...c, quantity: Math.max(1, c.quantity + d)} : c))} 
                        onRemove={(id) => setActiveCards(prev => prev.filter(c => c.uniqueId !== id))} 
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {activeCards.length === 0 && !isAnalyzing && (
          <div className="py-20 text-center flex flex-col items-center opacity-20">
            <History className="w-16 h-16 mb-4" />
            <p className="text-lg">今日暂无记录，开启你的营养追踪吧</p>
          </div>
        )}
      </main>
    </div>
  );
}

// ------------------------------------------
// 子组件
// ------------------------------------------

function StatBox({ label, value, unit, color, icon }) {
  return (
    <div className="bg-[#1c1d24] rounded-2xl p-5 border border-gray-800/50 hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-3 text-[10px] uppercase tracking-widest text-gray-500 font-bold">
        {label} {icon}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-black ${color}`}>{value}</span>
        <span className="text-gray-600 text-xs font-medium">{unit}</span>
      </div>
    </div>
  );
}

function FoodCard({ card, onUpdateQty, onRemove }) {
  const formatNum = (num) => Number(num || 0).toFixed(1).replace(/\.0$/, '');
  
  return (
    <div className="bg-[#1c1d24] border border-gray-800 hover:border-gray-600 rounded-2xl p-5 relative group transition-all animate-in zoom-in-95 duration-200">
      <button 
        onClick={() => onRemove(card.uniqueId)} 
        className="absolute top-3 right-3 text-gray-600 hover:text-red-500 p-1 rounded-md hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="mb-4 pr-6">
        <h4 className="font-bold text-white truncate">{card.name}</h4>
        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter mt-0.5">{card.unit}</p>
      </div>

      <div className="flex items-center bg-[#0a0a0c] rounded-xl w-max p-1 mb-5 border border-gray-800">
        <button onClick={() => onUpdateQty(card.uniqueId, -1)} className="p-2 hover:bg-gray-800 rounded-lg transition-colors"><Minus className="w-3 h-3" /></button>
        <span className="w-10 text-center font-black text-sm">{card.quantity}</span>
        <button onClick={() => onUpdateQty(card.uniqueId, 1)} className="p-2 hover:bg-gray-800 rounded-lg transition-colors"><Plus className="w-3 h-3" /></button>
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
