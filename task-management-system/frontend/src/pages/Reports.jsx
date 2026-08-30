import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { reportService } from '../services/reportService';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  BarChart3, 
  Sparkles, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Users, 
  Tag, 
  RotateCcw, 
  Copy, 
  Check, 
  FileText, 
  Database,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  History,
  Activity
} from 'lucide-react';

const PERIOD_PRESETS = [
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'this_year', label: 'This Year' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom Range' },
];

const Reports = () => {
  const { user } = useAuth();

  // Filter State
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Analytics Data State
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(null);

  // AI Report State
  const [aiReport, setAiReport] = useState(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [activeAITab, setActiveAITab] = useState('overview');
  const [copiedReport, setCopiedReport] = useState(false);

  // Fetch Database Analytics
  const fetchAnalytics = async (period = selectedPeriod, start = customStartDate, end = customEndDate) => {
    setLoadingAnalytics(true);
    setAnalyticsError(null);
    try {
      const res = await reportService.getAnalytics({
        period,
        startDate: period === 'custom' ? start : undefined,
        endDate: period === 'custom' ? end : undefined,
      });

      if (res?.success && res?.data) {
        setAnalytics(res.data);
      } else {
        setAnalyticsError('Unable to load database reports.');
      }
    } catch (err) {
      console.error('Fetch Analytics Error:', err);
      setAnalyticsError(err.message || 'Error connecting to database reports.');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(selectedPeriod);
  }, [selectedPeriod]);

  // Handle Preset Change
  const handlePeriodChange = (periodId) => {
    setSelectedPeriod(periodId);
    if (periodId !== 'custom') {
      fetchAnalytics(periodId);
    }
  };

  // Apply Custom Date Range
  const handleApplyCustomRange = (e) => {
    e.preventDefault();
    if (!customStartDate || !customEndDate) return;
    fetchAnalytics('custom', customStartDate, customEndDate);
  };

  // Generate AI Executive Report
  const handleGenerateAIReport = async () => {
    setGeneratingAI(true);
    setAiError(null);
    try {
      const res = await reportService.generateAIReport({
        period: selectedPeriod,
        startDate: selectedPeriod === 'custom' ? customStartDate : undefined,
        endDate: selectedPeriod === 'custom' ? customEndDate : undefined,
      });

      if (res?.success && res?.data) {
        setAiReport(res.data);
        setActiveAITab('overview');
      } else {
        setAiError('Failed to generate AI insights.');
      }
    } catch (err) {
      console.error('Generate AI Report Error:', err);
      setAiError(err.message || 'Failed to generate AI report.');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Copy Full Report
  const handleCopyReport = () => {
    if (!aiReport?.reportContent) return;
    navigator.clipboard.writeText(aiReport.reportContent);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const summary = analytics?.summary || {};
  const comparisons = analytics?.comparisons || {};
  const priorPeriod = comparisons?.priorPeriod || {};
  const sameMonthLastYear = comparisons?.sameMonthLastYear || {};
  const yearOverYear = comparisons?.yearOverYear || {};
  const monthlyHistory = comparisons?.monthlyHistory || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Page Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-sm">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Reports & AI Insights
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Deterministic PostgreSQL analytics, multi-period comparisons, and LLM-powered intelligence.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 py-1.5 px-3">
            <Database className="h-3.5 w-3.5 mr-1.5" />
            {analytics?.scope || 'PostgreSQL Grounded'}
          </Badge>

          {user?.role && (
            <Badge variant="secondary" className="uppercase text-xs font-semibold py-1.5 px-3">
              {user.role}
            </Badge>
          )}
        </div>
      </div>

      {/* Date Filter Bar & AI Action Toolbar */}
      <Card className="shadow-xs border bg-card">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Period Filter Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Period:
              </span>
              {PERIOD_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePeriodChange(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedPeriod === p.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* AI Report Trigger Button */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleGenerateAIReport}
                disabled={generatingAI || loadingAnalytics || (summary.totalTasks === 0)}
                className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 hover:from-indigo-700 hover:via-blue-700 hover:to-purple-700 text-white shadow-md gap-2 font-medium px-4 py-2 text-sm transition-all"
              >
                {generatingAI ? (
                  <>
                    <RotateCcw className="h-4 w-4 animate-spin" />
                    <span>Analyzing Historical Data...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <span>Generate AI Report</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Custom Date Range Picker (conditionally shown) */}
          {selectedPeriod === 'custom' && (
            <form onSubmit={handleApplyCustomRange} className="mt-4 pt-4 border-t flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">From:</label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  required
                  className="w-40 text-xs h-8"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">To:</label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  required
                  className="w-40 text-xs h-8"
                />
              </div>

              <Button type="submit" size="sm" className="h-8 text-xs bg-gray-800 text-white hover:bg-gray-900">
                Apply Date Range
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* AI REPORT SECTION (When Generated or Triggered) */}
      {(generatingAI || aiReport || aiError) && (
        <Card className="border-2 border-indigo-200 dark:border-indigo-900 shadow-md bg-gradient-to-b from-indigo-50/40 via-background to-background dark:from-indigo-950/20 overflow-hidden">
          <CardHeader className="p-4 sm:p-6 border-b bg-indigo-50/50 dark:bg-indigo-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-xs">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base sm:text-lg font-bold text-indigo-950 dark:text-indigo-200">
                    AI-Generated Executive Insights
                  </CardTitle>
                  <Badge variant="outline" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 text-[10px] font-semibold">
                    AI Powered
                  </Badge>
                </div>
                <CardDescription className="text-xs text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                  Ground-truth multi-period analysis for <strong className="font-semibold">{analytics?.period?.label || selectedPeriod}</strong> • {aiReport?.model || 'Active Engine'}
                </CardDescription>
              </div>
            </div>

            {aiReport && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyReport}
                  className="h-8 text-xs gap-1.5 bg-white dark:bg-gray-900 border-indigo-200 dark:border-indigo-800"
                >
                  {copiedReport ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-gray-500" />
                      <span>Copy Report</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateAIReport}
                  disabled={generatingAI}
                  className="h-8 text-xs text-indigo-700 dark:text-indigo-300"
                  title="Regenerate"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            {generatingAI ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                  <Sparkles className="h-5 w-5 text-indigo-600 absolute inset-0 m-auto animate-pulse" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Synthesizing Multi-Period Database Analytics...
                </h3>
                <p className="text-xs text-gray-500 max-w-md">
                  Analyzing Month-over-Month volume shifts, Year-over-Year growth trajectories, contributor capacity, and identifying bottlenecks.
                </p>
              </div>
            ) : aiError ? (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 dark:text-red-300 text-sm flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Unable to generate AI report</p>
                  <p className="text-xs mt-0.5">{aiError}</p>
                </div>
              </div>
            ) : aiReport ? (
              <div className="space-y-5">
                {/* 4 Structured Section Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-indigo-100/60 dark:bg-indigo-950/60 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 overflow-x-auto">
                  <button
                    onClick={() => setActiveAITab('overview')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                      activeAITab === 'overview'
                        ? 'bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    1. Overview
                  </button>

                  <button
                    onClick={() => setActiveAITab('keyFindings')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                      activeAITab === 'keyFindings'
                        ? 'bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    2. Key Findings & Trends
                  </button>

                  <button
                    onClick={() => setActiveAITab('insights')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                      activeAITab === 'insights'
                        ? 'bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    3. AI Insights
                  </button>

                  <button
                    onClick={() => setActiveAITab('recommendations')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                      activeAITab === 'recommendations'
                        ? 'bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5 text-blue-500" />
                    4. Recommendations
                  </button>

                  <button
                    onClick={() => setActiveAITab('full')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ml-auto ${
                      activeAITab === 'full'
                        ? 'bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Full Document
                  </button>
                </div>

                {/* Active Tab Content Area */}
                <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-gray-900 border shadow-xs prose dark:prose-invert prose-sm max-w-none">
                  {activeAITab === 'overview' && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2 pb-1 border-b">
                        <BarChart3 className="h-4 w-4 text-indigo-600" /> Executive Overview
                      </h3>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {aiReport.sections?.overview || aiReport.reportContent}
                      </ReactMarkdown>
                    </div>
                  )}

                  {activeAITab === 'keyFindings' && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2 pb-1 border-b">
                        <Layers className="h-4 w-4 text-blue-600" /> Key Findings & Historical Growth Metrics
                      </h3>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {aiReport.sections?.keyFindings || aiReport.reportContent}
                      </ReactMarkdown>
                    </div>
                  )}

                  {activeAITab === 'insights' && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2 pb-1 border-b">
                        <Sparkles className="h-4 w-4 text-amber-500" /> AI Insights, Trends & Delivery Risks
                      </h3>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {aiReport.sections?.insights || aiReport.reportContent}
                      </ReactMarkdown>
                    </div>
                  )}

                  {activeAITab === 'recommendations' && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2 pb-1 border-b">
                        <Zap className="h-4 w-4 text-emerald-600" /> Actionable Strategic Recommendations
                      </h3>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {aiReport.sections?.recommendations || aiReport.reportContent}
                      </ReactMarkdown>
                    </div>
                  )}

                  {activeAITab === 'full' && (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {aiReport.reportContent}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Loading Skeleton for Analytics */}
      {loadingAnalytics ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : analyticsError ? (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-6 text-center text-red-600 dark:text-red-400">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-semibold">{analyticsError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAnalytics()}
              className="mt-3 text-xs"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* STATS SUMMARY KPI CARDS */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Total Tasks */}
            <Card className="shadow-xs border hover:shadow-sm transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tracked Tasks
                </CardTitle>
                <div className="p-1.5 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 rounded-md">
                  <BarChart3 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold tracking-tight">
                  {summary.totalTasks || 0}
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  {priorPeriod.total > 0 ? (
                    <>
                      {priorPeriod.volumeGrowthPct >= 0 ? (
                        <span className="flex items-center font-bold text-emerald-600 dark:text-emerald-400">
                          <TrendingUp className="h-3.5 w-3.5 mr-0.5" />
                          +{priorPeriod.volumeGrowthPct}%
                        </span>
                      ) : (
                        <span className="flex items-center font-bold text-rose-600 dark:text-rose-400">
                          <TrendingDown className="h-3.5 w-3.5 mr-0.5" />
                          {priorPeriod.volumeGrowthPct}%
                        </span>
                      )}
                      <span>vs prior ({priorPeriod.total})</span>
                    </>
                  ) : (
                    <span>In current active scope</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 2. Completion Rate */}
            <Card className="shadow-xs border hover:shadow-sm transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Completion Rate
                </CardTitle>
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 rounded-md">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                    {summary.completionRate || '0.0%'}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    ({summary.completedTasks || 0}/{summary.totalTasks || 0})
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${summary.completionRateNum || 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 3. Active Workload */}
            <Card className="shadow-xs border hover:shadow-sm transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Workload
                </CardTitle>
                <div className="p-1.5 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-300 rounded-md">
                  <Clock className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
                  {summary.activeTasks || 0}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {summary.inProgressTasks || 0} In Progress
                  </span>
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {summary.pendingTasks || 0} Pending
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 4. Overdue Risks */}
            <Card className="shadow-xs border hover:shadow-sm transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Overdue Bottlenecks
                </CardTitle>
                <div className="p-1.5 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 rounded-md">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-extrabold tracking-tight ${
                  (summary.overdueCount || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'
                }`}>
                  {summary.overdueCount || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {(summary.overdueCount || 0) > 0 ? (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                      ⚠️ Needs immediate attention
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      ✅ All tasks within deadline
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* DEDICATED HISTORICAL PERIOD COMPARISONS PANEL */}
          <Card className="shadow-xs border bg-gradient-to-r from-slate-50/50 via-background to-slate-50/50 dark:from-slate-900/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <History className="h-4 w-4 text-indigo-600" />
                    Historical Comparisons & Trend Metrics
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Period-over-period growth rates and Year-over-Year (YoY) benchmarking calculated directly from the database
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  <Activity className="h-3 w-3 mr-1 text-indigo-500" />
                  Real Database Deltas
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {/* 1. Month-over-Month (MoM) / Prior Period */}
                <div className="p-4 rounded-xl border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Period vs Prior
                    </span>
                    <Badge variant={priorPeriod.volumeGrowthPct >= 0 ? 'default' : 'secondary'} className="text-[10px] font-bold">
                      {priorPeriod.volumeGrowthPct >= 0 ? `+${priorPeriod.volumeGrowthPct}%` : `${priorPeriod.volumeGrowthPct}%`}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Current Period:</span>
                      <strong className="text-sm">{summary.totalTasks || 0} tasks</strong>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                      <span>{priorPeriod.label || 'Prior Period'}:</span>
                      <span>{priorPeriod.total || 0} tasks</span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs border-t pt-1 font-semibold">
                      <span>Volume Change:</span>
                      <span className={priorPeriod.volumeChange >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                        {priorPeriod.volumeChange >= 0 ? `+${priorPeriod.volumeChange}` : priorPeriod.volumeChange} tasks ({priorPeriod.volumeGrowthPct >= 0 ? `+${priorPeriod.volumeGrowthPct}%` : `${priorPeriod.volumeGrowthPct}%`})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Year-over-Year (Same Month Last Year) */}
                <div className="p-4 rounded-xl border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Year-over-Year (YoY)
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200">
                      {sameMonthLastYear.volumeGrowthPct !== undefined ? `+${sameMonthLastYear.volumeGrowthPct}% YoY` : 'YoY Baseline'}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Current Month:</span>
                      <strong className="text-sm">{summary.totalTasks || 0} tasks</strong>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                      <span>{sameMonthLastYear.label || 'Same Month Last Year'}:</span>
                      <span>{sameMonthLastYear.total || 0} tasks</span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs border-t pt-1 font-semibold">
                      <span>YoY Net Growth:</span>
                      <span className="text-purple-600 dark:text-purple-400 font-bold">
                        {sameMonthLastYear.volumeChange >= 0 ? `+${sameMonthLastYear.volumeChange}` : sameMonthLastYear.volumeChange} tasks (+{sameMonthLastYear.volumeGrowthPct || 0}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Full Year 2026 vs 2025 Trajectory */}
                <div className="p-4 rounded-xl border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Annual Trajectory
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200">
                      2026 vs 2025
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">2026 Full Year:</span>
                      <strong className="text-sm">{yearOverYear.currentTotal || 0} tasks</strong>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                      <span>2025 Full Year:</span>
                      <span>{yearOverYear.prevTotal || 0} tasks</span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs border-t pt-1 font-semibold">
                      <span>Annual Expansion:</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        +{yearOverYear.volumeChange || 0} tasks (+{yearOverYear.volumeGrowthPct || 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TWO-COLUMN DETAILED BREAKDOWN (Status & Priority) */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Status Breakdown Card */}
            <Card className="shadow-xs border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  Task Status Breakdown
                </CardTitle>
                <CardDescription className="text-xs">
                  Proportion of tasks across lifecycle phases
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.statusBreakdown?.map((item) => (
                  <div key={item.status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.label}
                      </span>
                      <span className="font-semibold">
                        {item.count} <span className="text-muted-foreground font-normal">({item.percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Priority Breakdown Card */}
            <Card className="shadow-xs border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-rose-600" />
                  Priority Distribution
                </CardTitle>
                <CardDescription className="text-xs">
                  Workload segmentation by urgency & criticality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.priorityBreakdown?.map((item) => (
                  <div key={item.priority} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.label}
                      </span>
                      <span className="font-semibold">
                        {item.count} <span className="text-muted-foreground font-normal">({item.percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* TEAM WORKLOAD & CAPACITY TABLE */}
          <Card className="shadow-xs border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    Team Workload & Contributor Performance
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Task allocation, completion rates, and individual overdue counts
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {analytics.workloadBreakdown?.length || 0} Members
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {analytics.workloadBreakdown && analytics.workloadBreakdown.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                        <th className="py-2.5 px-3">Team Member</th>
                        <th className="py-2.5 px-3 text-center">Total</th>
                        <th className="py-2.5 px-3 text-center">Completed</th>
                        <th className="py-2.5 px-3 text-center">In Progress</th>
                        <th className="py-2.5 px-3 text-center">Pending</th>
                        <th className="py-2.5 px-3 text-center">Overdue</th>
                        <th className="py-2.5 px-3">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {analytics.workloadBreakdown.map((w) => (
                        <tr key={w.userId} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-[10px]">
                                {w.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{w.name}</p>
                                <p className="text-[10px] text-muted-foreground capitalize">{w.role}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">{w.total}</td>
                          <td className="py-2.5 px-3 text-center text-emerald-600 font-semibold">{w.completed}</td>
                          <td className="py-2.5 px-3 text-center text-blue-600 font-semibold">{w.inProgress}</td>
                          <td className="py-2.5 px-3 text-center text-amber-600 font-semibold">{w.pending}</td>
                          <td className="py-2.5 px-3 text-center">
                            {w.overdue > 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px]">
                                {w.overdue} overdue
                              </span>
                            ) : (
                              <span className="text-gray-400 font-normal">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${w.completionRate}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-semibold">{w.completionRate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No workload records available in this scope.
                </p>
              )}
            </CardContent>
          </Card>

          {/* FUNCTIONAL TAGS / CATEGORIES GRID */}
          <Card className="shadow-xs border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Tag className="h-4 w-4 text-blue-600" />
                Workstream & Category Breakdown
              </CardTitle>
              <CardDescription className="text-xs">
                Performance across functional domain tags
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.tagBreakdown && analytics.tagBreakdown.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {analytics.tagBreakdown.map((t) => (
                    <div
                      key={t.tag}
                      className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                          <Tag className="h-3 w-3 text-blue-500" /> {t.tag}
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {t.total} tasks
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{t.completed} done ({t.completionRate}%)</span>
                        <span>{t.inProgress + t.pending} active</span>
                      </div>

                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${t.completionRate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No categories recorded.
                </p>
              )}
            </CardContent>
          </Card>

          {/* OVERDUE & UPCOMING DEADLINES LIST */}
          {analytics.overdueTasks && analytics.overdueTasks.length > 0 && (
            <Card className="border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Urgent Attention: Overdue Deliverables ({analytics.overdueTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  {analytics.overdueTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-rose-200 dark:border-rose-900/40 shadow-xs flex items-start justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {t.title}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Assigned to: <strong className="text-gray-700 dark:text-gray-300">{t.assignee}</strong>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                          {t.priority}
                        </Badge>
                        <p className="text-[10px] text-rose-600 font-mono mt-1">Due: {t.dueDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
