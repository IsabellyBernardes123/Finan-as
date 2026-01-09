
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface AIInsightResponse {
  analysis: string;
  savings: string;
  tip: string;
}

export const getFinancialInsights = async (transactions: Transaction[]): Promise<AIInsightResponse | string> => {
  if (transactions.length < 3) return "Adicione pelo menos 3 transações para que eu possa analisar seus padrões financeiros.";

  const summary = transactions.map(t => ({
    tipo: t.type === 'income' ? 'Entrada' : 'Saída',
    valor: t.amount,
    categoria: t.category,
    descricao: t.description,
    pago: t.is_paid ? 'Sim' : 'Não',
    data: t.date.split('T')[0]
  }));

  const prompt = `Analise o seguinte histórico de transações financeiras e forneça insights estruturados em português.
  IMPORTANTE: Use uma linguagem muito simples, como se estivesse conversando com um amigo. Evite palavras difíceis ou termos técnicos de economia. Seja direto e use frases curtas.
  Histórico: ${JSON.stringify(summary)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "Você é um consultor financeiro amigável que explica as coisas de forma simples e direta. Use palavras fáceis, evite jargões técnicos complexos e fale de um jeito que qualquer pessoa consiga entender. Sua missão é analisar os dados e dar dicas práticas e fáceis de seguir.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: {
              type: Type.STRING,
              description: "Uma explicação simples de como está o dinheiro hoje.",
            },
            savings: {
              type: Type.STRING,
              description: "Uma dica fácil de onde dá para gastar menos.",
            },
            tip: {
              type: Type.STRING,
              description: "Um conselho amigável para o futuro financeiro.",
            },
          },
          required: ["analysis", "savings", "tip"],
        },
        temperature: 0.8,
      },
    });

    const text = response.text;
    if (text) {
      try {
        return JSON.parse(text) as AIInsightResponse;
      } catch (e) {
        return "Erro ao processar análise da IA.";
      }
    }
    return "Não foi possível gerar insights no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro de conexão com o consultor IA. Verifique sua chave de API.";
  }
};
