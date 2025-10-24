import { GoogleGenAI, Chat } from "@google/genai";
import type { Message } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// FIX: `generationConfig` is deprecated. Use `config` instead.
const config = {
  temperature: 0.7,
  topP: 1,
  topK: 1,
};

export function createChatSession(history: Message[]): Chat {
    // FIX: `ai.models['...']` and `model.createChat` are deprecated. Use `ai.chats.create`.
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        history: history,
        config: config,
    });
}
