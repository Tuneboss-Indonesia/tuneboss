<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SaleResource;
use App\Models\AuditLog;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Sale;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        $sales = Sale::with(['cashier', 'voidedBy', 'items.product'])
            ->when($request->query('search'), fn ($query, string $search) => $query->where('invoice_number', 'like', "%{$search}%"))
            ->when($request->query('status'), fn ($query, string $status) => $query->where('status', $status))
            ->when($request->query('cashier_id'), fn ($query, string $cashierId) => $query->where('cashier_id', $cashierId))
            ->when($request->query('from'), fn ($query, string $from) => $query->whereDate('created_at', '>=', $from))
            ->when($request->query('to'), fn ($query, string $to) => $query->whereDate('created_at', '<=', $to))
            ->latest()
            ->paginate((int) $request->query('per_page', 15));

        return SaleResource::collection($sales);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'uuid', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $sale = DB::transaction(function () use ($request, $data) {
            $sale = Sale::create([
                'invoice_number' => 'INV-'.now()->format('YmdHis').'-'.random_int(100, 999),
                'cashier_id' => $request->user()->id,
                'total_amount' => 0,
            ]);
            $total = 0;

            foreach ($data['items'] as $item) {
                $product = Product::where('id', $item['product_id'])->where('is_active', true)->firstOrFail();
                $stock = ProductStock::where('product_id', $product->id)->lockForUpdate()->firstOrFail();
                $before = $stock->quantity;
                $after = $before - $item['quantity'];

                if ($after < 0) {
                    abort(422, "Stok {$product->name} tidak cukup.");
                }

                $subtotal = $product->sale_price * $item['quantity'];
                $total += $subtotal;
                $sale->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'price' => $product->sale_price,
                    'subtotal' => $subtotal,
                ]);

                $stock->update(['quantity' => $after]);
                StockMovement::create([
                    'product_id' => $product->id,
                    'operator_id' => $request->user()->id,
                    'sale_id' => $sale->id,
                    'type' => 'sale',
                    'quantity' => $item['quantity'],
                    'before_quantity' => $before,
                    'after_quantity' => $after,
                    'party' => 'Penjualan',
                    'note' => $sale->invoice_number,
                ]);
            }

            $sale->update(['total_amount' => $total]);
            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'sale.created',
                'entity' => 'sales',
                'entity_id' => $sale->id,
            ]);

            return $sale;
        });

        return (new SaleResource($sale->load(['cashier', 'voidedBy', 'items.product'])))->response()->setStatusCode(201);
    }

    public function show(Sale $sale)
    {
        return new SaleResource($sale->load(['cashier', 'voidedBy', 'items.product']));
    }

    public function void(Request $request, Sale $sale)
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        if ($sale->status === 'void') {
            return response()->json(['message' => 'Penjualan sudah dibatalkan.'], 422);
        }

        $sale = DB::transaction(function () use ($request, $sale, $data) {
            $sale->load('items.product');

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
                'metadata' => ['reason' => $data['reason']],
            ]);

            return $sale;
        });

        return new SaleResource($sale->load(['cashier', 'voidedBy', 'items.product']));
    }
}
