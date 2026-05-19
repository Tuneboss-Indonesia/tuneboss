<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\AuditLog;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $products = Product::query()
            ->with(['category', 'stock'])
            ->when($request->query('search'), function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%");
                });
            })
            ->when($request->query('category_id'), fn ($query, string $categoryId) => $query->where('category_id', $categoryId))
            ->when($request->query('active') !== null, fn ($query) => $query->where('is_active', filter_var($request->query('active'), FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('name')
            ->paginate((int) $request->query('per_page', 15));

        return ProductResource::collection($products);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $product = DB::transaction(function () use ($request, $data) {
            $product = Product::create($data);
            $product->stock()->create(['quantity' => 0]);
            $this->audit($request, 'product.created', $product);

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

        $product = DB::transaction(function () use ($request, $product, $data) {
            $product->update($data);
            $this->audit($request, 'product.updated', $product);

            return $product;
        });

        return new ProductResource($product->load(['category', 'stock']));
    }

    public function destroy(Request $request, Product $product)
    {
        $product->update(['is_active' => false]);
        $this->audit($request, 'product.disabled', $product);

        return response()->json(['message' => 'Produk dinonaktifkan.']);
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
            'category' => $product->category?->name,
            'categoryId' => $product->category_id,
            'stock' => $stock,
            'minStock' => $product->min_stock,
            'salePrice' => (float) $product->sale_price,
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
            'sale_price' => ['required', 'numeric', 'min:0'],
            'min_stock' => ['required', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }

    private function status(int $stock, int $minStock): string
    {
        return $stock === 0 ? 'empty' : ($stock < $minStock ? 'low' : 'safe');
    }

    private function audit(Request $request, string $action, Product $product): void
    {
        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'entity' => 'products',
            'entity_id' => $product->id,
        ]);
    }
}
