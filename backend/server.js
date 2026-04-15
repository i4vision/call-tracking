const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const FormData = require('form-data');
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

const getAudioDuration = async (filePath) => {
  try {
    const mm = await import('music-metadata');
    const metadata = await mm.parseFile(filePath);
    return metadata.format.duration || 0; // seconds
  } catch (err) {
    console.warn("Could not parse music metadata:", err.message);
    return 60; // fallback 1 minute
  }
};

const transcribeWithWhisper = async (filePath, openaiKey) => {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append('model', 'whisper-1');

  const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
    headers: {
      ...formData.getHeaders(),
      Authorization: `Bearer ${openaiKey}`
    }
  });
  return response.data;
};

const analyzeEmotionOpenAI = async (transcript, model, apiKey) => {
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: model,
    messages: [
      { role: 'system', content: 'You are an AI tasked with emotional analysis. Respond with exactly one word: GOOD, BAD, or NEUTRAL.' },
      { role: 'user', content: `Analyze the sentiment of this call transcript: "${transcript}"`}
    ],
    temperature: 0
  }, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  return {
    emotion: response.data.choices[0].message.content.trim().toLowerCase(),
    input_tokens: response.data.usage.prompt_tokens,
    output_tokens: response.data.usage.completion_tokens
  };
};

const analyzeEmotionAnthropic = async (transcript, model, apiKey) => {
  // Translate UI names to actual API models
  const apiModel = model === 'claude-3-5-sonnet' ? 'claude-3-5-sonnet-20240620' : 
                   model === 'claude-3-opus' ? 'claude-3-opus-20240229' : 'claude-3-haiku-20240307';

  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: apiModel,
    max_tokens: 10,
    system: 'You are an AI tasked with emotional analysis. Respond with exactly one word: GOOD, BAD, or NEUTRAL.',
    messages: [
      { role: 'user', content: `Analyze the sentiment of this call transcript: "${transcript}"`}
    ]
  }, {
    headers: { 
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    }
  });

  return {
    emotion: response.data.content[0].text.trim().toLowerCase(),
    input_tokens: response.data.usage.input_tokens,
    output_tokens: response.data.usage.output_tokens
  };
};

// Pricing rates
const RATES = {
  transcribe: { 'openai': 0.006 }, // $0.006 per minute
  analyzer: {
    'openai': { input: 5.00 / 1000000, output: 15.00 / 1000000 },
    'anthropic': { input: 3.00 / 1000000, output: 15.00 / 1000000 }
  }
};

// POST /api/transcribe
app.post('/api/transcribe', async (req, res) => {
  const { files, transcriberProvider, analyzerProvider, analyzerVersion } = req.body;
  if (!files || !Array.isArray(files) || files.length === 0) return res.status(400).json({ error: 'No files provided for transcription' });
  if (!transcriberProvider || !analyzerProvider || !analyzerVersion) return res.status(400).json({ error: 'Missing AI providers or versions' });

  // 1. Fetch Credentials
  const { data: creds, error: credsError } = await supabase.from('ai_credentials').select('*');
  if (credsError) return res.status(500).json({ error: 'Database credentials error' });

  const transcriberKey = creds.find(c => c.provider === transcriberProvider)?.api_key;
  const analyzerKey = creds.find(c => c.provider === analyzerProvider)?.api_key;

  if (!transcriberKey) return res.status(403).json({ error: `Missing API Key for Transcriber: ${transcriberProvider}` });
  if (!analyzerKey && analyzerProvider !== 'mock') return res.status(403).json({ error: `Missing API Key for Analyzer: ${analyzerProvider}` });

  const results = [];

  for (const file of files) {
    try {
      const filePath = path.join(ARCHIVE_PATH, file);

      // 2. Measure Duration (for cost)
      const durationSecs = await getAudioDuration(filePath);
      const minutes = durationSecs / 60;
      let totalCost = (RATES.transcribe[transcriberProvider] || 0) * minutes;

      // 3. Transcription Network Call
      const transRes = await transcribeWithWhisper(filePath, transcriberKey);
      const transcriptText = transRes.text;

      // 4. Analysis Network Call
      let emotion = 'neutral';
      let inputToks = transcriptText.length / 4;
      let outputToks = 1;

      if (analyzerProvider === 'openai') {
        const rez = await analyzeEmotionOpenAI(transcriptText, analyzerVersion, analyzerKey);
        emotion = rez.emotion;
        inputToks = rez.input_tokens;
        outputToks = rez.output_tokens;
        totalCost += (inputToks * RATES.analyzer.openai.input) + (outputToks * RATES.analyzer.openai.output);
      } else if (analyzerProvider === 'anthropic') {
        const rez = await analyzeEmotionAnthropic(transcriptText, analyzerVersion, analyzerKey);
        emotion = rez.emotion;
        inputToks = rez.input_tokens;
        outputToks = rez.output_tokens;
        totalCost += (inputToks * RATES.analyzer.anthropic.input) + (outputToks * RATES.analyzer.anthropic.output);
      } else {
        // Fallback dummy
        if (transcriptText.toLowerCase().includes('satisfied')) emotion = 'good';
        else if (transcriptText.toLowerCase().includes('angry')) emotion = 'bad';
      }

      // Cleanup weird characters from LLM
      if (!['good', 'bad', 'neutral'].includes(emotion)) emotion = 'neutral';

      // 5. Store to database securely
      const { data, error } = await supabase
        .from('calls')
        .insert([{
          filename: file,
          transcript: transcriptText,
          ai_version: `${transcriberProvider} whisper | ${analyzerProvider} ${analyzerVersion}`,
          emotion: emotion,
          cost: totalCost
        }])
        .select();

      if (error) throw error;
      results.push({ file, success: true, data: data[0] });
    } catch (err) {
      console.error(`Error processing ${file}:`, err.response?.data || err.message);
      results.push({ file, success: false, error: err.response?.data?.error?.message || err.message });
    }
  }

  res.json({ results });
});

// GET /api/dashboard summary
app.get('/api/dashboard', async (req, res) => {
  try {
    const { count: goodCount } = await supabase.from('calls').select('*', { count: 'exact', head: true }).eq('emotion', 'good');
    const { count: badCount } = await supabase.from('calls').select('*', { count: 'exact', head: true }).eq('emotion', 'bad');
    const { count: neutralCount } = await supabase.from('calls').select('*', { count: 'exact', head: true }).eq('emotion', 'neutral');

    const { data: recentCalls } = await supabase.from('calls').select('*').order('created_at', { ascending: false }).limit(10);

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
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Watching archive path: ${ARCHIVE_PATH}`);
});
