'use client';

import React, { useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import clsx from 'clsx';

type Tab = 'caption' | 'repurpose' | 'hashtags' | 'schedule' | 'image-gen' | 'approvals';

const TAB_LABELS: Record<Tab, string> = {
  caption: 'Caption Writer',
  repurpose: 'Content Repurposer',
  hashtags: 'Hashtag Suggester',
  schedule: 'Schedule Advisor',
  'image-gen': 'Image Generator',
  approvals: 'Approval Queue',
};

const PLATFORMS = ['Twitter', 'LinkedIn', 'Instagram', 'Facebook', 'TikTok'];

export const AiToolsPanel = () => {
  const fetch = useFetch();
  const [activeTab, setActiveTab] = useState<Tab>('caption');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (endpoint: string, body: unknown) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/agents/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [fetch]);

  const tabs: Tab[] = ['caption', 'repurpose', 'hashtags', 'schedule', 'image-gen', 'approvals'];

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <h2 className="text-[22px] font-semibold">AI Tools</h2>

      <div className="flex gap-[8px] flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setResult(null); setError(null); }}
            className={clsx(
              'px-[14px] py-[7px] rounded-[4px] text-[13px] border transition-colors',
              activeTab === tab ? 'bg-primary text-white border-primary' : 'border-fifth hover:bg-boxHover'
            )}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="bg-sixth border border-fifth rounded-[4px] p-[24px]">
        {activeTab === 'caption' && <CaptionTab run={run} loading={loading} result={result} error={error} />}
        {activeTab === 'repurpose' && <RepurposeTab run={run} loading={loading} result={result} error={error} />}
        {activeTab === 'hashtags' && <HashtagsTab run={run} loading={loading} result={result} error={error} />}
        {activeTab === 'schedule' && <ScheduleTab run={run} loading={loading} result={result} error={error} />}
        {activeTab === 'image-gen' && <ImageGenTab run={run} loading={loading} result={result} error={error} fetch={fetch} />}
        {activeTab === 'approvals' && <ApprovalsTab fetch={fetch} />}
      </div>
    </div>
  );
};

type TabProps = {
  run: (endpoint: string, body: unknown) => Promise<void>;
  loading: boolean;
  result: unknown;
  error: string | null;
};

const CaptionTab = ({ run, loading, result, error }: TabProps) => {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('LinkedIn');
  const [tone, setTone] = useState('professional');

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="text-[15px] font-medium">Generate a platform-specific caption</div>
      <div className="flex flex-col gap-[8px]">
        <label className="text-[13px] text-textColor/70">Topic or description</label>
        <textarea
          rows={3}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="E.g. New product launch for eco-friendly water bottles"
          className="bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] text-[14px] outline-none focus:border-primary resize-y"
        />
      </div>
      <div className="flex gap-[12px]">
        <div className="flex flex-col gap-[4px] flex-1">
          <label className="text-[13px] text-textColor/70">Platform</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)}
            className="bg-input border border-fifth rounded-[4px] px-[10px] py-[8px] text-[14px] outline-none">
            {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-[4px] flex-1">
          <label className="text-[13px] text-textColor/70">Tone</label>
          <select value={tone} onChange={(e) => setTone(e.target.value)}
            className="bg-input border border-fifth rounded-[4px] px-[10px] py-[8px] text-[14px] outline-none">
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="funny">Funny</option>
            <option value="inspirational">Inspirational</option>
          </select>
        </div>
      </div>
      <RunButton onClick={() => run('caption', { topic, platform, tone })} loading={loading} />
      <ResultDisplay result={result} error={error} />
    </div>
  );
};

const RepurposeTab = ({ run, loading, result, error }: TabProps) => {
  const [url, setUrl] = useState('');
  const [selected, setSelected] = useState<string[]>(['LinkedIn', 'Twitter']);

  const toggle = (p: string) =>
    setSelected((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="text-[15px] font-medium">Repurpose a blog post or article URL</div>
      <div className="flex flex-col gap-[4px]">
        <label className="text-[13px] text-textColor/70">URL</label>
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/blog/my-article"
          className="bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] text-[14px] outline-none focus:border-primary" />
      </div>
      <div className="flex flex-col gap-[4px]">
        <label className="text-[13px] text-textColor/70">Target platforms</label>
        <div className="flex gap-[10px] flex-wrap">
          {PLATFORMS.map((p) => (
            <label key={p} className="flex items-center gap-[6px] cursor-pointer text-[13px]">
              <input type="checkbox" checked={selected.includes(p)} onChange={() => toggle(p)} className="cursor-pointer" />
              {p}
            </label>
          ))}
        </div>
      </div>
      <RunButton onClick={() => run('repurpose', { url, platforms: selected })} loading={loading} />
      <ResultDisplay result={result} error={error} />
    </div>
  );
};

const HashtagsTab = ({ run, loading, result, error }: TabProps) => {
  const [text, setText] = useState('');
  const [platform, setPlatform] = useState('Instagram');

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="text-[15px] font-medium">Suggest hashtags for your post</div>
      <div className="flex flex-col gap-[4px]">
        <label className="text-[13px] text-textColor/70">Post text</label>
        <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Paste your post here..."
          className="bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] text-[14px] outline-none focus:border-primary resize-y" />
      </div>
      <div className="flex flex-col gap-[4px] w-[200px]">
        <label className="text-[13px] text-textColor/70">Platform</label>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)}
          className="bg-input border border-fifth rounded-[4px] px-[10px] py-[8px] text-[14px] outline-none">
          {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>
      <RunButton onClick={() => run('hashtags', { text, platform })} loading={loading} />
      {Array.isArray(result) && (
        <div className="flex gap-[8px] flex-wrap">
          {(result as string[]).map((tag) => (
            <span key={tag} className="bg-primary/10 text-primary px-[10px] py-[4px] rounded-full text-[13px]">
              #{tag}
            </span>
          ))}
        </div>
      )}
      {error && <div className="text-red-500 text-[13px]">{error}</div>}
    </div>
  );
};

const ScheduleTab = ({ run, loading, result, error }: TabProps) => {
  const [selected, setSelected] = useState<string[]>(['LinkedIn', 'Twitter']);
  const toggle = (p: string) =>
    setSelected((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="text-[15px] font-medium">Get recommended posting times</div>
      <div className="flex flex-col gap-[4px]">
        <label className="text-[13px] text-textColor/70">Platforms</label>
        <div className="flex gap-[10px] flex-wrap">
          {PLATFORMS.map((p) => (
            <label key={p} className="flex items-center gap-[6px] cursor-pointer text-[13px]">
              <input type="checkbox" checked={selected.includes(p)} onChange={() => toggle(p)} className="cursor-pointer" />
              {p}
            </label>
          ))}
        </div>
      </div>
      <RunButton onClick={() => run('schedule-suggest', { platforms: selected })} loading={loading} />
      <ResultDisplay result={result} error={error} />
    </div>
  );
};

const ImageGenTab = ({ run, loading, result, error, fetch }: TabProps & { fetch: ReturnType<typeof useFetch> }) => {
  const [prompt, setPrompt] = useState('');
  const imageResult = result as { imageUrl?: string; requireApproval?: boolean } | null;

  const handleApprovalCreate = useCallback(async (postId: string) => {
    await fetch('/approvals/pending', { method: 'GET' });
  }, [fetch]);

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="text-[15px] font-medium">Generate an image with AI</div>
      <div className="flex flex-col gap-[4px]">
        <label className="text-[13px] text-textColor/70">Image description</label>
        <textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder="E.g. A minimalist office desk with a laptop and a coffee cup, natural lighting"
          className="bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] text-[14px] outline-none focus:border-primary resize-y" />
      </div>
      <RunButton onClick={() => run('image-gen', { prompt })} loading={loading} />
      {imageResult?.imageUrl && (
        <div className="flex flex-col gap-[8px]">
          <img src={imageResult.imageUrl} alt="Generated" className="max-w-[400px] rounded-[4px] border border-fifth" />
          {imageResult.requireApproval && (
            <div className="text-[13px] text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 rounded-[4px] px-[12px] py-[8px]">
              This image requires admin approval before it can be published.
            </div>
          )}
        </div>
      )}
      {error && <div className="text-red-500 text-[13px]">{error}</div>}
    </div>
  );
};

const ApprovalsTab = ({ fetch }: { fetch: ReturnType<typeof useFetch> }) => {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/approvals/pending');
      setApprovals(await res.json());
    } finally {
      setLoading(false);
    }
  }, [fetch]);

  React.useEffect(() => { load(); }, []);

  const approve = useCallback(async (id: string) => {
    await fetch(`/approvals/${id}/approve`, { method: 'PUT' });
    load();
  }, [fetch, load]);

  const reject = useCallback(async (id: string) => {
    await fetch(`/approvals/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reviewNote: note[id] || '' }),
    });
    load();
  }, [fetch, load, note]);

  if (loading) return <div className="animate-pulse text-[14px]">Loading approvals...</div>;
  if (!approvals.length) return <div className="text-[14px] text-textColor/60">No pending approvals.</div>;

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="text-[15px] font-medium">Pending Approvals ({approvals.length})</div>
      {approvals.map((approval: any) => (
        <div key={approval.id} className="border border-fifth rounded-[4px] p-[16px] flex flex-col gap-[10px]">
          <div className="text-[13px] text-textColor/70">
            Post ID: <span className="font-mono">{approval.postId}</span> • Requested by: {approval.requestedBy}
          </div>
          <div className="text-[13px]">{approval.post?.content?.slice(0, 200)}</div>
          <div className="flex gap-[8px] items-center">
            <button onClick={() => approve(approval.id)}
              className="bg-green-600 text-white px-[12px] py-[6px] rounded-[4px] text-[13px] hover:opacity-90">
              Approve
            </button>
            <input type="text" placeholder="Rejection note (optional)"
              value={note[approval.id] || ''}
              onChange={(e) => setNote((prev) => ({ ...prev, [approval.id]: e.target.value }))}
              className="bg-input border border-fifth rounded-[4px] px-[10px] py-[6px] text-[13px] outline-none flex-1" />
            <button onClick={() => reject(approval.id)}
              className="bg-red-600 text-white px-[12px] py-[6px] rounded-[4px] text-[13px] hover:opacity-90">
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const RunButton = ({ onClick, loading }: { onClick: () => void; loading: boolean }) => (
  <button onClick={onClick} disabled={loading}
    className="bg-primary text-white px-[16px] py-[8px] rounded-[4px] text-[14px] hover:opacity-90 transition-opacity disabled:opacity-50 w-fit">
    {loading ? 'Running...' : 'Run'}
  </button>
);

const ResultDisplay = ({ result, error }: { result: unknown; error: string | null }) => {
  if (error) return <div className="text-red-500 text-[13px]">{error}</div>;
  if (!result) return null;
  return (
    <pre className="bg-input border border-fifth rounded-[4px] p-[12px] text-[13px] overflow-auto whitespace-pre-wrap max-h-[400px]">
      {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
    </pre>
  );
};
