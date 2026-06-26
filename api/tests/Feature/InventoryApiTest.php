<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Product;
use App\Models\ProductSerial;
use App\Models\ProductStock;
use App\Models\RestockAlert;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class InventoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_login_and_read_dashboard_summary(): void
    {
        $this->seed();

        $login = $this->postJson('/auth/login', [
            'email' => 'admin@tuneboss.co.id',
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

        $this->withToken($login->json('accessToken'))
            ->getJson('/dashboard/realtime')
            ->assertOk()
            ->assertJsonStructure(['serverTime', 'pollAfterSeconds', 'lastActivityAt', 'summary', 'priorityProducts', 'recentActivities']);
    }

    public function test_user_can_refresh_access_token(): void
    {
        $this->seed();
        $token = $this->loginToken('staff@tuneboss.co.id');

        $refresh = $this->withToken($token)
            ->postJson('/auth/refresh')
            ->assertOk()
            ->assertJsonStructure(['accessToken', 'tokenType', 'expiresAt', 'user']);

        $this->assertNotSame($token, $refresh->json('accessToken'));
        $this->assertSame(1, PersonalAccessToken::count());

        $this->app['auth']->forgetGuards();

        $this->withToken($token)
            ->getJson('/auth/me')
            ->assertUnauthorized();

        $this->app['auth']->forgetGuards();

        $this->withToken($refresh->json('accessToken'))
            ->getJson('/auth/me')
            ->assertOk();
    }

    public function test_outbound_rejects_insufficient_stock(): void
    {
        $this->seed();

        $login = $this->postJson('/auth/login', [
            'email' => 'staff@tuneboss.co.id',
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
        $staffToken = $this->loginToken('staff@tuneboss.co.id');

        $this->withToken($staffToken)
            ->getJson('/users')
            ->assertForbidden()
            ->assertJsonPath('code', 'forbidden');
    }

    public function test_admin_can_manage_users_and_staff_cannot(): void
    {
        $this->seed();

        $adminToken = $this->loginToken('admin@tuneboss.co.id');

        $response = $this->withToken($adminToken)
            ->postJson('/users', [
                'name' => 'Operator Baru',
                'email' => 'operator@tuneboss.co.id',
                'password' => 'password123',
                'role' => 'staff',
            ])
            ->assertCreated()
            ->assertJsonPath('email', 'operator@tuneboss.co.id');

        $this->withToken($adminToken)
            ->patchJson('/users/'.$response->json('id'), [
                'name' => 'Operator Baru',
                'email' => 'operator@tuneboss.co.id',
                'role' => 'staff',
                'is_active' => false,
            ])
            ->assertOk();

        $this->assertFalse(User::find($response->json('id'))->is_active);

        $users = $this->withToken($adminToken)
            ->getJson('/users')
            ->assertOk()
            ->json('data');

        $this->assertContains($response->json('id'), array_column($users, 'id'));

        $this->withToken($adminToken)
            ->deleteJson('/users/'.$response->json('id'))
            ->assertOk()
            ->assertJsonPath('message', 'User dihapus.');

        $this->assertDatabaseMissing('users', [
            'id' => $response->json('id'),
        ]);
    }

    public function test_staff_cannot_manage_users(): void
    {
        $this->seed();
        $staffToken = $this->loginToken('staff@tuneboss.co.id');

        $this->withToken($staffToken)
            ->getJson('/users')
            ->assertForbidden();
    }

    public function test_admin_can_create_category_and_product(): void
    {
        $this->seed();
        $adminToken = $this->loginToken('admin@tuneboss.co.id');

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
                'min_stock' => 2,
            ])
            ->assertCreated()
            ->assertJsonPath('sku', 'TB-DIAG-TOOL');

        $this->assertDatabaseHas('product_stocks', [
            'product_id' => $product->json('id'),
            'quantity' => 0,
        ]);
    }

    public function test_admin_can_upload_and_delete_product_image(): void
    {
        Storage::fake('public');
        $this->seed();
        $adminToken = $this->loginToken('admin@tuneboss.co.id');
        $staffToken = $this->loginToken('staff@tuneboss.co.id');
        $product = Product::where('sku', 'TB-USB-CABLE')->firstOrFail();

        $upload = $this->withToken($adminToken)
            ->postJson('/products/'.$product->id.'/image', [
                'image' => UploadedFile::fake()->image('usb-cable.jpg', 640, 480)->size(512),
            ])
            ->assertOk()
            ->assertJsonStructure(['imagePath', 'imageUrl']);

        $this->assertNotNull($upload->json('imagePath'));
        Storage::disk('public')->assertExists($upload->json('imagePath'));

        $this->app['auth']->forgetGuards();

        $this->withToken($staffToken)
            ->postJson('/products/'.$product->id.'/image', [
                'image' => UploadedFile::fake()->image('blocked.jpg'),
            ])
            ->assertForbidden();

        $this->app['auth']->forgetGuards();

        $this->withToken($adminToken)
            ->deleteJson('/products/'.$product->id.'/image')
            ->assertOk()
            ->assertJsonPath('imagePath', null)
            ->assertJsonPath('imageUrl', null);

        Storage::disk('public')->assertMissing($upload->json('imagePath'));
    }

    public function test_admin_delete_product_deactivates_product_with_stock_history(): void
    {
        $this->seed();
        $adminToken = $this->loginToken('admin@tuneboss.co.id');
        $product = Product::where('sku', 'TB-USB-CABLE')->firstOrFail();

        $this->withToken($adminToken)
            ->deleteJson('/products/'.$product->id)
            ->assertOk()
            ->assertJsonPath('message', 'Produk berhasil dinonaktifkan.');

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_active' => false,
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
        ]);
    }

    public function test_restock_alerts_can_be_listed_acknowledged_and_resolved(): void
    {
        $this->seed();
        $adminToken = $this->loginToken('admin@tuneboss.co.id');
        $staffToken = $this->loginToken('staff@tuneboss.co.id');

        $alerts = $this->withToken($staffToken)
            ->getJson('/restock-alerts?active_only=1')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'productId', 'status', 'severity', 'currentStock', 'threshold', 'product']]])
            ->json('data');

        $this->assertNotEmpty($alerts);
        $alertId = $alerts[0]['id'];

        $this->withToken($staffToken)
            ->postJson('/restock-alerts/'.$alertId.'/acknowledge', ['note' => 'Akan diproses'])
            ->assertOk()
            ->assertJsonPath('status', 'acknowledged')
            ->assertJsonPath('note', 'Akan diproses');

        $this->assertDatabaseHas('restock_alerts', [
            'id' => $alertId,
            'status' => 'acknowledged',
        ]);

        $this->app['auth']->forgetGuards();

        $this->withToken($staffToken)
            ->postJson('/restock-alerts/'.$alertId.'/resolve', ['note' => 'Blocked'])
            ->assertForbidden();

        $this->app['auth']->forgetGuards();

        $this->withToken($adminToken)
            ->postJson('/restock-alerts/'.$alertId.'/resolve', ['note' => 'Sudah dibuat PO'])
            ->assertOk()
            ->assertJsonPath('status', 'resolved')
            ->assertJsonPath('note', 'Sudah dibuat PO');
    }

    public function test_restock_alerts_auto_resolve_when_stock_is_safe(): void
    {
        $this->seed();
        $staffToken = $this->loginToken('staff@tuneboss.co.id');
        $product = Product::where('sku', 'TB-ECU-NMAX')->firstOrFail();

        $this->withToken($staffToken)
            ->getJson('/restock-alerts?active_only=1')
            ->assertOk();

        $alert = RestockAlert::where('product_id', $product->id)->firstOrFail();
        $this->assertSame('open', $alert->status);

        ProductStock::where('product_id', $product->id)->update(['quantity' => $product->min_stock]);

        $this->withToken($staffToken)
            ->getJson('/restock-alerts?status=resolved')
            ->assertOk();

        $this->assertSame('resolved', $alert->refresh()->status);
    }

    public function test_inbound_outbound_and_sale_update_stock(): void
    {
        $this->seed();
        $staffToken = $this->loginToken('staff@tuneboss.co.id');
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

    public function test_stock_movements_can_track_serial_numbers(): void
    {
        $this->seed();
        $staffToken = $this->postJson('/api/auth/login', [
            'email' => 'staff@tuneboss.co.id',
            'password' => 'password',
        ])->assertOk()->json('accessToken');
        $product = Product::where('sku', 'TB-YMH-XMAX-V2')->firstOrFail();
        $initialStock = $product->stock->quantity;

        $this->withToken($staffToken)
            ->postJson('/api/stock/inbound', [
                'productId' => $product->id,
                'quantity' => 2,
                'serialNumbers' => ['TDYA020A001', 'TDYA020A002'],
            ])
            ->assertCreated()
            ->assertJsonPath('quantity', 2)
            ->assertJsonPath('serialNumbers.0', 'TDYA020A001');

        $this->assertSame($initialStock + 2, ProductStock::where('product_id', $product->id)->value('quantity'));
        $this->assertDatabaseHas('product_serials', [
            'product_id' => $product->id,
            'serial_number' => 'TDYA020A001',
            'status' => 'in_stock',
        ]);

        $this->withToken($staffToken)
            ->postJson('/api/stock/outbound', [
                'productId' => $product->id,
                'quantity' => 1,
                'serialNumbers' => ['TDYA020A001'],
            ])
            ->assertCreated()
            ->assertJsonPath('serialNumbers.0', 'TDYA020A001');

        $this->assertSame('out', ProductSerial::where('serial_number', 'TDYA020A001')->value('status'));

        $this->withToken($staffToken)
            ->postJson('/api/stock/outbound', [
                'productId' => $product->id,
                'quantity' => 1,
                'serialNumbers' => ['TDYA020A001'],
            ])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'serial_not_available');
    }

    public function test_admin_can_edit_stock_movement_and_rebalance_stock(): void
    {
        $this->seed();
        $adminToken = $this->loginToken('admin@tuneboss.co.id');
        $product = Product::where('sku', 'TB-USB-CABLE')->firstOrFail();
        $initialStock = $product->stock->quantity;

        $movement = $this->withToken($adminToken)
            ->postJson('/stock/inbound', [
                'productId' => $product->id,
                'quantity' => 5,
                'party' => 'Supplier Lama',
                'note' => 'Catatan lama',
            ])
            ->assertCreated();

        $this->withToken($adminToken)
            ->patchJson('/stock/movements/'.$movement->json('id'), [
                'productId' => $product->id,
                'quantity' => 2,
                'party' => 'Supplier Baru',
                'note' => 'Catatan baru',
            ])
            ->assertOk()
            ->assertJsonPath('quantity', 2)
            ->assertJsonPath('party', 'Supplier Baru')
            ->assertJsonPath('note', 'Catatan baru');

        $this->assertSame($initialStock + 2, ProductStock::where('product_id', $product->id)->value('quantity'));
    }

    public function test_admin_can_delete_stock_movement_and_restore_stock(): void
    {
        $this->seed();
        $adminToken = $this->loginToken('admin@tuneboss.co.id');
        $product = Product::where('sku', 'TB-USB-CABLE')->firstOrFail();
        $initialStock = $product->stock->quantity;

        $movement = $this->withToken($adminToken)
            ->postJson('/stock/inbound', [
                'productId' => $product->id,
                'quantity' => 4,
                'party' => 'Supplier',
            ])
            ->assertCreated();

        $this->withToken($adminToken)
            ->deleteJson('/stock/movements/'.$movement->json('id'))
            ->assertOk();

        $this->assertSame($initialStock, ProductStock::where('product_id', $product->id)->value('quantity'));
        $this->assertDatabaseMissing('stock_movements', ['id' => $movement->json('id')]);
    }

    public function test_sale_preview_validates_cart_and_does_not_update_stock(): void
    {
        $this->seed();
        $staffToken = $this->loginToken('staff@tuneboss.co.id');
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
            ->assertJsonPath('totalAmount', 0);

        $this->assertSame($initialStock, ProductStock::where('product_id', $product->id)->value('quantity'));
    }

    public function test_sale_preview_rejects_insufficient_stock(): void
    {
        $this->seed();
        $staffToken = $this->loginToken('staff@tuneboss.co.id');
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

    public function test_admin_can_void_sale_and_restore_stock(): void
    {
        $this->seed();
        $adminToken = $this->loginToken('admin@tuneboss.co.id');
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
        $adminToken = $this->loginToken('admin@tuneboss.co.id');

        $this->withToken($adminToken)
            ->getJson('/dashboard/sales-chart?period=month')
            ->assertOk();

        $this->withToken($adminToken)
            ->getJson('/dashboard/top-products?period=month')
            ->assertOk();

        $this->withToken($adminToken)
            ->getJson('/audit-logs')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'action', 'entity', 'user' => ['name', 'role'], 'createdAt']],
                'meta' => ['currentPage', 'from', 'lastPage', 'perPage', 'to', 'total'],
            ]);
    }

    public function test_filters_health_and_bootstrap_are_available(): void
    {
        $this->seed();
        $adminToken = $this->loginToken('admin@tuneboss.co.id');
        $product = Product::where('sku', 'TB-USB-CABLE')->firstOrFail();

        $this->getJson('/health')
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('database', 'ok')
            ->assertJsonStructure(['version']);

        $this->withToken($adminToken)
            ->getJson('/app/bootstrap')
            ->assertOk()
            ->assertJsonStructure(['user', 'permissions', 'categories', 'summary']);

        $this->withToken($adminToken)
            ->getJson('/stock/movements?product_id='.$product->id.'&from='.now()->toDateString())
            ->assertOk()
            ->assertJsonStructure(['data']);

        $this->withToken($adminToken)
            ->getJson('/reports/stock?product_id='.$product->id)
            ->assertOk()
            ->assertJsonStructure(['data']);

        $this->withToken($adminToken)
            ->getJson('/reports/sales?product_id='.$product->id.'&category_id='.$product->category_id)
            ->assertOk()
            ->assertJsonStructure(['data']);

        $this->withToken($adminToken)
            ->getJson('/reports/inbound?product_id='.$product->id.'&category_id='.$product->category_id)
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
        $adminToken = $this->loginToken('admin@tuneboss.co.id');
        $product = Product::where('sku', 'TB-USB-CABLE')->firstOrFail();

        $this->withToken($adminToken)
            ->patchJson('/products/'.$product->id, [
                'category_id' => $product->category_id,
                'name' => 'USB Tuning Cable Updated',
                'sku' => $product->sku,
                'barcode' => $product->barcode,
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

            $this->withToken($adminToken)
                ->get("/reports/{$report}/export.pdf")
                ->assertOk()
                ->assertHeader('content-type', 'application/pdf');
        }

        $this->withToken($adminToken)
            ->get('/audit-logs/export')
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    public function test_user_can_update_own_profile_and_password(): void
    {
        $this->seed();
        $token = $this->loginToken('staff@tuneboss.co.id');

        $this->withToken($token)
            ->patchJson('/auth/profile', [
                'name' => 'Staff Operasional',
                'email' => 'staff.ops@tuneboss.co.id',
            ])
            ->assertOk()
            ->assertJsonPath('email', 'staff.ops@tuneboss.co.id');

        $this->withToken($token)
            ->patchJson('/auth/password', [
                'currentPassword' => 'password',
                'password' => 'password-baru',
            ])
            ->assertOk();

        $this->postJson('/auth/login', [
            'email' => 'staff.ops@tuneboss.co.id',
            'password' => 'password-baru',
        ])->assertOk();
    }

    public function test_user_can_logout_all_devices(): void
    {
        $this->seed();
        $token = $this->loginToken('staff@tuneboss.co.id');

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
