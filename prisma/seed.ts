#!/usr/bin/env tsx

/**
 * Demo data seeder, Clínica Lumen.
 *
 * Run with:
 *   yarn db:seed [--reset]
 *
 * The --reset flag wipes all tables first. Without it, the seed will skip
 * cleanly if the demo org already exists.
 */
import { PrismaClient } from "@prisma/client";
import { customAlphabet } from "nanoid";

const prisma = new PrismaClient();
const id = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

const DEMO_ORG_SLUG = "clinica-lumen-demo";

const KB_DOCS: Array<{ title: string; body: string }> = [
  {
    title: "Política de cancelamento",
    body: "Cancelamentos com mais de 24h de antecedência: sem cobrança. Cancelamentos com menos de 24h: cobrança de 50% da consulta. Reagendamentos são gratuitos a qualquer momento.",
  },
  {
    title: "Convênios aceitos",
    body: "Aceitamos Unimed, Bradesco Saúde, SulAmérica e Amil. Para particular, oferecemos parcelamento em até 3x sem juros. Confirme com a recepção antes da consulta.",
  },
  {
    title: "Localização e estacionamento",
    body: "Av. Paulista, 1234 - Bela Vista, São Paulo. Estacionamento conveniado no Shopping Cidade SP, com desconto mediante validação na recepção.",
  },
  {
    title: "Horários e especialidades",
    body: "Atendimento de segunda a sexta, 8h às 19h. Especialidades: ortopedia, fisioterapia, RPG. Dr. Marcos atende às terças e quintas. Dra. Renata atende quartas e sextas.",
  },
];

const SAMPLE_TRANSCRIPTS: Array<{
  outcome: "SCHEDULED" | "QUALIFIED" | "TRANSFERRED" | "NO_ANSWER" | "OTHER";
  summary: string;
  turns: Array<{ speaker: "USER" | "AGENT"; text: string; ms: number }>;
}> = [
  {
    outcome: "SCHEDULED",
    summary:
      "Paciente João agendou consulta de ortopedia para a próxima terça-feira com a Dra. Renata. Confirmou convênio Unimed.",
    turns: [
      {
        speaker: "AGENT",
        text: "Olá! Obrigada por ligar para a Clínica Lumen. Como posso ajudar?",
        ms: 0,
      },
      { speaker: "USER", text: "Oi, eu queria marcar uma consulta de ortopedia.", ms: 3500 },
      { speaker: "AGENT", text: "Claro! Posso pegar seu nome, por favor?", ms: 6800 },
      { speaker: "USER", text: "João Carlos Silva.", ms: 9200 },
      {
        speaker: "AGENT",
        text: "Perfeito, João. Você tem alguma preferência de horário?",
        ms: 11500,
      },
      { speaker: "USER", text: "De manhã se possível, na próxima semana.", ms: 14700 },
      {
        speaker: "AGENT",
        text: "Um momentinho, vou verificar os horários disponíveis.",
        ms: 18000,
      },
      {
        speaker: "AGENT",
        text: "Tenho terça-feira às 9h ou quinta às 10h30 com a Dra. Renata. Qual prefere?",
        ms: 21500,
      },
      { speaker: "USER", text: "Terça às 9h tá ótimo.", ms: 26000 },
      { speaker: "AGENT", text: "Você tem convênio ou é particular?", ms: 28200 },
      { speaker: "USER", text: "Unimed.", ms: 30800 },
      {
        speaker: "AGENT",
        text: "Pronto, João! Sua consulta está marcada para terça às 9h com a Dra. Renata. Vou te mandar a confirmação por WhatsApp.",
        ms: 33500,
      },
      { speaker: "USER", text: "Obrigado, tchau!", ms: 39000 },
      { speaker: "AGENT", text: "De nada, tenha um ótimo dia!", ms: 40500 },
    ],
  },
  {
    outcome: "QUALIFIED",
    summary:
      "Paciente Maria ligou para saber sobre cirurgia de menisco. Foi orientada que precisa de avaliação prévia. Quer ser contatada para agendar.",
    turns: [
      { speaker: "AGENT", text: "Olá, Clínica Lumen, em que posso ajudar?", ms: 0 },
      { speaker: "USER", text: "Vocês fazem cirurgia de menisco?", ms: 2800 },
      {
        speaker: "AGENT",
        text: "Realizamos sim, mas precisa de uma avaliação ortopédica primeiro. Posso agendar uma consulta?",
        ms: 5500,
      },
      { speaker: "USER", text: "Hmm, ainda não tenho certeza. Vou pensar.", ms: 11000 },
      {
        speaker: "AGENT",
        text: "Sem problemas! Posso anotar seu telefone e a Dra. Renata pode te ligar pra explicar o processo?",
        ms: 14000,
      },
      { speaker: "USER", text: "Pode ser, é 11 99999-1234.", ms: 19500 },
      { speaker: "AGENT", text: "Anotado. Em até 48h ela retorna. Mais alguma coisa?", ms: 23000 },
      { speaker: "USER", text: "Não, obrigada.", ms: 26500 },
    ],
  },
  {
    outcome: "TRANSFERRED",
    summary:
      "Paciente Roberto pediu para falar com o financeiro sobre uma cobrança duplicada. Transferimos pra Patricia (recepção).",
    turns: [
      { speaker: "AGENT", text: "Olá, Clínica Lumen!", ms: 0 },
      {
        speaker: "USER",
        text: "Eu recebi uma cobrança duplicada na fatura, queria falar com o financeiro.",
        ms: 2200,
      },
      {
        speaker: "AGENT",
        text: "Entendo, vou te transferir pra Patricia da recepção que cuida da parte financeira. Um momento.",
        ms: 7800,
      },
    ],
  },
  {
    outcome: "OTHER",
    summary:
      "Cliente perguntou se aceitamos PIX. Informamos que sim e mandamos QR Code por WhatsApp.",
    turns: [
      { speaker: "AGENT", text: "Olá, Clínica Lumen!", ms: 0 },
      { speaker: "USER", text: "Vocês aceitam PIX?", ms: 2000 },
      {
        speaker: "AGENT",
        text: "Sim, aceitamos! Posso te mandar o QR Code por WhatsApp. Qual seu número?",
        ms: 4500,
      },
      { speaker: "USER", text: "11 98888-7777.", ms: 8500 },
      { speaker: "AGENT", text: "Pronto, mandei. Mais alguma coisa?", ms: 11000 },
      { speaker: "USER", text: "Não, obrigado.", ms: 13800 },
    ],
  },
];

const SAMPLE_PHONES = [
  "+5511999991234",
  "+5511988887777",
  "+5511977776666",
  "+5511966665555",
  "+5511955554444",
  "+5511944443333",
  "+5511933332222",
  "+5511922221111",
  "+5511911110000",
  "+5521999998888",
];

async function main() {
  const reset = process.argv.includes("--reset");

  if (reset) {
    console.log("--reset: wiping existing demo data");
    await prisma.organization.deleteMany({ where: { slug: DEMO_ORG_SLUG } });
  }

  const existing = await prisma.organization.findUnique({ where: { slug: DEMO_ORG_SLUG } });
  if (existing) {
    console.log(`demo org already exists at slug=${DEMO_ORG_SLUG}. Use --reset to wipe.`);
    return;
  }

  console.log("creating Clínica Lumen demo org");
  const org = await prisma.organization.create({
    data: { name: "Clínica Lumen", slug: DEMO_ORG_SLUG },
  });

  // Agent
  console.log("creating PT-BR agent");
  const agent = await prisma.agent.create({
    data: {
      orgId: org.id,
      name: "Recepcionista Mariana",
      language: "PT_BR",
      ttsProvider: "CARTESIA",
      voiceId: "pt-br-mariana",
      greeting: "Olá! Obrigada por ligar para a Clínica Lumen. Como posso ajudar?",
      personaPrompt:
        "Você é Mariana, recepcionista virtual da Clínica Lumen, especializada em ortopedia. Seja calorosa, eficiente e direta. Sempre confirme detalhes antes de agendar.",
      fallbackTransferE164: "+5511987654321",
      businessHours: {
        timezone: "America/Sao_Paulo",
        monday: { open: "08:00", close: "19:00" },
        tuesday: { open: "08:00", close: "19:00" },
        wednesday: { open: "08:00", close: "19:00" },
        thursday: { open: "08:00", close: "19:00" },
        friday: { open: "08:00", close: "19:00" },
      },
    },
  });

  // Knowledge docs
  console.log("seeding knowledge base");
  for (const doc of KB_DOCS) {
    await prisma.knowledgeDoc.create({
      data: { orgId: org.id, agentId: agent.id, title: doc.title, body: doc.body },
    });
  }

  // Phone number
  console.log("seeding phone number");
  const phone = await prisma.phoneNumber.create({
    data: {
      orgId: org.id,
      agentId: agent.id,
      e164: "+551130000000",
      label: "Recepção principal",
    },
  });

  // Calls
  console.log("seeding 60 calls across the last 30 days");
  for (let i = 0; i < 60; i += 1) {
    const sample = SAMPLE_TRANSCRIPTS[i % SAMPLE_TRANSCRIPTS.length]!;
    const daysAgo = Math.floor(Math.random() * 30);
    const hour = 8 + Math.floor(Math.random() * 11);
    const minute = Math.floor(Math.random() * 60);
    const startedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    startedAt.setHours(hour, minute, 0, 0);
    const lastTurn = sample.turns[sample.turns.length - 1]!;
    const durationMs = lastTurn.ms + 4000 + Math.floor(Math.random() * 3000);
    const endedAt = new Date(startedAt.getTime() + durationMs);

    const callerE164 = SAMPLE_PHONES[i % SAMPLE_PHONES.length]!;

    const sentiment =
      sample.outcome === "SCHEDULED"
        ? "POSITIVE"
        : sample.outcome === "TRANSFERRED"
          ? "NEGATIVE"
          : "NEUTRAL";

    const call = await prisma.call.create({
      data: {
        orgId: org.id,
        agentId: agent.id,
        phoneNumberId: phone.id,
        callerE164,
        calleeE164: phone.e164,
        direction: "INBOUND",
        status: "COMPLETED",
        livekitRoomName: `call-${id()}`,
        startedAt,
        answeredAt: new Date(startedAt.getTime() + 1500),
        endedAt,
        durationMs,
        outcome: sample.outcome,
        summary: sample.summary,
        sentiment,
        topics:
          sample.outcome === "SCHEDULED"
            ? ["agendamento", "ortopedia", "convênio"]
            : sample.outcome === "TRANSFERRED"
              ? ["financeiro", "transferência"]
              : sample.outcome === "QUALIFIED"
                ? ["cirurgia", "menisco"]
                : ["pagamento"],
        costCents: 8 + Math.floor(Math.random() * 8),
        processedAt: endedAt,
      },
    });

    // Transcripts
    for (let t = 0; t < sample.turns.length; t += 1) {
      const turn = sample.turns[t]!;
      const next = sample.turns[t + 1];
      const endMs = next ? next.ms : turn.ms + 2500;
      await prisma.transcript.create({
        data: {
          orgId: org.id,
          callId: call.id,
          speaker: turn.speaker,
          text: turn.text,
          startMs: turn.ms,
          endMs,
          isFinal: true,
          sentiment: turn.speaker === "USER" ? sentiment : null,
        },
      });
    }

    // Metrics, vary so the histogram looks realistic
    const e2e = 600 + Math.floor(Math.random() * 500);
    await prisma.callMetric.create({
      data: {
        orgId: org.id,
        callId: call.id,
        leg: "END_TO_END",
        valueMs: e2e,
        occurredAt: startedAt,
      },
    });
    await prisma.callMetric.create({
      data: {
        orgId: org.id,
        callId: call.id,
        leg: "LLM_TTFT",
        valueMs: 200 + Math.floor(Math.random() * 250),
        occurredAt: startedAt,
      },
    });
    await prisma.callMetric.create({
      data: {
        orgId: org.id,
        callId: call.id,
        leg: "TTS_TTFA",
        valueMs: 60 + Math.floor(Math.random() * 80),
        occurredAt: startedAt,
      },
    });

    if (sample.outcome === "SCHEDULED" && Math.random() < 0.5) {
      await prisma.toolCall.create({
        data: {
          orgId: org.id,
          callId: call.id,
          name: "book_appointment",
          inputJson: {
            slotIso: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            durationMin: 30,
            patientName: "Paciente Exemplo",
            patientPhone: callerE164,
            reason: "Consulta ortopédica",
          },
          outputJson: { confirmationId: `book-${id()}`, status: "ACCEPTED" },
          startedAt: new Date(startedAt.getTime() + 25000),
          endedAt: new Date(startedAt.getTime() + 25400),
          durationMs: 400,
        },
      });
    }
  }

  console.log("demo seeded.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
