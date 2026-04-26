import { GoogleGenAI, Type } from "@google/genai";
import { retrieveRelevantContext } from "./rag.ts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export interface InterviewQuestion {
  question: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  idealAnswer: string;
}

export async function generateQuestion(history: { role: string; content: string }[], level: string): Promise<InterviewQuestion> {
  // Retrieve context for the next question
  const lastUserMessage = history.filter(h => h.role === 'user').pop()?.content || "";
  
  // If no history, search for general architectural elements or main features
  const searchQuery = lastUserMessage || "overview architecture main features key components";
  const context = await retrieveRelevantContext(searchQuery, 8);

  const topicsCovered = history
    .filter(h => h.role === 'ai')
    .map(h => h.content) // Pass full content to help avoid duplication
    .join('\n---\n');

  const contextDisplay = context && context.trim().length > 0 
    ? context 
    : "NO SPECIFIC CONTEXT FOUND FOR THIS QUERY. PLEASE PULL FROM YOUR GENERAL KNOWLEDGE OF THE SOURCE REPOSITORY IF POSSIBLE, OR ASK A FUNDAMENTAL ARCHITECTURAL QUESTION RELATED TO THE SCRAPED DATA TITLES.";

  const prompt = `
    You are a Student Revision Assistant. Your goal is to help a student master the technical details of the provided source code/documentation through focused questioning.
    
    CONTEXT RETRIEVED FROM SOURCE (Use this as your primary source of truth):
    ${contextDisplay}

    STUDY HISTORY:
    ${history.map(h => `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.content}`).join('\n')}

    TOPICS ALREADY COVERED (DO NOT REPEAT THESE):
    ${topicsCovered}

    DIFFICULTY LEVEL: ${level}

    INSTRUCTIONS:
    1. EXAMINE the context provided below. Identify a specific technical detail, architectural pattern, or implementation choice.
    2. ASK a challenging, specific question that tests the student's understanding of THIS EXACT CODEBASE.
    3. MANDATORY: The question MUST be derived from the "CONTEXT RETRIEVED FROM SOURCE". If the context appears sparse or irrelevant to the previous topic, pivot to a new technical area within the provided context.
    4. AVOID REPETITION: Do not ask about topics already discussed in the history.
    5. FOCUS on: Implementation logic, trade-offs, performance, and core concepts found in the context.
    6. FORMAT your response as JSON.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          topic: { type: Type.STRING },
          difficulty: { type: Type.STRING, enum: ["easy", "medium", "hard"] }
        },
        required: ["question", "topic", "difficulty"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function evaluateAnswer(question: string, answer: string): Promise<EvaluationResult> {
  const context = await retrieveRelevantContext(question, 3);

  const prompt = `
    You are a helpful Revision Assistant evaluating a student's answer.
    
    QUESTION: ${question}
    STUDENT ANSWER: ${answer}
    
    SOURCE CONTEXT:
    ${context}

    EVALUATE BASED ON:
    1. Correctness: Does it solve the problem or explain the concept correctly?
    2. Depth: Does it go beyond surface-level explanations? (mentioning trade-offs, internals, etc.)
    3. Clarity: Is it well-articulated?

    Format your response as JSON.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "Score from 0 to 10" },
          feedback: { type: Type.STRING },
          idealAnswer: { type: Type.STRING }
        },
        required: ["score", "feedback", "idealAnswer"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}
