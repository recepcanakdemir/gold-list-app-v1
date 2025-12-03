// Supabase Edge Function for Gemini AI Integration
// Handles translation and example generation using Google's Gemini API

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  action: 'translate' | 'generate_example';
  term: string;
  targetLang: string;
  nativeLang: string;
  languageLevel?: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API Error:', errorText);
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data: GeminiResponse = await response.json();
  
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response from Gemini API');
  }

  const result = data.candidates[0]?.content?.parts?.[0]?.text;
  
  if (!result) {
    throw new Error('Invalid response format from Gemini API');
  }

  return result.trim();
}

function createTranslationPrompt(term: string, targetLang: string, nativeLang: string): string {
  return `Translate the following ${targetLang} word or phrase to ${nativeLang}. 
This helps language learners understand the meaning of words they encounter.
Provide ONLY the translation, no explanations, no additional text, no quotes.

Word/phrase to translate: "${term}"

Translation:`;
}

function createExamplePrompt(term: string, targetLang: string, nativeLang: string, languageLevel: string = 'A2'): string {
  const levelDescriptions: { [key: string]: string } = {
    'A1': 'very basic and simple',
    'A2': 'simple and elementary', 
    'B1': 'intermediate complexity',
    'B2': 'upper intermediate with more complex structures',
    'C1': 'advanced with sophisticated vocabulary',
    'C2': 'proficient with native-like complexity'
  };
  
  const description = levelDescriptions[languageLevel] || 'simple and elementary';
  
  return `Create a ${description} sentence in ${targetLang} that uses the word "${term}". 
The sentence should be appropriate for ${languageLevel} level language learners.
Put the word "${term}" in **bold** by wrapping it with **word**.
Provide ONLY the sentence, no explanations, no additional text.

Example sentence:`;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();

    // Validate required fields
    if (!body.action || !body.term || !body.targetLang || !body.nativeLang) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, term, targetLang, nativeLang' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Validate language level if provided
    const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    if (body.languageLevel && !validLevels.includes(body.languageLevel)) {
      return new Response(
        JSON.stringify({ error: 'Invalid language level. Must be one of: A1, A2, B1, B2, C1, C2' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate action type
    if (!['translate', 'generate_example'].includes(body.action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "translate" or "generate_example"' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Sanitize inputs
    const term = body.term.trim();
    const targetLang = body.targetLang.trim();
    const nativeLang = body.nativeLang.trim();
    const languageLevel = body.languageLevel?.trim() || 'A2';

    if (!term || !targetLang || !nativeLang) {
      return new Response(
        JSON.stringify({ error: 'Fields cannot be empty' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let prompt: string;
    
    switch (body.action) {
      case 'translate':
        prompt = createTranslationPrompt(term, targetLang, nativeLang);
        break;
      case 'generate_example':
        prompt = createExamplePrompt(term, targetLang, nativeLang, languageLevel);
        break;
      default:
        throw new Error('Invalid action');
    }

    // Call Gemini API
    const result = await callGeminiAPI(prompt);

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        result: result,
        action: body.action 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Edge Function Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
