<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RestockOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'productId' => $this->product_id,
            'product' => $this->whenLoaded('product', fn () => [
                'id' => $this->product->id,
                'name' => $this->product->name,
                'sku' => $this->product->sku,
                'stock' => $this->product->stock?->quantity ?? 0,
                'minStock' => $this->product->min_stock,
            ]),
            'supplierId' => $this->supplier_id,
            'supplier' => $this->supplier?->name,
            'restockAlertId' => $this->restock_alert_id,
            'status' => $this->status,
            'quantity' => $this->quantity,
            'note' => $this->note,
            'createdBy' => $this->createdBy?->name,
            'receivedBy' => $this->receivedBy?->name,
            'orderedAt' => $this->ordered_at?->toISOString(),
            'receivedAt' => $this->received_at?->toISOString(),
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}
