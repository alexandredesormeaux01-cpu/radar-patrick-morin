import { kv } from '@vercel/kv';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
      // Fetch articles from Vercel KV
      const articles = await kv.get('pm_radar_articles');
      return res.status(200).json(articles || []);
    } catch (error: any) {
      console.error("KV GET Error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const generatedArticles = req.body;
      if (Array.isArray(generatedArticles) && generatedArticles.length > 0) {
        // Save to Vercel KV
        await kv.set('pm_radar_articles', generatedArticles);
        return res.status(200).json({ success: true, count: generatedArticles.length });
      } else {
        return res.status(400).json({ error: "Invalid articles data" });
      }
    } catch (error: any) {
      console.error("KV POST Error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
