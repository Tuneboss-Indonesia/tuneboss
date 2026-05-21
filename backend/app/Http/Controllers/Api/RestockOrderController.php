<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\RestockOrderCollection;
use App\Http\Resources\RestockOrderResource;
use App\Models\AuditLog;
use App\Models\ProductStock;
use App\Models\RestockAlert;
use App\Models\RestockOrder;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RestockOrderController extends Controller
{
    public function index(Request $request)
    {
        $orders = RestockOrder::with(['product.stock', 'supplier', 'createdBy', 'receivedBy'])
            ->when($request->query('status'), fn ($query, string $status) => $query->where('status', $status))
            ->when($request->query('product_id'), fn ($query, string $productId) => $query->where('product_id', $productId))
            ->when($request->query('supplier_id'), fn ($query, string $supplierId) => $query->where('supplier_id', $supplierId))
            ->latest()
            ->paginate((int) $request->query('per_page', 15));

        return new RestockOrderCollection($orders);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'product_id' => ['required', 'uuid', 'exists:products,id'],
            'supplier_id' => ['nullable', 'uuid', 'exists:suppliers,id'],
            'restock_alert_id' => ['nullable', 'uuid', 'exists:restock_alerts,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'status' => ['sometimes', Rule::in(['draft', 'ordered'])],
            'note' => ['nullable', 'string'],
        ]);

        $order = RestockOrder::create([
            ...$data,
            'created_by' => $request->user()->id,
            'status' => $data['status'] ?? 'draft',
            'ordered_at' => ($data['status'] ?? 'draft') === 'ordered' ? now() : null,
        ]);

        $this->audit($request, 'restock_order.created', $order, after: $this->auditPayload($order));

        return (new RestockOrderResource($order->load(['product.stock', 'supplier', 'createdBy', 'receivedBy'])))->response()->setStatusCode(201);
    }

    public function update(Request $request, RestockOrder $restockOrder)
    {
        if (in_array($restockOrder->status, ['received', 'cancelled'], true)) {
            return response()->json(['message' => 'Restock order sudah final.', 'code' => 'restock_order_final'], 422);
        }

        $data = $request->validate([
            'supplier_id' => ['nullable', 'uuid', 'exists:suppliers,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'status' => ['required', Rule::in(['draft', 'ordered'])],
            'note' => ['nullable', 'string'],
        ]);

        $before = $this->auditPayload($restockOrder);
        $restockOrder->update([
            ...$data,
            'ordered_at' => $data['status'] === 'ordered' ? ($restockOrder->ordered_at ?? now()) : null,
        ]);
        $this->audit($request, 'restock_order.updated', $restockOrder, $before, $this->auditPayload($restockOrder));

        return new RestockOrderResource($restockOrder->load(['product.stock', 'supplier', 'createdBy', 'receivedBy']));
    }

    public function receive(Request $request, RestockOrder $restockOrder)
    {
        if ($restockOrder->status === 'received') {
            return response()->json(['message' => 'Restock order sudah diterima.', 'code' => 'restock_order_received'], 422);
        }

        if ($restockOrder->status === 'cancelled') {
            return response()->json(['message' => 'Restock order sudah dibatalkan.', 'code' => 'restock_order_cancelled'], 422);
        }

        $request->validate(['note' => ['nullable', 'string']]);
        $before = $this->auditPayload($restockOrder);

        $order = DB::transaction(function () use ($request, $restockOrder) {
            $stock = ProductStock::where('product_id', $restockOrder->product_id)->lockForUpdate()->firstOrFail();
            $beforeQuantity = $stock->quantity;
            $afterQuantity = $beforeQuantity + $restockOrder->quantity;
            $stock->update(['quantity' => $afterQuantity]);

            $movement = StockMovement::create([
                'product_id' => $restockOrder->product_id,
                'operator_id' => $request->user()->id,
                'type' => 'inbound',
                'quantity' => $restockOrder->quantity,
                'before_quantity' => $beforeQuantity,
                'after_quantity' => $afterQuantity,
                'party' => $restockOrder->supplier?->name,
                'supplier_id' => $restockOrder->supplier_id,
                'note' => $request->input('note', 'Received restock order'),
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'stock.inbound',
                'entity' => 'stock_movements',
                'entity_id' => $movement->id,
                'metadata' => [
                    'productId' => $movement->product_id,
                    'restockOrderId' => $restockOrder->id,
                    'quantity' => $movement->quantity,
                    'before' => ['quantity' => $movement->before_quantity],
                    'after' => ['quantity' => $movement->after_quantity],
                ],
            ]);

            $restockOrder->update([
                'status' => 'received',
                'received_by' => $request->user()->id,
                'received_at' => now(),
                'note' => $request->input('note', $restockOrder->note),
            ]);

            RestockAlert::where('id', $restockOrder->restock_alert_id)->update([
                'status' => 'resolved',
                'resolved_by' => $request->user()->id,
                'resolved_at' => now(),
                'note' => 'Resolved by restock order '.$restockOrder->id,
            ]);

            return $restockOrder;
        });

        $this->audit($request, 'restock_order.received', $order, $before, $this->auditPayload($order));

        return new RestockOrderResource($order->load(['product.stock', 'supplier', 'createdBy', 'receivedBy']));
    }

    public function cancel(Request $request, RestockOrder $restockOrder)
    {
        if ($restockOrder->status === 'received') {
            return response()->json(['message' => 'Restock order sudah diterima.', 'code' => 'restock_order_received'], 422);
        }

        $before = $this->auditPayload($restockOrder);
        $restockOrder->update(['status' => 'cancelled']);
        $this->audit($request, 'restock_order.cancelled', $restockOrder, $before, $this->auditPayload($restockOrder));

        return new RestockOrderResource($restockOrder->load(['product.stock', 'supplier', 'createdBy', 'receivedBy']));
    }

    private function audit(Request $request, string $action, RestockOrder $order, ?array $before = null, ?array $after = null): void
    {
        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'entity' => 'restock_orders',
            'entity_id' => $order->id,
            'metadata' => array_filter(['before' => $before, 'after' => $after]),
        ]);
    }

    private function auditPayload(RestockOrder $order): array
    {
        return $order->only(['product_id', 'supplier_id', 'restock_alert_id', 'status', 'quantity', 'note', 'ordered_at', 'received_at']);
    }
}
