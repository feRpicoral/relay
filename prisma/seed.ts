#!/usr/bin/env tsx

// Demo seed, Clínica Lumen. Populates the demo org with agents, knowledge
// docs, phone numbers, ~2 months of calls (transcripts, tool calls, latency
// metrics), campaigns with leads and attempts, invites and audit entries,
// then links a real Supabase auth user to the org as ADMIN and points their
// `app_metadata.active_org_id` at it so the app opens straight into the demo.
//
//   yarn seed                        # interactive user picker (recommended)
//   DEMO_USER_ID=<uuid> yarn seed    # non-interactive
//
// Re-running wipes and regenerates the demo org's data; other orgs are never
// touched. We run via `yarn seed` rather than `prisma db seed` because
// Prisma's child-process spawning swallows stdin in some setups, which breaks
// the interactive prompt (the script stays wired in prisma.config.ts for
// environments where `prisma db seed` is preferred).

import { randomUUID } from "node:crypto";

import { input, select } from "@inquirer/prompts";
import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "@prisma/client";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { customAlphabet } from "nanoid";
import pc from "picocolors";

import { encryptSecret } from "@/lib/crypto";
import type { BookAppointmentInput, BookAppointmentOutput } from "@/lib/voice/tool-schemas";
import type { BusinessHours } from "@/lib/voice/types";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Fill it in .env.local before running the seeder.");
}
if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
}
if (!supabaseSecretKey) {
  throw new Error("SUPABASE_SECRET_KEY is not set.");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });
const roomId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);
const inviteToken = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 32);

const DEMO_ORG_SLUG = "clinica-lumen-demo";
const DEMO_ORG_NAME = "Clínica Lumen";
// São Paulo has had no DST since 2019, so a fixed -03:00 offset is exact and
// keeps generated call times inside business hours regardless of the machine
// timezone the seed runs on.
const SP_OFFSET = "-03:00";
const MAIN_LINE = "+551130000000";
const CAMPAIGN_LINE = "+551130000001";
const FALLBACK_TRANSFER = "+5511987654321";
const HISTORY_DAYS = 65;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// -----------------------------------------------------------------------------
// Supabase user selection (mirrors sonar's seed UX)
// -----------------------------------------------------------------------------

interface AuthUserSummary {
  id: string;
  email: string;
  name: string;
}

function makeAdminClient(): SupabaseClient {
  return createSupabaseClient(supabaseUrl!, supabaseSecretKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function summarize(u: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): AuthUserSummary {
  const meta = (u.user_metadata ?? {}) as { full_name?: unknown; name?: unknown };
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    u.email ||
    u.id;
  return { id: u.id, email: u.email ?? "(no email)", name };
}

async function fetchSupabaseUser(admin: SupabaseClient, userId: string): Promise<AuthUserSummary> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) {
    throw new Error(
      `No Supabase auth user with id ${userId}. Sign up via the app first, then re-run the seed.`,
    );
  }
  return summarize(data.user);
}

async function resolveDemoUser(admin: SupabaseClient): Promise<AuthUserSummary> {
  const fromEnv = process.env.DEMO_USER_ID?.trim();
  if (fromEnv) {
    if (!UUID_REGEX.test(fromEnv)) {
      throw new Error(`DEMO_USER_ID is not a valid UUID: ${fromEnv}`);
    }
    return fetchSupabaseUser(admin, fromEnv);
  }

  const method = await select<"browse" | "manual">({
    message: "How do you want to pick the demo user?",
    choices: [
      { name: "Browse Supabase users (recommended)", value: "browse" },
      { name: "Enter UUID manually", value: "manual" },
    ],
    default: "browse",
  });

  if (method === "manual") {
    const id = await input({
      message: "Supabase user UUID:",
      validate: (v) => UUID_REGEX.test(v.trim()) || "Not a valid UUID",
    });
    return fetchSupabaseUser(admin, id.trim());
  }

  process.stdout.write(pc.dim("Loading users from Supabase...\n"));
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 100 });
  if (error) throw error;
  const users = data.users.map(summarize);
  if (users.length === 0) {
    throw new Error("No Supabase users found. Sign up via the app first.");
  }

  const selectedId = await select<string>({
    message: "Pick a user:",
    pageSize: 12,
    choices: users.map((u) => ({
      name: `${u.name}  ${pc.dim(`<${u.email}>`)}  ${pc.gray(u.id)}`,
      value: u.id,
      short: u.name,
    })),
  });

  return users.find((u) => u.id === selectedId)!;
}

/**
 * The app resolves the current org from `app_metadata.active_org_id`
 * (lib/auth/session.ts); a membership row alone is not enough to land in the
 * demo org, so the seed points the metadata at it and reports the previous
 * value for manual rollback.
 */
async function setActiveOrg(
  admin: SupabaseClient,
  userId: string,
  orgId: string,
): Promise<string | null> {
  const { data: existing } = await admin.auth.admin.getUserById(userId);
  const previousMetadata = (existing.user?.app_metadata ?? {}) as Record<string, unknown>;
  const previous =
    typeof previousMetadata.active_org_id === "string" ? previousMetadata.active_org_id : null;
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...previousMetadata, active_org_id: orgId },
  });
  if (error) throw error;
  return previous;
}

// -----------------------------------------------------------------------------
// Optional live Cartesia voice lookup so seeded agents can take test calls
// -----------------------------------------------------------------------------

async function fetchCartesiaVoiceIds(): Promise<string[]> {
  const apiKey = process.env.CARTESIA_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch("https://api.cartesia.ai/voices?limit=100", {
      headers: { "X-API-Key": apiKey, "Cartesia-Version": "2024-11-13" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: Array<{ id: string; language?: string | null }> };
    return (json.data ?? [])
      .filter((v) => (v.language ?? "").toLowerCase().startsWith("pt"))
      .map((v) => v.id);
  } catch {
    return [];
  }
}

// -----------------------------------------------------------------------------
// Static demo content
// -----------------------------------------------------------------------------

const RECEPTION_HOURS: BusinessHours = {
  timezone: "America/Sao_Paulo",
  monday: { open: "08:00", close: "19:00" },
  tuesday: { open: "08:00", close: "19:00" },
  wednesday: { open: "08:00", close: "19:00" },
  thursday: { open: "08:00", close: "19:00" },
  friday: { open: "08:00", close: "19:00" },
  saturday: { open: "08:00", close: "13:00" },
};

const CAMPAIGN_HOURS: BusinessHours = {
  timezone: "America/Sao_Paulo",
  monday: { open: "09:00", close: "18:00" },
  tuesday: { open: "09:00", close: "18:00" },
  wednesday: { open: "09:00", close: "18:00" },
  thursday: { open: "09:00", close: "18:00" },
  friday: { open: "09:00", close: "18:00" },
};

const RECEPTION_KB: Array<{ title: string; body: string }> = [
  {
    title: "Política de cancelamento",
    body: "Cancelamentos com mais de 24h de antecedência: sem cobrança. Cancelamentos com menos de 24h: cobrança de 50% da consulta. Reagendamentos são gratuitos a qualquer momento.",
  },
  {
    title: "Convênios aceitos",
    body: "Aceitamos Unimed, Bradesco Saúde, SulAmérica e Amil. Para particular, oferecemos parcelamento em até 3x sem juros. Confirme a cobertura com a recepção antes da consulta.",
  },
  {
    title: "Localização e estacionamento",
    body: "Av. Paulista, 1234 - Bela Vista, São Paulo. Estacionamento conveniado no Shopping Cidade SP, com desconto mediante validação na recepção.",
  },
  {
    title: "Horários e especialidades",
    body: "Atendimento de segunda a sexta, 8h às 19h, e sábado, 8h às 13h. Especialidades: ortopedia, fisioterapia e RPG. Dr. Marcos atende às terças e quintas. Dra. Renata atende quartas e sextas.",
  },
  {
    title: "Preparo para exames de imagem",
    body: "Raio-X e ultrassom articular não exigem preparo. Ressonância magnética: chegar 30 minutos antes, sem objetos metálicos, e informar próteses ou marca-passo no agendamento.",
  },
  {
    title: "Valores particulares",
    body: "Consulta ortopédica particular: R$ 380. Sessão de fisioterapia: R$ 160. Pacote com 10 sessões de fisioterapia: R$ 1.400. Aceitamos PIX, cartão e parcelamento em até 3x.",
  },
];

const CAMPAIGN_KB: Array<{ title: string; body: string }> = [
  {
    title: "Roteiro de confirmação",
    body: "Confirme nome do paciente, data e horário da consulta. Se o paciente não puder comparecer, ofereça os dois próximos horários livres antes de desistir. Nunca cancele sem oferecer reagendamento.",
  },
  {
    title: "Política de remarcação",
    body: "Remarcações são gratuitas. Pacientes com duas faltas seguidas sem aviso entram na lista de confirmação obrigatória por telefone.",
  },
];

interface TranscriptTurn {
  speaker: "USER" | "AGENT";
  text: string;
  ms: number;
}

type ToolKind = "booking" | "transfer" | "kb";

interface CallTemplate {
  outcome: "SCHEDULED" | "QUALIFIED" | "TRANSFERRED" | "NOT_QUALIFIED" | "OTHER";
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  summary: string;
  topics: string[];
  tools: ToolKind[];
  turns: TranscriptTurn[];
}

const INBOUND_TEMPLATES: CallTemplate[] = [
  {
    outcome: "SCHEDULED",
    sentiment: "POSITIVE",
    summary:
      "Paciente agendou consulta de ortopedia para a próxima semana com a Dra. Renata. Confirmou convênio Unimed.",
    topics: ["agendamento", "ortopedia", "convênio"],
    tools: ["booking"],
    turns: [
      {
        speaker: "AGENT",
        text: "Olá! Obrigada por ligar para a Clínica Lumen. Como posso ajudar?",
        ms: 0,
      },
      { speaker: "USER", text: "Oi, eu queria marcar uma consulta de ortopedia.", ms: 3500 },
      { speaker: "AGENT", text: "Claro! Posso pegar seu nome, por favor?", ms: 6800 },
      { speaker: "USER", text: "João Carlos Silva.", ms: 9200 },
      { speaker: "AGENT", text: "Perfeito, João. Você tem preferência de horário?", ms: 11500 },
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
    outcome: "SCHEDULED",
    sentiment: "POSITIVE",
    summary:
      "Paciente remarcou a sessão de fisioterapia de sexta para segunda-feira no mesmo horário.",
    topics: ["remarcação", "fisioterapia"],
    tools: ["booking"],
    turns: [
      { speaker: "AGENT", text: "Clínica Lumen, bom dia! Em que posso ajudar?", ms: 0 },
      {
        speaker: "USER",
        text: "Bom dia. Tenho fisioterapia marcada pra sexta mas surgiu um imprevisto, dá pra remarcar?",
        ms: 2800,
      },
      {
        speaker: "AGENT",
        text: "Dá sim, e a remarcação é gratuita. Pode ser na segunda-feira no mesmo horário, às 14h?",
        ms: 9500,
      },
      { speaker: "USER", text: "Pode, perfeito.", ms: 15200 },
      {
        speaker: "AGENT",
        text: "Prontinho, remarcado para segunda às 14h. Te esperamos!",
        ms: 17400,
      },
      { speaker: "USER", text: "Valeu, obrigada!", ms: 21000 },
    ],
  },
  {
    outcome: "QUALIFIED",
    sentiment: "NEUTRAL",
    summary:
      "Paciente ligou para saber sobre cirurgia de menisco. Foi orientada que precisa de avaliação prévia e pediu retorno da Dra. Renata.",
    topics: ["cirurgia", "menisco", "avaliação"],
    tools: ["kb"],
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
        text: "Sem problemas! Posso anotar seu telefone e a Dra. Renata te liga pra explicar o processo?",
        ms: 14000,
      },
      { speaker: "USER", text: "Pode ser, é 11 99999-1234.", ms: 19500 },
      { speaker: "AGENT", text: "Anotado. Em até 48h ela retorna. Mais alguma coisa?", ms: 23000 },
      { speaker: "USER", text: "Não, obrigada.", ms: 26500 },
    ],
  },
  {
    outcome: "QUALIFIED",
    sentiment: "NEUTRAL",
    summary:
      "Paciente perguntou o valor da consulta particular e do pacote de fisioterapia. Vai conversar com a família e retornar.",
    topics: ["preço", "particular", "fisioterapia"],
    tools: ["kb"],
    turns: [
      { speaker: "AGENT", text: "Clínica Lumen, boa tarde!", ms: 0 },
      {
        speaker: "USER",
        text: "Boa tarde. Quanto custa a consulta com ortopedista sem convênio?",
        ms: 2400,
      },
      {
        speaker: "AGENT",
        text: "A consulta particular custa R$ 380, com parcelamento em até 3x sem juros.",
        ms: 8100,
      },
      { speaker: "USER", text: "E a fisioterapia?", ms: 13000 },
      {
        speaker: "AGENT",
        text: "A sessão avulsa sai R$ 160, e o pacote com 10 sessões, R$ 1.400.",
        ms: 15400,
      },
      {
        speaker: "USER",
        text: "Entendi. Vou conversar com minha esposa e ligo de volta.",
        ms: 21000,
      },
      { speaker: "AGENT", text: "Combinado! Estamos à disposição.", ms: 24800 },
    ],
  },
  {
    outcome: "TRANSFERRED",
    sentiment: "NEGATIVE",
    summary:
      "Paciente pediu para falar com o financeiro sobre uma cobrança duplicada. Transferido para a recepção.",
    topics: ["financeiro", "cobrança", "transferência"],
    tools: ["transfer"],
    turns: [
      { speaker: "AGENT", text: "Olá, Clínica Lumen!", ms: 0 },
      {
        speaker: "USER",
        text: "Eu recebi uma cobrança duplicada na fatura, queria falar com o financeiro.",
        ms: 2200,
      },
      {
        speaker: "AGENT",
        text: "Entendo, vou te transferir para a equipe da recepção que cuida da parte financeira. Um momento.",
        ms: 7800,
      },
    ],
  },
  {
    outcome: "NOT_QUALIFIED",
    sentiment: "NEUTRAL",
    summary:
      "Paciente procurava dermatologista. Informado que a clínica atende apenas ortopedia, fisioterapia e RPG.",
    topics: ["especialidade", "dermatologia"],
    tools: ["kb"],
    turns: [
      { speaker: "AGENT", text: "Clínica Lumen, olá!", ms: 0 },
      { speaker: "USER", text: "Oi, queria marcar com um dermatologista.", ms: 2500 },
      {
        speaker: "AGENT",
        text: "Aqui na Lumen atendemos ortopedia, fisioterapia e RPG. Dermatologia não temos, infelizmente.",
        ms: 5600,
      },
      { speaker: "USER", text: "Ah, entendi. Obrigado então.", ms: 12000 },
      { speaker: "AGENT", text: "Disponha! Melhoras pra você.", ms: 14300 },
    ],
  },
  {
    outcome: "OTHER",
    sentiment: "NEUTRAL",
    summary: "Cliente perguntou se aceitamos PIX. Confirmado e enviado QR Code por WhatsApp.",
    topics: ["pagamento", "pix"],
    tools: ["kb"],
    turns: [
      { speaker: "AGENT", text: "Olá, Clínica Lumen!", ms: 0 },
      { speaker: "USER", text: "Vocês aceitam PIX?", ms: 2000 },
      {
        speaker: "AGENT",
        text: "Sim, aceitamos! Posso te mandar o QR Code por WhatsApp. Qual seu número?",
        ms: 4500,
      },
      { speaker: "USER", text: "11 98888-7777.", ms: 8500 },
      { speaker: "AGENT", text: "Pronto, enviado. Mais alguma coisa?", ms: 11000 },
      { speaker: "USER", text: "Não, obrigado.", ms: 13800 },
    ],
  },
  {
    outcome: "OTHER",
    sentiment: "NEUTRAL",
    summary:
      "Paciente confirmou o endereço e perguntou sobre estacionamento antes da consulta de amanhã.",
    topics: ["endereço", "estacionamento"],
    tools: ["kb"],
    turns: [
      { speaker: "AGENT", text: "Clínica Lumen, bom dia!", ms: 0 },
      {
        speaker: "USER",
        text: "Bom dia! Minha consulta é amanhã, é na Paulista mesmo? Tem estacionamento?",
        ms: 2600,
      },
      {
        speaker: "AGENT",
        text: "Isso, Av. Paulista, 1234, Bela Vista. Temos convênio com o estacionamento do Shopping Cidade SP, é só validar o ticket na recepção.",
        ms: 8900,
      },
      { speaker: "USER", text: "Ótimo, obrigada!", ms: 16500 },
      { speaker: "AGENT", text: "Até amanhã!", ms: 18200 },
    ],
  },
];

const CONFIRMATION_TEMPLATE: CallTemplate = {
  outcome: "OTHER",
  sentiment: "POSITIVE",
  summary: "Paciente confirmou presença na consulta agendada. Nenhuma alteração necessária.",
  topics: ["confirmação", "consulta"],
  tools: [],
  turns: [
    {
      speaker: "AGENT",
      text: "Olá! Aqui é o Diego, da Clínica Lumen. Estou ligando para confirmar sua consulta desta semana. Você pode falar?",
      ms: 0,
    },
    { speaker: "USER", text: "Oi, posso sim.", ms: 6500 },
    {
      speaker: "AGENT",
      text: "Perfeito! Sua consulta está marcada com a Dra. Renata. Posso confirmar sua presença?",
      ms: 9000,
    },
    { speaker: "USER", text: "Pode confirmar, eu vou sim.", ms: 15000 },
    {
      speaker: "AGENT",
      text: "Confirmado! Lembrando que temos estacionamento conveniado no Shopping Cidade SP. Até lá!",
      ms: 18000,
    },
    { speaker: "USER", text: "Obrigado, até!", ms: 24000 },
  ],
};

const REACTIVATION_TEMPLATE: CallTemplate = {
  outcome: "SCHEDULED",
  sentiment: "POSITIVE",
  summary:
    "Paciente sem consultas há 6 meses aceitou agendar uma reavaliação ortopédica para a próxima semana.",
  topics: ["reativação", "reavaliação", "agendamento"],
  tools: ["booking"],
  turns: [
    {
      speaker: "AGENT",
      text: "Olá! Aqui é o Diego, da Clínica Lumen. Notamos que faz um tempinho desde sua última consulta e queríamos saber como você está.",
      ms: 0,
    },
    {
      speaker: "USER",
      text: "Oi! Verdade, acabei deixando de lado. O joelho ainda incomoda.",
      ms: 8000,
    },
    {
      speaker: "AGENT",
      text: "Então vale uma reavaliação com o Dr. Marcos. Tenho horário na terça às 10h ou quinta às 16h. Alguma serve?",
      ms: 14000,
    },
    { speaker: "USER", text: "Quinta às 16h fica bom.", ms: 22000 },
    {
      speaker: "AGENT",
      text: "Agendado! Você recebe a confirmação por WhatsApp. Melhoras para esse joelho!",
      ms: 25000,
    },
    { speaker: "USER", text: "Obrigado, viu? Tchau!", ms: 31000 },
  ],
};

const PATIENT_NAMES = [
  "João Carlos Silva",
  "Maria Fernanda Costa",
  "Roberto Almeida",
  "Ana Beatriz Rocha",
  "Carlos Eduardo Nunes",
  "Juliana Martins",
  "Fernanda Oliveira",
  "Pedro Henrique Souza",
  "Camila Ribeiro",
  "Lucas Gabriel Ferreira",
  "Patrícia Mendes",
  "Ricardo Barbosa",
  "Larissa Cardoso",
  "Bruno Teixeira",
  "Beatriz Gonçalves",
  "Gustavo Lima",
  "Aline Duarte",
  "Marcelo Pinto",
  "Renata Freitas",
  "Thiago Azevedo",
  "Vanessa Moraes",
  "Eduardo Campos",
  "Sofia Correia",
  "André Luiz Ramos",
];

const APPOINTMENT_TYPES: Array<{ name: string; durationMin: number }> = [
  { name: "Consulta ortopédica", durationMin: 30 },
  { name: "Avaliação de fisioterapia", durationMin: 45 },
  { name: "Sessão de fisioterapia", durationMin: 60 },
  { name: "RPG", durationMin: 50 },
];

const BOOKING_REASONS = [
  "Dor no joelho ao caminhar",
  "Avaliação pós-cirúrgica",
  "Dor lombar recorrente",
  "Fisioterapia para ombro",
  "Reavaliação de entorse no tornozelo",
];

// -----------------------------------------------------------------------------
// Generation helpers
// -----------------------------------------------------------------------------

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(arr: T[]): T => arr[rand(arr.length)]!;

// Weighted toward the morning and mid-afternoon peaks so the analytics
// heatmap shows a plausible reception load instead of uniform noise.
const HOUR_POOL = [8, 9, 9, 10, 10, 10, 11, 11, 12, 14, 14, 15, 15, 15, 16, 16, 17, 17, 18];

function saoPauloDate(daysBack: number, hour: number, minute: number): Date {
  const day = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const iso = day.toISOString().slice(0, 10);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${iso}T${hh}:${mm}:00${SP_OFFSET}`);
}

function futureSlotIso(daysAhead: number): string {
  const day = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  const iso = day.toISOString().slice(0, 10);
  const slot = pick(["09:00", "10:30", "14:00", "15:30", "16:00"]);
  return new Date(`${iso}T${slot}:00${SP_OFFSET}`).toISOString();
}

function callerPhone(i: number): string {
  return `+55119${String(88880000 + i * 137).padStart(8, "0")}`;
}

function leadPhone(campaign: number, i: number): string {
  return `+55119${String(77000000 + campaign * 10000 + i * 91).padStart(8, "0")}`;
}

interface GeneratedCall {
  call: Prisma.CallCreateManyInput;
  transcripts: Prisma.TranscriptCreateManyInput[];
  toolCalls: Prisma.ToolCallCreateManyInput[];
  metrics: Prisma.CallMetricCreateManyInput[];
}

interface BuildCallOptions {
  orgId: string;
  agentId: string;
  phoneNumberId: string;
  direction: "INBOUND" | "OUTBOUND";
  callerE164: string;
  calleeE164: string;
  startedAt: Date;
  status: "COMPLETED" | "NO_ANSWER" | "VOICEMAIL" | "FAILED";
  template: CallTemplate;
  bookingSlotIso?: string;
}

function buildCall(opts: BuildCallOptions): GeneratedCall {
  const callId = randomUUID();
  const { orgId, startedAt, template } = opts;

  const base: Prisma.CallCreateManyInput = {
    id: callId,
    orgId,
    agentId: opts.agentId,
    phoneNumberId: opts.phoneNumberId,
    callerE164: opts.callerE164,
    calleeE164: opts.calleeE164,
    direction: opts.direction,
    status: opts.status,
    livekitRoomName: `call-${roomId()}`,
    startedAt,
  };

  if (opts.status !== "COMPLETED") {
    const ringMs = 15_000 + rand(15_000);
    return {
      call: {
        ...base,
        endedAt: new Date(startedAt.getTime() + ringMs),
        outcome: opts.status === "FAILED" ? null : "NO_ANSWER",
        processedAt: new Date(startedAt.getTime() + ringMs),
      },
      transcripts: [],
      toolCalls: [],
      metrics: [],
    };
  }

  const lastTurn = template.turns[template.turns.length - 1]!;
  const durationMs = lastTurn.ms + 4_000 + rand(3_000);
  const endedAt = new Date(startedAt.getTime() + durationMs);
  const at = (offsetMs: number) => new Date(startedAt.getTime() + offsetMs);

  const call: Prisma.CallCreateManyInput = {
    ...base,
    answeredAt: at(1_500),
    endedAt,
    durationMs,
    outcome: template.outcome,
    summary: template.summary,
    topics: template.topics,
    sentiment: template.sentiment,
    costCents: 4 + Math.round(durationMs / 12_000) + rand(4),
    processedAt: endedAt,
  };

  const transcripts: Prisma.TranscriptCreateManyInput[] = template.turns.map((turn, i) => {
    const next = template.turns[i + 1];
    return {
      orgId,
      callId,
      speaker: turn.speaker,
      text: turn.text,
      startMs: turn.ms,
      endMs: next ? next.ms : turn.ms + 2_500,
      isFinal: true,
      confidence: turn.speaker === "USER" ? 0.86 + rand(12) / 100 : null,
      sentiment: turn.speaker === "USER" ? template.sentiment : null,
    };
  });

  const toolCalls: Prisma.ToolCallCreateManyInput[] = [];
  const midMs = Math.floor(durationMs / 2);

  for (const tool of template.tools) {
    if (tool === "kb") {
      const toolMs = 250 + rand(300);
      toolCalls.push({
        orgId,
        callId,
        name: "lookup_kb",
        inputJson: { query: template.topics.join(" ") },
        outputJson: { chunks: RECEPTION_KB.slice(0, 2).map((d) => `${d.title}: ${d.body}`) },
        startedAt: at(midMs),
        endedAt: at(midMs + toolMs),
        durationMs: toolMs,
      });
    }
    if (tool === "transfer") {
      const toolMs = 900 + rand(600);
      toolCalls.push({
        orgId,
        callId,
        name: "transfer_to_human",
        inputJson: { reason: template.summary },
        outputJson: { ok: true, transferredTo: FALLBACK_TRANSFER },
        startedAt: at(durationMs - 3_000),
        endedAt: at(durationMs - 3_000 + toolMs),
        durationMs: toolMs,
      });
    }
    if (tool === "booking") {
      const appointment = pick(APPOINTMENT_TYPES);
      const slotIso =
        opts.bookingSlotIso ??
        new Date(startedAt.getTime() + (1 + rand(10)) * 24 * 60 * 60 * 1000).toISOString();
      const availabilityMs = 500 + rand(400);
      toolCalls.push({
        orgId,
        callId,
        name: "check_availability",
        inputJson: {
          from: startedAt.toISOString(),
          to: new Date(startedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          durationMin: appointment.durationMin,
        },
        outputJson: { slots: [slotIso, futureSlotIso(3 + rand(5)), futureSlotIso(6 + rand(5))] },
        startedAt: at(midMs - 4_000),
        endedAt: at(midMs - 4_000 + availabilityMs),
        durationMs: availabilityMs,
      });
      const bookingInput: BookAppointmentInput = {
        slotIso,
        durationMin: appointment.durationMin,
        patientName: pick(PATIENT_NAMES),
        patientPhone: opts.direction === "INBOUND" ? opts.callerE164 : opts.calleeE164,
        reason: pick(BOOKING_REASONS),
        eventTypeName: appointment.name,
      };
      const bookingOutput: BookAppointmentOutput = {
        confirmationId: `bkg_${roomId()}`,
        status: "ACCEPTED",
      };
      const bookingMs = 700 + rand(500);
      toolCalls.push({
        orgId,
        callId,
        name: "book_appointment",
        inputJson: bookingInput,
        outputJson: bookingOutput,
        startedAt: at(midMs),
        endedAt: at(midMs + bookingMs),
        durationMs: bookingMs,
      });
    }
  }

  // Transferred calls end via the SIP REFER, not the agent's end_call tool.
  if (!template.tools.includes("transfer")) {
    toolCalls.push({
      orgId,
      callId,
      name: "end_call",
      inputJson: { farewell: lastTurn.text, summary: template.summary },
      startedAt: at(durationMs - 1_000),
      endedAt: at(durationMs - 1_000),
      durationMs: 0,
    });
  }

  const metrics: Prisma.CallMetricCreateManyInput[] = [];
  const agentTurns = template.turns.filter((t) => t.speaker === "AGENT").length;
  for (let i = 0; i < Math.min(agentTurns, 4); i += 1) {
    metrics.push(
      { orgId, callId, leg: "END_TO_END", valueMs: 550 + rand(700), occurredAt: at(i * 8_000) },
      { orgId, callId, leg: "LLM_TTFT", valueMs: 180 + rand(260), occurredAt: at(i * 8_000) },
      { orgId, callId, leg: "TTS_TTFA", valueMs: 60 + rand(100), occurredAt: at(i * 8_000) },
    );
  }
  metrics.push(
    { orgId, callId, leg: "STT_FINALIZE", valueMs: 90 + rand(170), occurredAt: at(4_000) },
    { orgId, callId, leg: "LLM_TOTAL", valueMs: 420 + rand(650), occurredAt: at(4_000) },
  );
  if (toolCalls.length > 1) {
    metrics.push({
      orgId,
      callId,
      leg: "TOOL_TOTAL",
      valueMs: 350 + rand(600),
      occurredAt: at(midMs),
    });
  }

  return { call, transcripts, toolCalls, metrics };
}

function rollInboundStatus(): BuildCallOptions["status"] {
  const r = rand(100);
  if (r < 80) return "COMPLETED";
  if (r < 88) return "NO_ANSWER";
  if (r < 94) return "VOICEMAIL";
  return "FAILED";
}

function step(message: string): void {
  console.log(`${pc.dim(">")} ${message}`);
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(pc.bold("\nRelay demo seed\n"));

  const admin = makeAdminClient();
  const demoUser = await resolveDemoUser(admin);
  console.log(`\n${pc.green("Using")} ${pc.bold(demoUser.name)} ${pc.dim(`<${demoUser.email}>`)}`);
  console.log(`${pc.dim("id:")} ${pc.gray(demoUser.id)}\n`);

  const voiceIds = await fetchCartesiaVoiceIds();
  if (voiceIds.length > 0) {
    step(`Cartesia reachable, assigning real pt-BR voices (${voiceIds.length} available)`);
  } else {
    step("No CARTESIA_API_KEY (or no pt-BR voices); agents get an empty voice id");
  }

  const now = new Date();
  const receptionAgentId = randomUUID();
  const campaignAgentId = randomUUID();
  const mainPhoneId = randomUUID();
  const campaignPhoneId = randomUUID();

  step("Generating calls, transcripts, tool calls and metrics");
  const generated: GeneratedCall[] = [];

  // Recent history slightly busier than the previous period so the analytics
  // page shows positive deltas against the prior range.
  for (let daysBack = 1; daysBack <= HISTORY_DAYS; daysBack += 1) {
    const weekday = saoPauloDate(daysBack, 12, 0).getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const count = isWeekend ? rand(3) : daysBack <= 30 ? 4 + rand(5) : 3 + rand(4);
    for (let i = 0; i < count; i += 1) {
      generated.push(
        buildCall({
          orgId: "",
          agentId: receptionAgentId,
          phoneNumberId: mainPhoneId,
          direction: "INBOUND",
          callerE164: callerPhone(rand(40)),
          calleeE164: MAIN_LINE,
          startedAt: saoPauloDate(daysBack, pick(HOUR_POOL), rand(60)),
          status: rollInboundStatus(),
          template: pick(INBOUND_TEMPLATES),
        }),
      );
    }
  }

  // Today's calls sit within the last few hours so the overview widgets
  // (recent calls, today's outcomes) have something to show right after
  // seeding, and a few recent bookings land in the future for the calendar.
  for (let i = 0; i < 7; i += 1) {
    const startedAt = new Date(now.getTime() - (i + 1) * (45 + rand(45)) * 60 * 1000);
    const template = i < 3 ? INBOUND_TEMPLATES[0]! : pick(INBOUND_TEMPLATES);
    generated.push(
      buildCall({
        orgId: "",
        agentId: receptionAgentId,
        phoneNumberId: mainPhoneId,
        direction: "INBOUND",
        callerE164: callerPhone(rand(40)),
        calleeE164: MAIN_LINE,
        startedAt,
        status: i === 5 ? "NO_ANSWER" : "COMPLETED",
        template,
        bookingSlotIso: futureSlotIso(1 + rand(12)),
      }),
    );
  }

  step("Generating campaigns, leads and attempts");
  const campaigns: Prisma.CampaignCreateManyInput[] = [];
  const campaignLeads: Prisma.CampaignLeadCreateManyInput[] = [];
  const campaignAttempts: Prisma.CampaignAttemptCreateManyInput[] = [];

  interface CampaignSpec {
    name: string;
    status: "RUNNING" | "COMPLETED" | "DRAFT";
    scriptPrompt: string;
    template: CallTemplate;
    startedDaysAgo: number | null;
    completedDaysAgo: number | null;
    leads: Array<{
      status: "PENDING" | "REACHED" | "NO_ANSWER" | "VOICEMAIL" | "FAILED";
      attempts: number;
    }>;
  }

  const campaignSpecs: CampaignSpec[] = [
    {
      name: "Confirmação de consultas · semana atual",
      status: "RUNNING",
      scriptPrompt:
        "Ligue para confirmar a consulta da semana. Se o paciente não puder comparecer, ofereça os dois próximos horários livres antes de encerrar.",
      template: CONFIRMATION_TEMPLATE,
      startedDaysAgo: 5,
      completedDaysAgo: null,
      leads: [
        { status: "REACHED", attempts: 1 },
        { status: "REACHED", attempts: 1 },
        { status: "REACHED", attempts: 2 },
        { status: "REACHED", attempts: 1 },
        { status: "REACHED", attempts: 1 },
        { status: "REACHED", attempts: 2 },
        { status: "REACHED", attempts: 1 },
        { status: "REACHED", attempts: 1 },
        { status: "NO_ANSWER", attempts: 2 },
        { status: "NO_ANSWER", attempts: 1 },
        { status: "NO_ANSWER", attempts: 2 },
        { status: "VOICEMAIL", attempts: 1 },
        { status: "VOICEMAIL", attempts: 2 },
        { status: "FAILED", attempts: 1 },
        { status: "PENDING", attempts: 0 },
        { status: "PENDING", attempts: 0 },
        { status: "PENDING", attempts: 0 },
        { status: "PENDING", attempts: 0 },
      ],
    },
    {
      name: "Reativação de pacientes · mês passado",
      status: "COMPLETED",
      scriptPrompt:
        "Ligue para pacientes sem consultas há mais de 6 meses. Pergunte como estão e ofereça uma reavaliação com desconto.",
      template: REACTIVATION_TEMPLATE,
      startedDaysAgo: 25,
      completedDaysAgo: 18,
      leads: [
        { status: "REACHED", attempts: 1 },
        { status: "REACHED", attempts: 1 },
        { status: "REACHED", attempts: 2 },
        { status: "REACHED", attempts: 1 },
        { status: "REACHED", attempts: 2 },
        { status: "REACHED", attempts: 1 },
        { status: "NO_ANSWER", attempts: 3 },
        { status: "NO_ANSWER", attempts: 3 },
        { status: "VOICEMAIL", attempts: 3 },
        { status: "FAILED", attempts: 1 },
      ],
    },
    {
      name: "Pesquisa de satisfação",
      status: "DRAFT",
      scriptPrompt:
        "Pergunte de 1 a 5 como o paciente avalia o último atendimento e registre comentários.",
      template: CONFIRMATION_TEMPLATE,
      startedDaysAgo: null,
      completedDaysAgo: null,
      leads: [
        { status: "PENDING", attempts: 0 },
        { status: "PENDING", attempts: 0 },
        { status: "PENDING", attempts: 0 },
        { status: "PENDING", attempts: 0 },
        { status: "PENDING", attempts: 0 },
        { status: "PENDING", attempts: 0 },
      ],
    },
  ];

  campaignSpecs.forEach((spec, campaignIndex) => {
    const campaignId = randomUUID();
    campaigns.push({
      id: campaignId,
      orgId: "",
      agentId: campaignAgentId,
      name: spec.name,
      status: spec.status,
      fromPhoneNumberE164: CAMPAIGN_LINE,
      scriptPrompt: spec.scriptPrompt,
      workingHours: CAMPAIGN_HOURS as unknown as Prisma.InputJsonValue,
      maxAttempts: 3,
      cooldownMinutes: 60,
      concurrencyLimit: 2,
      startedAt:
        spec.startedDaysAgo === null ? null : saoPauloDate(spec.startedDaysAgo, 9, rand(30)),
      completedAt:
        spec.completedDaysAgo === null ? null : saoPauloDate(spec.completedDaysAgo, 17, rand(30)),
    });

    spec.leads.forEach((leadSpec, leadIndex) => {
      const leadId = randomUUID();
      const phoneE164 = leadPhone(campaignIndex, leadIndex);
      const windowStart = spec.startedDaysAgo ?? 0;
      const windowEnd = spec.completedDaysAgo ?? 1;

      let lastAttemptAt: Date | null = null;
      for (let attempt = 0; attempt < leadSpec.attempts; attempt += 1) {
        const daysBack = Math.max(
          windowEnd,
          windowStart - attempt - rand(Math.max(windowStart - windowEnd, 1)),
        );
        const startedAt = saoPauloDate(daysBack, 9 + rand(9), rand(60));
        const isFinalAttempt = attempt === leadSpec.attempts - 1;
        const status = !isFinalAttempt
          ? "NO_ANSWER"
          : leadSpec.status === "REACHED"
            ? "COMPLETED"
            : leadSpec.status === "PENDING"
              ? "NO_ANSWER"
              : leadSpec.status;
        const outcome =
          status === "COMPLETED" ? spec.template.outcome : status === "FAILED" ? null : "NO_ANSWER";

        const generatedCall = buildCall({
          orgId: "",
          agentId: campaignAgentId,
          phoneNumberId: campaignPhoneId,
          direction: "OUTBOUND",
          callerE164: CAMPAIGN_LINE,
          calleeE164: phoneE164,
          startedAt,
          status,
          template: spec.template,
        });
        generated.push(generatedCall);
        campaignAttempts.push({
          orgId: "",
          campaignId,
          leadId,
          callId: generatedCall.call.id,
          startedAt,
          endedAt: generatedCall.call.endedAt,
          outcome,
          errorMessage: status === "FAILED" ? "Carrier rejected the call (SIP 486)" : null,
        });
        if (!lastAttemptAt || startedAt > lastAttemptAt) lastAttemptAt = startedAt;
      }

      campaignLeads.push({
        id: leadId,
        orgId: "",
        campaignId,
        name: PATIENT_NAMES[(campaignIndex * 7 + leadIndex) % PATIENT_NAMES.length]!,
        phoneE164,
        status:
          leadSpec.status === "REACHED"
            ? "REACHED"
            : leadSpec.status === "PENDING"
              ? "PENDING"
              : leadSpec.status,
        attempts: leadSpec.attempts,
        lastAttemptAt,
        nextEligibleAt:
          spec.status === "RUNNING" &&
          (leadSpec.status === "NO_ANSWER" || leadSpec.status === "PENDING")
            ? new Date(now.getTime() + 60 * 60 * 1000)
            : null,
        reachedAt: leadSpec.status === "REACHED" ? lastAttemptAt : null,
        outcome: leadSpec.status === "REACHED" ? spec.template.outcome : null,
      });
    });
  });

  const totals = {
    calls: generated.length,
    transcripts: generated.reduce((sum, g) => sum + g.transcripts.length, 0),
    toolCalls: generated.reduce((sum, g) => sum + g.toolCalls.length, 0),
    metrics: generated.reduce((sum, g) => sum + g.metrics.length, 0),
  };
  step(
    `Prepared ${totals.calls} calls, ${totals.transcripts} transcripts, ${totals.toolCalls} tool calls, ${totals.metrics} metrics`,
  );

  const encryptionKey = process.env.ENCRYPTION_KEY;
  const calcomApiKeyEncrypted =
    encryptionKey && encryptionKey.length >= 32
      ? encryptSecret("cal_demo_placeholder_do_not_use")
      : null;

  step("Writing everything in one transaction");
  const orgId = await prisma.$transaction(
    async (tx) => {
      const org = await tx.organization.upsert({
        where: { slug: DEMO_ORG_SLUG },
        create: {
          name: DEMO_ORG_NAME,
          slug: DEMO_ORG_SLUG,
          timezone: "America/Sao_Paulo",
          defaultAgentLanguage: "PT_BR",
        },
        update: { name: DEMO_ORG_NAME },
      });

      // Wipe tenant data but keep the org row (and its id) stable so
      // `active_org_id` in Supabase metadata survives re-seeding.
      await tx.call.deleteMany({ where: { orgId: org.id } });
      await tx.campaign.deleteMany({ where: { orgId: org.id } });
      await tx.agent.deleteMany({ where: { orgId: org.id } });
      await tx.phoneNumber.deleteMany({ where: { orgId: org.id } });
      await tx.invite.deleteMany({ where: { orgId: org.id } });
      await tx.auditLog.deleteMany({ where: { orgId: org.id } });

      await tx.user.upsert({
        where: { id: demoUser.id },
        create: { id: demoUser.id, email: demoUser.email, name: demoUser.name },
        update: { email: demoUser.email, name: demoUser.name },
      });
      await tx.membership.upsert({
        where: { orgId_userId: { orgId: org.id, userId: demoUser.id } },
        create: { orgId: org.id, userId: demoUser.id, role: "ADMIN" },
        update: { role: "ADMIN" },
      });

      // Synthetic teammate (no auth.users row, cannot log in) so the members
      // page shows more than a single row.
      const teammate = await tx.user.upsert({
        where: { email: "patricia@clinicalumen.com.br" },
        create: {
          id: randomUUID(),
          email: "patricia@clinicalumen.com.br",
          name: "Patrícia Souza",
        },
        update: {},
      });
      await tx.membership.upsert({
        where: { orgId_userId: { orgId: org.id, userId: teammate.id } },
        create: { orgId: org.id, userId: teammate.id, role: "MEMBER" },
        update: {},
      });

      await tx.agent.create({
        data: {
          id: receptionAgentId,
          orgId: org.id,
          name: "Mariana · Recepção",
          language: "PT_BR",
          ttsProvider: "CARTESIA",
          voiceId: voiceIds[0] ?? "",
          greeting: "Olá! Obrigada por ligar para a Clínica Lumen. Como posso ajudar?",
          personaPrompt:
            "Você é Mariana, recepcionista virtual da Clínica Lumen, clínica de ortopedia e fisioterapia em São Paulo. Seja calorosa, eficiente e direta. Sempre confirme nome, horário e convênio antes de agendar. Consulte a base de conhecimento antes de responder dúvidas sobre preços, convênios ou preparo de exames.",
          fallbackTransferE164: FALLBACK_TRANSFER,
          businessHours: RECEPTION_HOURS as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.agent.create({
        data: {
          id: campaignAgentId,
          orgId: org.id,
          name: "Diego · Confirmações",
          language: "PT_BR",
          ttsProvider: "CARTESIA",
          voiceId: voiceIds[1] ?? voiceIds[0] ?? "",
          greeting: "Olá! Aqui é o Diego, da Clínica Lumen. Você pode falar agora?",
          personaPrompt:
            "Você é Diego, assistente de confirmações da Clínica Lumen. Você faz ligações ativas para confirmar consultas e reativar pacientes. Seja breve e respeitoso; se a pessoa não puder falar, ofereça retornar em outro horário.",
          fallbackTransferE164: FALLBACK_TRANSFER,
          businessHours: CAMPAIGN_HOURS as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.knowledgeDoc.createMany({
        data: [
          ...RECEPTION_KB.map((doc) => ({
            orgId: org.id,
            agentId: receptionAgentId,
            title: doc.title,
            body: doc.body,
          })),
          ...CAMPAIGN_KB.map((doc) => ({
            orgId: org.id,
            agentId: campaignAgentId,
            title: doc.title,
            body: doc.body,
          })),
        ],
      });

      await tx.phoneNumber.createMany({
        data: [
          {
            id: mainPhoneId,
            orgId: org.id,
            agentId: receptionAgentId,
            e164: MAIN_LINE,
            label: "Recepção principal",
            inbound: true,
            outbound: false,
          },
          {
            id: campaignPhoneId,
            orgId: org.id,
            agentId: campaignAgentId,
            e164: CAMPAIGN_LINE,
            label: "Linha de campanhas",
            inbound: false,
            outbound: true,
          },
        ],
      });

      const withOrg = <T extends { orgId: string }>(rows: T[]): T[] =>
        rows.map((row) => ({ ...row, orgId: org.id }));

      await tx.call.createMany({ data: withOrg(generated.map((g) => g.call)) });
      await tx.transcript.createMany({ data: withOrg(generated.flatMap((g) => g.transcripts)) });
      await tx.toolCall.createMany({ data: withOrg(generated.flatMap((g) => g.toolCalls)) });
      await tx.callMetric.createMany({ data: withOrg(generated.flatMap((g) => g.metrics)) });
      await tx.campaign.createMany({ data: withOrg(campaigns) });
      await tx.campaignLead.createMany({ data: withOrg(campaignLeads) });
      await tx.campaignAttempt.createMany({ data: withOrg(campaignAttempts) });

      await tx.invite.createMany({
        data: [
          {
            orgId: org.id,
            email: "financeiro@clinicalumen.com.br",
            role: "MEMBER" as const,
            token: inviteToken(),
            createdByUserId: demoUser.id,
            expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
          {
            orgId: org.id,
            email: "dr.marcos@clinicalumen.com.br",
            role: "ADMIN" as const,
            token: inviteToken(),
            createdByUserId: demoUser.id,
            expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        ],
      });

      if (calcomApiKeyEncrypted) {
        await tx.calcomConnection.upsert({
          where: { orgId: org.id },
          create: {
            orgId: org.id,
            apiKeyEncrypted: calcomApiKeyEncrypted,
            calcomUserEmail: "agenda@clinicalumen.com.br",
            defaultEventTypeId: 2048,
            timezone: "America/Sao_Paulo",
          },
          update: {
            apiKeyEncrypted: calcomApiKeyEncrypted,
            calcomUserEmail: "agenda@clinicalumen.com.br",
          },
        });
      }

      await tx.auditLog.createMany({
        data: [
          {
            orgId: org.id,
            userId: demoUser.id,
            action: "CREATE",
            entity: "ORGANIZATION",
            entityId: org.id,
            metadata: { name: DEMO_ORG_NAME, slug: DEMO_ORG_SLUG },
            createdAt: saoPauloDate(HISTORY_DAYS, 9, 0),
          },
          {
            orgId: org.id,
            userId: demoUser.id,
            action: "CREATE",
            entity: "AGENT",
            entityId: receptionAgentId,
            metadata: { name: "Mariana · Recepção" },
            createdAt: saoPauloDate(HISTORY_DAYS, 9, 30),
          },
          {
            orgId: org.id,
            userId: demoUser.id,
            action: "CREATE",
            entity: "AGENT",
            entityId: campaignAgentId,
            metadata: { name: "Diego · Confirmações" },
            createdAt: saoPauloDate(HISTORY_DAYS - 1, 10, 0),
          },
          {
            orgId: org.id,
            userId: demoUser.id,
            action: "CREATE",
            entity: "PHONE_NUMBER",
            entityId: mainPhoneId,
            metadata: { e164: MAIN_LINE },
            createdAt: saoPauloDate(HISTORY_DAYS - 1, 11, 0),
          },
          ...campaigns.map((c, i) => ({
            orgId: org.id,
            userId: demoUser.id,
            action: "CREATE",
            entity: "CAMPAIGN",
            entityId: c.id!,
            metadata: { name: c.name, leads: campaignSpecs[i]!.leads.length },
            createdAt: c.startedAt ?? saoPauloDate(2, 15, 0),
          })),
          {
            orgId: org.id,
            userId: demoUser.id,
            action: "UPDATE",
            entity: "AGENT",
            entityId: receptionAgentId,
            metadata: { field: "personaPrompt" },
            createdAt: saoPauloDate(3, 16, 20),
          },
        ],
      });

      return org.id;
    },
    { timeout: 120_000 },
  );
  step(`Demo org ready (${pc.gray(orgId)})`);

  step("Pointing app_metadata.active_org_id at the demo org");
  const previousOrgId = await setActiveOrg(admin, demoUser.id, orgId);

  console.log(`\n${pc.green(pc.bold("Done."))} Open ${pc.cyan("http://localhost:3000/overview")}`);
  console.log(pc.dim(`Seeded: ${totals.calls} calls across the last ${HISTORY_DAYS} days,`));
  console.log(
    pc.dim(
      `${totals.transcripts} transcript segments, ${totals.toolCalls} tool calls, ${campaigns.length} campaigns, ${campaignLeads.length} leads.`,
    ),
  );
  if (previousOrgId && previousOrgId !== orgId) {
    console.log(
      `${pc.yellow("note:")} previous active org was ${pc.gray(previousOrgId)}; restore it in Supabase app_metadata to switch back.`,
    );
  }
  if (!calcomApiKeyEncrypted) {
    console.log(
      `${pc.yellow("note:")} ENCRYPTION_KEY unset, skipped the Cal.com connection; the calendar page shows the connect state.`,
    );
  } else {
    console.log(
      `${pc.yellow("note:")} Cal.com connection uses a placeholder key; the calendar renders seeded bookings but live booking calls will fail until a real key is connected.`,
    );
  }
  if (voiceIds.length === 0) {
    console.log(
      `${pc.yellow("note:")} agents have no TTS voice; pick one in each agent's voice tab before making test calls.`,
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(
      `\n${pc.red("Seed failed:")} ${err instanceof Error ? err.message : String(err)}\n`,
    );
    await prisma.$disconnect();
    process.exit(1);
  });
