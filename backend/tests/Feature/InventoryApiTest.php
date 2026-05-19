<?php

namespace Tests\Feature;

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

        $this->withHeader('Authorization', 'Bearer '.$login->json('accessToken'))
            ->getJson('/dashboard/summary')
            ->assertOk()
            ->assertJsonStructure([
                'totalSku',
                'totalUnits',
                'lowStockCount',
                'outOfStockCount',
                'stockHealth' => ['healthy', 'low', 'empty'],
            ]);

        $this->withHeader('Authorization', 'Bearer '.$login->json('accessToken'))
            ->getJson('/dashboard/priority-products')
            ->assertOk();

        $this->withHeader('Authorization', 'Bearer '.$login->json('accessToken'))
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

        $productId = $this->withHeader('Authorization', 'Bearer '.$login->json('accessToken'))
            ->getJson('/products/lookup?code=899-TB-002-VARIO')
            ->json('id');

        $this->withHeader('Authorization', 'Bearer '.$login->json('accessToken'))
            ->postJson('/stock/outbound', [
                'productId' => $productId,
                'quantity' => 1,
            ])
            ->assertUnprocessable();
    }
}
