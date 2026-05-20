"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createKnowledgeDocAction, deleteKnowledgeDocAction } from "./actions";

interface KbDoc {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

export function KnowledgeBase({ agentId, docs }: { agentId: string; docs: KbDoc[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  function onCreate() {
    startTransition(async () => {
      const result = await createKnowledgeDocAction({ agentId, title, body });
      if (result.ok) {
        toast.success("Documento adicionado");
        setOpen(false);
        setTitle("");
        setBody("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const result = await deleteKnowledgeDocAction({ docId: id });
      if (result.ok) {
        toast.success("Removido");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Base de conhecimento</h2>
          <p className="text-muted-foreground text-sm">
            FAQs, políticas, horários especiais. O agente consulta antes de responder.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Adicionar documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Novo documento</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="kb-title">Título</Label>
                <Input
                  id="kb-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Política de cancelamento"
                  disabled={pending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kb-body">Conteúdo</Label>
                <Textarea
                  id="kb-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  placeholder="Cole o texto / FAQ aqui..."
                  disabled={pending}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button onClick={onCreate} disabled={pending || !title || !body}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {docs.length === 0 ? (
        <Empty
          title="Nenhum documento ainda"
          description="Adicione FAQs e políticas pra que o agente responda com precisão."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {docs.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{doc.title}</CardTitle>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Atualizado em {new Date(doc.updatedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete(doc.id)}
                  disabled={pending}
                >
                  <Trash2 className="text-muted-foreground h-4 w-4" />
                </Button>
              </CardHeader>
              <div className="text-muted-foreground line-clamp-4 px-6 pb-6 text-sm">{doc.body}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
