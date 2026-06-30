<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'productId' => $this->product_id,
            'productName' => $this->product?->name,
            'productCategory' => $this->product?->category?->name,
            'sku' => $this->product?->sku,
            'operatorId' => $this->operator_id,
            'operator' => $this->operator?->name,
            'saleId' => $this->sale_id,
            'type' => $this->type,
            'quantity' => $this->quantity,
            'serialNumbers' => $this->serial_numbers ?? [],
            'beforeQuantity' => $this->before_quantity,
            'afterQuantity' => $this->after_quantity,
            'party' => $this->party,
            'customerName' => $this->customer_name,
            'customerPhone' => $this->customer_phone,
            'paymentStatus' => $this->payment_status,
            'paymentMethod' => $this->payment_method,
            'nominalAmount' => $this->nominal_amount,
            'saleAddress' => $this->sale?->address,
            'saleInvoice' => $this->sale?->invoice_number,
            'note' => $this->note,
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}
