// frontend/src/components/blueprint/SectionError.jsx
// Displays when a blueprint section has _status: 'generation_failed'

import React from 'react';
import { AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

export default function SectionError({ data, sectionKey, onRegenerate }) {
  if (!data?._status || data._status !== 'generation_failed') return null;

  const [regen, setRegen] = React.useState(false);

  const handleRegen = async () => {
    setRegen(true);
    try { await onRegenerate(sectionKey); } finally { setRegen(false); }
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-red-800 text-sm">Section generation failed</p>
            {onRegenerate && (
              <button
                onClick={handleRegen}
                disabled={regen}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${regen ? 'animate-spin' : ''}`} />
                {regen ? 'Retrying...' : 'Retry'}
              </button>
            )}
          </div>
          <p className="text-sm text-red-700 mt-1">{data._error}</p>
          {data._action && (
            <p className="text-xs text-red-500 mt-1">{data._action}</p>
          )}
          {data._retrievedAt && (
            <p className="text-xs text-red-400 mt-1">Failed at: {new Date(data._retrievedAt).toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}
