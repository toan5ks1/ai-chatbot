import { ChatWebLLM } from "@langchain/community/chat_models/webllm";
import { ServiceWorkerMLCEngineHandler } from "@mlc-ai/web-llm";
import { defaultCache } from "@serwist/next/worker";
import { convertToCoreMessages, LangChainAdapter, type Message } from "ai";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, Serwist } from "serwist";
import { callNextApi, generateUUID, getMostRecentUserMessage } from "../utils";
import { generateTitleFromUserMessage } from "../client/action";

declare const self: WorkerGlobalScope;
const CHATGPT_NEXT_WEB_CACHE = "chatgpt-next-web-cache";
let handler: ServiceWorkerMLCEngineHandler;

async function checkGPUAvailablity() {
  if (!("gpu" in navigator)) {
    console.log("Service Worker: Web-LLM Engine Activated");
    return false;
  }
  const adapter = await (navigator as any).gpu.requestAdapter();
  if (!adapter) {
    console.log("Service Worker: Web-LLM Engine Activated");
    return false;
  }
  return true;
}

(self as any).addEventListener("message", (event: any) => {
  if (!handler) {
    handler = new ServiceWorkerMLCEngineHandler();
    console.log("Service Worker: Web-LLM Engine Activated");
  }

  const msg = event.data;
  if (msg.kind === "checkWebGPUAvilability") {
    console.log("Service Worker: Web-LLM Engine Activated");
    checkGPUAvailablity().then((gpuAvailable) => {
      console.log(
        "Service Worker: WebGPU is " +
          (gpuAvailable ? "available" : "unavailable")
      );
      const reply = {
        kind: "return",
        uuid: msg.uuid,
        content: gpuAvailable,
      };
      event.source?.postMessage(reply);
    });
  }
});

(self as any).addEventListener("install", (event: any) => {
  // Always update right away
  (self as any).skipWaiting();

  event.waitUntil(
    caches.open(CHATGPT_NEXT_WEB_CACHE).then((cache) => {
      return cache.addAll([]);
    })
  );
});

(self as any).addEventListener("activate", (event: any) => {
  if (!handler) {
    handler = new ServiceWorkerMLCEngineHandler();
    console.log("Service Worker: Web-LLM Engine Activated");
  }
});

(self as any).addEventListener("fetch", (event: any) => {
  const url = new URL(event.request.url);

  // Intercept the `/api/chat` requests
  if (url.pathname === "/api/chat") {
    event.respondWith(
      (async () => {
        // Read the request body
        const {
          id,
          messages,
          modelId = "Llama-3.2-1B-Instruct-q4f32_1-MLC",
          userId,
        }: {
          id: string;
          messages: Array<Message>;
          modelId: string;
          userId: string;
        } = await event.request.json();

        const coreMessages = convertToCoreMessages(messages);
        const userMessage = getMostRecentUserMessage(coreMessages);

        if (!userMessage) {
          return new Response("No user message found", { status: 400 });
        }

        const res = await callNextApi<any>("/api/chat", { id }, "GET");

        const saveMsg = () =>
          callNextApi(
            "/api/message",
            {
              messages: [
                {
                  ...userMessage,
                  id: generateUUID(),
                  createdAt: new Date(),
                  chatId: id,
                },
              ],
            },
            "POST"
          );

        if (!res.data) {
          generateTitleFromUserMessage({
            modelId,
            message: userMessage,
          }).then((title) => {
            callNextApi("/api/chat", { id, userId, title }, "POST").then(
              saveMsg
            );
          });
        } else {
          saveMsg();
        }

        // Simulate processing (e.g., WebGPU tasks or any custom logic)
        const model = new ChatWebLLM({
          model: modelId,
          chatOptions: {
            temperature: 0.5,
          },
        });

        await model.initialize((progress: any) => {
          console.log(progress);
        });

        const stream = await model.stream(coreMessages);

        return LangChainAdapter.toDataStreamResponse(stream);
      })()
    );
  }
});

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    {
      matcher: ({ sameOrigin, url: { pathname } }) =>
        sameOrigin && pathname === "/ping.txt",
      handler: new CacheFirst({
        cacheName: "WebLLMChatServiceWorkerKeepAlive",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 1,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
            maxAgeFrom: "last-used",
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
