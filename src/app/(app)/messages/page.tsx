import { redirect } from "next/navigation";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";
import {
  getHeadCoachId,
  getOrCreateConversation,
  listMessages,
} from "@/lib/data/messages";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import MessagesView from "@/components/chat/MessagesView";

/**
 * Member-side chat. One thread with the head coach. Coaches reach
 * their inbox at /coach/members/[id] instead — they don't see their
 * own thread on this page (it'd be empty: a coach isn't anyone's
 * client).
 */
export default async function MessagesPage() {
  const member = await getSession();
  if (!member) redirect("/login");
  if (member.isCoach) redirect("/coach");

  // Resolve thread + initial messages on the server so the page
  // streams with content. The Realtime channel takes over for new
  // arrivals client-side.
  let conversationId: string | null = null;
  let initialMessages: Awaited<ReturnType<typeof listMessages>> = [];
  let coachHandle: string | null = null;

  if (SUPABASE_ENABLED) {
    const coachId = await getHeadCoachId();
    if (coachId) {
      conversationId = await getOrCreateConversation(member.id, coachId);
      if (conversationId) {
        initialMessages = await listMessages(conversationId);
      }
      // Pull coach handle for the header.
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      if (supabase) {
        const { data } = await supabase
          .from("members")
          .select("handle")
          .eq("id", coachId)
          .maybeSingle();
        coachHandle = data?.handle ?? null;
      }
    }
  }

  return (
    <Container className="py-6 lg:py-12">
      <header className="pt-2 pb-4 mb-4 border-b hairline">
        <div className="eyebrow mb-2">07 — Beskeder</div>
        <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">
          {coachHandle ? `Chat med @${coachHandle}` : "Din coach"}
        </h1>
        <p className="mt-2 text-fg-dim text-sm max-w-md">
          Direkte linje til din coach. Send tekst, billeder eller en
          lydbesked — videoer modtager du.
        </p>
      </header>

      <div
        className="surface-2 rounded-2xl overflow-hidden flex flex-col"
        style={{ minHeight: "60vh", maxHeight: "calc(100vh - 220px)" }}
      >
        <MessagesView
          conversationId={conversationId}
          initialMessages={initialMessages}
          myMemberId={member.id}
          canSendVideo={false}
        />
      </div>
    </Container>
  );
}
