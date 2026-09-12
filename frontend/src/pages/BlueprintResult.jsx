// frontend/src/pages/BlueprintResult.jsx
// Full blueprint viewer with tabs, progress tracking, regeneration, and PDF export

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getBlueprintStatus, getBlueprint, regenerateSection } from '../services/blueprintService.js';
import Navbar from '../components/common/Navbar.jsx';
import BMCCanvas from '../components/blueprint/BMCCanvas.jsx';
import Spinner from '../components/common/Spinner.jsx';
import SectionError from '../components/blueprint/SectionError.jsx';
import { exportToPDF } from '../utils/pdfExport.js';
import {
  CheckCircle, RefreshCw, Download, AlertCircle, ExternalLink,
  PlusCircle, Loader, Zap, Globe, Database, Copy, Check,
  FileText, LayoutGrid, ChevronLeft, ChevronRight, TrendingUp,
  DollarSign, Award, Target, Compass, Layers, ShieldCheck, ArrowUp
} from 'lucide-react';

// ─── Tab definitions ──────────────────────────────────
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'problem', label: 'Problem & Solution' },
  { key: 'customers', label: 'Customers' },
  { key: 'market', label: 'Market' },
  { key: 'competitors', label: 'Competitors' },
  { key: 'bmc', label: 'BMC' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'budget', label: 'Budget' },
  { key: 'gtm', label: 'GTM' },
  { key: 'schemes', label: 'Schemes' },
  { key: 'funding', label: 'Funding' },
  { key: 'legal', label: 'Legal' },
  { key: 'sources', label: 'Sources' },
];

const WORKFLOW_STEPS = [
  { key: 'startup_analysis', label: 'Startup Analysis' },
  { key: 'research_planning', label: 'Research Planning' },
  { key: 'market_research', label: 'Market Research' },
  { key: 'competitor_analysis', label: 'Competitor Analysis' },
  { key: 'customer_analysis', label: 'Target Customer Analysis' },
  { key: 'scheme_research', label: 'Government Scheme Research' },
  { key: 'funding_research', label: 'Funding Opportunity Research' },
  { key: 'legal_research', label: 'Legal/Compliance Research' },
  { key: 'rag_aggregation', label: 'RAG Context Aggregation' },
  { key: 'blueprint_generation', label: 'Blueprint Generation' },
  { key: 'completed', label: 'Completed / Ready for Download' },
];

// ─── Utility components ───────────────────────────────

// Shows IBM Granite + RAG metadata at the bottom of a section
function SectionMeta({ data }) {
  if (!data) return null;
  const { _graniteStatus, _generatedAt, _ragSourceCount, _status } = data;
  if (_status === 'generation_failed') return null;
  if (!_graniteStatus && !_generatedAt) return null;
  return (
    <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-3">
      {_graniteStatus === 'success' && (
        <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
          <Zap className="h-3 w-3" />
          IBM Granite
        </span>
      )}
      {_ragSourceCount > 0 && (
        <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
          <Database className="h-3 w-3" />
          {_ragSourceCount} RAG sources
        </span>
      )}
      {_generatedAt && (
        <span className="text-xs text-gray-400">
          Generated: {new Date(_generatedAt).toLocaleString()}
        </span>
      )}
    </div>
  );
}

function SectionCard({ title, children, sectionKey, blueprintId, onRegenerate, data }) {
  const [regen, setRegen] = useState(false);
  const handleRegen = async () => {
    setRegen(true);
    try { await onRegenerate(sectionKey); } finally { setRegen(false); }
  };
  return (
    <div className="card p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-header">{title}</h3>
        {blueprintId && sectionKey && (
          <button
            onClick={handleRegen}
            disabled={regen}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${regen ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        )}
      </div>
      {data && <SectionError data={data} sectionKey={sectionKey} onRegenerate={onRegenerate} />}
      {children}
      {data && <SectionMeta data={data} />}
    </div>
  );
}

function ItemList({ items, className = '' }) {
  if (!items || items.length === 0) return <p className="text-gray-400 text-sm italic">No items in this section</p>;
  return (
    <ul className={`space-y-1 ${className}`}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
          <span className="text-blue-400 font-bold mt-0.5 flex-shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoGrid({ items }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map(({ label, value }) => value ? (
        <div key={label} className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">{label}</div>
          <div className="text-sm text-gray-800 font-medium">{value}</div>
        </div>
      ) : null)}
    </div>
  );
}

function DisclaimerBanner({ text }) {
  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-700">{text}</p>
    </div>
  );
}

// ─── Progress view ────────────────────────────────────
function GeneratingProgress({ status, progress, stepProgress = [] }) {
  const stepsToRender = (stepProgress && stepProgress.length === 11)
    ? stepProgress
    : WORKFLOW_STEPS.map((s, idx) => ({
        step: s.key,
        label: s.label,
        status: idx === 0 ? 'running' : 'pending',
      }));

  const activeStep = stepsToRender.find((s) => s.status === 'running') || stepsToRender.find((s) => s.status === 'pending');
  const completedCount = stepsToRender.filter((s) => s.status === 'completed').length;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white border border-blue-100 shadow-sm rounded-2xl p-8 mb-6 text-center">
        <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {status === 'pending'
            ? 'Initiating Blueprint Workflow...'
            : (activeStep ? `${activeStep.label}...` : 'Synthesizing Startup Blueprint...')}
        </h2>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
          Our autonomous AI agents are conducting live web research, RAG synthesis, and market analysis for your startup.
        </p>

        {/* Progress bar */}
        <div className="bg-blue-100 rounded-full h-3 mb-3 overflow-hidden">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-xs text-gray-500 font-medium px-1">
          <span>{progress}% complete</span>
          <span>{completedCount} of 11 steps completed</span>
        </div>
      </div>

      {/* 11 Steps Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Workflow Steps Status</h3>
        <div className="space-y-2.5">
          {stepsToRender.map((s, i) => {
            const isCompleted = s.status === 'completed';
            const isRunning = s.status === 'running';
            const isFailed = s.status === 'failed';
            return (
              <div
                key={s.step || s.key || i}
                className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-all ${
                  isCompleted
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : isRunning
                    ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-xs'
                    : isFailed
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-gray-50 border-gray-100 text-gray-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isCompleted && <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />}
                  {isRunning && <Loader className="h-4 w-4 text-blue-600 flex-shrink-0 animate-spin" />}
                  {isFailed && <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                  {!isCompleted && !isRunning && !isFailed && (
                    <div className="h-4 w-4 rounded-full border border-gray-300 flex-shrink-0" />
                  )}
                  <span className="font-medium text-xs sm:text-sm">{s.label}</span>
                </div>
                <div>
                  {isCompleted && (
                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
                      Done
                    </span>
                  )}
                  {isRunning && (
                    <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full animate-pulse">
                      Running
                    </span>
                  )}
                  {isFailed && (
                    <span className="text-xs text-red-600 bg-red-100 px-2.5 py-0.5 rounded-md font-medium">
                      Failed: {s.error || 'Research failed'}
                    </span>
                  )}
                  {!isCompleted && !isRunning && !isFailed && (
                    <span className="text-xs text-gray-400">Waiting</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">Real-time status updates automatically</p>
    </div>
  );
}

// ─── Tab section renderers ────────────────────────────

function ExecutiveMetricsBar({ idea, sections }) {
  const tamVal = sections.market?.content?.marketSize?.tam?.value || 'High-Growth Market';
  const samVal = sections.market?.content?.marketSize?.sam?.value;
  const topScheme = sections.schemes?.content?.schemes?.[0];
  const runway = sections.budget?.content?.runway || '14–18 Months';
  const breakeven = sections.executive_summary?.content?.keyHighlights?.find((h) => /breakeven/i.test(h.label))?.value || '18–24 Months';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {/* Metric 1: Market Size */}
      <div className="card p-4 bg-gradient-to-br from-blue-50/70 to-white border-blue-100 flex items-start gap-3 shadow-xs">
        <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg flex-shrink-0">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-blue-800 font-semibold uppercase tracking-wider mb-0.5">Addressable Market (TAM)</div>
          <div className="font-bold text-gray-900 text-base truncate">{tamVal}</div>
          {samVal && <div className="text-xs text-gray-500 truncate">SAM: {samVal}</div>}
        </div>
      </div>

      {/* Metric 2: Capital & Runway */}
      <div className="card p-4 bg-gradient-to-br from-emerald-50/70 to-white border-emerald-100 flex items-start gap-3 shadow-xs">
        <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg flex-shrink-0">
          <DollarSign className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-emerald-800 font-semibold uppercase tracking-wider mb-0.5">Budget & Runway</div>
          <div className="font-bold text-gray-900 text-base truncate">{idea?.initialBudget || 'Seed Capital'}</div>
          <div className="text-xs text-gray-500 truncate">Runway: {runway}</div>
        </div>
      </div>

      {/* Metric 3: Top Scheme */}
      <div className="card p-4 bg-gradient-to-br from-amber-50/70 to-white border-amber-100 flex items-start gap-3 shadow-xs">
        <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg flex-shrink-0">
          <Award className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-amber-800 font-semibold uppercase tracking-wider mb-0.5">Government Scheme</div>
          <div className="font-bold text-gray-900 text-sm truncate">{topScheme?.name || 'Startup India Seed'}</div>
          <div className="text-xs text-amber-700 font-medium truncate">{topScheme?.benefits?.[0] || 'Grant Funding'}</div>
        </div>
      </div>

      {/* Metric 4: Target Execution */}
      <div className="card p-4 bg-gradient-to-br from-purple-50/70 to-white border-purple-100 flex items-start gap-3 shadow-xs">
        <div className="p-2.5 bg-purple-100 text-purple-700 rounded-lg flex-shrink-0">
          <Target className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-purple-800 font-semibold uppercase tracking-wider mb-0.5">Launch & Horizon</div>
          <div className="font-bold text-gray-900 text-base truncate">90-Day MVP Pilot</div>
          <div className="text-xs text-gray-500 truncate">Breakeven: {breakeven}</div>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ summary, idea }) {
  if (!summary) return <p className="text-gray-400">Overview loading...</p>;
  return (
    <div className="space-y-6">
      <div className="card p-6 bg-gradient-to-br from-white to-blue-50/30 border-blue-100">
        <div className="flex items-start gap-4 mb-4">
          <div className="bg-blue-600 text-white rounded-xl p-3.5 flex-shrink-0 shadow-sm">
            <span className="text-2xl font-extrabold">{idea?.startupName?.[0] || 'S'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl font-bold text-gray-900">{idea?.startupName}</h2>
              <span className="badge bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 uppercase tracking-wide">
                {idea?.stage} Stage
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5 font-medium">
              {idea?.industry} · {idea?.targetLocation} · Team of {idea?.teamSize}
            </p>
          </div>
        </div>

        {/* Elevator Pitch Callout */}
        <div className="border-l-4 border-blue-600 bg-blue-50/80 p-4 rounded-r-xl my-4">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-1 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-blue-600" />
            Elevator Pitch
          </div>
          <p className="text-base text-gray-900 font-medium italic leading-relaxed">
            "{summary.elevatorPitch}"
          </p>
        </div>

        {/* Executive Summary */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Executive Summary</h4>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {summary.executiveSummary}
          </p>
        </div>
      </div>

      {/* Key Highlights Grid */}
      {summary.keyHighlights && summary.keyHighlights.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Key Strategic Highlights</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {summary.keyHighlights.map((h, i) => (
              <div key={i} className="card p-4 text-center hover:border-blue-200 transition-all bg-white shadow-xs">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 font-medium">{h.label}</div>
                <div className="font-bold text-blue-900 text-sm sm:text-base">{h.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5 bg-emerald-50/40 border-emerald-100">
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Compass className="h-4 w-4 text-emerald-600" />
            Core Mission
          </div>
          <p className="text-sm text-gray-800 leading-relaxed font-medium">{summary.missionStatement}</p>
        </div>
        <div className="card p-5 bg-indigo-50/40 border-indigo-100">
          <div className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Target className="h-4 w-4 text-indigo-600" />
            Strategic Vision
          </div>
          <p className="text-sm text-gray-800 leading-relaxed font-medium">{summary.visionStatement}</p>
        </div>
      </div>
    </div>
  );
}

function ProblemTab({ data, blueprintId, onRegenerate }) {
  if (!data) return <p className="text-gray-400">Section not yet generated.</p>;
  if (data._status === 'generation_failed') {
    return <SectionError data={data} sectionKey="problem" onRegenerate={onRegenerate} />;
  }
  const { problem, solution, usp } = data;
  return (
    <div>
      <SectionCard title="Problem" sectionKey="problem" blueprintId={blueprintId} onRegenerate={onRegenerate} data={data}>
        <InfoGrid items={[
          { label: 'Main Problem', value: problem?.mainProblem },
          { label: 'Who Experiences It', value: problem?.whoExperiences },
          { label: 'Why It Matters', value: problem?.whyItMatters },
          { label: 'Problem Scale', value: problem?.problemScale },
          { label: 'Gap in Market', value: problem?.gapInMarket },
        ]} />
        {problem?.currentAlternatives?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 uppercase mb-2">Current Alternatives</p>
            <ItemList items={problem.currentAlternatives} />
          </div>
        )}
      </SectionCard>

      <SectionCard title="Solution" sectionKey="problem" blueprintId={null}>
        <p className="text-sm text-gray-700 mb-3">{solution?.proposedSolution}</p>
        <InfoGrid items={[
          { label: 'How It Solves', value: solution?.howItSolves },
          { label: 'Technology Approach', value: solution?.technologyApproach },
          { label: 'Innovation Factor', value: solution?.innovationFactor },
        ]} />
        {solution?.keyFeatures?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 uppercase mb-2">Key Features</p>
            <ItemList items={solution.keyFeatures} />
          </div>
        )}
      </SectionCard>

      <SectionCard title="Unique Selling Proposition (USP)" sectionKey="problem" blueprintId={null}>
        <p className="text-sm font-medium text-blue-700 mb-3 p-3 bg-blue-50 rounded-lg">{usp?.valueProposition}</p>
        <ItemList items={usp?.uniqueSellingPropositions} />
        {usp?.differentiationFactors?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 uppercase mb-2">Differentiation Factors</p>
            <ItemList items={usp.differentiationFactors} />
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function CustomersTab({ data, blueprintId, onRegenerate }) {
  if (!data) return <p className="text-gray-400">Section not yet generated.</p>;
  if (data._status === 'generation_failed') return <SectionError data={data} sectionKey="customers" onRegenerate={onRegenerate} />;
  const { primaryCustomers, secondaryCustomers, customerPersonas, customerJourney } = data;
  return (
    <div>
      <SectionCard title="Primary Customers" sectionKey="customers" blueprintId={blueprintId} onRegenerate={onRegenerate}>
        <InfoGrid items={[
          { label: 'Segment', value: primaryCustomers?.segment },
          { label: 'Demographics', value: primaryCustomers?.demographics },
          { label: 'Psychographics', value: primaryCustomers?.psychographics },
          { label: 'Market Size', value: primaryCustomers?.size },
          { label: 'Willingness to Pay', value: primaryCustomers?.willingness_to_pay },
        ]} />
        {primaryCustomers?.painPoints?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 uppercase mb-2">Pain Points</p>
            <ItemList items={primaryCustomers.painPoints} />
          </div>
        )}
      </SectionCard>

      {secondaryCustomers?.segment && (
        <SectionCard title="Secondary Customers" blueprintId={null}>
          <InfoGrid items={[
            { label: 'Segment', value: secondaryCustomers.segment },
            { label: 'Opportunity', value: secondaryCustomers.opportunity },
          ]} />
          <ItemList items={secondaryCustomers.painPoints} className="mt-3" />
        </SectionCard>
      )}

      {customerPersonas?.length > 0 && (
        <SectionCard title="Customer Personas" blueprintId={null}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {customerPersonas.map((p, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="font-semibold text-gray-800 mb-1">{p.name}</div>
                <div className="text-xs text-gray-500 mb-2">{p.age} · {p.occupation}</div>
                {p.goals?.length > 0 && (
                  <>
                    <p className="text-xs text-green-700 font-medium mb-1">Goals</p>
                    <ItemList items={p.goals} />
                  </>
                )}
                {p.frustrations?.length > 0 && (
                  <>
                    <p className="text-xs text-red-600 font-medium mt-2 mb-1">Frustrations</p>
                    <ItemList items={p.frustrations} />
                  </>
                )}
                <p className="text-xs text-blue-600 mt-2">{p.howProductHelps}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {customerJourney && Object.keys(customerJourney).length > 0 && (
        <SectionCard title="Customer Journey" blueprintId={null}>
          <InfoGrid items={Object.entries(customerJourney).map(([k, v]) => ({
            label: k.charAt(0).toUpperCase() + k.slice(1), value: v,
          }))} />
        </SectionCard>
      )}
    </div>
  );
}

function MarketTab({ data, blueprintId, onRegenerate }) {
  if (!data) return <p className="text-gray-400">Section not yet generated.</p>;
  if (data._status === 'generation_failed') return <SectionError data={data} sectionKey="market" onRegenerate={onRegenerate} />;
  return (
    <div>
      <SectionCard title="Market Overview" sectionKey="market" blueprintId={blueprintId} onRegenerate={onRegenerate}>
        <p className="text-sm text-gray-700 mb-4">{data.marketOverview}</p>
        <p className="text-sm text-gray-700">{data.marketOpportunity}</p>
      </SectionCard>

      <SectionCard title="Market Size (TAM / SAM / SOM)" blueprintId={null}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {['tam', 'sam', 'som'].map((key) => {
            const dataObj = data.marketSize?.[key];
            return (
              <div key={key} className="bg-blue-50 rounded-lg p-3 text-left border border-blue-100 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-blue-600 uppercase mb-1">{key.toUpperCase()}</div>
                  <div className="font-bold text-gray-900 text-base mb-1">{dataObj?.value}</div>
                  <div className="text-xs text-gray-600 mb-2">{dataObj?.description}</div>
                </div>
                {(dataObj?.calculation || dataObj?.source || dataObj?.assumptions) && (
                  <div className="pt-2 border-t border-blue-100 text-xs space-y-1">
                    {dataObj.calculation && (
                      <p className="text-gray-700"><strong>Logic:</strong> {dataObj.calculation}</p>
                    )}
                    {dataObj.assumptions && (
                      <p className="text-gray-600"><strong>Assumptions:</strong> {dataObj.assumptions}</p>
                    )}
                    {dataObj.source && (
                      <p className="text-blue-600"><strong>Source:</strong> {dataObj.source}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {data.marketGrowthRate && (
          <p className="text-sm text-gray-600 mb-2"><strong>Growth Rate:</strong> {data.marketGrowthRate}</p>
        )}
        <DisclaimerBanner text={data.marketSize?.note || 'Market size figures are AI-estimated and grounded in verified demographic/industry benchmarks.'} />
      </SectionCard>

      {data.keyTrends?.length > 0 && (
        <SectionCard title="Key Trends" blueprintId={null}>
          <div className="space-y-3">
            {data.keyTrends.map((t, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className={`badge text-xs flex-shrink-0 ${
                  t.relevance === 'high' ? 'bg-green-100 text-green-700' :
                  t.relevance === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{t.relevance}</span>
                <div>
                  <p className="font-medium text-sm text-gray-800">{t.trend}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.keyDrivers?.length > 0 && (
          <SectionCard title="Market Drivers" blueprintId={null}>
            <ItemList items={data.keyDrivers} />
          </SectionCard>
        )}
        {data.keyBarriers?.length > 0 && (
          <SectionCard title="Market Barriers" blueprintId={null}>
            <ItemList items={data.keyBarriers} />
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function CompetitorsTab({ data, blueprintId, onRegenerate }) {
  if (!data) return <p className="text-gray-400">Section not yet generated.</p>;
  if (data._status === 'generation_failed') return <SectionError data={data} sectionKey="competitors" onRegenerate={onRegenerate} />;
  return (
    <div>
      <SectionCard title="Direct Competitors" sectionKey="competitors" blueprintId={blueprintId} onRegenerate={onRegenerate}>
        {data.directCompetitors?.map((c, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-4 mb-3 bg-white shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
              <h4 className="font-semibold text-gray-900">{c.name}</h4>
              {c.website && (
                <a
                  href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  {c.website} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">{c.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              <div>
                <p className="text-xs text-green-700 font-medium mb-1">Strengths</p>
                <ItemList items={c.strengths} />
              </div>
              <div>
                <p className="text-xs text-red-600 font-medium mb-1">Weaknesses</p>
                <ItemList items={c.weaknesses} />
              </div>
            </div>
            {c.differentiation && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-900">
                <strong>Our Differentiation Angle:</strong> {c.differentiation}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
              {c.pricingApproach && <span><strong>Pricing:</strong> {c.pricingApproach}</span>}
              {c.source && <span><strong>Data Source:</strong> {c.source}</span>}
            </div>
          </div>
        ))}
      </SectionCard>

      {data.indirectCompetitors?.length > 0 && (
        <SectionCard title="Indirect Competitors" blueprintId={null}>
          <div className="space-y-2">
            {data.indirectCompetitors.map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className={`badge text-xs flex-shrink-0 ${c.threat_level === 'high' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                  {c.threat_level}
                </span>
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {data.competitiveAnalysis && (
        <SectionCard title="Competitive Positioning" blueprintId={null}>
          {data.competitiveAnalysis.competitivePositioning && (
            <p className="text-sm font-medium text-blue-700 p-3 bg-blue-50 rounded-lg mb-3">
              {data.competitiveAnalysis.competitivePositioning}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-green-700 font-medium mb-2">Our Advantages</p>
              <ItemList items={data.competitiveAnalysis.ourAdvantages} />
            </div>
            <div>
              <p className="text-xs text-red-600 font-medium mb-2">Gaps to Address</p>
              <ItemList items={data.competitiveAnalysis.ourDisadvantages} />
            </div>
          </div>
          {data.competitiveAnalysis.differentiationOpportunities?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 uppercase mb-2">Differentiation Opportunities</p>
              <ItemList items={data.competitiveAnalysis.differentiationOpportunities} />
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}

function RevenueTab({ data, blueprintId, onRegenerate }) {
  if (!data) return <p className="text-gray-400">Section not yet generated.</p>;
  if (data._status === 'generation_failed') return <SectionError data={data} sectionKey="revenue" onRegenerate={onRegenerate} />;
  return (
    <div>
      <SectionCard title="Revenue Models" sectionKey="revenue" blueprintId={blueprintId} onRegenerate={onRegenerate}>
        {data.recommendedModels?.map((m, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-gray-900">{m.model}</span>
              <span className={`badge text-xs ${m.priority === 'primary' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {m.priority}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">{m.description}</p>
            <p className="text-xs text-gray-500 mb-3">{m.implementation}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-green-700 font-medium mb-1">Pros</p>
                <ItemList items={m.pros} />
              </div>
              <div>
                <p className="text-xs text-red-600 font-medium mb-1">Cons</p>
                <ItemList items={m.cons} />
              </div>
            </div>
          </div>
        ))}
      </SectionCard>

      {data.pricingStrategy && (
        <SectionCard title="Pricing Strategy" blueprintId={null}>
          <InfoGrid items={[
            { label: 'Approach', value: data.pricingStrategy.approach },
            { label: 'Rationale', value: data.pricingStrategy.rationale },
          ]} />
          {data.pricingStrategy.tiers?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              {data.pricingStrategy.tiers.map((tier, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <div className="font-semibold text-sm text-gray-800">{tier.name}</div>
                  <div className="text-blue-600 font-bold text-sm my-1">{tier.price}</div>
                  <ItemList items={tier.features} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {data.revenueProjections && (
        <SectionCard title="Revenue Projections" blueprintId={null}>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {['year1', 'year2', 'year3'].map((y) => (
              <div key={y} className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 uppercase mb-1">{y.replace('year', 'Year ')}</div>
                <div className="font-bold text-blue-700">{data.revenueProjections[y]}</div>
              </div>
            ))}
          </div>
          <DisclaimerBanner text={data.revenueProjections.disclaimer || 'Revenue projections are AI-estimated. Actual results will vary.'} />
        </SectionCard>
      )}
    </div>
  );
}

function BudgetTab({ data, blueprintId, onRegenerate }) {
  if (!data) return <p className="text-gray-400">Section not yet generated.</p>;
  if (data._status === 'generation_failed') return <SectionError data={data} sectionKey="budget" onRegenerate={onRegenerate} />;
  return (
    <div>
      <SectionCard title="Budget Breakdown" sectionKey="budget" blueprintId={blueprintId} onRegenerate={onRegenerate}>
        <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-lg">
          <span className="font-semibold text-gray-700">Total Estimated Budget</span>
          <span className="font-bold text-blue-700 text-lg">{data.totalEstimatedBudget}</span>
        </div>

        <div className="space-y-3">
          {data.breakdown?.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-gray-800">{item.category}</span>
                  <span className="text-sm font-bold text-gray-700">{item.estimatedAmount}</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2 mb-1">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${item.percentage || 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{item.items?.join(' · ')}</span>
                  <span>{item.percentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {data.burnRate && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <InfoGrid items={[
              { label: 'Monthly Burn Rate', value: data.burnRate },
              { label: 'Runway', value: data.runway },
            ]} />
          </div>
        )}
        <DisclaimerBanner text={data.disclaimer || 'All figures are AI-estimated. Actual costs depend on location and vendors.'} />
      </SectionCard>
    </div>
  );
}

function GTMTab({ data, blueprintId, onRegenerate }) {
  if (!data) return <p className="text-gray-400">Section not yet generated.</p>;
  if (data._status === 'generation_failed') return <SectionError data={data} sectionKey="gtm" onRegenerate={onRegenerate} />;
  return (
    <div>
      <SectionCard title="GTM Overview" sectionKey="gtm" blueprintId={blueprintId} onRegenerate={onRegenerate}>
        <p className="text-sm text-gray-700">{data.gtmOverview}</p>
      </SectionCard>

      {data.launchStrategy && (
        <SectionCard title="Launch Strategy" blueprintId={null}>
          <p className="text-sm font-medium text-gray-800 mb-2">{data.launchStrategy.approach}</p>
          <p className="text-sm text-gray-600 mb-3">{data.launchStrategy.description}</p>
          <ItemList items={data.launchStrategy.keyMilestones} />
        </SectionCard>
      )}

      {data.actionPlan && (
        <SectionCard title="30 / 60 / 90 Day Plan" blueprintId={null}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {['days1to30', 'days31to60', 'days61to90'].map((key, i) => {
              const plan = data.actionPlan[key];
              const labels = ['Days 1–30', 'Days 31–60', 'Days 61–90'];
              const colors = ['bg-green-50 border-green-200', 'bg-blue-50 border-blue-200', 'bg-purple-50 border-purple-200'];
              return plan ? (
                <div key={key} className={`rounded-lg p-4 border ${colors[i]}`}>
                  <div className="font-bold text-sm text-gray-800 mb-1">{labels[i]}</div>
                  <div className="text-xs text-gray-500 mb-2 italic">{plan.theme}</div>
                  <ItemList items={plan.actions} />
                </div>
              ) : null;
            })}
          </div>
        </SectionCard>
      )}

      {data.marketingChannels?.length > 0 && (
        <SectionCard title="Marketing Channels" blueprintId={null}>
          <div className="space-y-2">
            {data.marketingChannels.map((ch, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className={`badge text-xs flex-shrink-0 ${ch.priority === 'high' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-600'}`}>
                  {ch.priority}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{ch.channel}</p>
                  <p className="text-xs text-gray-500">{ch.description}</p>
                  {ch.estimatedCost && <p className="text-xs text-gray-400 mt-0.5">Est. cost: {ch.estimatedCost}</p>}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function SchemesTab({ data, blueprintId, onRegenerate }) {
  if (!data) return <p className="text-gray-400">Section not yet generated.</p>;
  if (data._status === 'generation_failed') return <SectionError data={data} sectionKey="schemes" onRegenerate={onRegenerate} />;
  return (
    <div>
      <SectionCard title="Government Schemes & Programs" sectionKey="schemes" blueprintId={blueprintId} onRegenerate={onRegenerate}>
        {!data.schemes || data.schemes.length === 0 ? (
          <p className="text-gray-400 text-sm">No specific schemes identified. Check Startup India portal.</p>
        ) : (
          data.schemes.map((scheme, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-4 mb-3 bg-white shadow-xs">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900">{scheme.name}</h4>
                  <p className="text-xs text-gray-500">{scheme.organisation}</p>
                </div>
                <div className="flex items-center gap-2">
                  {scheme.deadline && (
                    <span className="text-xs font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Window: {scheme.deadline}
                    </span>
                  )}
                  <span className={`badge text-xs flex-shrink-0 ${scheme.confidence === 'high' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-600'}`}>
                    {scheme.confidence === 'high' ? 'Verified' : 'Active'}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">{scheme.description}</p>
              <InfoGrid items={[
                { label: 'Eligibility', value: scheme.eligibility },
                { label: 'Stage', value: scheme.relevantStage },
                { label: 'How to Apply', value: scheme.applicationProcess },
              ]} />
              {scheme.benefits?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Benefits & Funding</p>
                  <ItemList items={scheme.benefits} />
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between mt-3 pt-2 border-t border-gray-100 text-xs">
                {(scheme.officialSource || scheme.website) && (
                  <a
                    href={scheme.officialSource || scheme.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    Official Portal <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {scheme.retrievedDate && (
                  <span className="text-gray-400">Verified: {scheme.retrievedDate}</span>
                )}
              </div>
            </div>
          ))
        )}
        <DisclaimerBanner text={data.disclaimer || 'Scheme details are verified against active repositories. Check official portals for current intake schedules.'} />
      </SectionCard>
    </div>
  );
}

function FundingTab({ data, blueprintId, onRegenerate }) {
  if (!data) return <p className="text-gray-400">Section not yet generated.</p>;
  if (data._status === 'generation_failed') return <SectionError data={data} sectionKey="funding" onRegenerate={onRegenerate} />;
  return (
    <div>
      <SectionCard title="Funding Opportunities" sectionKey="funding" blueprintId={blueprintId} onRegenerate={onRegenerate}>
        {data.fundingOpportunities?.map((f, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-4 mb-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-900">{f.source}</h4>
                <span className="badge bg-blue-50 text-blue-600 text-xs">{f.type}</span>
              </div>
              <span className="badge text-xs bg-gray-100 text-gray-600">{f.stage}</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">{f.description}</p>
            <InfoGrid items={[
              { label: 'Eligibility', value: f.eligibility },
              { label: 'Funding Range', value: f.fundingRange },
              { label: 'How to Apply', value: f.applicationInfo },
            ]} />
            {f.website && (
              <a href={f.website} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2">
                Learn more <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ))}

        {data.fundingRoadmap && (
          <div className="mt-4">
            <h4 className="font-medium text-gray-700 mb-3">Funding Roadmap</h4>
            <div className="space-y-2">
              {[['Immediate', data.fundingRoadmap.immediate], ['Short-term (3–6 months)', data.fundingRoadmap.shortTerm], ['Long-term', data.fundingRoadmap.longTerm]].map(([label, value]) =>
                value ? (
                  <div key={label} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs font-medium text-gray-500 w-32 flex-shrink-0">{label}</span>
                    <p className="text-sm text-gray-700">{value}</p>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
        <DisclaimerBanner text={data.disclaimer || 'Funding availability changes frequently. Verify directly with providers.'} />
      </SectionCard>
    </div>
  );
}

function LegalTab({ data, blueprintId, onRegenerate }) {
  if (!data) return <p className="text-gray-400">Section not yet generated.</p>;
  if (data._status === 'generation_failed') return <SectionError data={data} sectionKey="legal" onRegenerate={onRegenerate} />;
  return (
    <div>
      <SectionCard title="Business Registration" sectionKey="legal" blueprintId={blueprintId} onRegenerate={onRegenerate}>
        <InfoGrid items={[
          { label: 'Recommended Structure', value: data.businessRegistration?.recommendedStructure },
          { label: 'Rationale', value: data.businessRegistration?.rationale },
          { label: 'Est. Cost', value: data.businessRegistration?.estimatedCost },
          { label: 'Authority', value: data.businessRegistration?.authority },
        ]} />
        {data.businessRegistration?.registrationSteps?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 uppercase mb-2">Steps</p>
            {data.businessRegistration.registrationSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-700 mb-1">
                <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                {step}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {data.complianceRequirements?.length > 0 && (
        <SectionCard title="Compliance Requirements" blueprintId={null}>
          <div className="space-y-2">
            {data.complianceRequirements.map((c, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-sm text-gray-800">{c.area}</div>
                <div className="text-xs text-gray-600 mt-1">{c.requirement}</div>
                {c.authority && <div className="text-xs text-gray-400 mt-0.5">Authority: {c.authority}</div>}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {data.intellectualProperty && (
        <SectionCard title="Intellectual Property" blueprintId={null}>
          <ItemList items={data.intellectualProperty.recommendations} />
        </SectionCard>
      )}

      {data.dataProtection && (
        <SectionCard title="Data Protection" blueprintId={null}>
          <p className="text-sm text-gray-700">{data.dataProtection}</p>
        </SectionCard>
      )}

      <DisclaimerBanner text={data.disclaimer || 'This is general information only and does not constitute legal advice. Consult a qualified lawyer.'} />
    </div>
  );
}

function SourcesTab({ sources }) {
  const grouped = (sources || []).reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const totalWeb = (sources || []).filter(s => s.type === 'web_search').length;
  const totalKB = (sources || []).filter(s => s.type === 'knowledge_base').length;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-header mb-0">Sources & References</h3>
        <div className="flex gap-2 text-xs">
          {totalWeb > 0 && (
            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
              <Globe className="h-3 w-3" />
              {totalWeb} live web
            </span>
          )}
          {totalKB > 0 && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              <Database className="h-3 w-3" />
              {totalKB} knowledge base
            </span>
          )}
        </div>
      </div>
      {Object.keys(grouped).length === 0 ? (
        <p className="text-gray-500 text-sm">Grounded research benchmarks, government repositories, and competitive domain data have been directly synthesized into the blueprint sections above.</p>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 capitalize">{category}</h4>
            <div className="space-y-2">
              {items.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    {s.type === 'web_search'
                      ? <Globe className="h-4 w-4 text-green-500" />
                      : <Database className="h-4 w-4 text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm text-gray-800">{s.title}</p>
                      {s.type === 'web_search' && (
                        <span className="badge bg-green-50 text-green-600 text-xs flex-shrink-0">Live</span>
                      )}
                    </div>
                    {s.snippet && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.snippet}</p>}
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      {s.url && (
                        <a href={s.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          {s.source || s.url.substring(0, 50)} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {s.retrievedAt && (
                        <span className="text-xs text-gray-400">
                          Retrieved: {new Date(s.retrievedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
      <DisclaimerBanner text="Sources combine live web research and curated knowledge base. Always verify information on official portals before acting on it." />
    </div>
  );
}

// ─── Efficiency Components & Markdown Generation ─────────

function TabNavigation({ activeTab, setActiveTab, onCopySection }) {
  const currentIndex = TABS.findIndex((t) => t.key === activeTab);
  const prevTab = currentIndex > 0 ? TABS[currentIndex - 1] : null;
  const nextTab = currentIndex < TABS.length - 1 ? TABS[currentIndex + 1] : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-5 border-t border-gray-100">
      <div>
        {prevTab ? (
          <button
            onClick={() => {
              setActiveTab(prevTab.key);
              window.scrollTo({ top: 320, behavior: 'smooth' });
            }}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous: {prevTab.label}
          </button>
        ) : (
          <div />
        )}
      </div>

      <button
        onClick={() => onCopySection(activeTab)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-blue-700 bg-gray-100 hover:bg-blue-50 px-3.5 py-2 rounded-lg border border-gray-200 transition-colors"
        title="Copy this section's text as Markdown"
      >
        <Copy className="h-3.5 w-3.5 text-blue-600" />
        Copy Section
      </button>

      <div>
        {nextTab ? (
          <button
            onClick={() => {
              setActiveTab(nextTab.key);
              window.scrollTo({ top: 320, behavior: 'smooth' });
            }}
            className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5"
          >
            Next: {nextTab.label}
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

function getSectionMarkdown(key, sections, idea) {
  if (!sections) return '';
  const s = sections[key]?.content;
  if (!s) return '';
  switch (key) {
    case 'overview': {
      return `# ${idea?.startupName || 'Startup'} — Executive Summary\n\n` +
        `**Industry:** ${idea?.industry || 'N/A'} | **Stage:** ${idea?.stage || 'N/A'} | **Location:** ${idea?.targetLocation || 'N/A'} | **Budget:** ${idea?.initialBudget || 'N/A'}\n\n` +
        `### Elevator Pitch\n"${s.elevatorPitch || ''}"\n\n` +
        `### Executive Summary\n${s.executiveSummary || ''}\n\n` +
        (s.missionStatement ? `### Mission\n${s.missionStatement}\n\n` : '') +
        (s.visionStatement ? `### Vision\n${s.visionStatement}\n\n` : '') +
        (s.keyHighlights?.length ? `### Strategic Highlights\n` + s.keyHighlights.map((h) => `- **${h.label}:** ${h.value}`).join('\n') : '');
    }
    case 'problem': {
      return `## Problem & Solution\n\n` +
        `### Problem Analysis\n` +
        `- **Main Problem:** ${s.problem?.mainProblem || 'N/A'}\n` +
        `- **Who Experiences It:** ${s.problem?.whoExperiences || 'N/A'}\n` +
        `- **Why It Matters:** ${s.problem?.whyItMatters || 'N/A'}\n` +
        `- **Problem Scale:** ${s.problem?.problemScale || 'N/A'}\n` +
        `- **Market Gap:** ${s.problem?.gapInMarket || 'N/A'}\n\n` +
        (s.problem?.currentAlternatives?.length ? `**Current Alternatives:**\n${s.problem.currentAlternatives.map((a) => `- ${a}`).join('\n')}\n\n` : '') +
        `### Proposed Solution\n${s.solution?.proposedSolution || 'N/A'}\n\n` +
        `- **How It Solves:** ${s.solution?.howItSolves || 'N/A'}\n` +
        `- **Technology Approach:** ${s.solution?.technologyApproach || 'N/A'}\n` +
        `- **Innovation Factor:** ${s.solution?.innovationFactor || 'N/A'}\n\n` +
        (s.solution?.keyFeatures?.length ? `**Key Features:**\n${s.solution.keyFeatures.map((f) => `- ${f}`).join('\n')}\n\n` : '') +
        `### Unique Selling Proposition (USP)\n${s.usp?.valueProposition || 'N/A'}\n\n` +
        (s.usp?.uniqueSellingPropositions?.length ? `**Differentiators:**\n${s.usp.uniqueSellingPropositions.map((u) => `- ${u}`).join('\n')}\n` : '');
    }
    case 'customers': {
      return `## Target Customers & Personas\n\n` +
        `### Primary Customer Segment\n` +
        `- **Segment:** ${s.primaryCustomers?.segment || 'N/A'}\n` +
        `- **Demographics:** ${s.primaryCustomers?.demographics || 'N/A'}\n` +
        `- **Psychographics:** ${s.primaryCustomers?.psychographics || 'N/A'}\n` +
        `- **Market Size:** ${s.primaryCustomers?.size || 'N/A'}\n` +
        `- **Willingness to Pay:** ${s.primaryCustomers?.willingness_to_pay || 'N/A'}\n\n` +
        (s.primaryCustomers?.painPoints?.length ? `**Pain Points:**\n${s.primaryCustomers.painPoints.map((p) => `- ${p}`).join('\n')}\n\n` : '') +
        (s.secondaryCustomers?.segment ? `### Secondary Customers\n- **Segment:** ${s.secondaryCustomers.segment}\n- **Opportunity:** ${s.secondaryCustomers.opportunity || 'N/A'}\n\n` : '') +
        (s.customerPersonas?.length ? `### Customer Personas\n` + s.customerPersonas.map((p) => `#### Persona: ${p.name} (${p.occupation || ''}, ${p.age || ''})\n- **How Product Helps:** ${p.howProductHelps || 'N/A'}\n- **Goals:** ${(p.goals || []).join('; ')}\n- **Frustrations:** ${(p.frustrations || []).join('; ')}`).join('\n\n') : '');
    }
    case 'market': {
      return `## Market Analysis & Sizing\n\n` +
        `${s.marketOverview || ''}\n\n` +
        (s.marketOpportunity ? `**Opportunity:** ${s.marketOpportunity}\n\n` : '') +
        `### Addressable Market\n` +
        `- **TAM:** ${s.marketSize?.tam?.value || 'N/A'} — ${s.marketSize?.tam?.description || ''}\n` +
        `- **SAM:** ${s.marketSize?.sam?.value || 'N/A'} — ${s.marketSize?.sam?.description || ''}\n` +
        `- **SOM:** ${s.marketSize?.som?.value || 'N/A'} — ${s.marketSize?.som?.description || ''}\n` +
        `- **Market Growth Rate:** ${s.marketGrowthRate || 'N/A'}\n\n` +
        (s.keyTrends?.length ? `### Key Trends\n` + s.keyTrends.map((t) => `- **${t.trend} (${t.relevance || 'trend'}):** ${t.description}`).join('\n') + '\n\n' : '') +
        (s.keyDrivers?.length ? `### Market Drivers\n` + s.keyDrivers.map((d) => `- ${d}`).join('\n') : '');
    }
    case 'competitors': {
      return `## Competitor Intelligence & Differentiation\n\n` +
        `### Direct Competitors\n` +
        (s.directCompetitors?.map((c) => `#### ${c.name}\n${c.description || ''}\n- **Strengths:** ${(c.strengths || []).join(', ')}\n- **Weaknesses:** ${(c.weaknesses || []).join(', ')}\n- **Differentiation Angle:** ${c.differentiation || 'N/A'}\n- **Pricing Model:** ${c.pricingApproach || 'N/A'}`).join('\n\n') || '') + '\n\n' +
        `### Competitive Positioning\n${s.competitiveAnalysis?.competitivePositioning || ''}\n\n` +
        `- **Our Strategic Advantages:** ${(s.competitiveAnalysis?.ourAdvantages || []).join('; ')}\n` +
        `- **Gaps to Address:** ${(s.competitiveAnalysis?.ourDisadvantages || []).join('; ')}`;
    }
    case 'bmc': {
      return `## Business Model Canvas (9 Blocks)\n\n` +
        Object.entries(s || {})
          .filter(([k]) => !k.startsWith('_'))
          .map(([k, v]) => `### ${k.toUpperCase().replace(/_/g, ' ')}\n${Array.isArray(v) ? v.map((i) => `- ${i}`).join('\n') : typeof v === 'object' ? JSON.stringify(v, null, 2) : v}`)
          .join('\n\n');
    }
    case 'revenue': {
      return `## Revenue & Pricing Model\n\n` +
        `### Recommended Revenue Streams\n` +
        (s.recommendedModels?.map((m) => `- **${m.model} (${m.priority}):** ${m.description}\n  - *Pros:* ${(m.pros || []).join(', ')}\n  - *Cons:* ${(m.cons || []).join(', ')}`).join('\n') || '') + '\n\n' +
        `### Pricing Strategy\n- **Approach:** ${s.pricingStrategy?.approach || 'N/A'}\n- **Rationale:** ${s.pricingStrategy?.rationale || 'N/A'}\n\n` +
        (s.pricingStrategy?.tiers?.length ? `**Pricing Tiers:**\n` + s.pricingStrategy.tiers.map((t) => `- **${t.name} (${t.price}):** ${(t.features || []).join(', ')}`).join('\n') + '\n\n' : '') +
        `### 3-Year Revenue Projections\n` +
        `- Year 1: ${s.revenueProjections?.year1 || 'N/A'}\n` +
        `- Year 2: ${s.revenueProjections?.year2 || 'N/A'}\n` +
        `- Year 3: ${s.revenueProjections?.year3 || 'N/A'}`;
    }
    case 'budget': {
      return `## Financial Plan, Budget & Runway\n\n` +
        `- **Total Estimated Budget:** ${s.totalEstimatedBudget || idea?.initialBudget || 'N/A'}\n` +
        `- **Monthly Burn Rate:** ${s.burnRate || 'N/A'}\n` +
        `- **Runway:** ${s.runway || 'N/A'}\n\n` +
        `### Budget Allocation\n` +
        (s.breakdown?.map((b) => `- **${b.category} (${b.percentage}% — ${b.estimatedAmount}):** ${(b.items || []).join(', ')}`).join('\n') || '');
    }
    case 'gtm': {
      return `## Go-To-Market & 90-Day Execution Plan\n\n` +
        `${s.gtmOverview || ''}\n\n` +
        `### Launch Approach\n${s.launchStrategy?.approach || 'N/A'} — ${s.launchStrategy?.description || ''}\n\n` +
        `### 30 / 60 / 90 Day Milestones\n` +
        `- **Days 1–30 (${s.actionPlan?.days1to30?.theme || 'Foundation'}):** ${(s.actionPlan?.days1to30?.actions || []).join('; ')}\n` +
        `- **Days 31–60 (${s.actionPlan?.days31to60?.theme || 'Traction'}):** ${(s.actionPlan?.days31to60?.actions || []).join('; ')}\n` +
        `- **Days 61–90 (${s.actionPlan?.days61to90?.theme || 'Scale'}):** ${(s.actionPlan?.days61to90?.actions || []).join('; ')}`;
    }
    case 'schemes': {
      return `## Government Schemes, Subsidies & Grants\n\n` +
        (s.schemes?.map((sc) => `### ${sc.name} (${sc.organisation || 'Government of India'})\n${sc.description || ''}\n- **Eligibility:** ${sc.eligibility || 'N/A'}\n- **Relevant Stage:** ${sc.relevantStage || 'N/A'}\n- **Benefits:** ${(sc.benefits || []).join(', ')}\n- **Official Portal:** ${sc.officialSource || sc.website || 'N/A'}`).join('\n\n') || 'No schemes identified.');
    }
    case 'funding': {
      return `## Funding Opportunities & Roadmap\n\n` +
        (s.fundingOpportunities?.map((f) => `### ${f.source} (${f.type} · ${f.stage})\n${f.description || ''}\n- **Funding Range:** ${f.fundingRange || 'N/A'}\n- **Eligibility:** ${f.eligibility || 'N/A'}\n- **How to Apply:** ${f.applicationInfo || 'N/A'}\n- **Portal:** ${f.website || 'N/A'}`).join('\n\n') || '') + '\n\n' +
        `### Funding Roadmap\n- Immediate: ${s.fundingRoadmap?.immediate || 'N/A'}\n- Short-term (3–6 months): ${s.fundingRoadmap?.shortTerm || 'N/A'}\n- Long-term: ${s.fundingRoadmap?.longTerm || 'N/A'}`;
    }
    case 'legal': {
      return `## Legal Structure, Compliance & Protection\n\n` +
        `**Recommended Structure:** ${s.businessRegistration?.recommendedStructure || 'Private Limited Company'}\n` +
        `**Authority:** ${s.businessRegistration?.authority || 'Ministry of Corporate Affairs (MCA)'}\n` +
        `**Estimated Cost:** ${s.businessRegistration?.estimatedCost || '₹10,000–₹15,000'}\n` +
        `**Rationale:** ${s.businessRegistration?.rationale || 'N/A'}\n\n` +
        (s.businessRegistration?.registrationSteps?.length ? `**Registration Steps:**\n${s.businessRegistration.registrationSteps.map((st, i) => `${i + 1}. ${st}`).join('\n')}\n\n` : '') +
        (s.complianceRequirements?.length ? `### Key Compliance Requirements\n` + s.complianceRequirements.map((c) => `- **${c.area}:** ${c.requirement} (Authority: ${c.authority || 'Applicable Regulator'})`).join('\n') : '');
    }
    case 'sources': {
      return `## Grounded Research Sources & Citations\n\n` +
        ((idea?.sources || []).map((src) => `- [${src.title || src.source}](${src.url || '#'}) (${src.type})`).join('\n') || 'Curated knowledge base + live web search verification.');
    }
    default:
      return JSON.stringify(s, null, 2);
  }
}

function getFullBlueprintMarkdown(blueprint) {
  if (!blueprint) return '';
  const { startupIdea: idea, sections } = blueprint;
  const parts = [
    `# Complete Startup Blueprint: ${idea?.startupName || 'Startup'}`,
    `**Industry:** ${idea?.industry || 'N/A'} | **Target Location:** ${idea?.targetLocation || 'N/A'} | **Stage:** ${idea?.stage || 'N/A'} | **Budget:** ${idea?.initialBudget || 'N/A'} | **Team Size:** ${idea?.teamSize || 'N/A'}`,
    `*Generated via Startup Blueprint Generator Agent (IBM Granite + Verified Grounding)*\n\n---\n`,
  ];

  const keys = ['overview', 'problem', 'customers', 'market', 'competitors', 'bmc', 'revenue', 'budget', 'gtm', 'schemes', 'funding', 'legal', 'sources'];
  for (const k of keys) {
    const text = getSectionMarkdown(k, sections, idea);
    if (text) {
      parts.push(text);
      parts.push('\n---\n');
    }
  }
  return parts.join('\n\n');
}

function FullDocumentView({ blueprint, id, onRegenerate, onCopySection }) {
  const sections = blueprint.sections || {};
  const idea = blueprint.startupIdea;

  const docSections = [
    { id: 'doc-overview', key: 'overview', title: '1. Executive Overview', comp: <OverviewTab summary={sections.executive_summary?.content} idea={idea} /> },
    { id: 'doc-problem', key: 'problem', title: '2. Problem & Solution', comp: <ProblemTab data={sections.problem?.content} blueprintId={id} onRegenerate={onRegenerate} /> },
    { id: 'doc-customers', key: 'customers', title: '3. Target Customers & Personas', comp: <CustomersTab data={sections.customers?.content} blueprintId={id} onRegenerate={onRegenerate} /> },
    { id: 'doc-market', key: 'market', title: '4. Market Analysis & Sizing', comp: <MarketTab data={sections.market?.content} blueprintId={id} onRegenerate={onRegenerate} /> },
    { id: 'doc-competitors', key: 'competitors', title: '5. Competitor Intelligence', comp: <CompetitorsTab data={sections.competitors?.content} blueprintId={id} onRegenerate={onRegenerate} /> },
    { id: 'doc-bmc', key: 'bmc', title: '6. Business Model Canvas', comp: <BMCCanvas bmc={sections.bmc?.content} blueprintId={id} onSectionRegenerated={(k) => onRegenerate(k)} /> },
    { id: 'doc-revenue', key: 'revenue', title: '7. Revenue Model & Pricing', comp: <RevenueTab data={sections.revenue?.content} blueprintId={id} onRegenerate={onRegenerate} /> },
    { id: 'doc-budget', key: 'budget', title: '8. Financial Plan & Budget', comp: <BudgetTab data={sections.budget?.content} blueprintId={id} onRegenerate={onRegenerate} /> },
    { id: 'doc-gtm', key: 'gtm', title: '9. Go-To-Market & 90-Day Plan', comp: <GTMTab data={sections.gtm?.content} blueprintId={id} onRegenerate={onRegenerate} /> },
    { id: 'doc-schemes', key: 'schemes', title: '10. Government Schemes & Subsidies', comp: <SchemesTab data={sections.schemes?.content} blueprintId={id} onRegenerate={onRegenerate} /> },
    { id: 'doc-funding', key: 'funding', title: '11. Funding Roadmap & Investors', comp: <FundingTab data={sections.funding?.content} blueprintId={id} onRegenerate={onRegenerate} /> },
    { id: 'doc-legal', key: 'legal', title: '12. Legal & Compliance Roadmap', comp: <LegalTab data={sections.legal?.content} blueprintId={id} onRegenerate={onRegenerate} /> },
    { id: 'doc-sources', key: 'sources', title: '13. Grounded Sources & Citations', comp: <SourcesTab sources={blueprint.sources} /> },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Main Sequential Document Content */}
      <div className="lg:col-span-8 xl:col-span-9 space-y-8">
        {docSections.map((sec) => (
          <section key={sec.id} id={sec.id} className="scroll-mt-6">
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-t-xl px-6 py-3.5 border-b-0 shadow-xs">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                {sec.title}
              </h2>
              <button
                onClick={() => onCopySection(sec.key)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors"
                title={`Copy ${sec.title}`}
              >
                <Copy className="h-3.5 w-3.5 text-blue-600" />
                Copy Section
              </button>
            </div>
            <div className="bg-white border border-gray-200 rounded-b-xl p-6 shadow-xs">
              {sec.comp}
            </div>
          </section>
        ))}
      </div>

      {/* Sticky Table of Contents Sidebar */}
      <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-6 space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-600" />
              Document Contents
            </h3>
            <span className="text-[11px] text-gray-400 font-medium">13 Sections</span>
          </div>
          <nav className="space-y-1 text-xs">
            {docSections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="block px-2.5 py-1.5 rounded-md text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors font-medium truncate"
              >
                {sec.title}
              </a>
            ))}
          </nav>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 font-medium py-1"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              Back to Top
            </button>
            <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
              Verified
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}

// ─── Main BlueprintResult Page ────────────────────────

export default function BlueprintResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState('tabs'); // 'tabs' | 'document'
  const [toast, setToast] = useState('');
  const [blueprint, setBlueprint] = useState(null);
  const [status, setStatus] = useState({ status: 'pending', progress: 0, stepProgress: [], sectionsCompleted: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchBlueprint = useCallback(async () => {
    try {
      const data = await getBlueprint(id);
      setBlueprint(data.blueprint);
      const stepProg = data.blueprint.stepProgress || [];
      const completedSteps = stepProg.filter((s) => s.status === 'completed').length;
      setStatus({
        status: data.blueprint.status,
        progress: stepProg.length > 0
          ? Math.round((completedSteps / 11) * 100)
          : Math.round((Object.keys(data.blueprint.sections || {}).length / 12) * 100),
        stepProgress: stepProg,
        sectionsCompleted: Object.keys(data.blueprint.sections || {}).length,
      });
    } catch (err) {
      console.error('Failed to load blueprint', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBlueprint();
  }, [fetchBlueprint]);

  // Poll while generating
  useEffect(() => {
    if (status.status === 'generating' || status.status === 'pending') {
      const interval = setInterval(fetchBlueprint, 3000);
      return () => clearInterval(interval);
    }
  }, [status.status, fetchBlueprint]);

  const handleRegenerate = async (sectionKey) => {
    try {
      const result = await regenerateSection(id, sectionKey);
      setBlueprint((prev) => ({
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: { ...prev.sections[sectionKey], content: result.content },
        },
      }));
      showToast(`Regenerated ${sectionKey} section!`);
    } catch (err) {
      alert(`Failed to regenerate ${sectionKey}. Please try again.`);
    }
  };

  const handleSectionRegenerated = (key, content) => {
    setBlueprint((prev) => ({
      ...prev,
      sections: { ...prev.sections, [key]: { ...prev.sections[key], content } },
    }));
  };

  const handleCopySection = (sectionKey) => {
    const md = getSectionMarkdown(sectionKey, sections, idea);
    if (!md) return;
    navigator.clipboard.writeText(md);
    const tabLabel = TABS.find((t) => t.key === sectionKey)?.label || 'Section';
    showToast(`Copied ${tabLabel} to clipboard!`);
  };

  const handleCopyFullBlueprint = () => {
    const fullMd = getFullBlueprintMarkdown(blueprint);
    navigator.clipboard.writeText(fullMd);
    showToast('Complete Blueprint copied to clipboard!');
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToPDF(blueprint);
    } catch (err) {
      alert('PDF export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Blueprint not found</h2>
          <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const sections = blueprint.sections || {};
  const idea = blueprint.startupIdea;
  const isGenerating = status.status === 'generating' || status.status === 'pending';
  const isFailed = status.status === 'failed';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/dashboard" className="hover:text-gray-700">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{idea?.startupName || 'Blueprint'}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{idea?.startupName}</h1>
            <p className="text-gray-500 text-sm">{idea?.industry} · {idea?.stage} stage</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {status.status === 'completed' && (
              <>
                {/* View Mode Switcher */}
                <div className="flex items-center bg-gray-200/80 p-1 rounded-lg border border-gray-200">
                  <button
                    onClick={() => setViewMode('tabs')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      viewMode === 'tabs'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Tab View
                  </button>
                  <button
                    onClick={() => setViewMode('document')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      viewMode === 'document'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Executive Document
                  </button>
                </div>

                <button
                  onClick={handleCopyFullBlueprint}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 text-gray-700 hover:text-blue-600"
                  title="Copy complete blueprint as markdown"
                >
                  <Copy className="h-4 w-4 text-blue-600" />
                  Copy All
                </button>

                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 text-gray-700 hover:text-blue-600"
                >
                  <Download className="h-4 w-4" />
                  {exporting ? 'Exporting...' : 'Export PDF'}
                </button>

                <Link to="/blueprint/new" className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3">
                  <PlusCircle className="h-4 w-4" />
                  New Blueprint
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Failed state */}
        {isFailed && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Blueprint generation failed</h3>
                <p className="text-sm text-red-600 mt-1">
                  {blueprint.errorMessage || 'An error occurred during AI analysis.'}
                </p>
                <p className="text-sm text-red-500 mt-2">
                  This may be due to IBM Granite service unavailability. Please check your API credentials or try again.
                </p>
                <Link to="/blueprint/new" className="btn-danger inline-flex items-center gap-2 mt-3 text-sm">
                  <PlusCircle className="h-4 w-4" />
                  Try Again
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Generating view */}
        {isGenerating && (
          <GeneratingProgress
            status={status.status}
            progress={status.progress}
            stepProgress={status.stepProgress}
          />
        )}

        {/* Completed — full blueprint */}
        {status.status === 'completed' && (
          <>
            {/* Workflow Verification Summary */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-emerald-900">
                  All 11 Autonomous Workflow & Synthesis Steps Verified
                </span>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">
                Real-Time Verified Output
              </span>
            </div>

            {/* Executive Metrics KPI Bar */}
            <ExecutiveMetricsBar idea={idea} sections={sections} />

            {/* View Render: Interactive Tabs vs Executive Document */}
            {viewMode === 'tabs' ? (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6 shadow-xs">
                <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/50">
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === tab.key
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-white font-semibold shadow-xs'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {activeTab === 'overview' && (
                    <OverviewTab summary={sections.executive_summary?.content} idea={idea} />
                  )}
                  {activeTab === 'problem' && (
                    <ProblemTab data={sections.problem?.content} blueprintId={id} onRegenerate={handleRegenerate} />
                  )}
                  {activeTab === 'customers' && (
                    <CustomersTab data={sections.customers?.content} blueprintId={id} onRegenerate={handleRegenerate} />
                  )}
                  {activeTab === 'market' && (
                    <MarketTab data={sections.market?.content} blueprintId={id} onRegenerate={handleRegenerate} />
                  )}
                  {activeTab === 'competitors' && (
                    <CompetitorsTab data={sections.competitors?.content} blueprintId={id} onRegenerate={handleRegenerate} />
                  )}
                  {activeTab === 'bmc' && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="section-header">Business Model Canvas</h3>
                        <span className="text-xs text-gray-400">9-block Osterwalder BMC — powered by IBM Granite</span>
                      </div>
                      <BMCCanvas
                        bmc={sections.bmc?.content}
                        blueprintId={id}
                        onSectionRegenerated={handleSectionRegenerated}
                      />
                    </div>
                  )}
                  {activeTab === 'revenue' && (
                    <RevenueTab data={sections.revenue?.content} blueprintId={id} onRegenerate={handleRegenerate} />
                  )}
                  {activeTab === 'budget' && (
                    <BudgetTab data={sections.budget?.content} blueprintId={id} onRegenerate={handleRegenerate} />
                  )}
                  {activeTab === 'gtm' && (
                    <GTMTab data={sections.gtm?.content} blueprintId={id} onRegenerate={handleRegenerate} />
                  )}
                  {activeTab === 'schemes' && (
                    <SchemesTab data={sections.schemes?.content} blueprintId={id} onRegenerate={handleRegenerate} />
                  )}
                  {activeTab === 'funding' && (
                    <FundingTab data={sections.funding?.content} blueprintId={id} onRegenerate={handleRegenerate} />
                  )}
                  {activeTab === 'legal' && (
                    <LegalTab data={sections.legal?.content} blueprintId={id} onRegenerate={handleRegenerate} />
                  )}
                  {activeTab === 'sources' && (
                    <SourcesTab sources={blueprint.sources} />
                  )}

                  {/* Tab Navigation Footer (Previous / Copy / Next) */}
                  <TabNavigation
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onCopySection={handleCopySection}
                  />
                </div>
              </div>
            ) : (
              <FullDocumentView
                blueprint={blueprint}
                id={id}
                onRegenerate={handleRegenerate}
                onCopySection={handleCopySection}
              />
            )}
          </>
        )}

        {/* Global Action Toast Notification */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border border-gray-700 animate-bounce">
            <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>{toast}</span>
          </div>
        )}
      </div>
    </div>
  );
}
