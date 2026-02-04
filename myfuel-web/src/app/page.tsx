'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, CreditCard, Receipt, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui';
import { organizationsApi, cardsApi, transactionsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { data: organizations } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.getAll(),
  });

  const { data: cards } = useQuery({
    queryKey: ['cards'],
    queryFn: () => cardsApi.getAll(),
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionsApi.getAll(),
  });

  const approvedTxns = transactions?.filter(t => t.status === 'APPROVED') || [];
  const totalSpent = approvedTxns.reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const stats = [
    {
      name: 'Organizations',
      value: organizations?.length || 0,
      icon: Building2,
      color: 'bg-blue-500',
    },
    {
      name: 'Active Cards',
      value: cards?.filter(c => c.status === 'ACTIVE').length || 0,
      icon: CreditCard,
      color: 'bg-emerald-500',
    },
    {
      name: 'Total Transactions',
      value: transactions?.length || 0,
      icon: Receipt,
      color: 'bg-purple-500',
    },
    {
      name: 'Total Spent',
      value: formatCurrency(totalSpent),
      icon: TrendingUp,
      color: 'bg-amber-500',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-slate-200 mt-1">Overview of your fleet fuel management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-800">{stat.name}</p>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Transactions">
          {transactions && transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-slate-800">
                      {txn.stationName || 'Unknown Station'}
                    </p>
                    <p className="text-sm text-slate-700">{txn.fuelType || 'Fuel'}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${txn.status === 'APPROVED' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(txn.amount)}
                    </p>
                    <p className="text-xs text-slate-700">{txn.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-700 text-center py-8">No transactions yet</p>
          )}
        </Card>

        <Card title="Organizations">
          {organizations && organizations.length > 0 ? (
            <div className="space-y-3">
              {organizations.slice(0, 5).map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-slate-800">{org.name}</p>
                    <p className="text-sm text-slate-700">{org.timezone}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    org.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {org.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-700 text-center py-8">No organizations yet</p>
          )}
        </Card>
      </div>
    </div>
  );
}
