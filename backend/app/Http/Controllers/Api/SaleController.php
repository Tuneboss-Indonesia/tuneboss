<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SaleCollection;
use App\Http\Resources\SaleResource;
use App\Models\AuditLog;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Sale;
use App\Models\StockMovement;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        $sales = Sale::with(['cashier', 'customer', 'voidedBy', 'items.product'])
            ->when($request->query('search'), fn ($query, string $search) => $query->where('invoice_number', 'like', "%{$search}%"))
            ->when($request->query('status'), fn ($query, string $status) => $query->where('status', $status))
            ->when($request->query('cashier_id'), fn ($query, string $cashierId) => $query->where('cashier_id', $cashierId))
            ->when($request->query('customer_id'), fn ($query, string $customerId) => $query->where('customer_id', $customerId))
            ->when($request->query('from'), fn ($query, string $from) => $query->whereDate('created_at', '>=', $from))
            ->when($request->query('to'), fn ($query, string $to) => $query->whereDate('created_at', '<=', $to))
            ->latest()
            ->paginate((int) $request->query('per_page', 15));

        return new SaleCollection($sales);
    }

    public function store(Request $request)
    {
        $data = $this->validatedCart($request);

        $sale = DB::transaction(function () use ($request, $data) {
            $preview = $this->cartPreview($data['items'], true);
            $sale = Sale::create([
                'invoice_number' => 'INV-'.now()->format('YmdHis').'-'.random_int(100, 999),
                'cashier_id' => $request->user()->id,
                'customer_id' => $data['customer_id'] ?? null,
                'total_amount' => 0,
            ]);

            foreach ($preview['items'] as $item) {
                $sale->items()->create([
                    'product_id' => $item['productId'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['subtotal'],
                ]);

                $item['stock']->update(['quantity' => $item['afterStock']]);
                StockMovement::create([
                    'product_id' => $item['productId'],
                    'operator_id' => $request->user()->id,
                    'sale_id' => $sale->id,
                    'type' => 'sale',
                    'quantity' => $item['quantity'],
                    'before_quantity' => $item['availableStock'],
                    'after_quantity' => $item['afterStock'],
                    'party' => $sale->customer?->name ?? 'Penjualan',
                    'customer_id' => $sale->customer_id,
                    'note' => $sale->invoice_number,
                ]);
            }

            $sale->update(['total_amount' => $preview['totalAmount']]);
            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'sale.created',
                'entity' => 'sales',
                'entity_id' => $sale->id,
                'metadata' => [
                    'invoiceNumber' => $sale->invoice_number,
                    'customerId' => $sale->customer_id,
                    'totalAmount' => $preview['totalAmount'],
                    'items' => $sale->items()->get(['product_id', 'quantity', 'price', 'subtotal'])->toArray(),
                ],
            ]);

            return $sale;
        });

        return (new SaleResource($sale->load(['cashier', 'customer', 'voidedBy', 'items.product'])))->response()->setStatusCode(201);
    }

    public function preview(Request $request)
    {
        $data = $this->validatedCart($request);
        $preview = $this->cartPreview($data['items']);

        return response()->json([
            'customerId' => $data['customer_id'] ?? null,
            'items' => collect($preview['items'])->map(fn (array $item) => collect($item)->except('stock')->all())->values(),
            'totalItems' => array_sum(array_column($data['items'], 'quantity')),
            'totalAmount' => $preview['totalAmount'],
            'canSubmit' => true,
        ]);
    }

    public function show(Sale $sale)
    {
        return new SaleResource($sale->load(['cashier', 'customer', 'voidedBy', 'items.product']));
    }

    public function void(Request $request, Sale $sale)
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        if ($sale->status === 'void') {
            return response()->json(['message' => 'Penjualan sudah dibatalkan.', 'code' => 'sale_already_void'], 422);
        }

        $sale = DB::transaction(function () use ($request, $sale, $data) {
            $sale->load('items.product');
            $before = $sale->only(['status', 'voided_by', 'voided_at', 'void_reason']);

            foreach ($sale->items as $item) {
                $stock = ProductStock::where('product_id', $item->product_id)->lockForUpdate()->firstOrFail();
                $before = $stock->quantity;
                $after = $before + $item->quantity;
                $stock->update(['quantity' => $after]);

                StockMovement::create([
                    'product_id' => $item->product_id,
                    'operator_id' => $request->user()->id,
                    'sale_id' => $sale->id,
                    'type' => 'adjustment',
                    'quantity' => $item->quantity,
                    'before_quantity' => $before,
                    'after_quantity' => $after,
                    'party' => 'Void Penjualan',
                    'note' => $sale->invoice_number.' - '.$data['reason'],
                ]);
            }

            $sale->update([
                'status' => 'void',
                'voided_by' => $request->user()->id,
                'voided_at' => now(),
                'void_reason' => $data['reason'],
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'sale.voided',
                'entity' => 'sales',
                'entity_id' => $sale->id,
                'metadata' => [
                    'reason' => $data['reason'],
                    'before' => $before,
                    'after' => $sale->only(['status', 'voided_by', 'voided_at', 'void_reason']),
                ],
            ]);

            return $sale;
        });

        return new SaleResource($sale->load(['cashier', 'customer', 'voidedBy', 'items.product']));
    }

    private function validatedCart(Request $request): array
    {
        return $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'customer_id' => ['nullable', 'uuid', 'exists:customers,id'],
            'items.*.product_id' => ['required', 'uuid', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);
    }

    private function cartPreview(array $items, bool $lockStock = false): array
    {
        $groupedItems = collect($items)
            ->groupBy('product_id')
            ->map(fn ($items, string $productId) => [
                'product_id' => $productId,
                'quantity' => (int) $items->sum('quantity'),
            ])
            ->values();

        $previewItems = $groupedItems->map(function (array $item) use ($lockStock) {
            $product = Product::where('id', $item['product_id'])->where('is_active', true)->firstOrFail();
            $stockQuery = ProductStock::where('product_id', $product->id);
            $stock = ($lockStock ? $stockQuery->lockForUpdate() : $stockQuery)->firstOrFail();
            $availableStock = $stock->quantity;
            $afterStock = $availableStock - $item['quantity'];

            if ($afterStock < 0) {
                throw new HttpResponseException(response()->json([
                    'message' => "Stok {$product->name} tidak cukup.",
                    'code' => 'insufficient_stock',
                    'productId' => $product->id,
                    'availableStock' => $availableStock,
                    'requestedQuantity' => $item['quantity'],
                ], 422));
            }

            $price = (float) $product->sale_price;
            $subtotal = $price * $item['quantity'];

            return [
                'productId' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'quantity' => $item['quantity'],
                'availableStock' => $availableStock,
                'afterStock' => $afterStock,
                'price' => $price,
                'subtotal' => $subtotal,
                'stock' => $stock,
            ];
        });

        return [
            'items' => $previewItems->all(),
            'totalAmount' => (float) $previewItems->sum('subtotal'),
        ];
    }
}
