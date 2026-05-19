<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockController extends Controller
{
    public function movements(Request $request)
    {
        return response()->json(StockMovement::with(['product', 'operator'])
            ->when($request->query('type'), fn ($query, string $type) => $query->where('type', $type))
            ->latest()
            ->paginate((int) $request->query('per_page', 15)));
    }

    public function inbound(Request $request)
    {
        $data = $this->validateMovement($request);

        return response()->json($this->move($request, $data, 'inbound'), 201);
    }

    public function outbound(Request $request)
    {
        $data = $this->validateMovement($request);

        return response()->json($this->move($request, $data, 'outbound'), 201);
    }

    public function adjustment(Request $request)
    {
        $data = $request->validate([
            'productId' => ['required_without:product_id', 'uuid', 'exists:products,id'],
            'product_id' => ['required_without:productId', 'uuid', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:0'],
            'party' => ['nullable', 'string', 'max:180'],
            'note' => ['nullable', 'string'],
        ]);

        $productId = $data['product_id'] ?? $data['productId'];

        return response()->json(DB::transaction(function () use ($request, $data, $productId) {
            $stock = ProductStock::where('product_id', $productId)->lockForUpdate()->firstOrFail();
            $before = $stock->quantity;
            $after = $data['quantity'];
            $stock->update(['quantity' => $after]);

            $movement = StockMovement::create([
                'product_id' => $productId,
                'operator_id' => $request->user()->id,
                'type' => 'adjustment',
                'quantity' => $after - $before,
                'before_quantity' => $before,
                'after_quantity' => $after,
                'party' => $data['party'] ?? null,
                'note' => $data['note'] ?? null,
            ]);

            $this->audit($request, 'stock.adjusted', $movement);

            return $movement;
        }), 201);
    }

    private function validateMovement(Request $request): array
    {
        return $request->validate([
            'productId' => ['required_without:product_id', 'uuid', 'exists:products,id'],
            'product_id' => ['required_without:productId', 'uuid', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'party' => ['nullable', 'string', 'max:180'],
            'note' => ['nullable', 'string'],
        ]);
    }

    private function move(Request $request, array $data, string $type): StockMovement
    {
        $productId = $data['product_id'] ?? $data['productId'];

        return DB::transaction(function () use ($request, $data, $productId, $type) {
            Product::where('id', $productId)->where('is_active', true)->firstOrFail();
            $stock = ProductStock::where('product_id', $productId)->lockForUpdate()->firstOrFail();
            $before = $stock->quantity;
            $after = $type === 'inbound' ? $before + $data['quantity'] : $before - $data['quantity'];

            if ($after < 0) {
                abort(422, 'Stok tidak cukup.');
            }

            $stock->update(['quantity' => $after]);

            $movement = StockMovement::create([
                'product_id' => $productId,
                'operator_id' => $request->user()->id,
                'type' => $type,
                'quantity' => $data['quantity'],
                'before_quantity' => $before,
                'after_quantity' => $after,
                'party' => $data['party'] ?? null,
                'note' => $data['note'] ?? null,
            ]);

            $this->audit($request, "stock.{$type}", $movement);

            return $movement;
        });
    }

    private function audit(Request $request, string $action, StockMovement $movement): void
    {
        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'entity' => 'stock_movements',
            'entity_id' => $movement->id,
        ]);
    }
}
