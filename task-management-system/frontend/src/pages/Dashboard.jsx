import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { reportService } from '../services/reportService';
import { taskService } from '../services/taskService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  ClipboardList, 
  MessageSquare, 
  BarChart3, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  ChevronRight
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [analyticsRes, tasksRes] = await Promise.allSettled([
          reportService.getAnalytics({ period: 'this_month' }),
          taskService.getTasks ? taskService.getTasks({ limit: 5 }) : Promise.resolve({ data: { tasks: [] } })
        ]);

        if (analyticsRes.status === 'fulfilled' && analyticsRes.value?.data) {
          setAnalytics(analyticsRes.value.data);
        }

        if (tasksRes.status === 'fulfilled' && tasksRes.value?.data?.tasks) {
          setRecentTasks(tasksRes.value.data.tasks.slice(0, 5));
        }
      } catch (err) {
        console.warn('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const summary = analytics?.summary || {};

  const stats = [
    {
      title: 'Total Tasks (Month)',
      value: summary.totalTasks !== undefined ? summary.totalTasks : (loading ? '...' : '0'),
      subtitle: summary.completionRate ? `${summary.completionRate} completed` : 'All assigned',
      icon: ClipboardList,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950'
    },
    {
      title: 'Active In Progress',
      value: summary.inProgressTasks !== undefined ? summary.inProgressTasks : (loading ? '...' : '0'),
      subtitle: `${summary.pendingTasks || 0} pending in queue`,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950'
    },
    {
      title: 'Completed Tasks',
      value: summary.completedTasks !== undefined ? summary.completedTasks : (loading ? '...' : '0'),
      subtitle: summary.progressBar || '[░░░░░░░░░░]',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950'
    },
    {
      title: 'Overdue Items',
      value: summary.overdueCount !== undefined ? summary.overdueCount : (loading ? '...' : '0'),
      subtitle: (summary.overdueCount > 0) ? 'Requires attention' : 'On schedule',
      icon: AlertTriangle,
      color: (summary.overdueCount > 0) ? 'text-rose-600' : 'text-gray-400',
      bg: (summary.overdueCount > 0) ? 'bg-rose-50 dark:bg-rose-950' : 'bg-gray-50 dark:bg-gray-800'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, <strong className="font-semibold text-gray-800 dark:text-gray-200">{user?.firstName} {user?.lastName}</strong>! Here is your operational overview.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/reports">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm gap-2 text-xs font-medium">
              <Sparkles className="h-4 w-4 text-amber-300" />
              View Reports & AI Insights
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero AI Insights Quick Action Banner */}
      <Card className="border-indigo-200 dark:border-indigo-900 bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-purple-500/10 shadow-xs">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Executive AI Intelligence & Analytics
                <Badge variant="outline" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 text-[10px]">
                  PostgreSQL Grounded
                </Badge>
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
                Automatically generate executive summaries, identify delivery bottlenecks, evaluate contributor capacity, and receive actionable recommendations based on real database records.
              </p>
            </div>
          </div>

          <Link to="/reports" className="shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold bg-white dark:bg-gray-900 border-indigo-200 dark:border-indigo-800">
              Open Full Reports <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <Card key={index} className="shadow-xs hover:shadow-sm transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>

              <CardContent>
                <div className="text-2xl font-extrabold tracking-tight">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {stat.subtitle}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lower Dual Grid (Recent Tasks & Workload Preview) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Tasks List */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold">Overdue & Urgent Tasks</CardTitle>
              <CardDescription className="text-xs">Items requiring priority execution</CardDescription>
            </div>
            <Link to="/tasks" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium">
              View All Tasks <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>

          <CardContent>
            {analytics?.overdueTasks && analytics.overdueTasks.length > 0 ? (
              <div className="space-y-2.5">
                {analytics.overdueTasks.slice(0, 4).map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-lg border bg-rose-50/30 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40 flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{t.title}</p>
                      <p className="text-[11px] text-gray-500">Assigned: {t.assignee}</p>
                    </div>
                    <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                      Overdue
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 text-xs">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                No overdue tasks. All items are on track!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Workload Preview */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold">Contributor Capacity</CardTitle>
              <CardDescription className="text-xs">Top contributors and active workload</CardDescription>
            </div>
            <Link to="/reports" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium">
              Full Breakdown <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>

          <CardContent>
            {analytics?.workloadBreakdown && analytics.workloadBreakdown.length > 0 ? (
              <div className="space-y-3">
                {analytics.workloadBreakdown.slice(0, 4).map((w) => (
                  <div key={w.userId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{w.name}</span>
                      <span className="text-muted-foreground">{w.completed}/{w.total} completed ({w.completionRate}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${w.completionRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 text-xs">
                No active contributors recorded.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;