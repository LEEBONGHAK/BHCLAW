/* AI가 사용할 툴 정의 파일 */
import { tool } from "ai";
import z from "zod";

export const getWeather = tool({
  title: "GetWeather",
  description: "Get the wearther of a city",
  inputSchema: z.object({
    // zod는 AI model이 어떤 종류의 데이터를 가지고 툴을 호출할지 지정할 수 있게 해줌.
    city: z.string().meta({
      description:
        "The name of city you want to get the weather from (ie: Malaga)",
    }),
  }),
  // AI model이 이 툴을 사용하기로 결절했을 때 호출될 함수
  execute: ({ city }) => {
    return `The weather in the ${city} is sunny.`;
  },
});
