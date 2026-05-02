import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class WebSearchTool implements AgentToolInterface {
  name = 'webSearchTool';

  run() {
    return createTool({
      id: 'webSearchTool',
      description:
        'Search the web for current information to help generate accurate and up-to-date social media posts',
      mcp: {
        annotations: {
          title: 'Web Search',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      inputSchema: z.object({
        query: z.string().describe('The search query to look up'),
      }),
      outputSchema: z.object({
        result: z.string(),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const org = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        );

        if (org.aiProvider === 'google' && org.googleAiApiKey) {
          const genAI = new GoogleGenerativeAI(org.googleAiApiKey);
          const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            tools: [{ googleSearch: {} } as any],
          });
          const response = await model.generateContent(inputData.query);
          return { result: response.response.text() };
        }

        const apiKey =
          org.openaiApiKey || process.env.OPENAI_API_KEY || '';
        const openai = new OpenAI({ apiKey });
        const completion = await (openai.chat.completions as any).create({
          model: 'gpt-4o-search-preview',
          web_search_options: {},
          messages: [{ role: 'user', content: inputData.query }],
        });
        return { result: completion.choices[0].message.content || '' };
      },
    });
  }
}
