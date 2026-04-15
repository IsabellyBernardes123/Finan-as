
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "../types";

export interface AIInsightResponse {
  analysis: string;
  savings: string;
  tip: string;
}

export const getFinancialInsights = async (transactions: Transaction[]): Promise<AIInsightResponse | string> => {
  if (transactions.length < 3) return "Adicione pelo menos 3 transações para que eu possa analisar seu equilíbrio financeiro.";

  // Consolidação de dados para dar contexto macro à IA
  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const summary = transactions.slice(0, 20).map(t => ({
    tipo: t.type === 'income' ? 'Ganho' : 'Gasto',
    valor: t.amount,
    categoria: t.category,
    descricao: t.description,
    pago: t.is_paid ? 'Sim' : 'Não',
    data: t.date.split('T')[0]
  }));

  const prompt = `
    Contexto Geral: Ganhos Totais R$ ${totals.income.toFixed(2)}, Gastos Totais R$ ${totals.expense.toFixed(2)}.
    Saldo Atual: R$ ${(totals.income - totals.expense).toFixed(2)}.
    
    Transações Recentes: ${JSON.stringify(summary)}.
    
    Analise o equilíbrio entre Necessidades, Lazer e Investimento. 
    Seja específico sobre quais categorias estão pesando mais e como equilibrar sem sacrificar a qualidade de vida.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: `
          Você é um Consultor Financeiro Estratégico com foco em Equilíbrio de Vida. 
          Seu objetivo é ajudar o usuário a ter uma vida rica hoje enquanto constrói segurança para amanhã.
          
          REGRAS DE ANÁLISE:
          1. Use tom motivador, porém realista.
          2. No campo 'analysis', identifique o padrão atual (ex: gastos excessivos com lazer ou falta de diversidade nos ganhos).
          3. No campo 'savings', sugira cortes que NÃO tirem a felicidade do usuário (trocas inteligentes).
          4. No campo 'tip', dê um conselho estratégico sobre reserva de emergência ou metas de longo prazo baseado no saldo atual.
          5. Mantenha as respostas curtas (máximo 2 frases por campo).
        `,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING, description: "Análise do equilíbrio atual entre vida e finanças." },
            savings: { type: Type.STRING, description: "Sugestão de otimização de gastos sem perda de bem-estar." },
            tip: { type: Type.STRING, description: "Dica estratégica para o futuro financeiro." },
          },
          required: ["analysis", "savings", "tip"],
        },
        temperature: 0.8,
      },
    });

    const text = result.text;
    if (text) {
      return JSON.parse(text) as AIInsightResponse;
    }
    return "Não consegui equilibrar os dados agora. Tente novamente.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return "Erro de conexão com o consultor estratégico. Verifique sua rede.";
  }
};
