<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Http\Resources\SaleResource;
use App\Http\Resources\StockMovementResource;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function stock(Request $request)
    {
        $products = Product::with(['category', 'stock'])
            ->when($request->query('category_id'), fn ($query, string $categoryId) => $query->where('category_id', $categoryId))
            ->when($request->query('product_id'), fn ($query, string $productId) => $query->where('id', $productId))
            ->when($request->query('status'), function ($query, string $status) {
                $query->whereHas('stock', function ($query) use ($status) {
                    match ($status) {
                        'empty' => $query->where('quantity', 0),
                        'low' => $query->where('quantity', '>', 0)->whereColumn('quantity', '<', 'products.min_stock'),
                        'safe' => $query->whereColumn('quantity', '>=', 'products.min_stock'),
                        default => null,
                    };
                });
            })
            ->orderBy('name')
            ->paginate((int) $request->query('per_page', 15));

        return ProductResource::collection($products);
    }

    public function sales(Request $request)
    {
        $sales = $this->dateFilter(Sale::with(['cashier', 'voidedBy', 'items.product']), $request)
            ->when($request->query('status'), fn ($query, string $status) => $query->where('status', $status))
            ->when($request->query('cashier_id'), fn ($query, string $cashierId) => $query->where('cashier_id', $cashierId))
            ->when($request->query('search'), fn ($query, string $search) => $query->where('invoice_number', 'like', "%{$search}%"))
            ->latest()
            ->paginate((int) $request->query('per_page', 15));

        return SaleResource::collection($sales);
    }

    public function inbound(Request $request)
    {
        return $this->movementReport($request, ['inbound']);
    }

    public function outbound(Request $request)
    {
        return $this->movementReport($request, ['outbound', 'sale']);
    }

    private function movementReport(Request $request, array $types)
    {
        $query = StockMovement::with(['product', 'operator'])->whereIn('type', $types);

        $movements = $this->dateFilter($query, $request)
            ->when($request->query('product_id'), fn ($query, string $productId) => $query->where('product_id', $productId))
            ->when($request->query('operator_id'), fn ($query, string $operatorId) => $query->where('operator_id', $operatorId))
            ->latest()
            ->paginate((int) $request->query('per_page', 15));

        return StockMovementResource::collection($movements);
    }

    private function dateFilter($query, Request $request)
    {
        return $query
            ->when($request->query('from'), fn ($query, string $from) => $query->whereDate('created_at', '>=', $from))
            ->when($request->query('to'), fn ($query, string $to) => $query->whereDate('created_at', '<=', $to));
    }
}
