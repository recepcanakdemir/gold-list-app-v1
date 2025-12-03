// AI Helper Library for Goldlist App
// Provides clean API for calling Gemini AI Edge Functions

import { supabase } from './supabase';

// Types for AI function requests and responses
export interface AiRequest {
  action: 'translate' | 'generate_example';
  term: string;
  targetLang: string;
  nativeLang: string;
  languageLevel?: string;
}

export interface AiResponse {
  success: boolean;
  result?: string;
  action?: string;
  error?: string;
  message?: string;
}

// Base function to call the Gemini AI Edge Function
async function callAiFunction(request: AiRequest): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('gemini-ai', {
      body: request
    });

    if (error) {
      console.error('Supabase Edge Function Error:', error);
      throw new Error(error.message || 'Failed to call AI function');
    }

    const response = data as AiResponse;

    if (!response.success) {
      throw new Error(response.error || response.message || 'AI request failed');
    }

    if (!response.result) {
      throw new Error('No result returned from AI');
    }

    return response.result;
  } catch (error) {
    console.error('AI Helper Error:', error);
    
    // Provide user-friendly error messages
    if (error.message?.includes('GEMINI_API_KEY')) {
      throw new Error('AI service is not configured. Please contact support.');
    }
    
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    if (error.message?.includes('quota') || error.message?.includes('limit')) {
      throw new Error('AI service is temporarily unavailable. Please try again later.');
    }
    
    // Re-throw with original message for other errors
    throw error;
  }
}

// Translate a term from target language to native language
export async function translateTerm(
  term: string, 
  targetLang: string, 
  nativeLang: string = 'English',
  languageLevel: string = 'A2'
): Promise<string> {
  if (!term.trim()) {
    throw new Error('Term cannot be empty');
  }

  if (!targetLang.trim()) {
    throw new Error('Target language must be specified');
  }

  return await callAiFunction({
    action: 'translate',
    term: term.trim(),
    targetLang: targetLang.trim(),
    nativeLang: nativeLang.trim(),
    languageLevel: languageLevel.trim()
  });
}

// Generate an example sentence using the term at appropriate language level
export async function generateExample(
  term: string, 
  targetLang: string, 
  nativeLang: string = 'English',
  languageLevel: string = 'A2'
): Promise<string> {
  if (!term.trim()) {
    throw new Error('Term cannot be empty');
  }

  if (!targetLang.trim()) {
    throw new Error('Target language must be specified');
  }

  return await callAiFunction({
    action: 'generate_example',
    term: term.trim(),
    targetLang: targetLang.trim(),
    nativeLang: nativeLang.trim(),
    languageLevel: languageLevel.trim()
  });
}

// Helper to get language names and level from notebook data (notebook-level language setting)
export function getLanguagesFromNotebook(notebook: any): { 
  targetLang: string; 
  nativeLang: string;
  languageLevel: string;
} {
  // Use notebook's target_language and language_level instead of profile's settings
  return {
    targetLang: notebook?.target_language || 'English',
    nativeLang: 'English', // Could be configurable per notebook in future
    languageLevel: notebook?.language_level || 'A2'
  };
}

// Legacy helper - kept for backwards compatibility, but should use getLanguagesFromNotebook
// @deprecated Use getLanguagesFromNotebook instead
export function getLanguagesFromProfile(profile: any): { 
  targetLang: string; 
  nativeLang: string; 
} {
  console.warn('getLanguagesFromProfile is deprecated. Use getLanguagesFromNotebook instead.');
  return {
    targetLang: profile?.target_lang || 'Spanish',
    nativeLang: 'English'
  };
}

