// src/components/AuditPage.tsx
import React, { useEffect, useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { SubmitReportButton } from './SubmitReportButton';
import AuditReportTable from './AuditReportTable';
import { fetchAuditReports, AuditReport } from '../utils';

export default function AuditPage() {
  const { account } = useWallet();
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account) return;
    setLoading(true);
    fetchAuditReports(account.address)
      .then(rs => setReports(rs))
      .finally(() => setLoading(false));
  }, [account]);

  if (!account) return null;
  return (
    <div className="space-y-6">
      <SubmitReportButton />
      {loading
        ? <div>加载中…</div>
        : <AuditReportTable reports={reports} />
      }
    </div>
  );
}

