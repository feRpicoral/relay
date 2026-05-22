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
        entries.push(`${key}: ${block.open}-${block.close}`);
      } else {
        entries.push(`${dayMap[key]}: ${block.open}-${block.close}`);
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

  // Inject the current date in the org's timezone so the LLM doesn't pick
  // dates from its training cutoff when building tool-call arguments
  // (observed: Claude passing 2025-01-XX in 2026-05 calls, which then makes
  // Cal.com return zero slots because the query is in the past).
  const tz = ctx.businessHours.timezone;
  const nowInTz = new Date().toLocaleString(lang === "en-US" ? "en-US" : "pt-BR", {
    timeZone: tz,
    dateStyle: "full",
    timeStyle: "short",
  });

  if (lang === "en-US") {
    return [
      "You are a friendly, professional AI receptionist. Speak naturally, keep responses short (1-2 sentences), and never sound robotic.",
      "Always confirm details verbally before booking. If you are unsure, say so honestly and offer to transfer.",
      "If the caller asks something outside the knowledge base, do not invent. Use the lookup_kb tool first.",
      "When you need a moment for a tool call (>300ms), say 'one moment, please' before invoking it.",
      "After every tool call, you MUST speak — never go silent. If `check_availability` returns no slots, say so out loud and ask the caller for a different day or time. If a tool errors, apologize briefly and offer to transfer or take a message. Never let a tool result sit without a verbal reply.",
      "When the caller is fully done (appointment booked and confirmed, question answered, they said goodbye), say a brief farewell out loud THEN call `end_call` to hang up. Don't keep the line open waiting for them to disconnect.",
      "",
      `Current date/time: ${nowInTz} (${tz}). When the caller says "tomorrow", "next Monday", etc., resolve against this — never use older dates from your training data.`,
      `Business hours: ${hours}`,
      "",
      "Knowledge base (verbatim, quote when relevant):",
      kb,
      "",
      "Persona instructions:",
      ctx.personaPrompt || "Be warm, concise, and helpful.",
    ].join("\n");
  }

  return [
    "Você é uma recepcionista virtual amigável e profissional. Fale de forma natural, respostas curtas (1-2 frases), e nunca pareça robótica.",
    "Sempre confirme detalhes verbalmente antes de marcar. Se ficar em dúvida, seja honesta e ofereça transferir pra um humano.",
    "Se o cliente perguntar algo fora da base de conhecimento, não invente. Use a tool lookup_kb primeiro.",
    "Quando precisar de um momento pra usar uma ferramenta (>300ms), diga 'um momentinho' antes de chamá-la.",
    "Depois de cada chamada de ferramenta, você DEVE falar, nunca fique em silêncio. Se `check_availability` retornar sem horários, diga isso em voz alta e pergunte se o cliente tem outro dia ou horário em mente. Se uma ferramenta der erro, peça desculpa rapidinho e ofereça transferir ou anotar um recado. Nunca deixe um resultado de ferramenta sem resposta falada.",
    "Quando o cliente estiver totalmente atendido (consulta marcada e confirmada, dúvida respondida, ou ele se despediu), diga uma despedida curta em voz alta e DEPOIS chame `end_call` pra encerrar a chamada. Não deixe a linha aberta esperando o cliente desligar.",
    "",
    `Data/hora agora: ${nowInTz} (${tz}). Quando o cliente disser "amanhã", "segunda que vem", etc., resolva contra essa data — nunca use datas antigas vindas do seu treinamento.`,
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
