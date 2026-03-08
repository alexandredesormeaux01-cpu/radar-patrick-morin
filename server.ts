import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const db = new Database('articles.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    iconName TEXT,
    category TEXT,
    color TEXT,
    bgColor TEXT,
    summary TEXT,
    impact TEXT,
    sources TEXT
  )
`);

const app = express();
app.use(express.json());

app.get('/api/articles', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM articles ORDER BY id ASC').all();
    const articles = rows.map((row: any) => ({
      ...row,
      theme: row.color || 'stone', // map color column back to theme for frontend
      sources: JSON.parse(row.sources)
    }));
    res.json(articles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/articles', (req, res) => {
  try {
    const generatedArticles = req.body;
    
    if (Array.isArray(generatedArticles) && generatedArticles.length > 0) {
      db.exec('DELETE FROM articles'); // Clear old articles
      const insert = db.prepare('INSERT INTO articles (title, iconName, category, color, bgColor, summary, impact, sources) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      const insertMany = db.transaction((arts) => {
        for (const art of arts) {
          insert.run(art.title, art.iconName, art.category, art.color, art.bgColor, art.summary, art.impact, JSON.stringify(art.sources));
        }
      });
      insertMany(generatedArticles);
      res.json({ success: true, count: generatedArticles.length });
    } else {
      res.status(400).json({ error: "Invalid articles data" });
    }
  } catch (error: any) {
    console.error("Save error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ... (keep existing imports)

app.get('/api/cron', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

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
    const articlesWithIds = generatedArticles.map((art: any, index: number) => ({
      ...art,
      id: index + 1
    }));

    if (Array.isArray(articlesWithIds) && articlesWithIds.length > 0) {
      db.exec('DELETE FROM articles'); 
      const insert = db.prepare('INSERT INTO articles (title, iconName, category, color, bgColor, summary, impact, sources) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      const insertMany = db.transaction((arts) => {
        for (const art of arts) {
          // Fallback theme to color/bgColor for sqlite schema compatibility
          insert.run(art.title, art.iconName, art.category, art.theme || '', '', art.summary, art.impact, JSON.stringify(art.sources));
        }
      });
      insertMany(articlesWithIds);
      res.json({ success: true, count: articlesWithIds.length, articles: articlesWithIds });
    } else {
      res.status(400).json({ error: "Invalid articles data" });
    }
  } catch (error: any) {
    console.error("Cron error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on port 3000');
  });
}

startServer();
