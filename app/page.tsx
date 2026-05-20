import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  MessageSquareText,
  Phone,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Phone,
    title: "Atende 24/7",
    body: "Cada ligação é atendida em segundos, com voz natural em português e inglês.",
  },
  {
    icon: CalendarClock,
    title: "Agenda durante a chamada",
    body: "O agente conversa, qualifica e marca direto no calendário da sua equipe.",
  },
  {
    icon: MessageSquareText,
    title: "Transcrição ao vivo",
    body: "Veja cada palavra em tempo real no dashboard — e assuma a chamada se precisar.",
  },
  {
    icon: BarChart3,
    title: "Analytics que importam",
    body: "Volume, conversão, latência p95 e custo por chamada. Sem ruído.",
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-primary/20 absolute top-0 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full blur-3xl" />
        <div className="to-background absolute inset-0 bg-gradient-to-b from-transparent" />
      </div>

      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-md">
            <Zap className="h-4 w-4" />
          </div>
          Relay
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Começar</Link>
          </Button>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24 text-center">
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/5 text-primary mb-6 gap-1.5"
        >
          <Sparkles className="h-3 w-3" />
          Voice AI para negócios de serviço
        </Badge>
        <h1 className="text-5xl leading-[1.05] font-semibold tracking-tight text-balance md:text-7xl">
          A recepcionista que <span className="text-primary">não dorme</span>.
        </h1>
        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg text-balance">
          Um agente de voz com IA que atende ligações, qualifica leads e agenda consultas em tempo
          real — enquanto sua equipe vê tudo acontecer no dashboard.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link href="/signup">
              Criar conta grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Já tenho conta</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group border-border bg-card/50 hover:border-primary/30 hover:bg-card rounded-xl border p-6 transition-all"
            >
              <Icon className="text-primary h-5 w-5" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-border border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
          <p className="text-muted-foreground text-sm">
            © 2026 Relay. Built for clinics and service teams.
          </p>
          <div className="text-muted-foreground flex items-center gap-4 text-sm">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Login
            </Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">
              Signup
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
