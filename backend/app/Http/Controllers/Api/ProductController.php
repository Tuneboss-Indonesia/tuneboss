<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductCollection;
use App\Http\Resources\ProductResource;
use App\Models\AuditLog;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $products = Product::query()
            ->where('is_active', true)
            ->with(['category', 'stock'])
            ->when($request->query('search'), function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%");
                });
            })
            ->when($request->query('category_id'), fn ($query, string $categoryId) => $query->where('category_id', $categoryId))
            ->when($request->query('status'), function ($query, string $status) {
                if ($status === 'Habis') {
                    $query->whereHas('stock', fn ($q) => $q->where('quantity', 0));
                } elseif ($status === 'Menipis') {
                    $query->whereHas('stock', fn ($q) => $q->whereColumn('quantity', '<', 'products.min_stock')->where('quantity', '>', 0));
                } elseif ($status === 'Tersedia') {
                    $query->whereHas('stock', fn ($q) => $q->where('quantity', '>', 0));
                }
            })
            ->orderBy('name')
            ->paginate((int) $request->query('per_page', 15));

        return new ProductCollection($products);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $initialStock = $request->integer('initial_stock', 0);

        $product = DB::transaction(function () use ($request, $data, $initialStock) {
            $product = Product::create($data);
            $product->stock()->create(['quantity' => $initialStock]);

            if ($initialStock > 0) {
                $product->movements()->create([
                    'type' => 'adjustment',
                    'quantity' => $initialStock,
                    'before_quantity' => 0,
                    'after_quantity' => $initialStock,
                    'note' => 'Stok awal saat produk dibuat',
                    'operator_id' => $request->user()->id,
                ]);
            }

            $this->audit($request, 'product.created', $product, after: $this->auditPayload($product));

            return $product;
        });

        return (new ProductResource($product->load(['category', 'stock'])))->response()->setStatusCode(201);
    }

    public function show(Product $product)
    {
        return new ProductResource($product->load(['category', 'stock']));
    }

    public function update(Request $request, Product $product)
    {
        $data = $this->validated($request, $product);
        $currentStock = $request->input('current_stock');

        $product = DB::transaction(function () use ($request, $product, $data, $currentStock) {
            $before = $this->auditPayload($product);
            $product->update($data);

            if ($currentStock !== null) {
                $stockRecord = $product->stock;
                if (!$stockRecord) {
                    $stockRecord = $product->stock()->create(['quantity' => 0]);
                }
                $oldQty = $stockRecord->quantity;
                $newQty = (int) $currentStock;

                if ($oldQty !== $newQty) {
                    $stockRecord->update(['quantity' => $newQty]);
                    $product->movements()->create([
                        'type' => 'adjustment',
                        'quantity' => $newQty - $oldQty,
                        'before_quantity' => $oldQty,
                        'after_quantity' => $newQty,
                        'note' => 'Koreksi stok via edit produk',
                        'operator_id' => $request->user()->id,
                    ]);
                }
            }

            $this->audit($request, 'product.updated', $product, $before, $this->auditPayload($product));
            return $product;
        });

        return new ProductResource($product->load(['category', 'stock']));
    }

    public function destroy(Request $request, Product $product)
    {
        $before = $this->auditPayload($product);
        
        // Delete image file if exists
        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }

        $product->delete();
        $this->audit($request, 'product.deleted', $product, $before);

        return response()->json(['message' => 'Produk dan gambar berhasil dihapus.']);
    }

    public function uploadImage(Request $request, Product $product)
    {
        $data = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $before = $this->auditPayload($product);
        $path = $data['image']->store('products', 'public');

        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }

        $product->update(['image_path' => $path]);
        $this->audit($request, 'product.image_uploaded', $product, $before, $this->auditPayload($product));

        return new ProductResource($product->load(['category', 'stock']));
    }

    public function deleteImage(Request $request, Product $product)
    {
        $before = $this->auditPayload($product);

        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }

        $product->update(['image_path' => null]);
        $this->audit($request, 'product.image_deleted', $product, $before, $this->auditPayload($product));

        return new ProductResource($product->load(['category', 'stock']));
    }

    public function lookup(Request $request)
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:120']]);

        $product = Product::with(['category', 'stock'])
            ->where('is_active', true)
            ->where(fn ($query) => $query->where('sku', $data['code'])->orWhere('barcode', $data['code']))
            ->firstOrFail();

        $stock = $product->stock?->quantity ?? 0;

        return response()->json([
            'id' => $product->id,
            'name' => $product->name,
            'sku' => $product->sku,
            'barcode' => $product->barcode,
            'imagePath' => $product->image_path,
            'imageUrl' => $product->image_path ? asset('storage/'.$product->image_path) : null,
            'category' => $product->category?->name,
            'categoryId' => $product->category_id,
            'stock' => $stock,
            'minStock' => $product->min_stock,
            'status' => $this->status($stock, $product->min_stock),
        ]);
    }

    private function validated(Request $request, ?Product $product = null): array
    {
        return $request->validate([
            'category_id' => ['required', 'uuid', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:180'],
            'sku' => ['required', 'string', 'max:80', Rule::unique('products', 'sku')->ignore($product?->id)],
            'barcode' => ['nullable', 'string', 'max:120', Rule::unique('products', 'barcode')->ignore($product?->id)],
            'min_stock' => ['required', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }

    private function status(int $stock, int $minStock): string
    {
        return $stock === 0 ? 'empty' : ($stock < $minStock ? 'low' : 'safe');
    }

    private function audit(Request $request, string $action, Product $product, ?array $before = null, ?array $after = null): void
    {
        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'entity' => 'products',
            'entity_id' => $product->id,
            'metadata' => array_filter(['before' => $before, 'after' => $after]),
        ]);
    }

    private function auditPayload(Product $product): array
    {
        return $product->only(['category_id', 'name', 'sku', 'barcode', 'image_path', 'min_stock', 'is_active']);
    }
}
