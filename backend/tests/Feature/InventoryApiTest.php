<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductStock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
            ->assertJsonStructure(['accessToken', 'user' => ['id', 'name', 'email', 'role']]);

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
            ->assertUnprocessable();
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
            ->assertJsonPath('user.email', 'operator@tuneboss.id');

        $this->withToken($adminToken)
            ->patchJson('/users/'.$response->json('user.id').'/deactivate')
            ->assertOk();

        $this->assertFalse(User::find($response->json('user.id'))->is_active);
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
            ->assertJsonStructure(['id', 'invoice_number', 'items']);

        $this->assertSame($initialStock + 2, ProductStock::where('product_id', $product->id)->value('quantity'));
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

    private function loginToken(string $email): string
    {
        return $this->postJson('/auth/login', [
            'email' => $email,
            'password' => 'password',
        ])->assertOk()->json('accessToken');
    }
}
