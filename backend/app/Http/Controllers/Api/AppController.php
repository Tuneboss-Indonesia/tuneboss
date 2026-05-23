<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AppController extends Controller
{
    public function health()
    {
        DB::select('select 1');

        return response()->json([
            'status' => 'ok',
            'database' => 'ok',
            'service' => 'tuneboss-inventory-api',
            'version' => config('app.version'),
            'timestamp' => now()->toISOString(),
        ]);
    }

    public function bootstrap(Request $request)
    {
        return response()->json([
            'user' => [
                'id' => $request->user()->id,
                'name' => $request->user()->name,
                'email' => $request->user()->email,
                'role' => $request->user()->role,
            ],
            'permissions' => $this->permissions($request->user()->role),
            'categories' => CategoryResource::collection(Category::withCount('products')->orderBy('name')->get()),
            'summary' => [
                'totalProducts' => Product::where('is_active', true)->count(),
                'totalCategories' => Category::count(),
            ],
        ]);
    }

    private function permissions(string $role): array
    {
        if ($role === 'admin') {
            return ['manage_users', 'manage_master_data', 'adjust_stock', 'void_sales', 'view_reports'];
        }

        return ['view_products', 'create_stock_movement', 'create_sales', 'view_reports'];
    }
}
