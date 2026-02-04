'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Filter } from 'lucide-react';
import { Card, Button, Badge, getStatusVariant, Modal, Input } from '@/components/ui';
import { transactionsApi, organizationsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterOrgId, setFilterOrgId] = useState<string>('');

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', filterOrgId],
    queryFn: () => transactionsApi.getAll({ organizationId: filterOrgId || undefined }),
  });

  const { data: organizations } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.getAll(),
  });

  const processMutation = useMutation({
    mutationFn: transactionsApi.process,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setShowCreateModal(false);
    },
  });

  const handleProcessSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    processMutation.mutate({
      cardNumber: formData.get('cardNumber') as string,
      amount: formData.get('amount') as string,
      stationId: formData.get('stationId') as string,
      stationName: formData.get('stationName') as string,
      fuelType: formData.get('fuelType') as string,
      liters: formData.get('liters') as string,
    });
  };

  const getOrgName = (orgId: string) => {
    return organizations?.find(o => o.id === orgId)?.name || orgId.slice(0, 8) + '...';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Transactions</h1>
          <p className="text-slate-200 mt-1">View and process fuel transactions</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Transaction
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={filterOrgId}
            onChange={(e) => setFilterOrgId(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
          >
            <option value="">All Organizations</option>
            {organizations?.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="text-center py-8 text-slate-700">Loading...</div>
        ) : transactions && transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-slate-800">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-800">Organization</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-800">Station</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-800">Fuel</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-800">Liters</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-800">Amount</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-800">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-4 px-4 text-slate-800 text-sm">
                      {formatDate(txn.createdAt)}
                    </td>
                    <td className="py-4 px-4 text-slate-800 text-sm">
                      {getOrgName(txn.organizationId)}
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-medium text-slate-800">{txn.stationName || '-'}</p>
                      <p className="text-xs text-slate-700">{txn.stationId}</p>
                    </td>
                    <td className="py-4 px-4 text-slate-800">{txn.fuelType || '-'}</td>
                    <td className="py-4 px-4 text-right text-slate-800">
                      {txn.liters ? `${txn.liters} L` : '-'}
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-slate-800">
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Badge variant={getStatusVariant(txn.status)}>{txn.status}</Badge>
                      {txn.declineReason && (
                        <p className="text-xs text-red-600 mt-1">{txn.declineReason}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-700 mb-4">No transactions yet</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Process your first transaction
            </Button>
          </div>
        )}
      </Card>

      {/* Process Transaction Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Process Transaction"
      >
        <form onSubmit={handleProcessSubmit} className="space-y-4">
          <Input
            label="Card Number"
            name="cardNumber"
            placeholder="Enter 16-digit card number"
            maxLength={16}
            required
          />
          <Input
            label="Amount (IDR)"
            name="amount"
            type="number"
            step="0.01"
            placeholder="150000"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Station ID"
              name="stationId"
              placeholder="STATION-001"
            />
            <Input
              label="Station Name"
              name="stationName"
              placeholder="Shell Sudirman"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-900">
                Fuel Type
              </label>
              <select
                name="fuelType"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              >
                <option value="PERTAMAX">Pertamax</option>
                <option value="PERTAMAX_TURBO">Pertamax Turbo</option>
                <option value="PERTALITE">Pertalite</option>
                <option value="SOLAR">Solar</option>
                <option value="DEXLITE">Dexlite</option>
              </select>
            </div>
            <Input
              label="Liters"
              name="liters"
              type="number"
              step="0.01"
              placeholder="10.5"
            />
          </div>

          {processMutation.isError && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
              Transaction failed. Please check card and balance.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={processMutation.isPending}>
              Process
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
