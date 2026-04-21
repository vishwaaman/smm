'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';

interface AiProviderData {
  aiProvider: string;
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  googleAiApiKey: string | null;
}

export const useAiProvider = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/settings/ai-provider')).json();
  }, []);
  return useSWR<AiProviderData>('ai-provider-settings', load, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  });
};

const AiProviderComponent = () => {
  const fetch = useFetch();
  const toaster = useToaster();
  const { data, isLoading, mutate } = useAiProvider();

  const [provider, setProvider] = useState('openai');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (data) {
      setProvider(data.aiProvider || 'openai');
    }
  }, [data]);

  const save = useCallback(async () => {
    const body: Record<string, string> = { aiProvider: provider };
    if (openaiKey) body.openaiApiKey = openaiKey;
    if (anthropicKey) body.anthropicApiKey = anthropicKey;
    if (googleKey) body.googleAiApiKey = googleKey;

    await fetch('/settings/ai-provider', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    mutate();
    setOpenaiKey('');
    setAnthropicKey('');
    setGoogleKey('');
    toaster.show('AI provider settings saved', 'success');
  }, [provider, openaiKey, anthropicKey, googleKey]);

  const testConnection = useCallback(async () => {
    setTesting(true);
    try {
      const body: Record<string, string> = { aiProvider: provider };
      if (openaiKey) body.openaiApiKey = openaiKey;
      if (anthropicKey) body.anthropicApiKey = anthropicKey;
      if (googleKey) body.googleAiApiKey = googleKey;

      const res = await fetch('/settings/ai-provider/test', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.ok) {
        toaster.show(`Connected to ${result.provider}`, 'success');
      } else {
        toaster.show(`Connection failed: ${result.error}`, 'warning');
      }
    } finally {
      setTesting(false);
    }
  }, [provider, openaiKey, anthropicKey, googleKey]);

  if (isLoading) {
    return (
      <div className="my-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px]">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const providers = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Claude (Anthropic)' },
    { value: 'google', label: 'Google Gemini' },
  ];

  return (
    <div className="my-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
      <div className="text-[16px] font-semibold">AI Provider Settings</div>

      <div className="flex flex-col gap-[8px]">
        <div className="text-[14px]">Active Provider</div>
        <div className="flex gap-[16px]">
          {providers.map((p) => (
            <label key={p.value} className="flex items-center gap-[8px] cursor-pointer">
              <input
                type="radio"
                name="aiProvider"
                value={p.value}
                checked={provider === p.value}
                onChange={() => setProvider(p.value)}
                className="cursor-pointer"
              />
              <span className="text-[14px]">{p.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-[12px]">
        <div className="flex flex-col gap-[4px]">
          <label className="text-[13px] text-textColor/70">
            OpenAI API Key {data?.openaiApiKey && <span className="text-[11px]">({data.openaiApiKey})</span>}
          </label>
          <input
            type="password"
            placeholder={data?.openaiApiKey ? 'Enter new key to replace' : 'sk-proj-...'}
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            className="bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] text-[14px] outline-none focus:border-primary w-full"
          />
        </div>

        <div className="flex flex-col gap-[4px]">
          <label className="text-[13px] text-textColor/70">
            Anthropic API Key {data?.anthropicApiKey && <span className="text-[11px]">({data.anthropicApiKey})</span>}
          </label>
          <input
            type="password"
            placeholder={data?.anthropicApiKey ? 'Enter new key to replace' : 'sk-ant-...'}
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            className="bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] text-[14px] outline-none focus:border-primary w-full"
          />
        </div>

        <div className="flex flex-col gap-[4px]">
          <label className="text-[13px] text-textColor/70">
            Google AI Key {data?.googleAiApiKey && <span className="text-[11px]">({data.googleAiApiKey})</span>}
          </label>
          <input
            type="password"
            placeholder={data?.googleAiApiKey ? 'Enter new key to replace' : 'AIza...'}
            value={googleKey}
            onChange={(e) => setGoogleKey(e.target.value)}
            className="bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] text-[14px] outline-none focus:border-primary w-full"
          />
        </div>
      </div>

      <div className="flex gap-[12px]">
        <button
          onClick={save}
          className="bg-primary text-white px-[16px] py-[8px] rounded-[4px] text-[14px] hover:opacity-90 transition-opacity"
        >
          Save
        </button>
        <button
          onClick={testConnection}
          disabled={testing}
          className="border border-fifth px-[16px] py-[8px] rounded-[4px] text-[14px] hover:bg-boxHover transition-colors disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
      </div>
    </div>
  );
};

export default AiProviderComponent;
