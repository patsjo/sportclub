import { Alert, Button } from 'antd';
import { observer } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMobxStore } from '../../utils/mobxStore';

/** At the top of every page when the logged in user has overdue invoices */
const OverdueInvoicesAlert = observer(() => {
  const { t } = useTranslation();
  const { clubModel, globalStateModel, sessionModel } = useMobxStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!clubModel.invoice.url || !sessionModel.loggedIn || sessionModel.overdueInvoices <= 0) return null;

  return (
    <Alert
      showIcon
      type="warning"
      style={{ marginBottom: 12 }}
      title={t('invoices.OverdueWarning', { count: sessionModel.overdueInvoices })}
      action={
        location.pathname !== '/invoices' ? (
          <Button size="small" onClick={() => globalStateModel.setDashboard(navigate, '/invoices')}>
            {t('invoices.ShowMyInvoices')}
          </Button>
        ) : undefined
      }
    />
  );
});

export default OverdueInvoicesAlert;
