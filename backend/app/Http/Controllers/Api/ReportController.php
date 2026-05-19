<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductCollection;
use App\Http\Resources\SaleCollection;
use App\Http\Resources\StockMovementCollection;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function summary(Request $request)
    {
        $sales = $this->dateFilter(Sale::query(), $request);
        $movements = $this->dateFilter(StockMovement::query(), $request);

        $stock = Product::query()
            ->where('is_active', true)
            ->leftJoin('product_stocks', 'products.id', '=', 'product_stocks.product_id');

        return response()->json([
            'sales' => [
                'completedCount' => (clone $sales)->where('status', 'completed')->count(),
                'voidCount' => (clone $sales)->where('status', 'void')->count(),
                'totalAmount' => (float) (clone $sales)->where('status', 'completed')->sum('total_amount'),
            ],
            'stockMovements' => [
                'inboundQuantity' => (int) (clone $movements)->where('type', 'inbound')->sum('quantity'),
                'outboundQuantity' => (int) (clone $movements)->where('type', 'outbound')->sum('quantity'),
                'saleQuantity' => (int) (clone $movements)->where('type', 'sale')->sum('quantity'),
                'adjustmentCount' => (clone $movements)->where('type', 'adjustment')->count(),
            ],
            'stock' => [
                'totalSku' => (clone $stock)->count('products.id'),
                'totalUnits' => (int) (clone $stock)->sum(DB::raw('COALESCE(product_stocks.quantity, 0)')),
                'lowStockCount' => (clone $stock)->whereRaw('COALESCE(product_stocks.quantity, 0) > 0')->whereColumn('product_stocks.quantity', '<', 'products.min_stock')->count(),
                'outOfStockCount' => (clone $stock)->whereRaw('COALESCE(product_stocks.quantity, 0) = 0')->count(),
            ],
        ]);
    }

    public function stock(Request $request)
    {
        $products = $this->stockQuery($request)
            ->orderBy('name')
            ->paginate((int) $request->query('per_page', 15));

        return new ProductCollection($products);
    }

    public function stockExport(Request $request)
    {
        $products = $this->stockQuery($request)->orderBy('name')->get();

        return $this->csv('stock-report.csv', [
            ['SKU', 'Name', 'Category', 'Stock', 'Minimum Stock', 'Status', 'Sale Price', 'Active'],
            ...$products->map(fn (Product $product) => [
                $product->sku,
                $product->name,
                $product->category?->name,
                $product->stock?->quantity ?? 0,
                $product->min_stock,
                $this->stockStatus($product->stock?->quantity ?? 0, $product->min_stock),
                (float) $product->sale_price,
                $product->is_active ? 'yes' : 'no',
            ])->all(),
        ]);
    }

    public function sales(Request $request)
    {
        $sales = $this->salesQuery($request)
            ->latest()
            ->paginate((int) $request->query('per_page', 15));

        return new SaleCollection($sales);
    }

    public function salesExport(Request $request)
    {
        $sales = $this->salesQuery($request)->latest()->get();

        return $this->csv('sales-report.csv', [
            ['Invoice', 'Status', 'Cashier', 'Total Amount', 'Void Reason', 'Created At'],
            ...$sales->map(fn (Sale $sale) => [
                $sale->invoice_number,
                $sale->status,
                $sale->cashier?->name,
                (float) $sale->total_amount,
                $sale->void_reason,
                $sale->created_at?->toDateTimeString(),
            ])->all(),
        ]);
    }

    public function inbound(Request $request)
    {
        return $this->movementReport($request, ['inbound']);
    }

    public function inboundExport(Request $request)
    {
        return $this->movementExport($request, ['inbound'], 'inbound-report.csv');
    }

    public function outbound(Request $request)
    {
        return $this->movementReport($request, ['outbound', 'sale']);
    }

    public function outboundExport(Request $request)
    {
        return $this->movementExport($request, ['outbound', 'sale'], 'outbound-report.csv');
    }

    private function stockQuery(Request $request)
    {
        return Product::with(['category', 'stock'])
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
            });
    }

    private function salesQuery(Request $request)
    {
        return $this->dateFilter(Sale::with(['cashier', 'voidedBy', 'items.product']), $request)
            ->when($request->query('status'), fn ($query, string $status) => $query->where('status', $status))
            ->when($request->query('cashier_id'), fn ($query, string $cashierId) => $query->where('cashier_id', $cashierId))
            ->when($request->query('search'), fn ($query, string $search) => $query->where('invoice_number', 'like', "%{$search}%"));
    }

    private function movementReport(Request $request, array $types)
    {
        $movements = $this->movementQuery($request, $types)
            ->latest()
            ->paginate((int) $request->query('per_page', 15));

        return new StockMovementCollection($movements);
    }

    private function movementExport(Request $request, array $types, string $filename)
    {
        $movements = $this->movementQuery($request, $types)->latest()->get();

        return $this->csv($filename, [
            ['Date', 'Type', 'SKU', 'Product', 'Operator', 'Quantity', 'Before', 'After', 'Party', 'Note'],
            ...$movements->map(fn (StockMovement $movement) => [
                $movement->created_at?->toDateTimeString(),
                $movement->type,
                $movement->product?->sku,
                $movement->product?->name,
                $movement->operator?->name,
                $movement->quantity,
                $movement->before_quantity,
                $movement->after_quantity,
                $movement->party,
                $movement->note,
            ])->all(),
        ]);
    }

    private function movementQuery(Request $request, array $types)
    {
        $query = StockMovement::with(['product', 'operator'])->whereIn('type', $types);

        return $this->dateFilter($query, $request)
            ->when($request->query('product_id'), fn ($query, string $productId) => $query->where('product_id', $productId))
            ->when($request->query('operator_id'), fn ($query, string $operatorId) => $query->where('operator_id', $operatorId));
    }

    private function dateFilter($query, Request $request)
    {
        return $query
            ->when($request->query('from'), fn ($query, string $from) => $query->whereDate('created_at', '>=', $from))
            ->when($request->query('to'), fn ($query, string $to) => $query->whereDate('created_at', '<=', $to));
    }

    private function stockStatus(int $stock, int $minStock): string
    {
        return $stock === 0 ? 'empty' : ($stock < $minStock ? 'low' : 'safe');
    }

    private function csv(string $filename, array $rows)
    {
        return response()->streamDownload(function () use ($rows): void {
            $handle = fopen('php://output', 'w');

            foreach ($rows as $row) {
                fputcsv($handle, array_map(fn ($value) => $this->csvValue($value), $row));
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function csvValue($value): string
    {
        $value = (string) $value;

        return preg_match('/^[=+\-@]/', $value) ? "'{$value}" : $value;
    }
}
