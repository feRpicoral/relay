import { Badge } from "@/components/ui/badge";

type CallStatus = "RINGING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "NO_ANSWER" | "VOICEMAIL";

const labels: Record<CallStatus, string> = {
  RINGING: "Tocando",
  IN_PROGRESS: "Em curso",
  COMPLETED: "Finalizada",
  FAILED: "Falhou",
  NO_ANSWER: "Sem resposta",
  VOICEMAIL: "Caixa postal",
};

const variants: Record<
  CallStatus,
  "default" | "secondary" | "destructive" | "success" | "warning" | "outline"
> = {
  RINGING: "warning",
  IN_PROGRESS: "default",
  COMPLETED: "success",
  FAILED: "destructive",
  NO_ANSWER: "secondary",
  VOICEMAIL: "secondary",
};

export function CallStatusBadge({ status }: { status: CallStatus }) {
  return (
    <Badge variant={variants[status]} className="gap-1.5">
      {status === "IN_PROGRESS" || status === "RINGING" ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      ) : null}
      {labels[status]}
    </Badge>
  );
}
