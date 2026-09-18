<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Product;
use App\Models\ProductSerial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $products = Product::with(['category', 'stock'])
            ->when($request->query('category_id'), fn ($query, $categoryId) => $query->where('category_id', $categoryId))
            ->when($request->query('search'), function ($query, $search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%")
                        ->orWhereHas('serials', fn ($serialQuery) => $serialQuery->where('serial_number', 'like', "%{$search}%"));
                });
            })
            ->when($request->has('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->get();

        return response()->json($products->map(function (Product $product) {
            $stock = $product->stock?->quantity ?? 0;

            return [
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
                'isActive' => $product->is_active,
                'createdAt' => $product->created_at?->toISOString(),
                'updatedAt' => $product->updated_at?->toISOString(),
            ];
        }));
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $product = Product::create([
            'category_id' => $data['category_id'],
            'name' => $data['name'],
            'sku' => $data['sku'],
            'barcode' => $data['barcode'] ?? null,
            'min_stock' => $data['min_stock'],
            'is_active' => $data['is_active'] ?? true,
        ]);

        $initialStock = $request->input('stock', 0);
        $product->stock()->create(['quantity' => max(0, (int) $initialStock)]);

        $this->audit($request, 'product.created', $product, null, $this->auditPayload($product));

        return response()->json([
            'id' => $product->id,
            'name' => $product->name,
            'sku' => $product->sku,
            'barcode' => $product->barcode,
            'imagePath' => null,
            'imageUrl' => null,
            'category' => $product->category?->name,
            'categoryId' => $product->category_id,
            'stock' => max(0, (int) $initialStock),
            'minStock' => $product->min_stock,
            'status' => $this->status((int) $initialStock, $product->min_stock),
            'isActive' => $product->is_active,
            'createdAt' => $product->created_at?->toISOString(),
            'updatedAt' => $product->updated_at?->toISOString(),
        ], 201);
    }

    public function show(Product $product)
    {
        $product->load(['category', 'stock', 'serials']);
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
            'isActive' => $product->is_active,
            'serials' => $product->serials->map(fn (ProductSerial $serial) => [
                'id' => $serial->id,
                'serialNumber' => $serial->serial_number,
                'status' => $serial->status,
                'createdAt' => $serial->created_at?->toISOString(),
            ]),
            'createdAt' => $product->created_at?->toISOString(),
            'updatedAt' => $product->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $data = $this->validated($request, $product);
        $before = $this->auditPayload($product);

        $product->update([
            'category_id' => $data['category_id'],
            'name' => $data['name'],
            'sku' => $data['sku'],
            'barcode' => $data['barcode'] ?? null,
            'min_stock' => $data['min_stock'],
            'is_active' => $data['is_active'] ?? $product->is_active,
        ]);

        $product->load(['category', 'stock']);
        $stock = $product->stock?->quantity ?? 0;

        $this->audit($request, 'product.updated', $product, $before, $this->auditPayload($product));

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
            'isActive' => $product->is_active,
            'createdAt' => $product->created_at?->toISOString(),
            'updatedAt' => $product->updated_at?->toISOString(),
        ]);
    }

    public function destroy(Request $request, Product $product)
    {
        $hasMovements = $product->movements()->exists() || $product->serials()->exists();

        if ($hasMovements) {
            $product->update(['is_active' => false]);
            $this->audit($request, 'product.deactivated', $product);

            return response()->json(['message' => 'Produk dinonaktifkan karena memiliki riwayat transaksi.']);
        }

        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }

        $this->audit($request, 'product.deleted', $product, $this->auditPayload($product));
        $product->delete();

        return response()->noContent();
    }

    public function lookup(Request $request)
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:120']]);
        $code = trim($data['code']);

        // 1. Exact match by existing serial number
        $serial = ProductSerial::where('serial_number', $code)->first();
        $product = null;

        if ($serial) {
            $product = Product::with(['category', 'stock'])
                ->where('is_active', true)
                ->find($serial->product_id);
        }

        // 2. Exact match by SKU or Barcode
        if (!$product) {
            $product = Product::with(['category', 'stock'])
                ->where('is_active', true)
                ->where(function ($query) use ($code) {
                    $query->where('sku', $code)->orWhere('barcode', $code);
                })
                ->first();
        }

        // 3. Match by existing serial number prefix pattern (e.g. 'TDYA022A0033' matching prefix 'TDYA022A' in serials)
        if (!$product && preg_match('/^([A-Za-z0-9\/-]+?)(?:[0-9]{3,6})?$/', $code, $matches) && !empty($matches[1])) {
            $prefix = $matches[1];
            $siblingSerial = ProductSerial::where('serial_number', 'LIKE', $prefix.'%')->first();
            if ($siblingSerial) {
                $product = Product::with(['category', 'stock'])
                    ->where('is_active', true)
                    ->find($siblingSerial->product_id);
            }
        }

        // 4. Smart Prefix Matching for SKU/Barcode candidates
        if (!$product) {
            $allProducts = Product::with(['category', 'stock'])
                ->where('is_active', true)
                ->get();

            $bestMatch = null;
            $maxMatchLength = 0;

            foreach ($allProducts as $p) {
                $candidates = array_filter(array_merge(
                    [$p->sku, $p->barcode],
                    explode('/', (string) $p->sku)
                ));

                foreach ($candidates as $cand) {
                    $cand = trim($cand);
                    if (empty($cand)) {
                        continue;
                    }

                    if (stripos($code, $cand) === 0 && strlen($cand) > $maxMatchLength) {
                        $maxMatchLength = strlen($cand);
                        $bestMatch = $p;
                    }
                }
            }

            if ($bestMatch) {
                $product = $bestMatch;
            }
        }

        if (!$product) {
            return response()->json(['message' => 'Barcode/SKU produk tidak ditemukan.'], 404);
        }

        $stock = $product->stock?->quantity ?? 0;
        $isNewSerial = !$serial && ($code !== $product->sku && $code !== $product->barcode);

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
            'serialNumber' => $serial?->serial_number ?? ($isNewSerial ? $code : null),
            'serialStatus' => $serial?->status ?? ($isNewSerial ? 'new' : null),
            'isNewSerial' => $isNewSerial,
            'status' => $this->status($stock, $product->min_stock),
        ]);
    }

    public function uploadImage(Request $request, Product $product)
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:4096'],
        ]);

        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }

        $path = $request->file('image')->store('products', 'public');
        $product->update(['image_path' => $path]);

        $this->audit($request, 'product.image_uploaded', $product);

        return response()->json([
            'imagePath' => $path,
            'imageUrl' => asset('storage/'.$path),
        ]);
    }

    public function deleteImage(Request $request, Product $product)
    {
        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
            $product->update(['image_path' => null]);
            $this->audit($request, 'product.image_deleted', $product);
        }

        return response()->json([
            'imagePath' => null,
            'imageUrl' => null,
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
        return $stock === 0 ? 'empty' : ($stock < 5 ? 'low' : 'safe');
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
