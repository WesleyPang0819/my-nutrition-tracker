import { useState, useEffect } from "react";

const MEALS = [
  { id: "breakfast", label: "早餐", icon: "☀️", color: "#ff6b2b" },
  { id: "lunch", label: "午餐", icon: "🍽️", color: "#4a9eff" },
  { id: "dinner", label: "晚餐", icon: "🌙", color: "#a78bfa" },
  { id: "snack", label: "宵夜", icon: "🫖", color: "#34d399" },
];

const NUTRIENTS = [
  { key: "calories", label: "热量", unit: "大卡", color: "#ff6b2b", icon: "🔥" },
  { key: "protein", label: "蛋白质", unit: "g", color: "#4a9eff", icon: "💪" },
  { key: "carbs", label: "碳水", unit: "g", color: "#4eff7e", icon: "🌾" },
  { key: "fat", label: "脂肪", unit: "g", color: "#ffe04a", icon: "💧" },
];

const STORAGE_KEY = "nutrition_tracker_data";

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { breakfast: [], lunch: [], dinner: [], snack: [] };
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export default function App() {
  const [activeMeal, setActiveMeal] = useState("breakfast");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meals, setMeals] = useState(loadData);
  const [newCardId, setNewCardId] = useState(null);

  useEffect(() => saveData(meals), [meals]);

  const totals = Object.values(meals).flat().reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories || 0),
      protein: acc.protein + (item.protein || 0),
      carbs: acc.carbs + (item.carbs || 0),
      fat: acc.fat + (item.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const analyze = async () => {
    if (!inputText.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodText: inputText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "分析失败");
      const id = Date.now();
      setMeals((prev) => ({ ...prev, [activeMeal]: [...prev[activeMeal], { ...data, id }] }));
      setNewCardId(id);
      setTimeout(() => setNewCardId(null), 600);
      setInputText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    if (window.confirm("确定清空今日所有记录？")) {
      setMeals({ breakfast: [], lunch: [], dinner: [], snack: [] });
    }
  };

  const removeItem = (mealId, itemId) =>
    setMeals((prev) => ({ ...prev, [mealId]: prev[mealId].filter((i) => i.id !== itemId) }));

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) analyze();
  };

  const activeMealData = MEALS.find((m) => m.id === activeMeal);

  return (
    <div style={styles.container}>
      {/* Background grid */}
      <div style={styles.bgGrid} />

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            追踪你的{" "}
            <span style={{ color: "#ff6b2b", fontStyle: "italic" }}>营养素</span>
          </h1>
          <p style={styles.subtitle}>AI 智能解析 · 轻松管理每日摄入</p>
        </div>
        <button onClick={clearAll} style={styles.clearBtn} title="清空所有记录">🗑️</button>
      </div>

      {/* Totals Dashboard */}
      <div style={styles.dashboard}>
        <div style={styles.dashboardLabel}>📊 今日营养总计</div>
        <div style={styles.nutrientGrid}>
          {NUTRIENTS.map((n) => {
            const val = Math.round(totals[n.key]);
            return (
              <div key={n.key} style={styles.nutrientCard}>
                <div style={styles.nutrientIcon}>{n.icon}</div>
                <div style={styles.nutrientLabel}>{n.label}</div>
                <div style={{ ...styles.nutrientValue, color: n.color }}>
                  {val}
                  <span style={styles.nutrientUnit}>{n.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Meal Tabs */}
      <div style={styles.tabs}>
        {MEALS.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveMeal(m.id)}
            style={{
              ...styles.tab,
              background: activeMeal === m.id ? m.color : "#1a1a1a",
              color: activeMeal === m.id ? "#fff" : "#666",
              boxShadow: activeMeal === m.id ? `0 0 20px ${m.color}55` : "none",
            }}
          >
            {m.icon} {m.label}
            {meals[m.id].length > 0 && (
              <span style={{ ...styles.badge, background: activeMeal === m.id ? "rgba(255,255,255,0.3)" : m.color }}>
                {meals[m.id].length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div style={styles.inputCard}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`描述你的${activeMealData?.label}，例如：一碗白米饭200克、两个鸡蛋、一杯全脂牛奶250ml...`}
          style={styles.textarea}
          rows={3}
        />
        <div style={styles.inputFooter}>
          <span style={styles.hint}>⌘ + Enter 快速提交</span>
          <button
            onClick={analyze}
            disabled={loading || !inputText.trim()}
            style={{
              ...styles.analyzeBtn,
              background: loading || !inputText.trim() ? "#333" : activeMealData?.color || "#ff6b2b",
              boxShadow: !loading && inputText.trim() ? `0 0 20px ${activeMealData?.color || "#ff6b2b"}66` : "none",
              cursor: loading || !inputText.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <span style={styles.spinner}>⏳ AI 分析中...</span>
            ) : (
              "✨ 生成营养卡片 →"
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.errorBox}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} style={styles.errorClose}>✕</button>
        </div>
      )}

      {/* Food Cards */}
      <div>
        {meals[activeMeal].length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>{activeMealData?.icon}</div>
            <div style={{ color: "#444" }}>还没有记录，输入食物开始追踪</div>
          </div>
        ) : (
          meals[activeMeal].map((item) => (
            <div
              key={item.id}
              style={{
                ...styles.foodCard,
                animation: newCardId === item.id ? "slideIn 0.4s ease" : "none",
                borderColor: newCardId === item.id ? activeMealData?.color || "#ff6b2b" : "#2a2a2a",
              }}
            >
              <div style={styles.foodCardHeader}>
                <div>
                  <div style={styles.foodName}>{item.name}</div>
                  {item.description && <div style={styles.foodDesc}>{item.description}</div>}
                </div>
                <button onClick={() => removeItem(activeMeal, item.id)} style={styles.removeBtn}>✕</button>
              </div>
              <div style={styles.foodNutrients}>
                {NUTRIENTS.map((n) => (
                  <div key={n.key} style={styles.foodNutrientItem}>
                    <div style={styles.foodNutrientLabel}>{n.label}</div>
                    <div style={{ ...styles.foodNutrientValue, color: n.color }}>
                      {item[n.key] ?? "—"}
                      <span style={{ fontSize: "10px", opacity: 0.7 }}>{n.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; }
        body { margin: 0; background: #0a0a0a; }
        textarea::placeholder { color: #444; }
        textarea:focus { outline: none; }
        button:hover { opacity: 0.9; }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#fff",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "28px 20px",
    maxWidth: "720px",
    margin: "0 auto",
    position: "relative",
  },
  bgGrid: {
    position: "fixed",
    inset: 0,
    backgroundImage: "linear-gradient(#ffffff08 1px, transparent 1px), linear-gradient(90deg, #ffffff08 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    pointerEvents: "none",
    zIndex: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "28px",
    position: "relative",
    zIndex: 1,
  },
  title: { fontSize: "32px", fontWeight: "800", margin: 0, letterSpacing: "-1px" },
  subtitle: { color: "#555", margin: "6px 0 0", fontSize: "14px" },
  clearBtn: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    color: "#fff",
    fontSize: "18px",
    transition: "all 0.2s",
  },
  dashboard: {
    background: "linear-gradient(135deg, #1a1a1a, #141414)",
    borderRadius: "16px",
    padding: "22px",
    marginBottom: "24px",
    border: "1px solid #2a2a2a",
    position: "relative",
    zIndex: 1,
  },
  dashboardLabel: { fontSize: "13px", color: "#666", marginBottom: "18px", fontWeight: "600", letterSpacing: "0.5px" },
  nutrientGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" },
  nutrientCard: {
    background: "#0f0f0f",
    borderRadius: "12px",
    padding: "16px 12px",
    textAlign: "center",
    border: "1px solid #222",
  },
  nutrientIcon: { fontSize: "20px", marginBottom: "6px" },
  nutrientLabel: { fontSize: "11px", color: "#555", marginBottom: "6px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" },
  nutrientValue: { fontSize: "22px", fontWeight: "800" },
  nutrientUnit: { fontSize: "11px", opacity: 0.7, marginLeft: "2px" },
  tabs: { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", position: "relative", zIndex: 1 },
  tab: {
    padding: "9px 18px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  badge: {
    borderRadius: "999px",
    padding: "1px 7px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#fff",
  },
  inputCard: {
    background: "#1a1a1a",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "16px",
    border: "1px solid #2a2a2a",
    position: "relative",
    zIndex: 1,
  },
  textarea: {
    width: "100%",
    background: "transparent",
    border: "none",
    color: "#ddd",
    fontSize: "15px",
    resize: "none",
    fontFamily: "inherit",
    lineHeight: "1.6",
  },
  inputFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" },
  hint: { fontSize: "12px", color: "#444" },
  analyzeBtn: {
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 22px",
    fontWeight: "700",
    fontSize: "15px",
    transition: "all 0.2s",
  },
  spinner: { display: "inline-block" },
  errorBox: {
    background: "#1f0f0f",
    border: "1px solid #ff444455",
    borderRadius: "10px",
    padding: "12px 16px",
    marginBottom: "16px",
    color: "#ff8888",
    fontSize: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
    zIndex: 1,
  },
  errorClose: { background: "transparent", border: "none", color: "#ff8888", cursor: "pointer", fontSize: "16px" },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    position: "relative",
    zIndex: 1,
  },
  foodCard: {
    background: "#161616",
    borderRadius: "14px",
    padding: "18px",
    marginBottom: "12px",
    border: "1px solid #2a2a2a",
    transition: "border-color 0.3s",
    position: "relative",
    zIndex: 1,
  },
  foodCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" },
  foodName: { fontWeight: "700", fontSize: "16px", marginBottom: "4px" },
  foodDesc: { color: "#555", fontSize: "13px", lineHeight: "1.4" },
  removeBtn: { background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "16px", padding: "0 0 0 12px", flexShrink: 0 },
  foodNutrients: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" },
  foodNutrientItem: { background: "#0f0f0f", borderRadius: "8px", padding: "10px", textAlign: "center" },
  foodNutrientLabel: { fontSize: "10px", color: "#555", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600" },
  foodNutrientValue: { fontSize: "16px", fontWeight: "700" },
};
