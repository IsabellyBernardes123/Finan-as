
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getFinancialInsights = async (transactions: Transaction[]) => {
  if (transactions.length === 0) return "Add some transactions to get AI insights!";

  const summary = transactions.map(t => ({
    type: t.type,
    amount: t.amount,
    category: t.category,
    description: t.description
  }));

  const prompt = `Based on the following list of transactions, provide a brief, professional, and actionable financial insight in Portuguese. 
  Focus on identifying patterns, suggesting potential savings, and offering a quick tip.
  Transactions: ${JSON.stringify(summary)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful, minimalist financial advisor. Your advice should be concise and direct.",
        temperature: 0.7,
      },
    });

    return response.text || "Could not generate insights at this moment.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao carregar insights financeiros via IA.";
  }
};
