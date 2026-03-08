import { kv } from '@vercel/kv';
import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req: any, res: any) {
  // Verify cron secret if needed (Vercel provides CRON_SECRET)
  const authHeader = req.headers.authorization;
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Clé API Gemini manquante.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `Tu es un expert en stratégie retail (Category Manager Quincaillerie).
    Génère 10 articles d'actualité TRÈS RÉCENTS (de cette semaine) qui impactent le secteur de la quincaillerie et du bricolage.
    Fais des recherches sur le web pour trouver de VRAIES actualités de ces derniers jours.
    Catégories à couvrir : Macro-Économie, Matériaux de construction, Électricité, Plomberie, Couvre-plancher, Luminaire / Éclairage, Outillage, Peinture, Saisonnier / Jardin.
    Pour chaque article, fournis :
    - title: Titre accrocheur
    - iconName: Nom exact d'une icône Lucide React (ex: 'AlertTriangle', 'Zap', 'Droplets', 'Trees', 'Wrench', 'PaintRoller', 'Leaf', 'Home', 'TrendingUp', 'Layers', 'Lightbulb', 'ShieldAlert', 'Thermometer')
    - category: Nom de la catégorie avec un emoji (ex: '⚠️ Macro-Économie', '🪵 Matériaux')
    - theme: Thème de couleur (choisis parmi: 'red', 'blue', 'green', 'yellow', 'purple', 'stone')
    - summary: Résumé détaillé et approfondi de la nouvelle (au moins 2 à 3 paragraphes bien étoffés, environ 150 à 200 mots). Donne du contexte, des chiffres et explique les causes si possible.
    - impact: L'impact direct pour un Category Manager (Action à prendre).
    - sources: Tableau de 1 à 2 sources réelles avec URL directes vers les articles trouvés.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              iconName: { type: Type.STRING },
              category: { type: Type.STRING },
              theme: { type: Type.STRING },
              summary: { type: Type.STRING },
              impact: { type: Type.STRING },
              sources: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    url: { type: Type.STRING }
                  }
                }
              }
            },
            required: ["title", "iconName", "category", "theme", "summary", "impact", "sources"]
          }
        }
      }
    });

    const generatedText = response.text || '[]';
    const generatedArticles = JSON.parse(generatedText);

    // Add IDs to generated articles
    const articlesWithIds = generatedArticles.map((art: any, index: number) => ({
      ...art,
      id: index + 1
    }));

    // Save to Vercel KV
    await kv.set('pm_radar_articles', articlesWithIds);

    return res.status(200).json({ success: true, count: articlesWithIds.length, articles: articlesWithIds });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
