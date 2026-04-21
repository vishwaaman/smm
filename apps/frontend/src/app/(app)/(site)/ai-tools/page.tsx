import { Metadata } from 'next';
import { AiToolsPanel } from '@gitroom/frontend/components/ai-tools/ai-tools-panel';

export const metadata: Metadata = {
  title: 'Postiz - AI Tools',
  description: 'AI-powered content agents',
};

export default function AiToolsPage() {
  return <AiToolsPanel />;
}
