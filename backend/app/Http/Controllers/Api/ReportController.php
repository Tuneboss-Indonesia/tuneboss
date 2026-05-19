<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function stock(Request $request)
    {
        return response()->json(Product::with(['category', 'stock'])->orderBy('name')->paginate((int) $request->query('per_page', 15)));
    }

    public function sales(Request $request)
    {
        return response()->json($this->dateFilter(Sale::with(['cashier', 'items.product']), $request)->latest()->paginate((int) $request->query('per_page', 15)));
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

        return response()->json($this->dateFilter($query, $request)->latest()->paginate((int) $request->query('per_page', 15)));
    }

    private function dateFilter($query, Request $request)
    {
        return $query
            ->when($request->query('from'), fn ($query, string $from) => $query->whereDate('created_at', '>=', $from))
            ->when($request->query('to'), fn ($query, string $to) => $query->whereDate('created_at', '<=', $to));
    }
}
