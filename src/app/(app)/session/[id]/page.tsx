import { TODAY_SESSION } from "@/lib/workout";
import { notFound } from "next/navigation";
import SessionClient from "./SessionClient";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = id === TODAY_SESSION.id ? TODAY_SESSION : null;
  if (!session) notFound();
  return <SessionClient session={session} />;
}
