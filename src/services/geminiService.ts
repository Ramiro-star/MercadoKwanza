/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const chatWithGemini = async (message: string, history: { role: "user" | "model"; parts: { text: string }[] }[]) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [...history, { role: "user", parts: [{ text: message }] }],
    config: {
      systemInstruction: `Você é o assistente do MercadoKwanza, um marketplace angolano.
Sua missão é ajudar compradores e vendedores a navegar na plataforma, tirar dúvidas sobre produtos, categorias e como vender em Angola.
Sempre use o Kwanza (AOA) como moeda. Seja amigável, prestativo e use expressões comuns em Angola quando apropriado (ex: "Mambo", "Fixe", "Tudo bem").
Você pode sugerir categorias como: Alimentação & Bebidas, Moda & Vestuário, Tecnologia & Electrónica, Casa & Decoração, Beleza & Cuidados Pessoais, Automóvel & Acessórios, Livros & Material Escolar, Agricultura & Campo, Brinquedos & Infantil, Ferramentas & Construção.
As províncias de Angola são: Luanda, Benguela, Huambo, Huíla, Cabinda, Namibe, Malanje, Uíge, Zaire, Bié, Moxico, Cuando Cubango, Cunene, Lunda Norte, Lunda SUL, Bengo, Cuanza Norte, Cuanza Sul.`,
    },
  });

  return response.text;
};
