import { Agent, callable, routeAgentRequest, type Connection } from "agents";
import {
  withVoice,
  WorkersAIFluxSTT,
  WorkersAITTS,
  type VoiceTurnContext,
} from "@cloudflare/voice";
import { isLoopFinished, streamText } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { tool } from "ai";
import z from "zod";

const VoiceAgentBase = withVoice(Agent);

export class VoiceAgent extends VoiceAgentBase<Env> {
  transcriber = new WorkersAIFluxSTT(this.env.AI, {
    keyterms: [
      "tailwind",
      "adam smith",
      "cloudflare",
      "google",
      "weather",
      "seoul",
      "busan",
    ], // transcriber가 올바른 방향으로 갈 수 있도록 알아야할 용어들울 줄 수 있음
  }); // STT -> speech to text
  tts = new WorkersAITTS(this.env.AI); // TTS -> text to speech

  // TTS 전 실행되는 메서드 -> 음성으로 변환하기 전에 이 메서드를 이용해 내용 수정이 가능함. (음성으로 대답에 한하여)
  beforeSynthesize(text: string, connection: Connection) {
    console.log("beforeSynthesize");
    return text.replaceAll("*", ""); // * 제거
  }

  // STT 후 실행되는 메서드
  async onTurn(transcript: string, context: VoiceTurnContext) {
    const workersAi = createWorkersAI({
      binding: this.env.AI,
    });

    const result = streamText({
      model: workersAi("@cf/zai-org/glm-4.7-flash"),
      stopWhen: isLoopFinished(),
      messages: [
        ...context.messages,
        {
          role: "user",
          content: transcript,
        },
      ],
      tools: {
        getWeather: tool({
          description: "Get the current weather of a city",
          inputSchema: z.object({
            city: z.string(),
          }),
          execute: ({ city }) => {
            console.log(city);
            return `The weather in ${city} is sunny and 25°C.`;
          },
        }),
      },
    });

    return result.textStream;
  }

  @callable()
  getHistory() {
    return this.getConversationHistory(50);
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
