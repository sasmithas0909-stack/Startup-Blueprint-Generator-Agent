// frontend/src/pages/NewBlueprint.jsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar.jsx';
import { generateBlueprint } from '../services/blueprintService.js';
import { Zap, Info } from 'lucide-react';

const INDUSTRIES = [
  'AgriTech', 'EdTech', 'HealthTech / MedTech', 'FinTech',
  'CleanTech / GreenTech', 'E-Commerce / D2C', 'SaaS / B2B Software',
  'FoodTech', 'LogiTech / Supply Chain', 'HRTech', 'LegalTech',
  'PropTech / Real Estate', 'TravelTech', 'SpaceTech', 'DeepTech / AI/ML',
  'Social Impact', 'Manufacturing / Hardware', 'Retail', 'Other',
];

const STAGES = [
  { value: 'ideation', label: 'Ideation — Idea only, no product' },
  { value: 'validation', label: 'Validation — Prototype or MVP testing' },
  { value: 'mvp', label: 'MVP — Product launched, early users' },
  { value: 'growth', label: 'Growth — Revenue generating, scaling' },
  { value: 'scaling', label: 'Scaling — Expanding markets' },
];

const DEMO_IDEAS = [
  {
    label: 'AgriTech Demo',
    data: {
      startupName: 'CropSense AI',
      idea: 'An affordable AI-powered mobile app that helps small and marginal farmers in India detect crop diseases by scanning leaves with their smartphone camera. The app provides instant diagnosis, treatment recommendations, and connects farmers to agri-input suppliers.',
      industry: 'AgriTech',
      targetLocation: 'India (Rural Tier 2/3 districts)',
      targetCustomer: 'Small and marginal farmers with 1-5 acres of land',
      initialBudget: 'INR 25 lakhs',
      teamSize: 3,
      stage: 'validation',
      additionalNotes: 'Planning to integrate with PM-KISAN data and RKVY-RAFTAAR scheme.',
    },
  },
  {
    label: 'EdTech Demo',
    data: {
      startupName: 'SkillBridge',
      idea: 'A vernacular-language skill development platform targeting Tier 2/3 city youth in India aged 18-28. Provides job-ready courses in digital skills, trades, and entrepreneurship with job placement assistance and employer partnerships.',
      industry: 'EdTech',
      targetLocation: 'India (Tier 2/3 cities)',
      targetCustomer: 'Youth aged 18-28 seeking employment or skill upgradation',
      initialBudget: 'INR 50 lakhs',
      teamSize: 5,
      stage: 'ideation',
      additionalNotes: 'Focus on NSDC-aligned certifications.',
    },
  },
];

export default function NewBlueprint() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    startupName: '',
    idea: '',
    industry: '',
    targetLocation: '',
    targetCustomer: '',
    initialBudget: '',
    teamSize: 1,
    stage: 'ideation',
    additionalNotes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const loadDemo = (demo) => {
    setForm({ ...demo.data });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.idea.trim().length < 20) {
      return setError('Please describe your startup idea in at least 20 characters.');
    }

    setLoading(true);
    try {
      const result = await generateBlueprint(form);
      navigate(`/blueprint/${result.blueprintId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start blueprint generation. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 mb-4 block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">New Startup Blueprint</h1>
          <p className="text-gray-500">
            Fill in your startup details and IBM Granite AI will generate a comprehensive blueprint.
          </p>
        </div>

        {/* Demo loader */}
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Load a demo idea to test quickly</span>
          </div>
          <div className="flex gap-2">
            {DEMO_IDEAS.map((d) => (
              <button
                key={d.label}
                onClick={() => loadDemo(d)}
                className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Startup Name */}
          <div>
            <label className="label">Startup Name *</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. CropSense AI"
              value={form.startupName}
              onChange={(e) => update('startupName', e.target.value)}
              required
              maxLength={200}
            />
          </div>

          {/* Startup Idea */}
          <div>
            <label className="label">Describe Your Startup Idea *</label>
            <textarea
              className="input-field resize-none"
              rows={5}
              placeholder="Explain what your startup does, the problem it solves, and how it works. Be as specific as possible for better AI analysis."
              value={form.idea}
              onChange={(e) => update('idea', e.target.value)}
              required
              minLength={20}
              maxLength={5000}
            />
            <p className="text-xs text-gray-400 mt-1">{form.idea.length}/5000 characters</p>
          </div>

          {/* Industry + Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Industry / Domain *</label>
              <select
                className="input-field bg-white"
                value={form.industry}
                onChange={(e) => update('industry', e.target.value)}
                required
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Current Startup Stage *</label>
              <select
                className="input-field bg-white"
                value={form.stage}
                onChange={(e) => update('stage', e.target.value)}
              >
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location + Customer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Target Location *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. India, Rural Maharashtra"
                value={form.targetLocation}
                onChange={(e) => update('targetLocation', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Target Customer *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Small farmers, Urban millennials"
                value={form.targetCustomer}
                onChange={(e) => update('targetCustomer', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Budget + Team */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Approximate Initial Budget *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. INR 25 lakhs, USD 50K"
                value={form.initialBudget}
                onChange={(e) => update('initialBudget', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Founder / Team Size *</label>
              <input
                type="number"
                className="input-field"
                min={1}
                max={1000}
                value={form.teamSize}
                onChange={(e) => update('teamSize', parseInt(e.target.value) || 1)}
                required
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="label">Additional Requirements / Context (optional)</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Any specific requirements, target markets, partnerships, or constraints..."
              value={form.additionalNotes}
              onChange={(e) => update('additionalNotes', e.target.value)}
              maxLength={1000}
            />
          </div>

          {/* AI Notice */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-4">
            <Zap className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <strong>IBM Granite AI</strong> will analyze your startup idea across 12 dimensions.
              Generation takes 3–8 minutes. You can track progress live on the next page.
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Starting Analysis...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Generate Blueprint with IBM Granite
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
