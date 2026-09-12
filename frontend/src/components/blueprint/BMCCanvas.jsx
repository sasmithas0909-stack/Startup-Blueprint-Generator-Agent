// frontend/src/components/blueprint/BMCCanvas.jsx
// Business Model Canvas — 9-block visual grid

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { regenerateSection } from '../../services/blueprintService.js';

const BMC_LAYOUT = [
  // row 1: key partners, key activities, value props, customer relationships, customer segments
  [
    { key: 'keyPartners', label: 'Key Partners', rows: 2, color: 'bg-orange-50 border-orange-200' },
    {
      key: null, label: null, rows: 1,
      children: [
        { key: 'keyActivities', label: 'Key Activities', color: 'bg-yellow-50 border-yellow-200' },
        { key: 'keyResources', label: 'Key Resources', color: 'bg-yellow-50 border-yellow-200' },
      ],
    },
    { key: 'valuePropositions', label: 'Value Propositions', rows: 2, color: 'bg-blue-50 border-blue-200' },
    {
      key: null, label: null, rows: 1,
      children: [
        { key: 'customerRelationships', label: 'Customer Relationships', color: 'bg-green-50 border-green-200' },
        { key: 'channels', label: 'Channels', color: 'bg-green-50 border-green-200' },
      ],
    },
    { key: 'customerSegments', label: 'Customer Segments', rows: 2, color: 'bg-purple-50 border-purple-200' },
  ],
  // row 2: cost structure, revenue streams
  [
    { key: 'costStructure', label: 'Cost Structure', span: 2.5, color: 'bg-red-50 border-red-200' },
    { key: 'revenueStreams', label: 'Revenue Streams', span: 2.5, color: 'bg-teal-50 border-teal-200' },
  ],
];

function BMCBlock({ blockKey, label, data, blueprintId, onRegenerate, colorClass }) {
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await onRegenerate(blockKey);
    } finally {
      setRegenerating(false);
    }
  };

  const items = data?.items || [];

  return (
    <div className={`border rounded-lg p-3 flex flex-col h-full min-h-28 ${colorClass}`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-xs text-gray-700 uppercase tracking-wide">{label}</h4>
        {blueprintId && (
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors flex-shrink-0"
            title={`Regenerate ${label}`}
          >
            <RefreshCw className={`h-3 w-3 ${regenerating ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
      <ul className="space-y-1 flex-1">
        {items.length > 0 ? (
          items.map((item, i) => (
            <li key={i} className="text-xs text-gray-700 leading-relaxed flex items-start gap-1">
              <span className="text-gray-400 mt-0.5 flex-shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))
        ) : (
          <li className="text-xs text-gray-400 italic">No data available</li>
        )}
      </ul>
    </div>
  );
}

export default function BMCCanvas({ bmc, blueprintId, onSectionRegenerated }) {
  const handleRegenerate = async () => {
    try {
      const result = await regenerateSection(blueprintId, 'bmc');
      if (onSectionRegenerated) onSectionRegenerated('bmc', result);
    } catch (err) {
      alert('Failed to regenerate BMC. Please try again.');
    }
  };

  if (!bmc) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>Business Model Canvas not yet generated.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top row: 5 columns */}
      <div className="grid grid-cols-5 gap-2" style={{ gridTemplateRows: 'auto auto' }}>
        {/* Key Partners — spans 2 rows */}
        <div className="row-span-2">
          <BMCBlock
            blockKey="keyPartners"
            label="Key Partners"
            data={bmc.keyPartners}
            blueprintId={blueprintId}
            onRegenerate={handleRegenerate}
            colorClass="bg-orange-50 border-orange-200"
          />
        </div>

        {/* Key Activities */}
        <div>
          <BMCBlock
            blockKey="keyActivities"
            label="Key Activities"
            data={bmc.keyActivities}
            blueprintId={blueprintId}
            onRegenerate={handleRegenerate}
            colorClass="bg-yellow-50 border-yellow-200"
          />
        </div>

        {/* Value Propositions — spans 2 rows */}
        <div className="row-span-2">
          <BMCBlock
            blockKey="valuePropositions"
            label="Value Propositions"
            data={bmc.valuePropositions}
            blueprintId={blueprintId}
            onRegenerate={handleRegenerate}
            colorClass="bg-blue-50 border-blue-200"
          />
        </div>

        {/* Customer Relationships */}
        <div>
          <BMCBlock
            blockKey="customerRelationships"
            label="Customer Relationships"
            data={bmc.customerRelationships}
            blueprintId={blueprintId}
            onRegenerate={handleRegenerate}
            colorClass="bg-green-50 border-green-200"
          />
        </div>

        {/* Customer Segments — spans 2 rows */}
        <div className="row-span-2">
          <BMCBlock
            blockKey="customerSegments"
            label="Customer Segments"
            data={bmc.customerSegments}
            blueprintId={blueprintId}
            onRegenerate={handleRegenerate}
            colorClass="bg-purple-50 border-purple-200"
          />
        </div>

        {/* Key Resources */}
        <div>
          <BMCBlock
            blockKey="keyResources"
            label="Key Resources"
            data={bmc.keyResources}
            blueprintId={blueprintId}
            onRegenerate={handleRegenerate}
            colorClass="bg-yellow-50 border-yellow-200"
          />
        </div>

        {/* Channels */}
        <div>
          <BMCBlock
            blockKey="channels"
            label="Channels"
            data={bmc.channels}
            blueprintId={blueprintId}
            onRegenerate={handleRegenerate}
            colorClass="bg-green-50 border-green-200"
          />
        </div>
      </div>

      {/* Bottom row: Cost Structure + Revenue Streams */}
      <div className="grid grid-cols-2 gap-2">
        <BMCBlock
          blockKey="costStructure"
          label="Cost Structure"
          data={bmc.costStructure}
          blueprintId={blueprintId}
          onRegenerate={handleRegenerate}
          colorClass="bg-red-50 border-red-200"
        />
        <BMCBlock
          blockKey="revenueStreams"
          label="Revenue Streams"
          data={bmc.revenueStreams}
          blueprintId={blueprintId}
          onRegenerate={handleRegenerate}
          colorClass="bg-teal-50 border-teal-200"
        />
      </div>

      <p className="text-xs text-gray-400 text-right">
        Click <RefreshCw className="inline h-3 w-3" /> on any block to regenerate with IBM Granite
      </p>
    </div>
  );
}
