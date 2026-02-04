'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Ban, CheckCircle } from 'lucide-react';
import { Card, Button, Badge, getStatusVariant, Modal, Input } from '@/components/ui';
import { cardsApi, organizationsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function CardsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: cards, isLoading } = useQuery({
    queryKey: ['cards'],
    queryFn: () => cardsApi.getAll(),
  });

  const { data: organizations } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: cardsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      setShowCreateModal(false);
    },
  });

  const blockMutation = useMutation({
    mutationFn: cardsApi.block,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
  });

  const unblockMutation = useMutation({
    mutationFn: cardsApi.unblock,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      organizationId: formData.get('organizationId') as string,
      cardNumber: formData.get('cardNumber') as string,
      holderName: formData.get('holderName') as string,
      dailyLimit: formData.get('dailyLimit') as string || '500',
      monthlyLimit: formData.get('monthlyLimit') as string || '5000',
    });
  };

  const getOrgName = (orgId: string) => {
    return organizations?.find(o => o.id === orgId)?.name || orgId;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Fuel Cards</h1>
          <p className="text-slate-600 mt-1">Manage fleet fuel cards</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Card
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : cards && cards.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Card Number</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Holder</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Organization</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Daily Limit</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Monthly Limit</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => (
                  <tr key={card.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-4 px-4">
                      <p className="font-mono font-medium text-slate-800">{card.cardNumber}</p>
                    </td>
                    <td className="py-4 px-4 text-slate-600">{card.holderName || '-'}</td>
                    <td className="py-4 px-4 text-slate-600 text-sm">
                      {getOrgName(card.organizationId)}
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={getStatusVariant(card.status)}>{card.status}</Badge>
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {formatCurrency(card.dailyLimit)}
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {formatCurrency(card.monthlyLimit)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {card.status === 'ACTIVE' ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => blockMutation.mutate(card.id)}
                          loading={blockMutation.isPending}
                        >
                          <Ban className="w-4 h-4 mr-1" />
                          Block
                        </Button>
                      ) : card.status === 'BLOCKED' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => unblockMutation.mutate(card.id)}
                          loading={unblockMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Unblock
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-4">No cards yet</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create your first card
            </Button>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Card"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Organization
            </label>
            <select
              name="organizationId"
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select organization...</option>
              {organizations?.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Card Number"
            name="cardNumber"
            placeholder="1234567890123456"
            maxLength={16}
            required
          />
          <Input
            label="Holder Name"
            name="holderName"
            placeholder="Driver Name"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Daily Limit"
              name="dailyLimit"
              type="number"
              placeholder="500"
              defaultValue="500"
            />
            <Input
              label="Monthly Limit"
              name="monthlyLimit"
              type="number"
              placeholder="5000"
              defaultValue="5000"
            />
          </div>
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
    </div>
  );
}
