import React from 'react';
import { OpsApi } from '../api/opsApi';
import { Queue } from '../components/Queue';

export function Finance() {
  return (
    <Queue
      title="Payout-change requests (approve before bank edits apply)"
      fetcher={OpsApi.queues.payoutChanges}
      rowOf={(r) => ({ title: r.masked_label || r.masked || r.kind || 'Payout change', sub: r.status || 'pending' })}
      actions={[
        { label: 'Approve', kind: 'ok', run: (r) => OpsApi.payoutChangeDecision(r.id, 'approve') },
        { label: 'Reject', kind: 'no', run: (r) => OpsApi.payoutChangeDecision(r.id, 'reject') },
      ]}
    />
  );
}
