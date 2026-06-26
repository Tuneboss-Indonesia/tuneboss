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
            'sku' => $this->product?->sku,
            'operatorId' => $this->operator_id,
            'operator' => $this->operator?->name,
            'saleId' => $this->sale_id,
            'type' => $this->type,
            'quantity' => $this->quantity,
            'beforeQuantity' => $this->before_quantity,
            'afterQuantity' => $this->after_quantity,
            'party' => $this->party,
            'saleAddress' => $this->sale?->address,
            'saleInvoice' => $this->sale?->invoice_number,
            'note' => $this->note,
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}
