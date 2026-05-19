<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class InventoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_login_and_read_dashboard_summary(): void
    {
        $this->seed();

        $login = $this->postJson('/auth/login', [
            'email' => 'admin@tuneboss.id',
            'password' => 'password',
        ]);

        $login->assertOk()
            ->assertJsonStructure(['accessToken', 'tokenType', 'expiresAt', 'user' => ['id', 'name', 'email', 'role']]);

        $this->withToken($login->json('accessToken'))
            ->getJson('/dashboard/summary')
            ->assertOk()
            ->assertJsonStructure([
                'totalSku',
                'totalUnits',
                'lowStockCount',
                'outOfStockCount',
                'stockHealth' => ['healthy', 'low', 'empty'],
            ]);

        $this->withToken($login->json('accessToken'))
            ->getJson('/dashboard/priority-products')
            ->assertOk();

        $this->withToken($login->json('accessToken'))
            ->getJson('/dashboard/recent-activities')
            ->assertOk();
    }

    public function test_outbound_rejects_insufficient_stock(): void
    {
        $this->seed();

        $login = $this->postJson('/auth/login', [
            'email' => 'staff@tuneboss.id',
            'password' => 'password',
        ]);

        $productId = $this->withToken($login->json('accessToken'))
            ->getJson('/products/lookup?code=899-TB-002-VARIO')
            ->json('id');

        $this->withToken($login->json('accessToken'))
            ->postJson('/stock/outbound', [
                'productId' => $productId,
                'quantity' => 1,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'insufficient_stock');
    }

    public function test_api_errors_use_standard_shape(): void
    {
        $this->postJson('/auth/login', [])
            ->assertUnprocessable()
            ->assertJsonStructure(['message', 'code', 'errors']);

        $this->getJson('/dashboard/summary')
            ->assertUnauthorized()
            ->assertJsonPath('code', 'unauthenticated');

        $this->seed();
        $staffToken = $this->loginToken('staff@tuneboss.id');

        $this->withToken($staffToken)
            ->getJson('/users')
            ->assertForbidden()
            ->assertJsonPath('code', 'forbidden');
    }

    public function test_admin_can_manage_users_and_staff_cannot(): void
    {
        $this->seed();

        $adminToken = $this->loginToken('admin@tuneboss.id');

        $response = $this->withToken($adminToken)
            ->postJson('/users', [
                'name' => 'Operator Baru',
                'email' => 'operator@tuneboss.id',
                'password' => 'password123',
                'role' => 'staff',
            ])
            ->assertCreated()
            ->assertJsonPath('email', 'operator@tuneboss.id');

        $this->withToken($adminToken)
            ->patchJson('/users/'.$response->json('id').'/deactivate')
            ->assertOk();

        $this->assertFalse(User::find($response->json('id'))->is_active);
    }

    public function test_staff_cannot_manage_users(): void
    {
        $this->seed();
        $staffToken = $this->loginToken('staff@tuneboss.id');

        $this->withToken($staffToken)
            ->getJson('/users')
            ->assertForbidden();
    }

    public function test_admin_can_create_category_and_product(): void
    {
        $this->seed();
        $adminToken = $this->loginToken('admin@tuneboss.id');

        $category = $this->withToken($adminToken)
            ->postJson('/categories', [
                'name' => 'Tools',
                'description' => 'Alat bengkel',
            ])
            ->assertCreated();

        $product = $this->withToken($adminToken)
            ->postJson('/products', [
                'category_id' => $category->json('id'),
                'name' => 'TuneBoss Diagnostic Tool',
                'sku' => 'TB-DIAG-TOOL',
                'barcode' => '899-TB-900-DIAG',
                'sale_price' => 1250000,
                'min_stock' => 2,
            ])
            ->assertCreated()
            ->assertJsonPath('sku', 'TB-DIAG-TOOL');

        $this->assertDatabaseHas('product_stocks', [
            'product_id' => $product->json('id'),
            'quantity' => 0,
        ]);
    }

    public function test_admin_can_manage_suppliers_and_customers(): void
    {
        $this->seed();
        $adminToken = $this->loginToken('admin@tuneboss.id');
        $staffToken = $this->loginToken('staff@tuneboss.id');

        $supplier = $this->withToken($adminToken)
            ->postJson('/suppliers', [
                'name' => 'Supplier Jakarta',
                'phone' => '08123456789',
                'email' => 'supplier@example.com',
                'address' => 'Jakarta',
            ])
            ->assertCreated()
            ->assertJsonPath('name', 'Supplier Jakarta');

        $customer = $this->withToken($adminToken)
            ->postJson('/customers', [
                'name' => 'Dealer Surabaya',
                'phone' => '08987654321',
                'email' => 'dealer@example.com',
                'address' => 'Surabaya',
            ])
            ->assertCreated()
            ->assertJsonPath('name', 'Dealer Surabaya');

        $this->withToken($staffToken)
            ->getJson('/suppliers')
            ->assertOk()
            ->assertJsonStructure(['data']);

        $this->app['auth']->forgetGuards();

        $this->withToken($staffToken)
            ->patchJson('/customers/'.$customer->json('id'), ['name' => 'Blocked'])
            ->assertForbidden();

        $this->app['auth']->forgetGuards();

        $this->withToken($adminToken)
            ->deleteJson('/suppliers/'.$supplier->json('id'))
            ->assertOk();

        $this->assertFalse(Supplier::find($supplier->json('id'))->is_active);
    }

    public function test_inbound_outbound_and_sale_update_stock(): void
    {
        $this->seed();
        $staffToken = $this->loginToken('staff@tuneboss.id');
        $product = Product::where('sku', 'TB-USB-CABLE')->firstOrFail();
        $initialStock = $product->stock->quantity;

        $this->withToken($staffToken)
            ->postJson('/stock/inbound', [
                'productId' => $product->id,
                'quantity' => 5,
                'party' => 'Gudang Pusat',
            ])
            ->assertCreated();

        $this->assertSame($initialStock + 5, ProductStock::where('product_id', $product->id)->value('quantity'));

        $this->withToken($staffToken)
            ->postJson('/stock/outbound', [
                'productId' => $product->id,
                'quantity' => 2,
                'party' => 'Dealer Bandung',
            ])
            ->assertCreated();

        $this->assertSame($initialStock + 3, ProductStock::where('product_id', $product->id)->value('quantity'));

        $this->withToken($staffToken)
            ->postJson('/sales', [
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 1],
                ],
            ])
            ->assertCreated()
            ->assertJsonStructure(['id', 'invoiceNumber', 'items']);

        $this->assertSame($initialStock + 2, ProductStock::where('product_id', $product->id)->value('quantity'));
    }

    public function test_sale_preview_validates_cart_and_does_not_update_stock(): void
    {
        $this->seed();
        $staffToken = $this->loginToken('staff@tuneboss.id');
        $product = Product::where('sku', 'TB-USB-CABLE')->firstOrFail();
        $initialStock = $product->stock->quantity;

        $this->withToken($staffToken)
            ->postJson('/sales/preview', [
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 2],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('canSubmit', true)
            ->assertJsonPath('totalItems', 2)
            ->assertJsonPath('items.0.productId', $product->id)
            ->assertJsonPath('items.0.availableStock', $initialStock)
            ->assertJsonPath('items.0.afterStock', $initialStock - 2)
            ->assertJsonPath('totalAmount', (int) $product->sale_price * 2);

        $this->assertSame($initialStock, ProductStock::where('product_id', $product->id)->value('quantity'));
    }

    public function test_sale_preview_rejects_insufficient_stock(): void
    {
        $this->seed();
        $staffToken = $this->loginToken('staff@tuneboss.id');
        $product = Product::where('sku', 'TB-ECU-VARIO')->firstOrFail();

        $this->withToken($staffToken)
            ->postJson('/sales/preview', [
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 1],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'insufficient_stock')
            ->assertJsonPath('productId', $product->id)
            ->assertJsonPath('availableStock', 0)
            ->assertJsonPath('requestedQuantity', 1);
    }

    public function test_stock_and_sales_accept_supplier_and_customer_references(): void
    {
        $this->seed();
        $staffToken = $this->loginToken('staff@tuneboss.id');
        $product = Product::where('sku', 'TB-USB-CABLE')->firstOrFail();
        $supplier = Supplier::where('name', 'Supplier Malaysia')->firstOrFail();
        $customer = Customer::where('name', 'Dealer Bandung')->firstOrFail();

        $this->withToken($staffToken)
            ->postJson('/stock/inbound', [
                'productId' => $product->id,
                'quantity' => 3,
                'supplier_id' => $supplier->id,
            ])
            ->assertCreated()
            ->assertJsonPath('supplierId', $supplier->id)
            ->assertJsonPath('party', 'Supplier Malaysia');

        $sale = $this->withToken($staffToken)
            ->postJson('/sales', [
                'customer_id' => $customer->id,
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 1],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('customerId', $customer->id);

        $this->assertDatabaseHas('sales', [
            'id' => $sale->json('id'),
            'customer_id' => $customer->id,
        ]);

        $this->assertSame($customer->id, StockMovement::where('sale_id', $sale->json('id'))->value('customer_id'));
    }

    public function test_admin_can_void_sale_and_restore_stock(): void
    {
        $this->seed();
        $adminToken = $this->loginToken('admin@tuneboss.id');
        $product = Product::where('sku', 'TB-USB-CABLE')->firstOrFail();
        $initialStock = $product->stock->quantity;

        $sale = $this->withToken($adminToken)
            ->postJson('/sales', [
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 1],
                ],
            ])
            ->assertCreated();

        $this->assertSame($initialStock - 1, ProductStock::where('product_id', $product->id)->value('quantity'));

        $this->withToken($adminToken)
            ->postJson('/sales/'.$sale->json('id').'/void', ['reason' => 'Salah input'])
            ->assertOk()
            ->assertJsonPath('status', 'void');

        $this->assertSame($initialStock, ProductStock::where('product_id', $product->id)->value('quantity'));
    }

    public function test_dashboard_sales_endpoints_and_audit_logs_are_available(): void
    {
        $this->seed();
        $adminToken = $this->loginToken('admin@tuneboss.id');

        $this->withToken($adminToken)
            ->getJson('/dashboard/sales-chart?period=month')
            ->assertOk();

        $this->withToken($adminToken)
            ->getJson('/dashboard/top-products?period=month')
            ->assertOk();

        $this->withToken($adminToken)
            ->getJson('/audit-logs')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_filters_health_and_bootstrap_are_available(): void
    {
        $this->seed();
        $adminToken = $this->loginToken('admin@tuneboss.id');
        $product = Product::where('sku', 'TB-USB-CABLE')->firstOrFail();

        $this->getJson('/health')
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('database', 'ok');

        $this->withToken($adminToken)
            ->getJson('/app/bootstrap')
            ->assertOk()
            ->assertJsonStructure(['user', 'permissions', 'categories', 'suppliers', 'customers', 'summary']);

        $this->withToken($adminToken)
            ->getJson('/stock/movements?product_id='.$product->id.'&from='.now()->toDateString())
            ->assertOk()
            ->assertJsonStructure(['data']);

        $this->withToken($adminToken)
            ->getJson('/reports/stock?product_id='.$product->id)
            ->assertOk()
            ->assertJsonStructure(['data']);

        $this->withToken($adminToken)
            ->getJson('/sales?status=completed')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['currentPage', 'lastPage', 'perPage', 'total']]);

        $this->withToken($adminToken)
            ->getJson('/reports/summary?from='.now()->startOfMonth()->toDateString())
            ->assertOk()
            ->assertJsonStructure([
                'sales' => ['completedCount', 'voidCount', 'totalAmount'],
                'stockMovements' => ['inboundQuantity', 'outboundQuantity', 'saleQuantity', 'adjustmentCount'],
                'stock' => ['totalSku', 'totalUnits', 'lowStockCount', 'outOfStockCount'],
            ]);
    }

    public function test_report_exports_and_audit_metadata_are_available(): void
    {
        $this->seed();
        $adminToken = $this->loginToken('admin@tuneboss.id');
        $product = Product::where('sku', 'TB-USB-CABLE')->firstOrFail();

        $this->withToken($adminToken)
            ->patchJson('/products/'.$product->id, [
                'category_id' => $product->category_id,
                'name' => 'USB Tuning Cable Updated',
                'sku' => $product->sku,
                'barcode' => $product->barcode,
                'sale_price' => $product->sale_price,
                'min_stock' => $product->min_stock,
                'is_active' => true,
            ])
            ->assertOk();

        $audit = AuditLog::where('action', 'product.updated')->latest()->firstOrFail();
        $this->assertArrayHasKey('before', $audit->metadata);
        $this->assertArrayHasKey('after', $audit->metadata);

        foreach (['stock', 'sales', 'inbound', 'outbound'] as $report) {
            $this->withToken($adminToken)
                ->get("/reports/{$report}/export")
                ->assertOk()
                ->assertHeader('content-type', 'text/csv; charset=UTF-8');
        }
    }

    public function test_user_can_update_own_profile_and_password(): void
    {
        $this->seed();
        $token = $this->loginToken('staff@tuneboss.id');

        $this->withToken($token)
            ->patchJson('/auth/profile', [
                'name' => 'Staff Operasional',
                'email' => 'staff.ops@tuneboss.id',
            ])
            ->assertOk()
            ->assertJsonPath('email', 'staff.ops@tuneboss.id');

        $this->withToken($token)
            ->patchJson('/auth/password', [
                'currentPassword' => 'password',
                'password' => 'password-baru',
            ])
            ->assertOk();

        $this->postJson('/auth/login', [
            'email' => 'staff.ops@tuneboss.id',
            'password' => 'password-baru',
        ])->assertOk();
    }

    public function test_user_can_logout_all_devices(): void
    {
        $this->seed();
        $token = $this->loginToken('staff@tuneboss.id');

        $this->withToken($token)
            ->postJson('/auth/logout-all')
            ->assertOk();

        $this->assertSame(0, PersonalAccessToken::count());
    }

    private function loginToken(string $email): string
    {
        return $this->postJson('/auth/login', [
            'email' => $email,
            'password' => 'password',
        ])->assertOk()->json('accessToken');
    }
}
