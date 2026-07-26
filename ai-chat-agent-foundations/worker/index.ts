import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { routeAgentRequest } from "agents";
import {
  convertToModelMessages,
  generateText,
  streamText,
  type GenerateTextOnFinishCallback,
  type ToolSet,
} from "ai";
import { createWorkersAI } from "workers-ai-provider";

export class PotatoChatAgent extends AIChatAgent<Env> {
  async onChatMessage(
    _onFinish: GenerateTextOnFinishCallback<ToolSet>,
    _options?: OnChatMessageOptions,
  ): Promise<Response | undefined> {
    const workersAi = createWorkersAI({
      binding: this.env.AI,
    });

    // console.log(JSON.stringify(this.messages)); // this.messages에 agent와 주고 받은 메시지들이 들어가 있음.
    // 수신한 메시지를 model messages로 변환
    const convertedMessages = await convertToModelMessages(this.messages);
    // console.log(JSON.stringify(convertedMessages));

    // const { text } = await generateText({
    //   model: workersAi("@cf/zai-org/glm-4.7-flash"),
    //   messages: convertedMessages,
    // });

    // return new Response(text);

    const result = await streamText({
      model: workersAi("@cf/zai-org/glm-4.7-flash"),
      messages: convertedMessages,
    });

    return result.toUIMessageStreamResponse();
  }
}

export default {
  fetch(request, env) {
    return (
      routeAgentRequest(request, env) ?? new Response(null, { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
