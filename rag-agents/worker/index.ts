import { AIChatAgent } from "@cloudflare/ai-chat";
import { getAgentByName, routeAgentRequest } from "agents";
import { embedMany } from "ai";
import { createWorkersAI } from "workers-ai-provider";

export class RAGAgent extends AIChatAgent<Env> {
  async convert(fileName: string, buffer: ArrayBuffer, fileType: string) {
    const result = await this.env.AI.toMarkdown({
      name: fileName,
      blob: new Blob([buffer], { type: fileType ?? "application/pdf" }),
    });
    if (result.format === "error") return "error";
    return result.data;
  }

  async embedChunks(chunks: string[]) {
    const workersAi = createWorkersAI({ binding: this.env.AI });
    const { embeddings } = await embedMany({
      model: workersAi.textEmbeddingModel("@cf/baai/bge-base-en-v1.5"),
      values: chunks,
    });
    // console.log(embeddings[0]);
    // console.log(embeddings[0].length);

    return embeddings;
  }

  async ingestPdf(buffer: ArrayBuffer, fileName: string, fileType: string) {
    // Ingest the PDF into the agent's knowledge base
    const markdown = await this.convert(fileName, buffer, fileType);
    if (markdown === "error") {
      throw new Error("Failed to convert PDF to markdown");
    }
    // console.log(markdown.split("\n\n").length);
    const chunks = markdown.split("\n\n");
    const embeddings = this.embedChunks(chunks);
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
