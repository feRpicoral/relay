import { RelayWordmark } from "./relay-wordmark";

export function AuthCenteredShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="flex justify-center pt-6">
        <RelayWordmark />
      </div>
      <div className="flex flex-1 items-center justify-center p-6">{children}</div>
    </div>
  );
}
