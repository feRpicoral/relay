"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const t = useTranslations("agents.detail.knowledge");
  const formatter = useFormatter();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  function onCreate() {
    startTransition(async () => {
      const result = await createKnowledgeDocAction({ agentId, title, body });
      if (result.ok) {
        toast.success(t("toastAdded"));
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
      const result = await deleteKnowledgeDocAction({ docId: id, agentId });
      if (result.ok) {
        toast.success(t("toastRemoved"));
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
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              {t("addDocument")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{t("newDocument")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="kb-title">{t("titleLabel")}</Label>
                <Input
                  id="kb-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                  disabled={pending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kb-body">{t("bodyLabel")}</Label>
                <Textarea
                  id="kb-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  placeholder={t("bodyPlaceholder")}
                  disabled={pending}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                {t("cancel")}
              </Button>
              <Button onClick={onCreate} disabled={pending || !title || !body}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("add")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {docs.length === 0 ? (
        <Empty title={t("empty.title")} description={t("empty.description")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {docs.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{doc.title}</CardTitle>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t("updatedAt", {
                      date: formatter.dateTime(new Date(doc.updatedAt), { dateStyle: "short" }),
                    })}
                  </p>
                </div>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon-sm" disabled={pending}>
                      <Trash2 className="text-muted-foreground h-4 w-4" />
                      <span className="sr-only">{t("removeDocAria")}</span>
                    </Button>
                  }
                  title={t("confirmRemove.title")}
                  description={t("confirmRemove.description", { title: doc.title })}
                  confirmLabel={t("confirmRemove.confirm")}
                  pending={pending}
                  onConfirm={() => onDelete(doc.id)}
                />
              </CardHeader>
              <div className="text-muted-foreground line-clamp-4 px-6 pb-6 text-sm">{doc.body}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
