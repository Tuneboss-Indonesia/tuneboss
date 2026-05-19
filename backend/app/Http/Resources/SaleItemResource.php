<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'saleId' => $this->sale_id,
            'productId' => $this->product_id,
            'productName' => $this->product?->name,
            'sku' => $this->product?->sku,
            'quantity' => $this->quantity,
            'price' => (float) $this->price,
            'subtotal' => (float) $this->subtotal,
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}
