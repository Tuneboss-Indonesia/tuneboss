<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StockMovementCollection;
use App\Http\Resources\StockMovementResource;
use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\Supplier;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockController extends Controller
{
    public function movements(Request $request)
    {
        $movements = StockMovement::with(['product', 'operator', 'supplier', 'customer'])
            ->when($request->query('type'), fn ($query, string $type) => $query->where('type', $type))
            ->when($request->query('product_id'), fn ($query, string $productId) => $query->where('product_id', $productId))
            ->when($request->query('operator_id'), fn ($query, string $operatorId) => $query->where('operator_id', $operatorId))
            ->when($request->query('supplier_id'), fn ($query, string $supplierId) => $query->where('supplier_id', $supplierId))
            ->when($request->query('customer_id'), fn ($query, string $customerId) => $query->where('customer_id', $customerId))
            ->when($request->query('from'), fn ($query, string $from) => $query->whereDate('created_at', '>=', $from))
            ->when($request->query('to'), fn ($query, string $to) => $query->whereDate('created_at', '<=', $to))
            ->latest()
            ->paginate((int) $request->query('per_page', 15));

        return new StockMovementCollection($movements);
    }

    public function inbound(Request $request)
    {
        $data = $this->validateMovement($request);

        return (new StockMovementResource($this->move($request, $data, 'inbound')->load(['product', 'operator', 'supplier', 'customer'])))->response()->setStatusCode(201);
    }

    public function outbound(Request $request)
    {
        $data = $this->validateMovement($request);

        return (new StockMovementResource($this->move($request, $data, 'outbound')->load(['product', 'operator', 'supplier', 'customer'])))->response()->setStatusCode(201);
    }

    public function adjustment(Request $request)
    {
        $data = $request->validate([
            'productId' => ['required_without:product_id', 'uuid', 'exists:products,id'],
            'product_id' => ['required_without:productId', 'uuid', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:0'],
            'party' => ['nullable', 'string', 'max:180'],
            'supplier_id' => ['nullable', 'uuid', 'exists:suppliers,id'],
            'customer_id' => ['nullable', 'uuid', 'exists:customers,id'],
            'note' => ['nullable', 'string'],
        ]);

        $productId = $data['product_id'] ?? $data['productId'];

        $movement = DB::transaction(function () use ($request, $data, $productId) {
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
                'party' => $this->party($data),
                'supplier_id' => $data['supplier_id'] ?? null,
                'customer_id' => $data['customer_id'] ?? null,
                'note' => $data['note'] ?? null,
            ]);

            $this->audit($request, 'stock.adjusted', $movement);

            return $movement;
        });

        return (new StockMovementResource($movement->load(['product', 'operator', 'supplier', 'customer'])))->response()->setStatusCode(201);
    }

    private function validateMovement(Request $request): array
    {
        return $request->validate([
            'productId' => ['required_without:product_id', 'uuid', 'exists:products,id'],
            'product_id' => ['required_without:productId', 'uuid', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'party' => ['nullable', 'string', 'max:180'],
            'supplier_id' => ['nullable', 'uuid', 'exists:suppliers,id'],
            'customer_id' => ['nullable', 'uuid', 'exists:customers,id'],
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
                throw new HttpResponseException(response()->json([
                    'message' => 'Stok tidak cukup.',
                    'code' => 'insufficient_stock',
                ], 422));
            }

            $stock->update(['quantity' => $after]);

            $movement = StockMovement::create([
                'product_id' => $productId,
                'operator_id' => $request->user()->id,
                'type' => $type,
                'quantity' => $data['quantity'],
                'before_quantity' => $before,
                'after_quantity' => $after,
                'party' => $this->party($data),
                'supplier_id' => $data['supplier_id'] ?? null,
                'customer_id' => $data['customer_id'] ?? null,
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
            'metadata' => [
                'productId' => $movement->product_id,
                'type' => $movement->type,
                'quantity' => $movement->quantity,
                'supplierId' => $movement->supplier_id,
                'customerId' => $movement->customer_id,
                'before' => ['quantity' => $movement->before_quantity],
                'after' => ['quantity' => $movement->after_quantity],
            ],
        ]);
    }

    private function party(array $data): ?string
    {
        if (! empty($data['party'])) {
            return $data['party'];
        }

        if (! empty($data['supplier_id'])) {
            return Supplier::whereKey($data['supplier_id'])->value('name');
        }

        if (! empty($data['customer_id'])) {
            return Customer::whereKey($data['customer_id'])->value('name');
        }

        return null;
    }
}
