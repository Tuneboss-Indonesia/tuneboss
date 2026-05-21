<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $stock = $this->stock?->quantity ?? 0;

        return [
            'id' => $this->id,
            'categoryId' => $this->category_id,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'name' => $this->name,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'imagePath' => $this->image_path,
            'imageUrl' => $this->image_path ? asset('storage/'.$this->image_path) : null,
            'minStock' => $this->min_stock,
            'stock' => $stock,
            'status' => $stock === 0 ? 'empty' : ($stock < $this->min_stock ? 'low' : 'safe'),
            'isActive' => $this->is_active,
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}
