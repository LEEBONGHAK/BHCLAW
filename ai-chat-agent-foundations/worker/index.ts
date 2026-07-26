import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { routeAgentRequest } from "agents";
import {
  convertToModelMessages,
  generateText,
  stepCountIs,
  streamText,
  type GenerateTextOnFinishCallback,
  type ToolSet,
} from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { getLocation, getWeather } from "./tools";

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
      },
      // 과도한 루프로 과도한 과금 방지를 위해 종료 조건(단계) 설정
      // 모델이 툴을 사용할 때 1단계 소모, 결과를 받아 응답할 때 1단계 소모
      // isLoopFinished() : 모델이 필요할 때까지 진행하는 옵션 -> 과도한 루프로 과금 주의!!
      stopWhen: stepCountIs(50),
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
