import OpenAI from 'openai';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { TRIAGE_SYSTEM_PROMPT, buildTriageUserMessage } from './triage.prompt.js';
import { PRIORITY, ISSUE_CATEGORIES } from '../constants/index.js';
import AssetHistory from '../models/AssetHistory.model.js';
import Asset from '../models/Asset.model.js';

const TIMEOUT_MS = 20000; // 20s hard timeout

let openaiClient = null;

const getOpenAIClient = () => {
  if (!config.openai.apiKey) {
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.openai.apiKey,
      timeout: TIMEOUT_MS,
      maxRetries: 1,
    });
  }
  return openaiClient;
};

/**
 * Validate and normalize AI JSON output.
 */
const normalizeTriageOutput = (raw) => {
  const result = {
    title: '',
    category: 'Other',
    priority: PRIORITY.MEDIUM,
    possibleCauses: [],
    initialChecks: [],
    recurringPatternWarning: null,
  };

  if (!raw || typeof raw !== 'object') {
    return result;
  }

  if (typeof raw.title === 'string' && raw.title.trim()) {
    result.title = raw.title.trim().slice(0, 80);
  }

  if (typeof raw.category === 'string') {
    const match = ISSUE_CATEGORIES.find(
      (c) => c.toLowerCase() === raw.category.toLowerCase()
    );
    result.category = match || 'Other';
  }

  if (typeof raw.priority === 'string') {
    const p = Object.values(PRIORITY).find(
      (v) => v.toLowerCase() === raw.priority.toLowerCase()
    );
    if (p) result.priority = p;
  }

  if (Array.isArray(raw.possibleCauses)) {
    result.possibleCauses = raw.possibleCauses
      .filter((c) => typeof c === 'string' && c.trim())
      .map((c) => c.trim().slice(0, 200))
      .slice(0, 6);
  }

  if (Array.isArray(raw.initialChecks)) {
    result.initialChecks = raw.initialChecks
      .filter((c) => typeof c === 'string' && c.trim())
      .map((c) => c.trim().slice(0, 250))
      .slice(0, 6);
  }

  if (
    typeof raw.recurringPatternWarning === 'string' &&
    raw.recurringPatternWarning.trim()
  ) {
    result.recurringPatternWarning = raw.recurringPatternWarning.trim().slice(0, 300);
  }

  return result;
};

/**
 * Rule-based fallback when AI is unavailable or fails.
 */
const fallbackTriage = (complaint, assetCategory) => {
  const lower = (complaint || '').toLowerCase();
  let priority = PRIORITY.MEDIUM;
  let category = 'Other';
  let title = 'Maintenance request';

  if (
    lower.includes('fire') ||
    lower.includes('smoke') ||
    lower.includes('shock') ||
    lower.includes('spark') ||
    lower.includes('burn') ||
    lower.includes('gas leak')
  ) {
    priority = PRIORITY.CRITICAL;
    category = 'Safety Hazard';
    title = 'Possible safety hazard reported';
  } else if (
    lower.includes('leak') ||
    lower.includes('water') ||
    lower.includes('drip')
  ) {
    priority = PRIORITY.HIGH;
    category = 'Leakage / Performance';
    title = 'Leakage or fluid issue';
  } else if (
    lower.includes('not working') ||
    lower.includes("doesn't work") ||
    lower.includes('broken') ||
    lower.includes('failed')
  ) {
    priority = PRIORITY.HIGH;
    category = 'Hardware Failure';
    title = 'Equipment not functioning';
  } else if (
    lower.includes('noise') ||
    lower.includes('loud') ||
    lower.includes('vibrat')
  ) {
    priority = PRIORITY.MEDIUM;
    category = 'Mechanical';
    title = 'Unusual noise or vibration';
  } else if (
    lower.includes('connect') ||
    lower.includes('wifi') ||
    lower.includes('network') ||
    lower.includes('hdmi') ||
    lower.includes('signal')
  ) {
    priority = PRIORITY.MEDIUM;
    category = 'Connectivity';
    title = 'Connectivity issue';
  }

  if (assetCategory && category === 'Other') {
    // light hint from asset category
  }

  // Simple title from first 60 chars of complaint
  if (complaint && complaint.trim().length > 5) {
    const cleaned = complaint.trim().replace(/\s+/g, ' ');
    title = cleaned.length > 60 ? `${cleaned.slice(0, 57)}...` : cleaned;
  }

  return {
    title,
    category,
    priority,
    possibleCauses: [
      'Component wear or failure',
      'Environmental or usage factor',
      'Requires on-site inspection to confirm',
    ],
    initialChecks: [
      'Ensure the asset is powered off if any electrical or safety risk is present',
      'Visually inspect for obvious damage, leaks, or loose connections',
      'Note any error indicators or unusual smells/sounds',
      'Contact a qualified technician if the issue involves electrical, gas, or structural risk',
    ],
    recurringPatternWarning: null,
    _fallback: true,
  };
};

/**
 * Run AI Issue Triage.
 * Always returns a usable structure; never exposes raw API keys.
 */
export const runIssueTriage = async ({
  complaint,
  assetId,
  publicId,
}) => {
  if (!complaint || !complaint.trim()) {
    throw new ApiError(400, 'Complaint description is required for triage');
  }

  // Load asset context
  let asset = null;
  if (assetId) {
    asset = await Asset.findById(assetId).select(
      'name category model condition location publicId'
    );
  } else if (publicId) {
    asset = await Asset.findOne({ publicId }).select(
      'name category model condition location publicId'
    );
  }

  if (!asset) {
    throw new ApiError(404, 'Asset not found for triage');
  }

  // Recent history (last 5)
  let recentHistory = [];
  try {
    const historyDocs = await AssetHistory.find({ asset: asset._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('action description createdAt')
      .lean();
    recentHistory = historyDocs.map((h) => ({
      action: h.action,
      description: h.description,
      createdAt: h.createdAt,
    }));
  } catch {
    // non-fatal
  }

  const client = getOpenAIClient();

  // No API key → fallback immediately
  if (!client) {
    logger.warn('OpenAI API key not configured – using rule-based fallback triage');
    const fallback = fallbackTriage(complaint, asset.category);
    return {
      ...fallback,
      wasAISuggested: false,
      wasEditedByUser: false,
      wasAccepted: false,
      wasRejected: false,
      generatedAt: new Date(),
      source: 'fallback',
    };
  }

  const userMessage = buildTriageUserMessage({
    complaint,
    assetName: asset.name,
    assetCategory: asset.category,
    assetModel: asset.model,
    assetCondition: asset.condition,
    assetLocation: asset.location,
    recentHistory,
  });

  try {
    const completion = await Promise.race([
      client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: TRIAGE_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI_TIMEOUT')), TIMEOUT_MS)
      ),
    ]);

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty AI response');
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      logger.warn('AI returned non-JSON, attempting cleanup');
      const cleaned = content.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const normalized = normalizeTriageOutput(parsed);

    // Ensure we always have a title
    if (!normalized.title) {
      normalized.title = complaint.trim().slice(0, 80);
    }

    return {
      ...normalized,
      wasAISuggested: true,
      wasEditedByUser: false,
      wasAccepted: false,
      wasRejected: false,
      generatedAt: new Date(),
      source: 'openai',
      rawResponse: parsed,
    };
  } catch (err) {
    logger.error('AI triage failed – using fallback', {
      error: err.message,
      assetId: String(asset._id),
    });

    const fallback = fallbackTriage(complaint, asset.category);
    return {
      ...fallback,
      wasAISuggested: false,
      wasEditedByUser: false,
      wasAccepted: false,
      wasRejected: false,
      generatedAt: new Date(),
      source: err.message === 'AI_TIMEOUT' ? 'timeout-fallback' : 'error-fallback',
    };
  }
};

/**
 * Optional: AI Maintenance Summary (bonus)
 */
export const runMaintenanceSummary = async ({ notes, parts, assetName }) => {
  const client = getOpenAIClient();
  if (!client) {
    return {
      text: notes || 'Maintenance completed.',
      source: 'fallback',
    };
  }

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You convert rough technician notes into a short professional maintenance summary (2-4 sentences). Output plain text only.',
        },
        {
          role: 'user',
          content: `Asset: ${assetName || 'Unknown'}\nNotes: ${notes || 'N/A'}\nParts: ${JSON.stringify(parts || [])}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    return {
      text: completion.choices?.[0]?.message?.content?.trim() || notes,
      source: 'openai',
      generatedAt: new Date(),
    };
  } catch (err) {
    logger.error('AI maintenance summary failed', { error: err.message });
    return { text: notes || 'Maintenance completed.', source: 'error-fallback' };
  }
};
