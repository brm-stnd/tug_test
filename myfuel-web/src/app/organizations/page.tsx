'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Wallet } from 'lucide-react';
import { Card, Button, Badge, getStatusVariant, Modal, Input } from '@/components/ui';
import { organizationsApi, Organization, OrganizationBalance } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function OrganizationsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [balances, setBalances] = useState<Record<string, OrganizationBalance>>({});

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: organizationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setShowCreateModal(false);
    },
  });

  const topUpMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { amount: string; reference?: string } }) =>
      organizationsApi.topUp(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      fetchBalance(variables.id);
      setShowTopUpModal(false);
    },
  });

  const fetchBalance = async (orgId: string) => {
    try {
      const balance = await organizationsApi.getBalance(orgId);
      setBalances(prev => ({ ...prev, [orgId]: balance }));
    } catch (error) {
      console.error('Failed to fetch balance', error);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get('name') as string,
      timezone: formData.get('timezone') as string || 'Asia/Jakarta',
    });
  };

  const handleTopUpSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOrg) return;
    const formData = new FormData(e.currentTarget);
    topUpMutation.mutate({
      id: selectedOrg.id,
      data: {
        amount: formData.get('amount') as string,
        reference: formData.get('reference') as string,
      },
    });
  };

  const openTopUpModal = (org: Organization) => {
    setSelectedOrg(org);
    fetchBalance(org.id);
    setShowTopUpModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Organizations</h1>
          <p className="text-slate-200 mt-1">Manage fleet organizations and balances</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Organization
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="text-center py-8 text-slate-700">Loading...</div>
        ) : organizations && organizations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-slate-800">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-800">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-800">Timezone</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-800">Created</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-800">Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-4 px-4">
                      <p className="font-medium text-slate-800">{org.name}</p>
                      <p className="text-xs text-slate-700">{org.id}</p>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={getStatusVariant(org.status)}>{org.status}</Badge>
                    </td>
                    <td className="py-4 px-4 text-slate-800">{org.timezone}</td>
                    <td className="py-4 px-4 text-slate-800 text-sm">
                      {formatDate(org.createdAt)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openTopUpModal(org)}
                      >
                        <Wallet className="w-4 h-4 mr-1" />
                        Top Up
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-700 mb-4">No organizations yet</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create your first organization
            </Button>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Organization"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Organization Name"
            name="name"
            placeholder="e.g., PT Fleet Logistic"
            required
          />
          <Input
            label="Timezone"
            name="timezone"
            placeholder="Asia/Jakarta"
            defaultValue="Asia/Jakarta"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Top Up Modal */}
      <Modal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        title="Top Up Balance"
      >
        <form onSubmit={handleTopUpSubmit} className="space-y-4">
          {selectedOrg && (
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="font-medium text-slate-800">{selectedOrg.name}</p>
              {balances[selectedOrg.id] && (
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {formatCurrency(balances[selectedOrg.id].currentBalance)}
                </p>
              )}
            </div>
          )}
          <Input
            label="Amount"
            name="amount"
            type="number"
            step="0.01"
            placeholder="1000000"
            required
          />
          <Input
            label="Reference"
            name="reference"
            placeholder="e.g., TOPUP-001"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowTopUpModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={topUpMutation.isPending}>
              Top Up
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
