'use client';

import { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import dayjs from 'dayjs';

interface ErrorLogEntry {
  id: string;
  source: string;
  message: string;
  stack?: string;
  endpoint?: string;
  method?: string;
  requestBody?: string;
  statusCode?: number;
  createdAt: string;
  organization?: { id: string; name: string };
  user?: { id: string; email: string; name?: string };
}

interface ErrorLogResponse {
  total: number;
  pages: number;
  logs: ErrorLogEntry[];
}

const SOURCE_COLORS: Record<string, string> = {
  backend: 'bg-red-500/20 text-red-400',
  frontend: 'bg-orange-500/20 text-orange-400',
  orchestrator: 'bg-purple-500/20 text-purple-400',
};

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-400',
  POST: 'text-blue-400',
  PUT: 'text-yellow-400',
  DELETE: 'text-red-400',
  PATCH: 'text-orange-400',
};

const useErrorLogs = (page: number, source: string, organizationId: string, from: string, to: string) => {
  const fetch = useFetch();
  const load = useCallback(
    async (url: string) => (await fetch(url)).json(),
    []
  );
  const params = new URLSearchParams({ page: String(page) });
  if (source) params.set('source', source);
  if (organizationId) params.set('organizationId', organizationId);
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  return useSWR<ErrorLogResponse>(`/error-log?${params}`, load, {
    refreshInterval: 30000,
    revalidateOnFocus: false,
  });
};

const DetailModal: FC<{ log: ErrorLogEntry; onClose: () => void }> = ({ log, onClose }) => {
  let parsedBody = log.requestBody || '{}';
  try {
    parsedBody = JSON.stringify(JSON.parse(parsedBody), null, 2);
  } catch {}

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-newBgColorInner rounded-[12px] w-[90%] max-w-[900px] max-h-[85vh] overflow-y-auto p-[24px] flex flex-col gap-[16px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex gap-[10px] items-center">
            <span className={`px-[8px] py-[2px] rounded-[4px] text-xs font-[600] ${SOURCE_COLORS[log.source] || 'bg-gray-500/20 text-gray-400'}`}>
              {log.source}
            </span>
            {log.statusCode && (
              <span className="text-sm text-red-400 font-[600]">{log.statusCode}</span>
            )}
            <span className="text-textItemBlur text-sm">
              {dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </span>
          </div>
          <button onClick={onClose} className="text-textItemBlur hover:text-textColor text-[20px] leading-none">&times;</button>
        </div>

        <div>
          <p className="text-xs text-textItemBlur uppercase tracking-wider mb-[4px]">Message</p>
          <p className="text-textColor font-[500] break-words">{log.message}</p>
        </div>

        {log.endpoint && (
          <div>
            <p className="text-xs text-textItemBlur uppercase tracking-wider mb-[4px]">Endpoint</p>
            <p className="text-sm font-mono text-textColor">
              <span className={`mr-[8px] ${METHOD_COLORS[log.method || ''] || 'text-textColor'}`}>{log.method}</span>
              {log.endpoint}
            </p>
          </div>
        )}

        {log.organization && (
          <div>
            <p className="text-xs text-textItemBlur uppercase tracking-wider mb-[4px]">Organization</p>
            <p className="text-sm text-textColor">{log.organization.name} <span className="text-textItemBlur">({log.organization.id})</span></p>
          </div>
        )}

        {log.user && (
          <div>
            <p className="text-xs text-textItemBlur uppercase tracking-wider mb-[4px]">User</p>
            <p className="text-sm text-textColor">{log.user.email} {log.user.name && `(${log.user.name})`}</p>
          </div>
        )}

        {log.requestBody && log.requestBody !== '{}' && (
          <div>
            <p className="text-xs text-textItemBlur uppercase tracking-wider mb-[4px]">Request Body</p>
            <pre className="bg-newBgColor rounded-[8px] p-[12px] text-xs font-mono text-textColor overflow-x-auto whitespace-pre-wrap break-words">
              {parsedBody}
            </pre>
          </div>
        )}

        {log.stack && (
          <div>
            <p className="text-xs text-textItemBlur uppercase tracking-wider mb-[4px]">Stack Trace</p>
            <pre className="bg-newBgColor rounded-[8px] p-[12px] text-xs font-mono text-red-300 overflow-x-auto whitespace-pre-wrap break-words">
              {log.stack}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export const ErrorLogDashboard: FC = () => {
  const [page, setPage] = useState(0);
  const [source, setSource] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<ErrorLogEntry | null>(null);

  const { data, isLoading } = useErrorLogs(page, source, organizationId, from, to);

  return (
    <div className="flex flex-col gap-[16px] p-[24px] flex-1 overflow-y-auto">
      {selected && <DetailModal log={selected} onClose={() => setSelected(null)} />}

      <div className="flex flex-wrap gap-[12px] items-end">
        <div className="flex flex-col gap-[4px]">
          <label className="text-xs text-textItemBlur">Source</label>
          <select
            value={source}
            onChange={(e) => { setSource(e.target.value); setPage(0); }}
            className="bg-newBgColor border border-newBgLineColor rounded-[6px] text-textColor text-sm px-[10px] py-[6px]"
          >
            <option value="">All</option>
            <option value="backend">Backend</option>
            <option value="frontend">Frontend</option>
            <option value="orchestrator">Orchestrator</option>
          </select>
        </div>
        <div className="flex flex-col gap-[4px]">
          <label className="text-xs text-textItemBlur">Org ID</label>
          <input
            value={organizationId}
            onChange={(e) => { setOrganizationId(e.target.value); setPage(0); }}
            placeholder="Filter by org ID..."
            className="bg-newBgColor border border-newBgLineColor rounded-[6px] text-textColor text-sm px-[10px] py-[6px] w-[220px]"
          />
        </div>
        <div className="flex flex-col gap-[4px]">
          <label className="text-xs text-textItemBlur">From</label>
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(0); }}
            className="bg-newBgColor border border-newBgLineColor rounded-[6px] text-textColor text-sm px-[10px] py-[6px]"
          />
        </div>
        <div className="flex flex-col gap-[4px]">
          <label className="text-xs text-textItemBlur">To</label>
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(0); }}
            className="bg-newBgColor border border-newBgLineColor rounded-[6px] text-textColor text-sm px-[10px] py-[6px]"
          />
        </div>
        <button
          onClick={() => { setSource(''); setOrganizationId(''); setFrom(''); setTo(''); setPage(0); }}
          className="text-sm text-textItemBlur hover:text-textColor py-[6px]"
        >
          Clear
        </button>
        <div className="flex-1" />
        {data && (
          <p className="text-sm text-textItemBlur">{data.total} total errors</p>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-textItemBlur">Loading...</div>
      ) : !data?.logs?.length ? (
        <div className="flex flex-1 items-center justify-center text-textItemBlur">No errors found</div>
      ) : (
        <>
          <div className="rounded-[8px] overflow-hidden border border-newBgLineColor">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-newBgColor text-textItemBlur text-xs uppercase tracking-wider">
                  <th className="text-left px-[16px] py-[10px]">Time</th>
                  <th className="text-left px-[16px] py-[10px]">Source</th>
                  <th className="text-left px-[16px] py-[10px]">Status</th>
                  <th className="text-left px-[16px] py-[10px]">Endpoint</th>
                  <th className="text-left px-[16px] py-[10px]">Message</th>
                  <th className="text-left px-[16px] py-[10px]">Org</th>
                  <th className="text-left px-[16px] py-[10px]">User</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log, i) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelected(log)}
                    className={`cursor-pointer hover:bg-newBgColor transition-colors border-t border-newBgLineColor ${i % 2 === 0 ? '' : 'bg-newBgColor/30'}`}
                  >
                    <td className="px-[16px] py-[10px] text-textItemBlur whitespace-nowrap">
                      {dayjs(log.createdAt).format('MM-DD HH:mm:ss')}
                    </td>
                    <td className="px-[16px] py-[10px]">
                      <span className={`px-[6px] py-[2px] rounded-[4px] text-xs font-[600] ${SOURCE_COLORS[log.source] || 'bg-gray-500/20 text-gray-400'}`}>
                        {log.source}
                      </span>
                    </td>
                    <td className="px-[16px] py-[10px] text-red-400 font-[600]">
                      {log.statusCode || '—'}
                    </td>
                    <td className="px-[16px] py-[10px] font-mono max-w-[200px]">
                      {log.method && (
                        <span className={`mr-[6px] text-xs ${METHOD_COLORS[log.method] || ''}`}>{log.method}</span>
                      )}
                      <span className="text-textColor truncate block" title={log.endpoint || ''}>
                        {log.endpoint ? log.endpoint.slice(0, 40) + (log.endpoint.length > 40 ? '...' : '') : '—'}
                      </span>
                    </td>
                    <td className="px-[16px] py-[10px] text-textColor max-w-[280px]">
                      <span className="block truncate" title={log.message}>
                        {log.message}
                      </span>
                    </td>
                    <td className="px-[16px] py-[10px] text-textItemBlur">
                      {log.organization?.name || '—'}
                    </td>
                    <td className="px-[16px] py-[10px] text-textItemBlur">
                      {log.user?.email || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pages > 1 && (
            <div className="flex gap-[8px] justify-center items-center">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-[12px] py-[6px] rounded-[6px] bg-newBgColor text-textColor text-sm disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-sm text-textItemBlur">
                Page {page + 1} of {data.pages}
              </span>
              <button
                disabled={page + 1 >= data.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-[12px] py-[6px] rounded-[6px] bg-newBgColor text-textColor text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
