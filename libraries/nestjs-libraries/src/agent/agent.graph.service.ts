import { Injectable } from '@nestjs/common';
import {
  BaseMessage,
  HumanMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { END, START, StateGraph } from '@langchain/langgraph';
import { ChatOpenAI, DallEAPIWrapper } from '@langchain/openai';
import { DynamicTool } from '@langchain/core/tools';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import dayjs from 'dayjs';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { z } from 'zod';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { GeneratorDto } from '@gitroom/nestjs-libraries/dtos/generator/generator.dto';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface WorkflowChannelsState {
  messages: BaseMessage[];
  orgId: string;
  question: string;
  hook?: string;
  fresearch?: string;
  category?: string;
  topic?: string;
  date?: string;
  format: 'one_short' | 'one_long' | 'thread_short' | 'thread_long';
  tone: 'personal' | 'company';
  content?: {
    content: string;
    website?: string;
    prompt?: string;
    image?: string;
  }[];
  isPicture?: boolean;
  popularPosts?: { content: string; hook: string }[];
}

const category = z.object({
  category: z.string().describe('The category for the post'),
});

const topic = z.object({
  topic: z.string().describe('The topic for the post'),
});

const hook = z.object({
  hook: z
    .string()
    .describe(
      'Hook for the new post, don\'t take it from "the request of the user"'
    ),
});

const contentZod = (
  isPicture: boolean,
  format: 'one_short' | 'one_long' | 'thread_short' | 'thread_long'
) => {
  const content = z.object({
    content: z.string().describe('Content for the new post'),
    website: z
      .string()
      .nullable()
      .optional()
      .describe(
        "Website for the new post if exists, If one of the post present a brand, website link must be to the root domain of the brand or don't include it, website url should contain the brand name"
      ),
    ...(isPicture
      ? {
          prompt: z
            .string()
            .describe(
              "Prompt to generate a picture for this post later, make sure it doesn't contain brand names and make it very descriptive in terms of style"
            ),
        }
      : {}),
  });

  return z.object({
    content:
      format === 'one_short' || format === 'one_long'
        ? content
        : z.array(content).min(2).describe(`Content for the new post`),
  });
};

type OrgAiConfig = {
  openaiApiKey?: string | null;
  googleAiApiKey?: string | null;
  aiProvider?: string | null;
};

function createWebSearchTool(orgConfig: OrgAiConfig): DynamicTool {
  return new DynamicTool({
    name: 'web_search',
    description:
      'Search the web for current, up-to-date information about a topic',
    func: async (query: string) => {
      if (orgConfig.aiProvider === 'google' && orgConfig.googleAiApiKey) {
        const genAI = new GoogleGenerativeAI(orgConfig.googleAiApiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          tools: [{ googleSearch: {} } as any],
        });
        const response = await model.generateContent(query);
        return response.response.text();
      }

      const apiKey =
        orgConfig.openaiApiKey || process.env.OPENAI_API_KEY || '';
      const openai = new OpenAI({ apiKey });
      const completion = await (openai.chat.completions as any).create({
        model: 'gpt-4o-search-preview',
        web_search_options: {},
        messages: [{ role: 'user', content: query }],
      });
      return completion.choices[0].message.content || '';
    },
  });
}

function createDeps(orgConfig: OrgAiConfig) {
  const useGoogle =
    orgConfig.aiProvider === 'google' && !!orgConfig.googleAiApiKey;

  const model = useGoogle
    ? new ChatOpenAI({
        apiKey: orgConfig.googleAiApiKey!,
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        configuration: {
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        },
      })
    : new ChatOpenAI({
        apiKey: orgConfig.openaiApiKey || process.env.OPENAI_API_KEY || '',
        model: 'gpt-4.1',
        temperature: 0.7,
      });

  const tools = [createWebSearchTool(orgConfig)];
  const toolNode = new ToolNode(tools);

  const dalle = new DallEAPIWrapper({
    apiKey: orgConfig.openaiApiKey || process.env.OPENAI_API_KEY || '',
    model: 'dall-e-3',
  });

  return { model, tools, toolNode, dalle };
}

@Injectable()
export class AgentGraphService {
  private storage = UploadFactory.createStorage();

  constructor(
    private _postsService: PostsService,
    private _mediaService: MediaService,
    private _orgRepository: OrganizationRepository
  ) {}

  static state = () =>
    new StateGraph<WorkflowChannelsState>({
      channels: {
        messages: {
          reducer: (currentState, updateValue) =>
            currentState.concat(updateValue),
          default: () => [],
        },
        fresearch: null,
        format: null,
        tone: null,
        question: null,
        orgId: null,
        hook: null,
        content: null,
        date: null,
        category: null,
        popularPosts: null,
        topic: null,
        isPicture: null,
      },
    });

  async start(orgId: string, body: GeneratorDto) {
    const org = await this._orgRepository.getOrgById(orgId);
    const orgConfig: OrgAiConfig = {
      openaiApiKey: (org as any).openaiApiKey,
      googleAiApiKey: (org as any).googleAiApiKey,
      aiProvider: (org as any).aiProvider,
    };

    const { model, tools, toolNode, dalle } = createDeps(orgConfig);

    const startCall = async (state: WorkflowChannelsState) => {
      const runTools = model.bindTools(tools);
      const response = await ChatPromptTemplate.fromTemplate(
        `
    Today is ${dayjs().format()}, You are an assistant that gets a social media post or requests for a social media post.
    You research should be on the most possible recent data.
    You concat the text of the request together with an internet research based on the text.
    {text}
    `
      )
        .pipe(runTools)
        .invoke({
          text: state.messages[state.messages.length - 1].content,
        });

      return { messages: [response] };
    };

    const saveResearch = async (state: WorkflowChannelsState) => {
      const content: BaseMessage[] = state.messages.filter(
        (f) => f instanceof ToolMessage
      );
      return { fresearch: content };
    };

    const findCategories = async (state: WorkflowChannelsState) => {
      const allCategories =
        await this._postsService.findAllExistingCategories();
      const structuredOutput = model.withStructuredOutput(category);
      const { category: outputCategory } =
        await ChatPromptTemplate.fromTemplate(
          `
        You are an assistant that gets a text that will be later summarized into a social media post
        and classify it to one of the following categories: {categories}
        text: {text}
      `
        )
          .pipe(structuredOutput)
          .invoke({
            categories: allCategories.map((p) => p.category).join(', '),
            text: state.fresearch,
          });

      return { category: outputCategory };
    };

    const findTopic = async (state: WorkflowChannelsState) => {
      const allTopics =
        await this._postsService.findAllExistingTopicsOfCategory(
          state?.category!
        );
      if (allTopics.length === 0) {
        return { topic: null };
      }

      const structuredOutput = model.withStructuredOutput(topic);
      const { topic: outputTopic } = await ChatPromptTemplate.fromTemplate(
        `
        You are an assistant that gets a text that will be later summarized into a social media post
        and classify it to one of the following topics: {topics}
        text: {text}
      `
      )
        .pipe(structuredOutput)
        .invoke({
          topics: allTopics.map((p) => p.topic).join(', '),
          text: state.fresearch,
        });

      return { topic: outputTopic };
    };

    const findPopularPosts = async (state: WorkflowChannelsState) => {
      const popularPosts = await this._postsService.findPopularPosts(
        state.category!,
        state.topic
      );
      return { popularPosts };
    };

    const generateHook = async (state: WorkflowChannelsState) => {
      const structuredOutput = model.withStructuredOutput(hook);
      const { hook: outputHook } = await ChatPromptTemplate.fromTemplate(
        `
        You are an assistant that gets content for a social media post, and generate only the hook.
        The hook is the 1-2 sentences of the post that will be used to grab the attention of the reader.
        You will be provided existing hooks you should use as inspiration.
        - Avoid weird hook that starts with "Discover the secret...", "The best...", "The most...", "The top..."
        - Make sure it sounds ${state.tone}
        - Use ${state.tone === 'personal' ? '1st' : '3rd'} person mode
        - Make sure it's engaging
        - Don't be cringy
        - Use simple english
        - Make sure you add "\\n" between the lines
        - Don't take the hook from "request of the user"

        <!-- BEGIN request of the user -->
        {request}
        <!-- END request of the user -->

        <!-- BEGIN existing hooks -->
        {hooks}
        <!-- END existing hooks -->

        <!-- BEGIN current content -->
        {text}
        <!-- END current content -->

      `
      )
        .pipe(structuredOutput)
        .invoke({
          request: state.messages[0].content,
          hooks: state.popularPosts!.map((p) => p.hook).join('\n'),
          text: state.fresearch,
        });

      return { hook: outputHook };
    };

    const generateContent = async (state: WorkflowChannelsState) => {
      const structuredOutput = model.withStructuredOutput(
        contentZod(!!state.isPicture, state.format)
      );
      const { content: outputContent } = await ChatPromptTemplate.fromTemplate(
        `
        You are an assistant that gets existing hook of a social media, content and generate only the content.
        - Don't add any hashtags
        - Make sure it sounds ${state.tone}
        - Use ${state.tone === 'personal' ? '1st' : '3rd'} person mode
        - ${
          state.format === 'one_short' || state.format === 'thread_short'
            ? 'Post should be maximum 200 chars to fit twitter'
            : 'Post should be long'
        }
        - ${
          state.format === 'one_short' || state.format === 'one_long'
            ? 'Post should have only 1 item'
            : 'Post should have minimum 2 items'
        }
        - Use the hook as inspiration
        - Make sure it's engaging
        - Don't be cringy
        - Use simple english
        - The Content should not contain the hook
        - Try to put some call to action at the end of the post
        - Make sure you add "\\n" between the lines
        - Add "\\n" after every "."

        Hook:
        {hook}

        User request:
        {request}

        current content information:
        {information}
      `
      )
        .pipe(structuredOutput)
        .invoke({
          hook: state.hook,
          request: state.messages[0].content,
          information: state.fresearch,
        });

      return { content: outputContent };
    };

    const fixArray = async (state: WorkflowChannelsState) => {
      if (state.format === 'one_short' || state.format === 'one_long') {
        return { content: [state.content] };
      }
      return {};
    };

    const generatePictures = async (state: WorkflowChannelsState) => {
      if (!state.isPicture) {
        return {};
      }

      const newContent = await Promise.all(
        (state.content || []).map(async (p) => {
          const image = await dalle.invoke(p.prompt!);
          return { ...p, image };
        })
      );

      return { content: newContent };
    };

    const uploadPictures = async (state: WorkflowChannelsState) => {
      const all = await Promise.all(
        (state.content || []).map(async (p) => {
          if (p.image) {
            const upload = await this.storage.uploadSimple(p.image);
            const name = upload.split('/').pop()!;
            const uploadWithId = await this._mediaService.saveFile(
              state.orgId,
              name,
              upload
            );
            return { ...p, image: uploadWithId };
          }
          return p;
        })
      );

      return { content: all };
    };

    const isGeneratePicture = async (state: WorkflowChannelsState) => {
      if (state.isPicture) {
        return 'generate-picture';
      }
      return 'post-time';
    };

    const postDateTime = async (state: WorkflowChannelsState) => {
      return { date: await this._postsService.findFreeDateTime(state.orgId) };
    };

    const state = AgentGraphService.state();
    const workflow = state
      .addNode('agent', startCall)
      .addNode('research', toolNode)
      .addNode('save-research', saveResearch)
      .addNode('find-category', findCategories)
      .addNode('find-topic', findTopic)
      .addNode('find-popular-posts', findPopularPosts)
      .addNode('generate-hook', generateHook)
      .addNode('generate-content', generateContent)
      .addNode('generate-content-fix', fixArray)
      .addNode('generate-picture', generatePictures)
      .addNode('upload-pictures', uploadPictures)
      .addNode('post-time', postDateTime)
      .addEdge(START, 'agent')
      .addEdge('agent', 'research')
      .addEdge('research', 'save-research')
      .addEdge('save-research', 'find-category')
      .addEdge('find-category', 'find-topic')
      .addEdge('find-topic', 'find-popular-posts')
      .addEdge('find-popular-posts', 'generate-hook')
      .addEdge('generate-hook', 'generate-content')
      .addEdge('generate-content', 'generate-content-fix')
      .addConditionalEdges('generate-content-fix', isGeneratePicture)
      .addEdge('generate-picture', 'upload-pictures')
      .addEdge('upload-pictures', 'post-time')
      .addEdge('post-time', END);

    const app = workflow.compile();

    return app.streamEvents(
      {
        messages: [new HumanMessage(body.research)],
        isPicture: body.isPicture,
        format: body.format,
        tone: body.tone,
        orgId,
      },
      {
        streamMode: 'values',
        version: 'v2',
      }
    );
  }
}
