<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\RestockAlertCollection;
use App\Http\Resources\RestockAlertResource;
use App\Models\AuditLog;
use App\Models\Product;
use App\Models\RestockAlert;
use Illuminate\Http\Request;

class RestockAlertController extends Controller
{
    public function index(Request $request)
    {
        $this->syncAlerts();

        $alerts = RestockAlert::with(['product.category', 'acknowledgedBy', 'resolvedBy'])
            ->whereHas('product', fn ($query) => $query->where('is_active', true))
            ->when($request->query('status'), fn ($query, string $status) => $query->where('status', $status))
            ->when($request->query('severity'), fn ($query, string $severity) => $query->where('severity', $severity))
            ->when($request->query('search'), function ($query, string $search) {
                $query->whereHas('product', function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%");
                });
            })
            ->when($request->query('product_id'), fn ($query, string $productId) => $query->where('product_id', $productId))
            ->when($request->query('active_only') !== null, fn ($query) => $query->whereIn('status', ['open', 'acknowledged']))
            ->orderByRaw("CASE status WHEN 'open' THEN 0 WHEN 'acknowledged' THEN 1 ELSE 2 END")
            ->orderByRaw("CASE severity WHEN 'empty' THEN 0 ELSE 1 END")
            ->latest()
            ->paginate((int) $request->query('per_page', 15));

        return new RestockAlertCollection($alerts);
    }

    public function acknowledge(Request $request, RestockAlert $restockAlert)
    {
        if ($restockAlert->status === 'resolved') {
            return response()->json(['message' => 'Restock alert sudah selesai.', 'code' => 'restock_alert_resolved'], 422);
        }

        $before = $restockAlert->only(['status', 'acknowledged_by', 'acknowledged_at', 'note']);
        $restockAlert->update([
            'status' => 'acknowledged',
            'acknowledged_by' => $request->user()->id,
            'acknowledged_at' => now(),
            'note' => $request->input('note', $restockAlert->note),
        ]);

        $this->audit($request, 'restock_alert.acknowledged', $restockAlert, $before);

        return new RestockAlertResource($restockAlert->load(['product.category', 'acknowledgedBy', 'resolvedBy']));
    }

    public function resolve(Request $request, RestockAlert $restockAlert)
    {
        $before = $restockAlert->only(['status', 'resolved_by', 'resolved_at', 'note']);
        $restockAlert->update([
            'status' => 'resolved',
            'resolved_by' => $request->user()->id,
            'resolved_at' => now(),
            'note' => $request->input('note', $restockAlert->note),
        ]);

        $this->audit($request, 'restock_alert.resolved', $restockAlert, $before);

        return new RestockAlertResource($restockAlert->load(['product.category', 'acknowledgedBy', 'resolvedBy']));
    }

    private function syncAlerts(): void
    {
        $products = Product::with('stock')->where('is_active', true)->get();

        foreach ($products as $product) {
            $currentStock = $product->stock?->quantity ?? 0;
            $minStock = max(1, (int) $product->min_stock);
            $severity = $currentStock === 0 ? 'empty' : ($currentStock < $minStock ? 'low' : null);

            if ($severity) {
                $alert = RestockAlert::firstOrNew(['product_id' => $product->id]);
                $reopen = ! $alert->exists || $alert->status === 'resolved';
                $alert->fill([
                    'severity' => $severity,
                    'current_stock' => $currentStock,
                    'threshold' => $product->min_stock,
                    'status' => $reopen ? 'open' : $alert->status,
                    'resolved_by' => $reopen ? null : $alert->resolved_by,
                    'resolved_at' => $reopen ? null : $alert->resolved_at,
                ])->save();

                continue;
            }

            RestockAlert::where('product_id', $product->id)
                ->where('status', '!=', 'resolved')
                ->update([
                    'status' => 'resolved',
                    'current_stock' => $currentStock,
                    'threshold' => $product->min_stock,
                    'resolved_at' => now(),
                ]);
        }
    }

    private function audit(Request $request, string $action, RestockAlert $alert, array $before): void
    {
        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'entity' => 'restock_alerts',
            'entity_id' => $alert->id,
            'metadata' => [
                'productId' => $alert->product_id,
                'before' => $before,
                'after' => $alert->only(['status', 'acknowledged_by', 'acknowledged_at', 'resolved_by', 'resolved_at', 'note']),
            ],
        ]);
    }
}
