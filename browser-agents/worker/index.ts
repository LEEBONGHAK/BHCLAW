import { AIChatAgent } from "@cloudflare/ai-chat";
import { routeAgentRequest } from "agents";
// import { createBrowserTools } from "agents/browser/ai";
import { convertToModelMessages, isLoopFinished, streamText, tool } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import puppeteer, { type Browser, type Page } from "@cloudflare/puppeteer";
import z from "zod";

export { CodemodeRuntime } from "@cloudflare/codemode";

export type BrowserAgentState = {
  liveUrl?: string | unknown;
};

export class BrowserAgent extends AIChatAgent<Env, BrowserAgentState> {
  initialState = {
    liveUrl: null,
  };

  browser?: Browser;
  page?: Page;

  async getPage() {
    if (this.page && this.browser && this.browser.connected) {
      return this.page;
    }
    this.browser = await puppeteer.launch(this.env.BROWSER, {
      recording: true, // 브라우저 세션을 기록하도록 설정
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });

    const liveViewUrl = await this.getLiveViewUrl();

    return this.page;
  }

  async getLiveViewUrl() {
    if (!this.browser) return;

    const sessionId = this.browser.sessionId();

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.env.ACCOUNT_ID}/browser-rendering/devtools/browser/${sessionId}/json/list`,
      {
        headers: {
          Authorization: `Bearer ${this.env.API_TOKEN}`,
        },
      },
    );

    const data = (await res.json()) as {
      type: string;
      devtoolsFrontendUrl: string;
    }[];

    // 기본으로 DevTool과 함께 보여줌.
    const url = data.find(
      (target) => target.type === "page",
    ).devtoolsFrontendUrl;

    console.log(url);

    // DevTool 없이 바로 보여주고 싶으면 아래처럼 변경 가능.
    const liveUrl = new URL(url);
    liveUrl.searchParams.set("mode", "tab");
    this.setState({
      liveUrl: liveUrl.toString(),
    });
    return liveUrl;
  }

  async closeBrowser() {
    await this.browser?.close();
    this.browser = null;
    this.page = null;
  }

  async onChatMessage() {
    const workersAi = createWorkersAI({ binding: this.env.AI });
    // const browserTools = createBrowserTools({
    //   browser: this.env.BROWSER as unknown as Fetcher,
    //   loader: this.env.LOADER,
    // });

    // console.log(browserTools);

    const result = streamText({
      model: workersAi("@cf/zai-org/glm-4.7-flash"),
      system: "You can browse the web and inspect the pages.",
      messages: await convertToModelMessages(this.messages),
      tools: {
        // ...browserTools,
        navigate: tool({
          description: "Navigate to a website",
          inputSchema: z.object({
            url: z.url().meta({
              description:
                "The url of the page that you want to go to with https://",
            }),
          }),
          execute: async ({ url }) => {
            const page = await this.getPage();
            await page.goto(url);

            return {
              ok: true,
              url: page.url(),
              title: await page.title(),
            };
          },
        }),
        closeBrowser: tool({
          description: "Close the browser session",
          inputSchema: z.object({}),
          execute: async () => {
            await this.closeBrowser();
            return { ok: true };
          },
        }),
        takeScreenshot: tool({
          description: "Take a screenshot of the current page",
          inputSchema: z.object({}),
          execute: async () => {
            const page = await this.getPage();
            const buffer = await page.screenshot({ type: "jpeg" });
            // console.log(buffer);
            const key = `screenshots/${Date.now()}.jpeg`;
            await this.env.FILES.put(key, buffer, {
              httpMetadata: {
                contentType: "image/jpeg",
              },
            });
            return {
              ok: true,
              filename: key,
            };
          },
        }),
      },
      stopWhen: isLoopFinished(),
    });

    return result.toUIMessageStreamResponse();
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/screenshots/")) {
      const key = url.pathname.slice(1);
      const file = await env.FILES.get(key);
      if (file) {
        return new Response(file.body, {
          headers: {
            "Content-Type":
              file.httpMetadata?.contentType || "application/octet-stream",
          },
        });
      }
    }
    return (
      (await routeAgentRequest(request, env)) ??
      new Response(null, { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
