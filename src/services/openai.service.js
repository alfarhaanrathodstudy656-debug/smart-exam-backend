const fs = require('fs');
const OpenAI = require('openai');
const { StatusCodes } = require('http-status-codes');
const env = require('../config/env');
const AppError = require('../utils/appError');

let client;

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const getClient = () => {
  if (!env.openaiApiKey) {
    throw new AppError(
      'OpenAI is not configured. Please set OPENAI_API_KEY on the backend.',
      StatusCodes.SERVICE_UNAVAILABLE
    );
  }

  if (!client) {
    client = new OpenAI({
      apiKey: env.openaiApiKey,
      baseURL: env.openaiBaseUrl
    });
  }

  return client;
};

const parseJsonContent = (rawContent) => {
  if (typeof rawContent !== 'string' || !rawContent.trim()) {
    throw new AppError('OpenAI returned an empty response', StatusCodes.BAD_GATEWAY);
  }

  try {
    return JSON.parse(rawContent);
  } catch (_error) {
    throw new AppError('OpenAI returned non-JSON content', StatusCodes.BAD_GATEWAY);
  }
};

const requestJsonCompletion = async ({ systemPrompt, userPayload }) => {
  try {
    const completion = await getClient().chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: JSON.stringify(userPayload)
        }
      ]
    });

    const content = completion?.choices?.[0]?.message?.content;
    return parseJsonContent(content);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const providerMessage = error?.error?.message || error?.message;
    throw new AppError(
      providerMessage ? `OpenAI request failed: ${providerMessage}` : 'OpenAI request failed',
      StatusCodes.BAD_GATEWAY
    );
  }
};

const normalizeQuestionDraft = (draft, defaults) => {
  const type = draft?.type || defaults.type;
  const marks = Number(draft?.marks || defaults.marks || 5);

  const normalized = {
    type,
    questionText: String(draft?.questionText || '').trim(),
    marks: Number.isFinite(marks) ? clampNumber(marks, 1, 200) : defaults.marks || 5,
    options: [],
    correctAnswer: undefined,
    expectedAnswer: undefined,
    keywords: undefined,
    speakingTime: undefined
  };

  if (type === 'mcq') {
    const incomingOptions = Array.isArray(draft?.options) ? draft.options : [];
    const options = incomingOptions
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 4);

    while (options.length < 4) {
      options.push(`Option ${String.fromCharCode(65 + options.length)}`);
    }

    const answerRaw = String(draft?.correctAnswer || '').trim().toLowerCase();
    let resolvedAnswer = options[0];

    if (answerRaw) {
      const indexByLetter = ['a', 'b', 'c', 'd'].indexOf(answerRaw);
      if (indexByLetter >= 0 && options[indexByLetter]) {
        resolvedAnswer = options[indexByLetter];
      } else {
        const found = options.find((option) => option.toLowerCase() === answerRaw);
        if (found) {
          resolvedAnswer = found;
        }
      }
    }

    normalized.options = options;
    normalized.correctAnswer = resolvedAnswer;
  }

  if (type === 'practical') {
    normalized.expectedAnswer = String(draft?.expectedAnswer || '').trim();
  }

  if (type === 'viva') {
    normalized.keywords = Array.isArray(draft?.keywords)
      ? draft.keywords.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 12)
      : [];

    const speakingTime = Number(draft?.speakingTime || defaults.speakingTime || 60);
    normalized.speakingTime = Number.isFinite(speakingTime)
      ? clampNumber(speakingTime, 15, 600)
      : 60;
  }

  return normalized;
};

const generateQuestionDraft = async ({
  subject,
  testTitle,
  testDescription,
  type,
  topic,
  difficulty = 'medium',
  marks = 5,
  additionalInstructions = ''
}) => {
  const systemPrompt = [
    'You generate exam question drafts for admins.',
    'Return valid JSON only.',
    'Strictly follow this schema:',
    '{',
    '  "type": "mcq" | "practical" | "viva",',
    '  "questionText": "string",',
    '  "marks": number,',
    '  "options": ["string"],',
    '  "correctAnswer": "string",',
    '  "expectedAnswer": "string",',
    '  "keywords": ["string"],',
    '  "speakingTime": number',
    '}',
    'For mcq include 4 options and a correctAnswer that matches one option.',
    'For practical include expectedAnswer and omit mcq/viva specifics.',
    'For viva include keywords and speakingTime and omit mcq/practical specifics.',
    'Keep wording clear, exam-grade, and free from markdown.'
  ].join(' ');

  const draft = await requestJsonCompletion({
    systemPrompt,
    userPayload: {
      subject,
      testTitle,
      testDescription,
      type,
      topic,
      difficulty,
      marks,
      additionalInstructions
    }
  });

  return normalizeQuestionDraft(draft, {
    type,
    marks,
    speakingTime: 60
  });
};

const suggestAnswerReview = async ({
  type,
  questionText,
  expectedAnswer,
  keywords,
  studentAnswer,
  transcript,
  maxScore,
  scoringStyle = 'balanced',
  rubric = ''
}) => {
  const response = await requestJsonCompletion({
    systemPrompt: [
      'You are assisting an exam evaluator.',
      'Return strict JSON only with:',
      '{',
      '  "suggestedScore": number,',
      '  "feedback": "string",',
      '  "strengths": ["string"],',
      '  "improvements": ["string"],',
      '  "confidence": number',
      '}',
      'Score must be between 0 and maxScore.',
      'Feedback should be concise and ready to show to students.',
      'Do not use markdown.'
    ].join(' '),
    userPayload: {
      type,
      questionText,
      expectedAnswer,
      keywords,
      studentAnswer,
      transcript,
      maxScore,
      scoringStyle,
      rubric
    }
  });

  const score = Number(response?.suggestedScore);
  const confidence = Number(response?.confidence);

  return {
    suggestedScore: Number.isFinite(score) ? clampNumber(score, 0, maxScore) : 0,
    feedback: String(response?.feedback || '').trim(),
    strengths: Array.isArray(response?.strengths)
      ? response.strengths.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
      : [],
    improvements: Array.isArray(response?.improvements)
      ? response.improvements.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
      : [],
    confidence: Number.isFinite(confidence) ? clampNumber(confidence, 0, 1) : 0.5
  };
};

const transcribeAudioFile = async ({ filePath, language = 'en' }) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new AppError('Audio file not found for transcription', StatusCodes.BAD_REQUEST);
    }

    const response = await getClient().audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: env.openaiTranscriptionModel,
      language
    });

    return String(response?.text || '').trim();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const providerMessage = error?.error?.message || error?.message;
    throw new AppError(
      providerMessage ? `Speech-to-text failed: ${providerMessage}` : 'Speech-to-text failed',
      StatusCodes.BAD_GATEWAY
    );
  }
};

const isConfigured = () => Boolean(env.openaiApiKey);

module.exports = {
  isConfigured,
  generateQuestionDraft,
  suggestAnswerReview,
  transcribeAudioFile
};
