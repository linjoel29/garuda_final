import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

const SYSTEM_PROMPT = `You are a logistics dispatch assistant. Given a structured JSON route
(vehicle info, ordered stop list with distances/times, priority flags,
and any disruption events), produce a concise, plain-language summary
(2-4 sentences) a human dispatcher can read at a glance. Mention: number
of stops, whether urgent orders are sequenced early, estimated total
time and distance, and — if a disruption occurred — what changed and why.
Never invent data not present in the input JSON. Do not give driving
directions; only summarize the plan.`;

export interface RouteSummaryInput {
  vehicle_name: string;
  stops: {
    sequence: number;
    address: string;
    priority: string;
    eta?: string;
  }[];
  total_distance_km: number;
  total_duration_min: number;
}

export interface DisruptionExplanationInput {
  event_type: 'delay' | 'closure' | 'breakdown' | 'extended_stop';
  affected_stop: string;
  old_route: string[];
  new_route: string[];
  time_delta_min: number;
}

/**
 * Prompt A: Generate concise AI Route Summary
 */
export async function generateRouteSummary(input: RouteSummaryInput): Promise<string> {
  const urgentStopsCount = input.stops.filter((s) => s.priority === 'urgent').length;
  const totalStops = input.stops.length;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT' as any,
            properties: {
              summary: { type: 'STRING' as any },
            },
            required: ['summary'],
          },
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Generate dispatch summary for route data:\n${JSON.stringify(input, null, 2)}`,
              },
            ],
          },
        ],
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (parsed.summary) return parsed.summary;
      }
    } catch (err) {
      console.warn('[Gemini] Route summary API call error. Using intelligent fallback logic.', err);
    }
  }

  // Fallback rule-based natural language generator
  let summary = `${input.vehicle_name} covers ${totalStops} delivery stop${totalStops === 1 ? '' : 's'} over ${input.total_distance_km} km with an estimated total duration of ${Math.round(input.total_duration_min)} minutes. `;
  if (urgentStopsCount > 0) {
    summary += `Sequenced ${urgentStopsCount} urgent priority order${urgentStopsCount === 1 ? '' : 's'} early to ensure on-time fulfillment. `;
  } else {
    summary += `Standard delivery sequence optimized for minimal travel time and fuel efficiency. `;
  }
  return summary.trim();
}

/**
 * Prompt B: Generate concise AI Disruption Explanation
 */
export async function generateDisruptionExplanation(input: DisruptionExplanationInput): Promise<string> {
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT' as any,
            properties: {
              explanation: { type: 'STRING' as any },
            },
            required: ['explanation'],
          },
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Generate disruption explanation for event:\n${JSON.stringify(input, null, 2)}`,
              },
            ],
          },
        ],
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (parsed.explanation) return parsed.explanation;
      }
    } catch (err) {
      console.warn('[Gemini] Disruption explanation API call error. Using fallback logic.', err);
    }
  }

  // Fallback explanation generator
  let explanation = `Route recomputed due to a ${input.event_type.replace('_', ' ')} at "${input.affected_stop}". `;
  if (input.time_delta_min > 0) {
    explanation += `Schedule adjusted with an estimated ${input.time_delta_min}-minute impact. Remaining stops re-sequenced to mitigate further downstream delays.`;
  } else {
    explanation += `Remaining stops re-routed to optimize path around the affected stop.`;
  }
  return explanation;
}
