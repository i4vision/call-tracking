const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;
const ARCHIVE_PATH = process.env.ARCHIVE_PATH || 'C:\\OpenPhoneArchive';

app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseKey);

// GET /api/files endpoint
app.get('/api/files', (req, res) => {
  try {
    if (!fs.existsSync(ARCHIVE_PATH)) {
      return res.status(404).json({ error: `Archive folder not found at ${ARCHIVE_PATH}`, files: [] });
    }
    const files = fs.readdirSync(ARCHIVE_PATH)
      .filter(f => f.toLowerCase().endsWith('.mp3'))
      .map((f, i) => ({
        id: `file-${i}`,
        filename: f,
        path: path.join(ARCHIVE_PATH, f)
      }));
    
    res.json({ files });
  } catch (error) {
    console.error('Error reading files:', error);
    res.status(500).json({ error: 'Failed to read archive folder', files: [] });
  }
});
// GET /api/credentials
app.get('/api/credentials', async (req, res) => {
  try {
    const { data, error } = await supabase.from('ai_credentials').select('provider, updated_at');
    if (error) throw error;
    // Don't send exact keys to frontend, just state they exist
    res.json({ credentials: data || [] });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

// POST /api/credentials
app.post('/api/credentials', async (req, res) => {
  const { provider, api_key } = req.body;
  if (!provider || !api_key) return res.status(400).json({ error: 'Missing provider or api_key' });
  
  try {
    const { data, error } = await supabase
      .from('ai_credentials')
      .upsert([{ provider, api_key, updated_at: new Date().toISOString() }], { onConflict: 'provider' });
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving credentials:', error);
    res.status(500).json({ error: 'Failed to save credentials' });
  }
});


// Mock transcription service
const generateMockTranscript = (filename, model) => {
  return `This is a mock transcript for ${filename} using ${model}. The conversation went well and the customer was satisfied. We solved their issue efficiently.`;
};

const determineEmotion = (transcript) => {
  // Simple heuristic for mock
  if (transcript.toLowerCase().includes('satisfied') || transcript.toLowerCase().includes('well')) {
    return 'good';
  } else if (transcript.toLowerCase().includes('angry') || transcript.toLowerCase().includes('poor')) {
    return 'bad';
  }
  return 'neutral';
};

// POST /api/transcribe
app.post('/api/transcribe', async (req, res) => {
  const { files, provider, version } = req.body;
  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'No files provided for transcription' });
  }
  
  if (!provider || !version) {
    return res.status(400).json({ error: 'No AI provider or version specified' });
  }

  // 1. Check if we have credentials for this provider
  const { data: credData, error: credError } = await supabase
    .from('ai_credentials')
    .select('api_key')
    .eq('provider', provider)
    .single();

  if (credError || !credData) {
    return res.status(403).json({ error: `Missing API Key for provider: ${provider}. Please configure it in settings.` });
  }

  const results = [];

  for (const file of files) {
    try {
      // 2. In a real app, we'd use credData.api_key here
      // const fileBuffer = fs.readFileSync(path.join(ARCHIVE_PATH, file));
      // const transcriptText = await callRealAI(fileBuffer, provider, version, credData.api_key);
      
      const transcriptText = generateMockTranscript(file, `${provider} ${version}`);
      const emotion = determineEmotion(transcriptText);

      // 2. Save result to Supabase
      const { data, error } = await supabase
        .from('calls')
        .insert([{
          filename: file,
          transcript: transcriptText,
          ai_version: version,
          emotion: emotion
        }])
        .select();

      if (error) {
        console.error('Supabase error inserting call:', error);
        results.push({ file, success: false, error: error.message });
      } else {
        results.push({ file, success: true, data: data[0] });
      }
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
      results.push({ file, success: false, error: err.message });
    }
  }

  res.json({ results });
});

// GET /api/dashboard summary
app.get('/api/dashboard', async (req, res) => {
  try {
    // Get count of good calls
    const { count: goodCount, error: goodError } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('emotion', 'good');
      
    // Get count of bad calls
    const { count: badCount, error: badError } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('emotion', 'bad');

    // Get count of neutral calls
    const { count: neutralCount, error: neutralError } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('emotion', 'neutral');

    if (goodError || badError || neutralError) {
      throw new Error('Supabase read error');
    }

    const { data: recentCalls, error: recentError } = await supabase
      .from('calls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      stats: {
        good: goodCount || 0,
        bad: badCount || 0,
        neutral: neutralCount || 0,
        total: (goodCount || 0) + (badCount || 0) + (neutralCount || 0)
      },
      recentCalls: recentCalls || []
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Serve frontend in production (via Docker build)
const staticPath = path.join(__dirname, 'public');
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
  // SPA routing: Let React router handle anything else
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Watching archive path: ${ARCHIVE_PATH}`);
});
