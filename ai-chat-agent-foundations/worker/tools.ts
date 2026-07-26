/* AI가 사용할 툴 정의 파일 */
import { tool } from "ai";
import z from "zod";

export const getWeather = tool({
  title: "gettWeather",
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

export const getLocation = tool({
  title: "getLocation",
  description: "Use this to get the user location",
  inputSchema: z.object({}),
});

// 테스트를 위한 가짜 비행기표 가져오는 툴
export const getTickets = tool({
  description: "Get plane tickets to a city",
  inputSchema: z.object({
    from: z
      .string()
      .meta({ description: "The code of the departure airport (ie. ICN)" }),
    to: z
      .string()
      .meta({ description: "The code of the arrival airport (ie. CNX)" }),
  }),
  execute: async ({ from, to }) => {
    return [
      {
        flight: "KE653",
        from,
        to,
        departure: "09:15",
        arrival: "13:40",
        price: "$342",
      },
      {
        flight: "TG659",
        from,
        to,
        departure: "14:30",
        arrival: "18:55",
        price: "$289",
      },
      {
        flight: "OZ741",
        from,
        to,
        departure: "23:50",
        arrival: "04:10+1",
        price: "$195",
      },
    ];
  },
});

export const buyPlaneTicket = tool({
  title: "BuyPlaneTicket",
  description: "Use this when the user asks you to buy a ticket",
  inputSchema: z.object({
    ticketCode: z
      .string()
      .meta({ description: "The ticket code that you want to buy" }),
    price: z.number().meta({
      description: "The price of the ticket",
    }),
  }),
  execute: async ({ price, ticketCode }) =>
    `Ticket #${ticketCode} bought for ${price}`,
  // 사용자의 인가 필요 여부를 지정하는 옵션(true/false), 조건 설정도 가능
  needsApproval: ({ price }) => price > 200,
});
