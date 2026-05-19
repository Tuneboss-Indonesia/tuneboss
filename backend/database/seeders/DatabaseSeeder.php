<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@tuneboss.id'],
            [
                'name' => 'Admin Gudang',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'is_active' => true,
            ]
        );

        User::updateOrCreate(
            ['email' => 'staff@tuneboss.id'],
            [
                'name' => 'Staff Gudang',
                'password' => Hash::make('password'),
                'role' => 'staff',
                'is_active' => true,
            ]
        );

        $categories = collect([
            ['name' => 'ECU', 'description' => 'Produk ECU TuneBoss'],
            ['name' => 'Kabel', 'description' => 'USB tuning cable dan wiring harness'],
            ['name' => 'Aksesoris', 'description' => 'Sticker seal, bracket, dan pendukung'],
            ['name' => 'Lainnya', 'description' => 'Kategori lainnya'],
        ])->mapWithKeys(fn (array $category) => [
            $category['name'] => Category::updateOrCreate(['name' => $category['name']], $category),
        ]);

        collect([
            ['name' => 'Gudang Pusat', 'phone' => null, 'email' => null, 'address' => 'Internal TuneBoss', 'is_active' => true],
            ['name' => 'Supplier Malaysia', 'phone' => null, 'email' => null, 'address' => 'Malaysia', 'is_active' => true],
        ])->each(fn (array $supplier) => Supplier::updateOrCreate(['name' => $supplier['name']], $supplier));

        collect([
            ['name' => 'Customer Walk-in', 'phone' => null, 'email' => null, 'address' => null, 'is_active' => true],
            ['name' => 'Dealer Bandung', 'phone' => null, 'email' => null, 'address' => 'Bandung', 'is_active' => true],
        ])->each(fn (array $customer) => Customer::updateOrCreate(['name' => $customer['name']], $customer));

        $products = [
            ['category' => 'ECU', 'name' => 'TuneBoss ECU Yamaha NMAX', 'sku' => 'TB-ECU-NMAX', 'barcode' => '899-TB-001-NMAX', 'sale_price' => 1800000, 'min_stock' => 12, 'stock' => 4],
            ['category' => 'ECU', 'name' => 'TuneBoss ECU Honda Vario', 'sku' => 'TB-ECU-VARIO', 'barcode' => '899-TB-002-VARIO', 'sale_price' => 1750000, 'min_stock' => 8, 'stock' => 0],
            ['category' => 'Aksesoris', 'name' => 'TuneBoss Wiring Harness', 'sku' => 'TB-WIRE-HARNESS', 'barcode' => '899-TB-003-WIRE', 'sale_price' => 350000, 'min_stock' => 20, 'stock' => 9],
            ['category' => 'Kabel', 'name' => 'USB Tuning Cable', 'sku' => 'TB-USB-CABLE', 'barcode' => '899-TB-004-USB', 'sale_price' => 250000, 'min_stock' => 15, 'stock' => 18],
            ['category' => 'Aksesoris', 'name' => 'Sticker Seal Pack', 'sku' => 'TB-SEAL-PACK', 'barcode' => '899-TB-005-SEAL', 'sale_price' => 50000, 'min_stock' => 10, 'stock' => 2],
        ];

        foreach ($products as $item) {
            $product = Product::updateOrCreate(
                ['sku' => $item['sku']],
                [
                    'category_id' => $categories[$item['category']]->id,
                    'name' => $item['name'],
                    'barcode' => $item['barcode'],
                    'sale_price' => $item['sale_price'],
                    'min_stock' => $item['min_stock'],
                    'is_active' => true,
                ]
            );

            $product->stock()->updateOrCreate(
                ['product_id' => $product->id],
                ['quantity' => $item['stock']]
            );
        }
    }
}
