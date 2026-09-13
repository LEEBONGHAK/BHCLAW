import { AIChatAgent } from "@cloudflare/ai-chat";
import { callable, getAgentByName, routeAgentRequest } from "agents";

export class RAGAgent extends AIChatAgent<Env> {
  @callable()
  async ingestPdf(buffer: ArrayBuffer, fileName: string, fileType: string) {
    // Ingest the PDF into the agent's knowledge base
    const result = await this.env.AI.toMarkdown({
      name: fileName,
      blob: new Blob([buffer], { type: fileType ?? "application/pdf" }),
    });
    console.log(result);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/upload" && request.method === "POST") {
      const formData = await request.formData();
      const file = (await formData.get("file")) as File | null;
      if (!file) {
        return new Response("File is required", { status: 400 });
      }
      const buffer = await file.arrayBuffer();
      const fileName = `${Date.now()}-${file?.name}`;
      await env.FILES.put(fileName, buffer, {
        httpMetadata: {
          contentType: file?.type,
        },
      });

      const stub = await getAgentByName(env.RAGAgent, "default");
      await stub.ingestPdf(buffer, fileName, file?.type);

      return new Response("ok", { status: 200 });
    }
    return (
      (await routeAgentRequest(request, env)) ??
      new Response(null, { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
