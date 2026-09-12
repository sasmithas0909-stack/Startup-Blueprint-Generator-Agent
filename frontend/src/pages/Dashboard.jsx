// frontend/src/pages/Dashboard.jsx

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { getUserBlueprints, getUserProfile, deleteBlueprint, getBlueprint } from '../services/blueprintService.js';
import Navbar from '../components/common/Navbar.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { exportToPDF } from '../utils/pdfExport.js';
import {
  PlusCircle, FileText, TrendingUp, Clock, CheckCircle,
  AlertCircle, Trash2, Eye, Loader, Download
} from 'lucide-react';

const STATUS_CONFIG = {
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  generating: { label: 'Generating...', color: 'bg-blue-100 text-blue-700', icon: Loader },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`badge ${config.color}`}>
      {status === 'generating' && <config.icon className="h-3 w-3 mr-1 animate-spin" />}
      {status !== 'generating' && <config.icon className="h-3 w-3 mr-1" />}
      {config.label}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [blueprints, setBlueprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchData = async () => {
    try {
      const [profileData, bpData] = await Promise.all([
        getUserProfile(),
        getUserBlueprints(),
      ]);
      setProfile(profileData.user);
      setBlueprints(bpData.blueprints || []);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll for generating blueprints
    const interval = setInterval(() => {
      const hasGenerating = blueprints.some(
        (b) => b.status === 'generating' || b.status === 'pending'
      );
      if (hasGenerating) fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, [blueprints.length]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this blueprint? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await deleteBlueprint(id);
      setBlueprints((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      alert('Failed to delete blueprint');
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (id) => {
    setDownloadingId(id);
    try {
      const data = await getBlueprint(id);
      if (data.blueprint) {
        await exportToPDF(data.blueprint);
      }
    } catch (err) {
      alert('Failed to generate and download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-500 mt-1">Manage and generate your startup blueprints</p>
          </div>
          <Link
            to="/blueprint/new"
            className="btn-primary flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            New Blueprint
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2.5 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{profile?.totalBlueprints || 0}</div>
                <div className="text-sm text-gray-500">Total Blueprints</div>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 p-2.5 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{profile?.completedBlueprints || 0}</div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="bg-purple-50 p-2.5 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {blueprints.filter((b) => b.status === 'generating' || b.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-500">In Progress</div>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Blueprints List */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Your Blueprints</h2>
          </div>

          {blueprints.length === 0 ? (
            <div className="text-center py-16 px-6">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-700 mb-2">No blueprints yet</h3>
              <p className="text-gray-400 text-sm mb-6">
                Generate your first AI-powered startup blueprint
              </p>
              <Link to="/blueprint/new" className="btn-primary inline-flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Create Blueprint
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {blueprints.map((bp) => (
                <div key={bp.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="bg-blue-50 p-2.5 rounded-lg flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {bp.startupIdea?.startupName || 'Untitled'}
                      </h3>
                      <StatusBadge status={bp.status} />
                    </div>
                    <p className="text-sm text-gray-500 truncate">{bp.startupIdea?.idea}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{bp.startupIdea?.industry}</span>
                      <span>·</span>
                      <span>{bp.startupIdea?.stage}</span>
                      <span>·</span>
                      <span>{new Date(bp.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {bp.status === 'completed' && (
                      <>
                        <Link
                          to={`/blueprint/${bp.id}`}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                        <button
                          onClick={() => handleDownload(bp.id)}
                          disabled={downloadingId === bp.id}
                          className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Download PDF"
                        >
                          {downloadingId === bp.id ? (
                            <Loader className="h-4 w-4 animate-spin text-blue-600" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline text-xs font-medium">PDF</span>
                        </button>
                      </>
                    )}
                    {(bp.status === 'generating' || bp.status === 'pending') && (
                      <Link
                        to={`/blueprint/${bp.id}`}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Loader className="h-4 w-4 animate-spin" />
                        Track
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(bp.id)}
                      disabled={deleting === bp.id}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
