import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { getAgentByName, routeAgentEmail, routeAgentRequest } from "agents";
import { createAddressBasedEmailResolver, type AgentEmail } from "agents/email";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type GenerateTextOnFinishCallback,
  type ToolSet,
} from "ai";
// import PostalMime from "postal-mime";
import { createWorkersAI } from "workers-ai-provider";
import z from "zod";

export class EmailAgent extends AIChatAgent<Env> {
  // onStart(props?: Record<string, unknown> | undefined): void | Promise<void> {
  //   // 실제로 agent에 email을 보내고 싶다면 agent를 배포해야하며, 도메인도 사야함..
  //   this.env.EMAIL.send({});
  // }

  async onChatMessage(
    _onFinish: GenerateTextOnFinishCallback<ToolSet>,
    _options?: OnChatMessageOptions,
  ): Promise<Response | undefined> {
    const workerAi = createWorkersAI({
      binding: this.env.AI,
    });

    const result = streamText({
      model: workerAi("@cf/zai-org/glm-4.7-flash"),
      messages: await convertToModelMessages(this.messages),
      tools: {
        sendTranscript: tool({
          description: "Send the transcript of the conversation to the user",
          inputSchema: z.object({
            email: z.string().meta({ description: "The email of the user" }),
          }),
          execute: async ({ email }) => {
            // 내장된 큐를 이용해 비싸거나 느린 작업을 덜어넣을 수 있음
            const taskId = await this.queue("sendSlowEmail", {
              email,
              messages: JSON.stringify(this.messages),
            });
            return { success: true, taskId };
          },
        }),
      },
      abortSignal: _options?.abortSignal,
      stopWhen: stepCountIs(50),
    });

    return result.toUIMessageStreamResponse();
  }

  async sendSlowEmail({
    email,
    messages,
  }: {
    email: string;
    messages: string;
  }) {
    await new Promise((resolve) => setTimeout(resolve, 30000));
    try {
      await this.retry(
        async (attempt) => {
          await this.sendEmail({
            binding: this.env.EMAIL,
            to: email,
            from: "youragent@agent.com",
            subject: "Transcript",
            text: JSON.stringify(messages),
          });
        },
        {
          maxAttempts: 10,
        },
      );
    } catch {
      console.log("10 attempts failed");
    }

    console.log("slow email processed");
  }

  async onEmail(email: AgentEmail) {
    // const raw = await email.getRaw();
    // console.log(raw);
    // console.log();
    // const parsed = await PostalMime.parse(raw);
    // console.log(parsed);
    // console.log();
    // console.log(parsed.to, parsed.from, parsed.text);

    await this.replyToEmail(email, {
      fromName: "EmailAgent",
      subject: "Im answering you",
      contentType: "text/plain",
      body: `Thank you for your email`,
    });
  }

  async onRequest(request: Request): Response | Promise<Response> {
    // 웹훅 알림을 받았는데 이미 실행 중인 작업이 있다면 60초 대기 -> 이후 로직 진행
    const stable = await this.waitUntilStable({ timeout: 60_000 });

    if (!stable) return new Response("failed");

    // 웹 훅으로 보내고 끝 -> 대화만 추가
    await this.persistMessages([
      ...this.messages,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Hello i've been hit from a webhook!",
          },
        ],
      },
    ]);

    // 웹 훅으로 대화 추가 후 모델이 추가된 대화에 대해 답변을 바로 진행함.
    // await this.saveMessages((messages) => [
    //   ...messages,
    //   {
    //     id: crypto.randomUUID(),
    //     role: "assistant",
    //     parts: [
    //       {
    //         type: "text",
    //         text: "Hello i've been hit from a webhook!",
    //       },
    //     ],
    //   },
    // ]);

    return new Response("ok");
  }
}

export default {
  // http request를 받을 때 호출됨.
  async fetch(request, env) {
    console.log(request.url);
    const url = new URL(request.url);
    if (url.pathname === "/webhook") {
      const agentId = url.searchParams.get("agentId") ?? "default";
      const agent = await getAgentByName(env.EmailAgent, agentId);
      return agent.fetch(request);
    }
    return (
      routeAgentRequest(request, env) ?? new Response(null, { status: 404 })
    );
  },
  // email을 받을 때 호출됨.
  async email(message, env, ctx) {
    console.log(message.raw);
    console.log(message.headers);
    await routeAgentEmail(message, env, {
      // resolver : 3개의 종류가 있음. 어떤 에이전트 클래스를 어떤 이름으로 쓸지 결정하는 함수
      // - createAddressBasedEmailResolver : 이메일을 보내면 에이전트는 EmailAgent가 되어 라우팅됨. (Agent ID: 이메일 @ 앞 아이디 (e.g: support@example.com -> support))
      // - createSecureReplyEmailResolver : 인증이나 보안 같은게 필요한 이메일을 위한 것
      // - createCatchAllEmailResolver : 다시 듣는 resolver. 모든 걸 같은 에이전트로 보내고 싶을 때 사용됨.
      resolver: createAddressBasedEmailResolver("EmailAgent"),
    });
  },
} satisfies ExportedHandler<Env>;
