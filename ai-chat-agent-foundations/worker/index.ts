import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { routeAgentRequest } from "agents";
import {
  convertToModelMessages,
  generateText,
  stepCountIs,
  streamText,
  type GenerateTextOnFinishCallback,
  type ToolSet,
  type UIMessage,
} from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { buyPlaneTicket, getLocation, getTickets, getWeather } from "./tools";

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

    // 사용 AI 처럼 결과를 한글자 한글자 보여주는(streaming) 방식으로 만들기
    const result = await streamText({
      model: workersAi("@cf/zai-org/glm-4.7-flash"),
      messages: convertedMessages,
      tools: {
        get_weather: getWeather,
        get_location: getLocation,
        get_tickets: getTickets,
        buy_plan_ticket: buyPlaneTicket,
      },
      abortSignal: _options?.abortSignal,
      // 과도한 루프로 과도한 과금 방지를 위해 종료 조건(단계) 설정
      // 모델이 툴을 사용할 때 1단계 소모, 결과를 받아 응답할 때 1단계 소모
      // isLoopFinished() : 모델이 필요할 때까지 진행하는 옵션 -> 과도한 루프로 과금 주의!!
      stopWhen: stepCountIs(50),
    });

    return result.toUIMessageStreamResponse();
  }

  // 내용을 바꾸거나 검열하고 싶을 때 사용 가능, 메시지가 저장되기 전에 호출되고 메시지를 수정할 수	있게 되며 꼭 return 해야함.
  // 프롬프트 내 내용이 검열되는 것 뿐이지 대답은 정상적으로 진행됨.
  protected sanitizeMessageForPersistence(message: UIMessage): UIMessage {
    return {
      ...message,
      parts: message.parts.map((part) => {
        if (part.type === "text") {
          return {
            ...part,
            text: part.text.replace("food", "X stop eating u fat X"),
          };
        }
        return part;
      }),
    };
  }
}

export default {
  fetch(request, env) {
    return (
      routeAgentRequest(request, env) ?? new Response(null, { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
