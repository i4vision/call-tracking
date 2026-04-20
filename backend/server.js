const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;
const ARCHIVE_PATH = process.env.ARCHIVE_PATH || 'C:\\OpenPhoneArchive';

app.use(cors());
app.use(express.json());

// Disk Storage mapping securely to Docker Volumes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(ARCHIVE_PATH)) {
      fs.mkdirSync(ARCHIVE_PATH, { recursive: true });
    }
    cb(null, ARCHIVE_PATH);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseKey);

// GET /api/files endpoint
app.get('/api/files', async (req, res) => {
  try {
    if (!fs.existsSync(ARCHIVE_PATH)) {
      return res.status(404).json({ error: `Archive folder not found at ${ARCHIVE_PATH}`, files: [] });
    }
    
    // Fetch distinct filenames from DB to mark them as seamlessly translated
    const { data: dbCalls } = await supabase.from('calls').select('filename');
    const translatedSet = new Set(dbCalls ? dbCalls.map(c => c.filename) : []);

    // Fetch arbitrary string attachments linked exclusively to physical binaries
    const { data: dbMeta } = await supabase.from('file_metadata').select('filename, notes');
    const notesMap = new Map();
    if (dbMeta) {
      dbMeta.forEach(m => notesMap.set(m.filename, m.notes));
    }

    const files = fs.readdirSync(ARCHIVE_PATH)
      .filter(f => f.toLowerCase().endsWith('.mp3'))
      .map((f, i) => ({
        id: `file-${i}`,
        filename: f,
        translated: translatedSet.has(f),
        notes: notesMap.get(f) || null,
        path: path.join(ARCHIVE_PATH, f)
      }));
    
    res.json({ files });
  } catch (error) {
    console.error('Error reading files:', error);
    res.status(500).json({ error: 'Failed to read archive folder', files: [] });
  }
});

// PUT /api/files/metadata - Rename strings natively mapped through Samba and cascade to Supabase tables
app.put('/api/files/metadata', async (req, res) => {
  try {
    const { oldFilename, newFilename, notes } = req.body;
    if (!oldFilename || !newFilename) return res.status(400).json({ error: 'Missing core mapping nomenclature keys' });

    // Step 1: Physically rename mapped entity natively inside Docker if it legally changed
    if (oldFilename !== newFilename) {
      const oldPath = path.join(ARCHIVE_PATH, oldFilename);
      const newPath = path.join(ARCHIVE_PATH, newFilename);

      if (!fs.existsSync(oldPath)) return res.status(404).json({ error: 'Source physical object natively absent' });
      if (fs.existsSync(newPath)) return res.status(400).json({ error: 'Target nomenclature inherently clashes with existing physical mapping' });

      fs.renameSync(oldPath, newPath);

      // Step 2: Cascade update seamlessly into transcription records matrix backwards inherently
      await supabase.from('calls').update({ filename: newFilename }).eq('filename', oldFilename);
      
      // Step 3: Delete exact historical tracker since PK structure changes
      await supabase.from('file_metadata').delete().eq('filename', oldFilename);
    }

    // Step 4: Structurally bind Notes array mappings via direct upsert natively
    await supabase.from('file_metadata').upsert({
      filename: newFilename,
      notes: notes || ''
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Metadata Editor Structural Exception:', err);
    res.status(500).json({ error: 'Cascading editor failed execution loop', details: err.message });
  }
});

// GET /api/audio/:filename - Stream audio directly manually
app.get('/api/audio/:filename', (req, res) => {
  const filePath = path.join(ARCHIVE_PATH, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Audio file not physically found' });
  }
});

// POST /api/upload - Handle manual system uploads
app.post('/api/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No physical file payload extracted' });
  }
  res.json({ message: 'File streamed successfully', filename: req.file.originalname });
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

const transcribeWithGoogle = async (filePath, key) => {
  try {
    const audioData = fs.readFileSync(filePath).toString("base64");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    const payload = {
      contents: [{
        parts: [
          { inline_data: { mime_type: "audio/mp3", data: audioData } },
          { text: "Generate a highly accurate, word-for-word transcript of this audio strictly. Do not summarize. Just output the clean transcript. Nothing else." }
        ]
      }]
    };
    const response = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
    const text = response.data.candidates[0].content.parts[0].text;
    return { text };
  } catch (error) {
    console.error("Google Gemini Transcription Error:", error.response ? error.response.data : error.message);
    throw new Error('Google Transcription failed at API layer');
  }
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
  transcribe: {
    'openai': 0.006, // per minute
    'groq': 0.001,
    'google': 0.001 // gemini audio estimate roughly per minute
  },
  analyzer: {
    'openai': { input: 5.00 / 1000000, output: 15.00 / 1000000 }, // gpt-4o proxy
    'anthropic': { input: 3.00 / 1000000, output: 15.00 / 1000000 },
    'google': { input: 3.50 / 1000000, output: 10.50 / 1000000 },
    'mistral': { input: 2.00 / 1000000, output: 6.00 / 1000000 },
    'groq': { input: 0.59 / 1000000, output: 0.79 / 1000000 },
    'xai': { input: 5.00 / 1000000, output: 15.00 / 1000000 }
  }
};

const VALID_EMOTIONS = ['delighted', 'satisfied', 'neutral', 'confused', 'frustrated', 'angry', 'urgent'];

// GET /api/system-prompt
app.get('/api/system-prompt', async (req, res) => {
  try {
    const { data } = await supabase.from('ai_credentials').select('api_key').eq('provider', 'system_prompt');
    if (data && data.length > 0) {
      res.json({ prompt: data[0].api_key });
    } else {
      res.json({ prompt: EMOTION_SYSTEM_PROMPT });
    }
  } catch (error) {
    res.json({ prompt: EMOTION_SYSTEM_PROMPT });
  }
});

// POST /api/system-prompt
app.post('/api/system-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    await supabase.from('ai_credentials').upsert([{ provider: 'system_prompt', api_key: prompt, updated_at: new Date().toISOString() }], { onConflict: 'provider' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

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
      const audioDuration = await getAudioDuration(filePath);
      let minutes = audioDuration / 60;
      let costTranscribe = (RATES.transcribe[transcriberProvider] || 0) * minutes;

      // 3. Transcription Network Call
      let transcriptText = "";
      if (transcriberProvider === 'google') {
        const transRes = await transcribeWithGoogle(filePath, transcriberKey);
        transcriptText = transRes.text;
      } else {
        const transRes = await transcribeWithWhisper(filePath, transcriberKey, transcriberProvider);
        transcriptText = transRes.text;
      }

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
      } else if (analyzerProvider === 'xai') {
        const rez = await analyzeEmotionOpenAIFormat(transcriptText, analyzerVersion, analyzerKey, activePrompt, 'https://api.x.ai/v1/chat/completions');
        emotion = rez.emotion; inputToks = rez.input_tokens; outputToks = rez.output_tokens;
      }

      let costAnalyze = (inputToks * rateSchema.input) + (outputToks * rateSchema.output);
      let totalCost = costTranscribe + costAnalyze;

      // Clean LLM parsing mistakes
      const strippedEmotion = emotion.replace(/[^a-z]/g, '');
      emotion = VALID_EMOTIONS.includes(strippedEmotion) ? strippedEmotion : 'neutral';

      // 6. Store to database securely
      const { data, error } = await supabase
        .from('calls')
        .insert([{
          filename: file,
          transcript: transcriptText,
          ai_version: `${transcriberProvider} whisper | ${analyzerProvider} ${analyzerVersion}`,
          emotion: emotion,
          cost: totalCost,
          cost_transcribe: costTranscribe,
          cost_analyze: costAnalyze,
          processing_time: (Date.now() - startTime) / 1000,
          system_prompt: activePrompt,
          audio_duration: audioDuration
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
