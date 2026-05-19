<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
        return response()->json(Sale::with(['cashier', 'items.product'])->latest()->paginate((int) $request->query('per_page', 15)));
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

        return response()->json($sale->load(['cashier', 'items.product']), 201);
    }

    public function show(Sale $sale)
    {
        return response()->json($sale->load(['cashier', 'items.product']));
    }
}
