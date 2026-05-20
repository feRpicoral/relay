import type { AgentContext } from "./types";

const dayMap: Record<keyof Omit<AgentContext["businessHours"], "timezone">, string> = {
  monday: "segunda-feira",
  tuesday: "terça-feira",
  wednesday: "quarta-feira",
  thursday: "quinta-feira",
  friday: "sexta-feira",
  saturday: "sábado",
  sunday: "domingo",
};

function formatHours(hours: AgentContext["businessHours"], lang: AgentContext["language"]) {
  const entries: string[] = [];
  for (const key of Object.keys(dayMap) as Array<keyof typeof dayMap>) {
    const block = hours[key];
    if (block) {
      if (lang === "en-US") {
        entries.push(`${key}: ${block.open}–${block.close}`);
      } else {
        entries.push(`${dayMap[key]}: ${block.open}–${block.close}`);
      }
    }
  }
  if (entries.length === 0) {
    return lang === "en-US" ? "24/7" : "24h por dia, 7 dias por semana";
  }
  return entries.join(", ");
}

export function buildSystemPrompt(ctx: AgentContext): string {
  const lang = ctx.language;
  const hours = formatHours(ctx.businessHours, lang);
  const kb = ctx.knowledgeChunks.length
    ? ctx.knowledgeChunks.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")
    : lang === "en-US"
      ? "(No knowledge base provided.)"
      : "(Sem base de conhecimento fornecida.)";

  if (lang === "en-US") {
    return [
      "You are a friendly, professional AI receptionist. Speak naturally, keep responses short (1–2 sentences), and never sound robotic.",
      "Always confirm details verbally before booking. If you are unsure, say so honestly and offer to transfer.",
      "If the caller asks something outside the knowledge base, do not invent. Use the lookup_kb tool first.",
      "When you need a moment for a tool call (>300ms), say 'one moment, please' before invoking it.",
      "",
      `Business hours: ${hours}`,
      "",
      "Knowledge base (verbatim — quote when relevant):",
      kb,
      "",
      "Persona instructions:",
      ctx.personaPrompt || "Be warm, concise, and helpful.",
    ].join("\n");
  }

  return [
    "Você é uma recepcionista virtual amigável e profissional. Fale de forma natural, respostas curtas (1–2 frases), e nunca pareça robótica.",
    "Sempre confirme detalhes verbalmente antes de marcar. Se ficar em dúvida, seja honesta e ofereça transferir pra um humano.",
    "Se o cliente perguntar algo fora da base de conhecimento, não invente. Use a tool lookup_kb primeiro.",
    "Quando precisar de um momento pra usar uma ferramenta (>300ms), diga 'um momentinho' antes de chamá-la.",
    "",
    `Horário de funcionamento: ${hours}`,
    "",
    "Base de conhecimento (cite quando relevante):",
    kb,
    "",
    "Instruções de persona:",
    ctx.personaPrompt || "Seja calorosa, concisa e prestativa.",
  ].join("\n");
}

export function buildGreeting(ctx: AgentContext): string {
  if (ctx.greeting && ctx.greeting.length > 0) return ctx.greeting;
  if (ctx.language === "en-US") {
    return "Hi! Thanks for calling. How can I help you today?";
  }
  return "Olá! Obrigada por ligar. Como posso ajudar?";
}
