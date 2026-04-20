export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { foodText } = req.body;
  if (!foodText) return res.status(400).json({ error: '请提供食物描述' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '服务器未配置 API Key，请在 Vercel 环境变量中添加 GEMINI_API_KEY' });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `你是专业营养分析师。分析以下食物营养成分，只返回JSON，不要任何其他文字或代码块标记。
食物：${foodText}
返回格式：{"name":"食物名称","calories":数字,"protein":数字,"carbs":数字,"fat":数字,"fiber":数字,"description":"一句话描述"}
说明：calories单位大卡，其余单位克，数字取整数。`
            }]
          }],
          generationConfig: { temperature: 0.1 }
        })
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `Gemini API 错误 ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('API 返回内容为空');

    const clean = text.replace(/```json|```/g, '').trim();
    const nutrition = JSON.parse(clean);
    res.status(200).json(nutrition);
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({ error: error.message });
  }
}
