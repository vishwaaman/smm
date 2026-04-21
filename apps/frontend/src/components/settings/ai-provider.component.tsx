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

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const KeyRow = ({
  label,
  description,
  placeholder,
  value,
  onChange,
  saved,
}: {
  label: string;
  description: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  saved: string | null;
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex items-start justify-between gap-[24px] py-[16px] border-b border-fifth last:border-b-0">
      <div className="flex flex-col gap-[4px] min-w-[200px]">
        <div className="flex items-center gap-[8px]">
          <span className="text-[14px] font-medium">{label}</span>
          {saved ? (
            <span className="text-[11px] bg-green-500/10 text-green-500 border border-green-500/20 px-[6px] py-[1px] rounded-full">
              Configured
            </span>
          ) : (
            <span className="text-[11px] bg-fifth/60 text-textColor/40 border border-fifth px-[6px] py-[1px] rounded-full">
              Not set
            </span>
          )}
        </div>
        <div className="text-[12px] text-textColor/50">{description}</div>
        {saved && (
          <div className="text-[12px] text-textColor/40 font-mono mt-[2px]">{saved}</div>
        )}
      </div>

      <div className="flex gap-[8px] flex-1 max-w-[420px]">
        <div className="relative flex-1">
          <input
            type={visible ? 'text' : 'password'}
            placeholder={saved ? 'Enter new key to replace...' : placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-input border border-fifth rounded-[4px] pl-[12px] pr-[40px] py-[8px] text-[14px] outline-none focus:border-primary w-full"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-[10px] top-1/2 -translate-y-1/2 text-textColor/40 hover:text-textColor/70 transition-colors"
          >
            <EyeIcon open={visible} />
          </button>
        </div>
      </div>
    </div>
  );
};

const PROVIDERS = [
  {
    value: 'openai',
    label: 'OpenAI',
    subtitle: 'GPT-4o · DALL-E 3',
    color: 'text-green-400',
    dot: 'bg-green-400',
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    subtitle: 'Claude 3.5 Sonnet',
    color: 'text-orange-400',
    dot: 'bg-orange-400',
  },
  {
    value: 'google',
    label: 'Google Gemini',
    subtitle: 'Gemini 1.5 Pro',
    color: 'text-blue-400',
    dot: 'bg-blue-400',
  },
];

const AiProviderComponent = () => {
  const fetch = useFetch();
  const toaster = useToaster();
  const { data, isLoading, mutate } = useAiProvider();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [provider, setProvider] = useState('openai');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');

  useEffect(() => {
    if (data) {
      setProvider(data.aiProvider || 'openai');
    }
  }, [data]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const body: Record<string, string> = { aiProvider: provider };
      if (openaiKey) body.openaiApiKey = openaiKey;
      if (anthropicKey) body.anthropicApiKey = anthropicKey;
      if (googleKey) body.googleAiApiKey = googleKey;

      const res = await fetch('/settings/ai-provider', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Save failed');
      setOpenaiKey('');
      setAnthropicKey('');
      setGoogleKey('');
      await mutate();
      toaster.show('AI provider settings saved', 'success');
    } catch {
      toaster.show('Failed to save settings', 'warning');
    } finally {
      setSaving(false);
    }
  }, [provider, openaiKey, anthropicKey, googleKey, mutate]);

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
        toaster.show(`Connection failed: ${result.error || 'Unknown error'}`, 'warning');
      }
    } catch {
      toaster.show('Test request failed', 'warning');
    } finally {
      setTesting(false);
    }
  }, [provider, openaiKey, anthropicKey, googleKey]);

  if (isLoading) {
    return (
      <div className="my-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px]">
        <div className="animate-pulse text-[14px]">Loading AI settings...</div>
      </div>
    );
  }

  const hasAnyKey =
    !!data?.openaiApiKey || !!data?.anthropicApiKey || !!data?.googleAiApiKey;

  return (
    <div className="my-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[16px] font-semibold">AI Provider Settings</div>
          <div className="text-[13px] text-textColor/60 mt-[4px]">
            Add API keys to enable AI-powered content generation, image creation, and scheduling features.
          </div>
        </div>
        {!hasAnyKey && (
          <span className="shrink-0 text-[12px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-[10px] py-[4px] rounded-full">
            No keys configured
          </span>
        )}
      </div>

      {/* Active provider selector */}
      <div className="flex flex-col gap-[10px]">
        <div className="text-[13px] text-textColor/70">
          Active provider — used for all AI generation
        </div>
        <div className="flex gap-[8px]">
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              onClick={() => setProvider(p.value)}
              className={`flex items-center gap-[10px] px-[14px] py-[10px] rounded-[4px] border flex-1 transition-colors text-left ${
                provider === p.value
                  ? 'border-primary bg-primary/10'
                  : 'border-fifth hover:bg-boxHover'
              }`}
            >
              <div className={`w-[8px] h-[8px] rounded-full shrink-0 ${p.dot}`} />
              <div>
                <div className="text-[13px] font-medium">{p.label}</div>
                <div className="text-[11px] text-textColor/50">{p.subtitle}</div>
              </div>
              {provider === p.value && (
                <div className="ml-auto text-[11px] text-primary font-medium">Active</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Key inputs */}
      <div className="flex flex-col">
        <KeyRow
          label="OpenAI API Key"
          description="Required for GPT-4o captions and DALL-E image generation"
          placeholder="sk-proj-..."
          value={openaiKey}
          onChange={setOpenaiKey}
          saved={data?.openaiApiKey || null}
        />
        <KeyRow
          label="Anthropic API Key"
          description="Required for Claude 3.5 Sonnet captions and content generation"
          placeholder="sk-ant-api03-..."
          value={anthropicKey}
          onChange={setAnthropicKey}
          saved={data?.anthropicApiKey || null}
        />
        <KeyRow
          label="Google Gemini API Key"
          description="Required for Gemini 1.5 Pro content generation"
          placeholder="AIzaSy..."
          value={googleKey}
          onChange={setGoogleKey}
          saved={data?.googleAiApiKey || null}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-[12px] pt-[4px]">
        <button
          onClick={save}
          disabled={saving}
          className="bg-primary text-white px-[20px] py-[8px] rounded-[4px] text-[14px] hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          onClick={testConnection}
          disabled={testing}
          className="border border-fifth px-[20px] py-[8px] rounded-[4px] text-[14px] hover:bg-boxHover transition-colors disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
      </div>
    </div>
  );
};

export default AiProviderComponent;
