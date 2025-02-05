import { cookies } from "next/headers";

import { Chat } from "@/components/chat";
import { DEFAULT_MODEL_NAME, DEFAULT_MODEL_BASES } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { auth } from "@/app/(auth)/auth";

export default async function Page() {
  const id = generateUUID();

  const session = await auth();
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("model-id")?.value;

  const selectedModelId =
    DEFAULT_MODEL_BASES.find((model) => model.name === modelIdFromCookie)
      ?.name || DEFAULT_MODEL_NAME;

  return (
    <>
      <Chat
        key={id}
        id={id}
        userId={session?.user?.id}
        initialMessages={[]}
        selectedModelId={selectedModelId}
        selectedVisibilityType="private"
        isReadonly={false}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
