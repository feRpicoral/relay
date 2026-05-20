"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { connectTwilioAction } from "./actions";

export function ConnectForm() {
  const [pending, startTransition] = useTransition();
  const [accountSid, setAccountSid] = useState("");
  const [apiKeySid, setApiKeySid] = useState("");
  const [apiKeySecret, setApiKeySecret] = useState("");
  const router = useRouter();

  function onSubmit() {
    startTransition(async () => {
      const result = await connectTwilioAction({ accountSid, apiKeySid, apiKeySecret });
      if (result.ok) {
        toast.success("Twilio conectado");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form
      className="grid w-full max-w-md gap-3 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="accountSid">Account SID</Label>
        <Input
          id="accountSid"
          value={accountSid}
          onChange={(e) => setAccountSid(e.target.value.trim())}
          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          required
          disabled={pending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="apiKeySid">API Key SID</Label>
        <Input
          id="apiKeySid"
          value={apiKeySid}
          onChange={(e) => setApiKeySid(e.target.value.trim())}
          placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          required
          disabled={pending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="apiKeySecret">API Key Secret</Label>
        <Input
          id="apiKeySecret"
          type="password"
          value={apiKeySecret}
          onChange={(e) => setApiKeySecret(e.target.value)}
          placeholder="(visible once at creation in Twilio Console)"
          required
          disabled={pending}
        />
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar"}
      </Button>
    </form>
  );
}
