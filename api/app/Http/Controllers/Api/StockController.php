<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StockMovementCollection;
use App\Http\Resources\StockMovementResource;
use App\Models\AuditLog;
use App\Models\Product;
use App\Models\ProductSerial;
use App\Models\ProductStock;
use App\Models\StockMovement;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockController extends Controller
{
    public function movements(Request $request)
    {
        $movements = StockMovement::with(['product.category', 'operator', 'sale'])
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

        return (new StockMovementResource($this->move($request, $data, 'inbound')->load(['product.category', 'operator'])))->response()->setStatusCode(201);
    }

    public function outbound(Request $request)
    {
        $data = $this->validateMovement($request);

        return (new StockMovementResource($this->move($request, $data, 'outbound')->load(['product.category', 'operator'])))->response()->setStatusCode(201);
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

        return new StockMovementResource($movement->load(['product.category', 'operator']));
    }

    public function destroyMovement(Request $request, StockMovement $stockMovement)
    {
        $this->ensureEditableMovement($stockMovement, true);

        DB::transaction(function () use ($request, $stockMovement) {
            $movement = StockMovement::whereKey($stockMovement->id)->lockForUpdate()->firstOrFail();
            $this->ensureEditableMovement($movement, true);

            $stock = ProductStock::where('product_id', $movement->product_id)->lockForUpdate()->firstOrFail();
            $after = $stock->quantity - $this->stockDelta($movement->type, $movement->quantity);

            if ($after < 0) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Stok tidak cukup untuk menghapus pergerakan ini.',
                    'code' => 'insufficient_stock',
                ], 422));
            }

            $this->reverseSerials($movement);
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

        return (new StockMovementResource($movement->load(['product.category', 'operator'])))->response()->setStatusCode(201);
    }

    private function validateMovement(Request $request): array
    {
        return $request->validate([
            'productId' => ['required_without:product_id', 'uuid', 'exists:products,id'],
            'product_id' => ['required_without:productId', 'uuid', 'exists:products,id'],
            'quantity' => ['required_without:serialNumbers,serial_numbers', 'integer', 'min:1'],
            'serialNumbers' => ['nullable', 'array'],
            'serialNumbers.*' => ['string', 'max:120'],
            'serial_numbers' => ['nullable', 'array'],
            'serial_numbers.*' => ['string', 'max:120'],
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
            $serialNumbers = $this->serialNumbers($data);
            $quantity = count($serialNumbers) ?: $data['quantity'];
            $before = $stock->quantity;
            $after = $type === 'inbound' ? $before + $quantity : $before - $quantity;

            if ($serialNumbers && isset($data['quantity']) && (int) $data['quantity'] !== $quantity) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Jumlah harus sama dengan total nomor seri.',
                    'code' => 'serial_quantity_mismatch',
                ], 422));
            }

            if ($after < 0) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Stok tidak cukup.',
                    'code' => 'insufficient_stock',
                ], 422));
            }

            if ($serialNumbers) {
                $this->applySerials($productId, $serialNumbers, $type);
            }

            $stock->update(['quantity' => $after]);

            $movement = StockMovement::create([
                'product_id' => $productId,
                'operator_id' => $request->user()->id,
                'type' => $type,
                'quantity' => $quantity,
                'serial_numbers' => $serialNumbers ?: null,
                'before_quantity' => $before,
                'after_quantity' => $after,
                'party' => $this->party($data),
                'note' => $data['note'] ?? null,
            ]);

            $this->audit($request, "stock.{$type}", $movement);

            return $movement;
        });
    }

    private function ensureEditableMovement(StockMovement $movement, bool $allowSerialized = false): void
    {
        if (! in_array($movement->type, ['inbound', 'outbound'], true) || $movement->sale_id) {
            throw new HttpResponseException(response()->json([
                'message' => 'Riwayat stok ini tidak bisa diedit atau dihapus.',
                'code' => 'movement_locked',
            ], 422));
        }

        if (! $allowSerialized && ! empty($movement->serial_numbers)) {
            throw new HttpResponseException(response()->json([
                'message' => 'Riwayat stok dengan nomor seri tidak bisa diedit. Hapus dan input ulang jika salah.',
                'code' => 'serialized_movement_locked',
            ], 422));
        }
    }

    private function serialNumbers(array $data): array
    {
        $serials = $data['serialNumbers'] ?? $data['serial_numbers'] ?? [];

        return collect($serials)
            ->map(fn (string $serial) => trim($serial))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function applySerials(string $productId, array $serialNumbers, string $type): void
    {
        if ($type === 'inbound') {
            $existing = ProductSerial::whereIn('serial_number', $serialNumbers)->lockForUpdate()->pluck('serial_number')->all();

            if ($existing) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Nomor seri sudah terdaftar: '.implode(', ', $existing),
                    'code' => 'serial_already_exists',
                    'serialNumbers' => $existing,
                ], 422));
            }

            foreach ($serialNumbers as $serialNumber) {
                ProductSerial::create([
                    'product_id' => $productId,
                    'serial_number' => $serialNumber,
                    'status' => 'in_stock',
                ]);
            }

            return;
        }

        $available = ProductSerial::where('product_id', $productId)
            ->whereIn('serial_number', $serialNumbers)
            ->where('status', 'in_stock')
            ->lockForUpdate()
            ->pluck('serial_number')
            ->all();
        $missing = array_values(array_diff($serialNumbers, $available));

        if ($missing) {
            throw new HttpResponseException(response()->json([
                'message' => 'Nomor seri tidak tersedia: '.implode(', ', $missing),
                'code' => 'serial_not_available',
                'serialNumbers' => $missing,
            ], 422));
        }

        ProductSerial::where('product_id', $productId)
            ->whereIn('serial_number', $serialNumbers)
            ->update(['status' => 'out']);
    }

    private function reverseSerials(StockMovement $movement): void
    {
        $serialNumbers = $movement->serial_numbers ?? [];

        if (! $serialNumbers) {
            return;
        }

        if ($movement->type === 'inbound') {
            $used = ProductSerial::where('product_id', $movement->product_id)
                ->whereIn('serial_number', $serialNumbers)
                ->where('status', 'out')
                ->exists();

            if ($used) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Nomor seri dari stok masuk ini sudah pernah keluar.',
                    'code' => 'serial_already_moved',
                ], 422));
            }

            ProductSerial::where('product_id', $movement->product_id)
                ->whereIn('serial_number', $serialNumbers)
                ->delete();

            return;
        }

        ProductSerial::where('product_id', $movement->product_id)
            ->whereIn('serial_number', $serialNumbers)
            ->update(['status' => 'in_stock']);
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
