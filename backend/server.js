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

const transcribeWithWhisper = async (filePath, key, provider) => {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));

  let url;
  if (provider === 'groq') {
    formData.append('model', 'whisper-large-v3'); // Groq's whisper
    url = 'https://api.groq.com/openai/v1/audio/transcriptions';
  } else {
    formData.append('model', 'whisper-1'); // OpenAI's whisper
    url = 'https://api.openai.com/v1/audio/transcriptions';
  }

  const response = await axios.post(url, formData, {
    headers: {
      ...formData.getHeaders(),
      Authorization: `Bearer ${key}`
    }
  });
  return response.data;
};

const EMOTION_SYSTEM_PROMPT = 'You are an AI tasked with emotional analysis. Respond with EXACTLY ONE WORD from this list based on the transcript: DELIGHTED, SATISFIED, NEUTRAL, CONFUSED, FRUSTRATED, ANGRY, URGENT. Do not include any punctuation or extra words.';

const analyzeEmotionOpenAIFormat = async (transcript, model, apiKey, systemPrompt, baseUrl="https://api.openai.com/v1/chat/completions") => {
  const response = await axios.post(baseUrl, {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze the sentiment of this call transcript: "${transcript}"`}
    ],
    temperature: 0
  }, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  return {
    emotion: response.data.choices[0].message.content.trim().toLowerCase(),
    input_tokens: response.data.usage?.prompt_tokens || (transcript.length/4),
    output_tokens: response.data.usage?.completion_tokens || 1
  };
};

const analyzeEmotionAnthropic = async (transcript, model, apiKey, systemPrompt) => {
  const apiModel = model === 'claude-3-5-sonnet' ? 'claude-3-5-sonnet-20240620' : 
                   model === 'claude-3-opus' ? 'claude-3-opus-20240229' : 'claude-3-haiku-20240307';

  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: apiModel,
    max_tokens: 10,
    system: systemPrompt,
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

const analyzeEmotionGoogle = async (transcript, model, apiKey, systemPrompt) => {
  const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [
      { role: 'user', parts: [{ text: `Analyze the sentiment of this call transcript: "${transcript}"` }] }
    ],
    generationConfig: { temperature: 0 }
  }, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  return {
    emotion: response.data.candidates[0].content.parts[0].text.trim().toLowerCase(),
    input_tokens: response.data.usageMetadata?.promptTokenCount || (transcript.length/4),
    output_tokens: response.data.usageMetadata?.candidatesTokenCount || 1
  };
};

// Standard fallback flat rates for missing pricing
const DEFAULT_RATES = { input: 0.50 / 1000000, output: 0.50 / 1000000 };

const RATES = {
  transcribe: { 'openai': 0.006, 'groq': 0.0005 },
  analyzer: {
    'openai': { input: 5.00 / 1000000, output: 15.00 / 1000000 },
    'anthropic': { input: 3.00 / 1000000, output: 15.00 / 1000000 },
    'google': { input: 3.50 / 1000000, output: 10.50 / 1000000 },
    'mistral': { input: 2.00 / 1000000, output: 6.00 / 1000000 },
    'groq': { input: 0.59 / 1000000, output: 0.79 / 1000000 }
  }
};

const VALID_EMOTIONS = ['delighted', 'satisfied', 'neutral', 'confused', 'frustrated', 'angry', 'urgent'];

// POST /api/transcribe
app.post('/api/transcribe', async (req, res) => {
  const { files, transcriberProvider, analyzerProvider, analyzerVersion, customPrompt } = req.body;
  if (!files || !Array.isArray(files) || files.length === 0) return res.status(400).json({ error: 'No files provided for transcription' });
  if (!transcriberProvider || !analyzerProvider || !analyzerVersion) return res.status(400).json({ error: 'Missing AI providers or versions' });

  const activePrompt = customPrompt && customPrompt.trim().length > 0 ? customPrompt : EMOTION_SYSTEM_PROMPT;

  // 1. Fetch Credentials
  const { data: creds, error: credsError } = await supabase.from('ai_credentials').select('*');
  if (credsError) return res.status(500).json({ error: 'Database credentials error' });

  const transcriberKey = creds.find(c => c.provider === transcriberProvider)?.api_key;
  const analyzerKey = creds.find(c => c.provider === analyzerProvider)?.api_key;

  if (!transcriberKey) return res.status(403).json({ error: `Missing API Key for Transcriber: ${transcriberProvider}` });
  if (!analyzerKey) return res.status(403).json({ error: `Missing API Key for Analyzer: ${analyzerProvider}` });

  const results = [];

  for (const file of files) {
    try {
      const startTime = Date.now();
      const filePath = path.join(ARCHIVE_PATH, file);

      // 2. Measure Duration (for cost)
      const durationSecs = await getAudioDuration(filePath);
      const minutes = durationSecs / 60;
      let totalCost = (RATES.transcribe[transcriberProvider] || 0) * minutes;

      // 3. Transcription Network Call
      const transRes = await transcribeWithWhisper(filePath, transcriberKey, transcriberProvider);
      const transcriptText = transRes.text;

      // 4. Analysis Network Call
      let emotion = 'neutral';
      let inputToks = 0, outputToks = 0;
      const rateSchema = RATES.analyzer[analyzerProvider] || DEFAULT_RATES;

      if (analyzerProvider === 'openai') {
        const rez = await analyzeEmotionOpenAIFormat(transcriptText, analyzerVersion, analyzerKey, activePrompt);
        emotion = rez.emotion; inputToks = rez.input_tokens; outputToks = rez.output_tokens;
      } else if (analyzerProvider === 'anthropic') {
        const rez = await analyzeEmotionAnthropic(transcriptText, analyzerVersion, analyzerKey, activePrompt);
        emotion = rez.emotion; inputToks = rez.input_tokens; outputToks = rez.output_tokens;
      } else if (analyzerProvider === 'google') {
        const rez = await analyzeEmotionGoogle(transcriptText, analyzerVersion, analyzerKey, activePrompt);
        emotion = rez.emotion; inputToks = rez.input_tokens; outputToks = rez.output_tokens;
      } else if (analyzerProvider === 'mistral') {
        const rez = await analyzeEmotionOpenAIFormat(transcriptText, analyzerVersion, analyzerKey, activePrompt, 'https://api.mistral.ai/v1/chat/completions');
        emotion = rez.emotion; inputToks = rez.input_tokens; outputToks = rez.output_tokens;
      } else if (analyzerProvider === 'groq') {
        const rez = await analyzeEmotionOpenAIFormat(transcriptText, analyzerVersion, analyzerKey, activePrompt, 'https://api.groq.com/openai/v1/chat/completions');
        emotion = rez.emotion; inputToks = rez.input_tokens; outputToks = rez.output_tokens;
      }

      totalCost += (inputToks * rateSchema.input) + (outputToks * rateSchema.output);

      // Clean LLM parsing mistakes
      const strippedEmotion = emotion.replace(/[^a-z]/g, '');
      emotion = VALID_EMOTIONS.includes(strippedEmotion) ? strippedEmotion : 'neutral';

      const endTime = Date.now();
      const timeTakenSecs = (endTime - startTime) / 1000;

      // 6. Store to database securely
      const { data, error } = await supabase
        .from('calls')
        .insert([{
          filename: file,
          transcript: transcriptText,
          ai_version: `${transcriberProvider} whisper | ${analyzerProvider} ${analyzerVersion}`,
          emotion: emotion,
          cost: totalCost,
          processing_time: timeTakenSecs,
          system_prompt: activePrompt
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
    const { data: calls, error: fetchErr } = await supabase.from('calls').select('*').order('created_at', { ascending: false });
    if (fetchErr) throw fetchErr;

    const stats = {
      delighted: 0, satisfied: 0, neutral: 0, confused: 0,
      frustrated: 0, angry: 0, urgent: 0
    };
    calls.forEach(call => {
      const em = call.emotion || 'neutral';
      stats[em] = (stats[em] || 0) + 1;
    });

    res.json({
      stats: stats,
      recentCalls: calls.slice(0, 100) || []
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

// GET /api/calls/:filename - Fetch strict history array for a single recording
app.get('/api/calls/:filename', async (req, res) => {
  try {
    const { data: calls, error } = await supabase.from('calls').select('*').eq('filename', req.params.filename).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(calls || []);
  } catch (error) {
    console.error('Error fetching file history:', error);
    res.status(500).json({ error: 'Failed to access database' });
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
