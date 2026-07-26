import { AIChatAgent } from "@cloudflare/ai-chat";
import { routeAgentRequest } from "agents";

export class EmailAgent extends AIChatAgent<Env> {
  onStart(props?: Record<string, unknown> | undefined): void | Promise<void> {
    // 실제로 agent에 email을 보내고 싶다면 agent를 배포해야하며, 도메인도 사야함..
    // this.env.EMAIL.send({});
  }
}

export default {
  // http request를 받을 때 호출됨.
  fetch(request, env) {
    return (
      routeAgentRequest(request, env) ?? new Response(null, { status: 404 })
    );
  },
  // email을 받을 때 호출됨.
  email(message, env, ctx) {
    console.log(message.raw);
    console.log(message.headers);
  },
} satisfies ExportedHandler<Env>;
