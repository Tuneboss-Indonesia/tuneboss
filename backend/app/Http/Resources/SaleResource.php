<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoiceNumber' => $this->invoice_number,
            'cashierId' => $this->cashier_id,
            'cashier' => $this->cashier?->name,
            'customerId' => $this->customer_id,
            'customer' => $this->customer?->name,
            'address' => $this->address ?? $this->customer?->address,
            'totalAmount' => (float) $this->total_amount,
            'status' => $this->status,
            'voidedBy' => $this->voidedBy?->name,
            'voidedAt' => $this->voided_at?->toISOString(),
            'voidReason' => $this->void_reason,
            'items' => SaleItemResource::collection($this->whenLoaded('items')),
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}
