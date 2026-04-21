'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import clsx from 'clsx';

type AgentType = 'caption' | 'repurpose' | 'hashtags' | 'schedule' | 'image-gen';

interface AgentConfig {
  agentType: AgentType;
  enabled: boolean;
  systemPrompt: string;
  settings: Record<string, unknown>;
}

const AGENT_LABELS: Record<AgentType, string> = {
  caption: 'Caption Writer',
  repurpose: 'Content Repurposer',
  hashtags: 'Hashtag Agent',
  schedule: 'Scheduler Agent',
  'image-gen': 'Image Generator',
};

const AGENT_DESCRIPTIONS: Record<AgentType, string> = {
  caption: 'Generates platform-specific captions from a topic or description.',
  repurpose: 'Scrapes a URL via Firecrawl and generates platform-tailored posts.',
  hashtags: 'Suggests relevant hashtags for a given post.',
  schedule: 'Recommends the best times and days to publish on each platform.',
  'image-gen': 'Generates images from a text prompt using DALL-E or Gemini.',
};

const DEFAULT_SETTINGS: Record<AgentType, Record<string, unknown>> = {
  caption: { tone: 'professional', language: 'English', maxLength: { twitter: 280, linkedin: 1300 } },
  repurpose: { platforms: ['twitter', 'linkedin'], includeUrl: true },
  hashtags: { maxHashtags: 10 },
  schedule: { timezone: 'UTC' },
  'image-gen': { style: 'photorealistic', requireApproval: true },
};

export const useAgentConfigs = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/agents/config')).json();
  }, []);
  return useSWR<AgentConfig[]>('agent-configs', load, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  });
};

const AgentConfigComponent = () => {
  const fetch = useFetch();
  const toaster = useToaster();
  const { data, isLoading, mutate } = useAgentConfigs();

  const [activeTab, setActiveTab] = useState<AgentType>('caption');
  const [configs, setConfigs] = useState<Record<AgentType, AgentConfig>>({} as any);

  useEffect(() => {
    if (data) {
      const map = {} as Record<AgentType, AgentConfig>;
      data.forEach((cfg) => {
        map[cfg.agentType] = cfg;
      });
      setConfigs(map);
    }
  }, [data]);

  const updateField = useCallback((field: keyof AgentConfig, value: unknown) => {
    setConfigs((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [field]: value },
    }));
  }, [activeTab]);

  const updateSetting = useCallback((key: string, value: unknown) => {
    setConfigs((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        settings: { ...prev[activeTab].settings, [key]: value },
      },
    }));
  }, [activeTab]);

  const save = useCallback(async () => {
    const cfg = configs[activeTab];
    if (!cfg) return;
    await fetch(`/agents/config/${activeTab}`, {
      method: 'PUT',
      body: JSON.stringify({
        enabled: cfg.enabled,
        systemPrompt: cfg.systemPrompt,
        settings: JSON.stringify(cfg.settings),
      }),
    });
    mutate();
    toaster.show(`${AGENT_LABELS[activeTab]} config saved`, 'success');
  }, [activeTab, configs]);

  const resetToDefault = useCallback(() => {
    setConfigs((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        settings: DEFAULT_SETTINGS[activeTab],
      },
    }));
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="my-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px]">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const current = configs[activeTab];
  const agentTypes: AgentType[] = ['caption', 'repurpose', 'hashtags', 'schedule', 'image-gen'];

  return (
    <div className="my-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[20px]">
      <div className="text-[16px] font-semibold">AI Agent Configuration</div>

      <div className="flex gap-[8px] flex-wrap">
        {agentTypes.map((type) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={clsx(
              'px-[12px] py-[6px] rounded-[4px] text-[13px] border transition-colors',
              activeTab === type
                ? 'bg-primary text-white border-primary'
                : 'border-fifth hover:bg-boxHover'
            )}
          >
            {AGENT_LABELS[type]}
          </button>
        ))}
      </div>

      {current && (
        <div className="flex flex-col gap-[16px]">
          <div className="text-[13px] text-textColor/60">{AGENT_DESCRIPTIONS[activeTab]}</div>

          <label className="flex items-center gap-[10px] cursor-pointer">
            <input
              type="checkbox"
              checked={current.enabled}
              onChange={(e) => updateField('enabled', e.target.checked)}
              className="w-[16px] h-[16px] cursor-pointer"
            />
            <span className="text-[14px]">Enabled</span>
          </label>

          <div className="flex flex-col gap-[4px]">
            <div className="flex justify-between items-center">
              <label className="text-[13px] text-textColor/70">System Prompt</label>
            </div>
            <textarea
              rows={5}
              value={current.systemPrompt}
              onChange={(e) => updateField('systemPrompt', e.target.value)}
              className="bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] text-[13px] outline-none focus:border-primary w-full resize-y font-mono"
            />
          </div>

          <div className="flex flex-col gap-[12px]">
            <div className="text-[13px] text-textColor/70 font-medium">Settings</div>
            {activeTab === 'caption' && (
              <>
                <SettingRow label="Default Tone">
                  <select
                    value={String(current.settings.tone || 'professional')}
                    onChange={(e) => updateSetting('tone', e.target.value)}
                    className="bg-input border border-fifth rounded-[4px] px-[8px] py-[6px] text-[13px] outline-none"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="funny">Funny</option>
                    <option value="inspirational">Inspirational</option>
                  </select>
                </SettingRow>
                <SettingRow label="Language">
                  <input
                    type="text"
                    value={String(current.settings.language || 'English')}
                    onChange={(e) => updateSetting('language', e.target.value)}
                    className="bg-input border border-fifth rounded-[4px] px-[8px] py-[6px] text-[13px] outline-none w-[150px]"
                  />
                </SettingRow>
              </>
            )}
            {activeTab === 'repurpose' && (
              <SettingRow label="Include original URL in post">
                <input
                  type="checkbox"
                  checked={Boolean(current.settings.includeUrl)}
                  onChange={(e) => updateSetting('includeUrl', e.target.checked)}
                  className="w-[16px] h-[16px] cursor-pointer"
                />
              </SettingRow>
            )}
            {activeTab === 'hashtags' && (
              <SettingRow label="Max hashtags per post">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={Number(current.settings.maxHashtags || 10)}
                  onChange={(e) => updateSetting('maxHashtags', Number(e.target.value))}
                  className="bg-input border border-fifth rounded-[4px] px-[8px] py-[6px] text-[13px] outline-none w-[80px]"
                />
              </SettingRow>
            )}
            {activeTab === 'schedule' && (
              <SettingRow label="Timezone">
                <input
                  type="text"
                  value={String(current.settings.timezone || 'UTC')}
                  onChange={(e) => updateSetting('timezone', e.target.value)}
                  placeholder="e.g. America/New_York"
                  className="bg-input border border-fifth rounded-[4px] px-[8px] py-[6px] text-[13px] outline-none w-[200px]"
                />
              </SettingRow>
            )}
            {activeTab === 'image-gen' && (
              <>
                <SettingRow label="Default style">
                  <select
                    value={String(current.settings.style || 'photorealistic')}
                    onChange={(e) => updateSetting('style', e.target.value)}
                    className="bg-input border border-fifth rounded-[4px] px-[8px] py-[6px] text-[13px] outline-none"
                  >
                    <option value="photorealistic">Photorealistic</option>
                    <option value="illustration">Illustration</option>
                    <option value="minimalist">Minimalist</option>
                    <option value="3d-render">3D Render</option>
                  </select>
                </SettingRow>
                <SettingRow label="Require approval before publishing">
                  <input
                    type="checkbox"
                    checked={Boolean(current.settings.requireApproval ?? true)}
                    onChange={(e) => updateSetting('requireApproval', e.target.checked)}
                    className="w-[16px] h-[16px] cursor-pointer"
                  />
                </SettingRow>
              </>
            )}
          </div>

          <div className="flex gap-[12px]">
            <button
              onClick={save}
              className="bg-primary text-white px-[16px] py-[8px] rounded-[4px] text-[14px] hover:opacity-90 transition-opacity"
            >
              Save Changes
            </button>
            <button
              onClick={resetToDefault}
              className="border border-fifth px-[16px] py-[8px] rounded-[4px] text-[14px] hover:bg-boxHover transition-colors"
            >
              Reset to Default
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-[16px]">
    <span className="text-[13px]">{label}</span>
    {children}
  </div>
);

export default AgentConfigComponent;
