<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function summary()
    {
        $products = Product::query()->where('is_active', true)->leftJoin('product_stocks', 'products.id', '=', 'product_stocks.product_id');
        $totalSku = (clone $products)->count('products.id');
        $totalUnits = (clone $products)->sum(DB::raw('COALESCE(product_stocks.quantity, 0)'));
        $lowStockCount = (clone $products)->whereRaw('COALESCE(product_stocks.quantity, 0) > 0')->whereColumn('product_stocks.quantity', '<', 'products.min_stock')->count();
        $outOfStockCount = (clone $products)->whereRaw('COALESCE(product_stocks.quantity, 0) = 0')->count();
        $safeCount = max($totalSku - $lowStockCount - $outOfStockCount, 0);

        return response()->json([
            'totalSku' => $totalSku,
            'totalUnits' => (int) $totalUnits,
            'lowStockCount' => $lowStockCount,
            'outOfStockCount' => $outOfStockCount,
            'stockHealth' => [
                'healthy' => $this->percent($safeCount, $totalSku),
                'low' => $this->percent($lowStockCount, $totalSku),
                'empty' => $this->percent($outOfStockCount, $totalSku),
            ],
        ]);
    }

    public function priorityProducts()
    {
        $products = Product::with(['category', 'stock'])
            ->where('is_active', true)
            ->whereHas('stock', fn ($query) => $query->whereColumn('quantity', '<=', 'products.min_stock'))
            ->limit(10)
            ->get()
            ->map(function (Product $product) {
                $stock = $product->stock?->quantity ?? 0;

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'barcode' => $product->barcode,
                    'stock' => $stock,
                    'minStock' => $product->min_stock,
                    'status' => $stock === 0 ? 'empty' : 'low',
                ];
            });

        return response()->json($products);
    }

    public function recentActivities()
    {
        return response()->json(StockMovement::with(['product', 'operator'])
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (StockMovement $movement) => [
                'id' => $movement->id,
                'type' => $movement->type,
                'productName' => $movement->product?->name,
                'quantity' => $movement->quantity,
                'operator' => $movement->operator?->name,
                'timestamp' => $movement->created_at?->toISOString(),
            ]));
    }

    public function salesChart(Request $request)
    {
        $period = $this->period($request);
        $format = match ($period) {
            'day' => 'Y-m-d',
            'week' => 'o-\WW',
            'month' => 'Y-m',
            'year' => 'Y',
        };

        $sales = Sale::with('items')
            ->where('status', 'completed')
            ->where('created_at', '>=', $this->periodStart($period))
            ->get()
            ->groupBy(fn (Sale $sale) => $sale->created_at->format($format))
            ->map(fn ($sales, string $label) => [
                'label' => $label,
                'value' => (int) $sales->sum(fn (Sale $sale) => $sale->items->sum('quantity')),
            ])
            ->sortBy('label')
            ->values();

        return response()->json($sales);
    }

    public function topProducts(Request $request)
    {
        $period = $this->period($request);

        $products = SaleItem::query()
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->select('products.id', 'products.name', 'products.sku')
            ->selectRaw('SUM(sale_items.quantity) as quantity')
            ->selectRaw('SUM(sale_items.subtotal) as totalAmount')
            ->where('sales.status', 'completed')
            ->where('sales.created_at', '>=', $this->periodStart($period))
            ->groupBy('products.id', 'products.name', 'products.sku')
            ->orderByDesc('quantity')
            ->limit(10)
            ->get()
            ->map(fn ($product) => [
                'id' => $product->id,
                'label' => $product->name,
                'sku' => $product->sku,
                'value' => (int) $product->quantity,
                'totalAmount' => (float) $product->totalAmount,
            ]);

        return response()->json($products);
    }

    private function percent(int $value, int $total): int
    {
        return $total === 0 ? 0 : (int) round(($value / $total) * 100);
    }

    private function period(Request $request): string
    {
        return in_array($request->query('period'), ['day', 'week', 'month', 'year'], true)
            ? $request->query('period')
            : 'month';
    }

    private function periodStart(string $period)
    {
        return match ($period) {
            'day' => now()->startOfDay(),
            'week' => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            'year' => now()->startOfYear(),
        };
    }
}
