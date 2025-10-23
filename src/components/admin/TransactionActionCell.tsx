'use client'

import React from 'react'
import { VerifyPaymentButton } from './VerifyPaymentButton'

interface TransactionActionCellProps {
  rowData: {
    id: string
    status: string
    paymentReference: string
    mtnTransactionId?: string
  }
}

export const TransactionActionCell: React.FC<TransactionActionCellProps> = ({ rowData }) => {
  return (
    <div className="flex items-center justify-start">
      <VerifyPaymentButton
        transactionId={rowData.id}
        status={rowData.status}
        paymentReference={rowData.paymentReference}
        mtnTransactionId={rowData.mtnTransactionId}
      />
    </div>
  )
}
