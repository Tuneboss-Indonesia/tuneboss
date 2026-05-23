<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StockMovementCollection;
use App\Http\Resources\StockMovementResource;
use App\Models\AuditLog;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\StockMovement;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockController extends Controller
{
    public function movements(Request $request)
    {
        $movements = StockMovement::with(['product', 'operator', 'sale'])
            ->when($request->query('type'), function ($query, string $type) {
                $types = collect(explode(',', $type))
                    ->map(fn (string $item) => trim($item))
                    ->filter()
                    ->values();

                if ($types->isEmpty()) {
                    return $query;
                }

                return $types->count() > 1
                    ? $query->whereIn('type', $types->all())
                    : $query->where('type', $types->first());
            })
            ->when($request->query('product_id'), fn ($query, string $productId) => $query->where('product_id', $productId))
            ->when($request->query('operator_id'), fn ($query, string $operatorId) => $query->where('operator_id', $operatorId))
            ->when($request->query('from'), fn ($query, string $from) => $query->whereDate('created_at', '>=', $from))
            ->when($request->query('to'), fn ($query, string $to) => $query->whereDate('created_at', '<=', $to))
            ->latest()
            ->paginate((int) $request->query('per_page', 15));

        return new StockMovementCollection($movements);
    }

    public function inbound(Request $request)
    {
        $data = $this->validateMovement($request);

        return (new StockMovementResource($this->move($request, $data, 'inbound')->load(['product', 'operator'])))->response()->setStatusCode(201);
    }

    public function outbound(Request $request)
    {
        $data = $this->validateMovement($request);

        return (new StockMovementResource($this->move($request, $data, 'outbound')->load(['product', 'operator'])))->response()->setStatusCode(201);
    }

    public function updateMovement(Request $request, StockMovement $stockMovement)
    {
        $this->ensureEditableMovement($stockMovement);
        $data = $this->validateMovement($request);

        $movement = DB::transaction(function () use ($request, $data, $stockMovement) {
            $movement = StockMovement::whereKey($stockMovement->id)->lockForUpdate()->firstOrFail();
            $this->ensureEditableMovement($movement);

            $oldStock = ProductStock::where('product_id', $movement->product_id)->lockForUpdate()->firstOrFail();
            $oldAfter = $oldStock->quantity - $this->stockDelta($movement->type, $movement->quantity);

            if ($oldAfter < 0) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Stok tidak cukup untuk membatalkan perubahan lama.',
                    'code' => 'insufficient_stock',
                ], 422));
            }

            $oldStock->update(['quantity' => $oldAfter]);

            $productId = $data['product_id'] ?? $data['productId'];
            Product::where('id', $productId)->where('is_active', true)->firstOrFail();
            $newStock = ProductStock::where('product_id', $productId)->lockForUpdate()->firstOrFail();
            $before = $newStock->quantity;
            $after = $before + $this->stockDelta($movement->type, $data['quantity']);

            if ($after < 0) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Stok tidak cukup.',
                    'code' => 'insufficient_stock',
                ], 422));
            }

            $newStock->update(['quantity' => $after]);
            $movement->update([
                'product_id' => $productId,
                'quantity' => $data['quantity'],
                'before_quantity' => $before,
                'after_quantity' => $after,
                'party' => $this->party($data),
                'note' => $data['note'] ?? null,
            ]);

            $this->audit($request, 'stock.movement_updated', $movement);

            return $movement;
        });

        return new StockMovementResource($movement->load(['product', 'operator']));
    }

    public function destroyMovement(Request $request, StockMovement $stockMovement)
    {
        $this->ensureEditableMovement($stockMovement);

        DB::transaction(function () use ($request, $stockMovement) {
            $movement = StockMovement::whereKey($stockMovement->id)->lockForUpdate()->firstOrFail();
            $this->ensureEditableMovement($movement);

            $stock = ProductStock::where('product_id', $movement->product_id)->lockForUpdate()->firstOrFail();
            $after = $stock->quantity - $this->stockDelta($movement->type, $movement->quantity);

            if ($after < 0) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Stok tidak cukup untuk menghapus pergerakan ini.',
                    'code' => 'insufficient_stock',
                ], 422));
            }

            $stock->update(['quantity' => $after]);
            $this->audit($request, 'stock.movement_deleted', $movement);
            $movement->delete();
        });

        return response()->json(['message' => 'Riwayat stok berhasil dihapus.']);
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
                'note' => $data['note'] ?? null,
            ]);

            $this->audit($request, 'stock.adjusted', $movement);

            return $movement;
        });

        return (new StockMovementResource($movement->load(['product', 'operator'])))->response()->setStatusCode(201);
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
                'note' => $data['note'] ?? null,
            ]);

            $this->audit($request, "stock.{$type}", $movement);

            return $movement;
        });
    }

    private function ensureEditableMovement(StockMovement $movement): void
    {
        if (! in_array($movement->type, ['inbound', 'outbound'], true) || $movement->sale_id) {
            throw new HttpResponseException(response()->json([
                'message' => 'Riwayat stok ini tidak bisa diedit atau dihapus.',
                'code' => 'movement_locked',
            ], 422));
        }
    }

    private function stockDelta(string $type, int $quantity): int
    {
        return $type === 'inbound' ? $quantity : -$quantity;
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

        return null;
    }
}
