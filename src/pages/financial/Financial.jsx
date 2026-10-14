/**
 * Financial Module: Proforma Invoice tab and Purchase Invoice tab, each with a Create/Edit modal
 * and a View modal.
 */
import { useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import ProformaInvoiceModals from './ProformaInvoiceModals';
import ProformaInvoiceTab from './ProformaInvoiceTab';
import PurchaseInvoiceModals from './PurchaseInvoiceModals';
import PurchaseInvoiceTab from './PurchaseInvoiceTab';
import { useProformaInvoices } from './useProformaInvoices';
import { usePurchaseInvoices } from './usePurchaseInvoices';

const PROFORMA_TAB_BUTTON = '[data-bs-target="#tabProformaInvoice"]';
const PURCHASE_TAB_BUTTON = '[data-bs-target="#tabPurchaseInvoice"]';

export default function Financial() {
  const { userCan } = useAuth();
  const proforma = useProformaInvoices();
  const purchase = usePurchaseInvoices();

  const financialAccess = ['financial_view', 'purchaseView'].some((permission) => userCan(permission));

  useEffect(() => {
    proforma.loadClients();
    proforma.list.loadList();
    proforma.list.loadStats();
    purchase.list.loadList();
    purchase.list.loadStats();

    // Reload data when switching tabs
    $(document).on('shown.bs.tab', PURCHASE_TAB_BUTTON, () => purchase.list.reload());
    $(document).on('shown.bs.tab', PROFORMA_TAB_BUTTON, () => proforma.list.reload());

    return () => {
      $(document).off('shown.bs.tab', PURCHASE_TAB_BUTTON);
      $(document).off('shown.bs.tab', PROFORMA_TAB_BUTTON);
    };
  }, []);

  if (!financialAccess) return null;

  return (
    <>
      <div className="container-xxl flex-grow-1 container-p-y">

        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-1">Financial Module</h4>
            <p className="text-muted mb-0">Manage invoices and financial documents</p>
          </div>
        </div>

        {/* Tabs */}
        <ul className="nav nav-tabs mb-3" role="tablist">
          {userCan('financial_view') && (
            <li className="nav-item">
              <button className="nav-link active" data-bs-toggle="tab" data-bs-target="#tabProformaInvoice" type="button">
                <i className="bx bx-receipt me-1"></i>Proforma Invoice
              </button>
            </li>
          )}
          {userCan('purchaseView') && (
            <li className="nav-item">
              <button className={'nav-link' + (userCan('financial_view') ? '' : ' active')} data-bs-toggle="tab"
                data-bs-target="#tabPurchaseInvoice" type="button">
                <i className="bx bx-cart me-1"></i>Purchase Invoice
              </button>
            </li>
          )}
        </ul>

        {/* Tab Content */}
        <div className="tab-content">
          {userCan('financial_view') && <ProformaInvoiceTab proforma={proforma} />}
          {userCan('purchaseView') && <PurchaseInvoiceTab purchase={purchase} />}
        </div>
      </div>

      <ProformaInvoiceModals proforma={proforma} />
      <PurchaseInvoiceModals purchase={purchase} />
    </>
  );
}
