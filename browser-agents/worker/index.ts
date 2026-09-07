import { AIChatAgent } from "@cloudflare/ai-chat";
import { routeAgentRequest } from "agents";
// import { createBrowserTools } from "agents/browser/ai";
import { convertToModelMessages, isLoopFinished, streamText, tool } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import puppeteer, { type Browser, type Page } from "@cloudflare/puppeteer";
import z from "zod";

export { CodemodeRuntime } from "@cloudflare/codemode";

export class BrowserAgent extends AIChatAgent<Env> {
  browser?: Browser;
  page?: Page;

  async getPage() {
    if (this.page && this.browser && this.browser.connected) {
      return this.page;
    }
    this.browser = await puppeteer.launch(this.env.BROWSER);
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });

    return this.page;
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
      },
      stopWhen: isLoopFinished(),
    });

    return result.toUIMessageStreamResponse();
  }
}

export default {
  async fetch(request, env) {
    return (
      (await routeAgentRequest(request, env)) ??
      new Response(null, { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
