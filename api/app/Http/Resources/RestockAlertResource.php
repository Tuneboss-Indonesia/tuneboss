<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RestockAlertResource extends JsonResource
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
                'barcode' => $this->product->barcode,
                'category' => $this->product->category?->name,
                'imageUrl' => $this->product->image_path ? asset('storage/'.$this->product->image_path) : null,
            ]),
            'status' => $this->status,
            'severity' => $this->severity,
            'currentStock' => $this->current_stock,
            'threshold' => $this->threshold,
            'acknowledgedBy' => $this->acknowledgedBy?->name,
            'acknowledgedAt' => $this->acknowledged_at?->toISOString(),
            'resolvedBy' => $this->resolvedBy?->name,
            'resolvedAt' => $this->resolved_at?->toISOString(),
            'note' => $this->note,
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}
