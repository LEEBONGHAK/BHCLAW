import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { routeAgentRequest } from "agents";
import type { GenerateTextOnFinishCallback, ToolSet } from "ai";

export class PotatoChatAgent extends AIChatAgent<Env> {
  async onChatMessage(
    _onFinish: GenerateTextOnFinishCallback<ToolSet>,
    _options?: OnChatMessageOptions,
  ): Promise<Response | undefined> {
    console.log(JSON.stringify(this.messages)); // this.messages에 agent와 주고 받은 메시지들이 들어가 있음.
    return new Response("hello");
  }
}

export default {
  fetch(request, env) {
    return (
      routeAgentRequest(request, env) ?? new Response(null, { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
